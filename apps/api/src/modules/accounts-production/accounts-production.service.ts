import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  AccountsSet,
  AccountingFramework,
  AccountsSetStatus,
} from './interfaces/accounts-set.interface';
import { CreateAccountsSetDto } from './dto/create-accounts-set.dto';
import { AccountsSetValidationService } from './accounts-set-validation.service';
import { FinancialCalculationService } from './financial-calculation.service';
import { AccountsOutputService } from './accounts-output.service';
import { CompaniesHouseService } from '../companies-house/companies-house.service';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { ClientsService } from '../clients/clients.service';

@Injectable()
export class AccountsProductionService {
  private readonly logger = new Logger(AccountsProductionService.name);
  private readonly storagePath: string;
  private readonly accountsSetsPath: string;
  private readonly accountsSetsHistoryPath: string;
  private readonly indexPath: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly validationService: AccountsSetValidationService,
    private readonly calculationService: FinancialCalculationService,
    private readonly outputService: AccountsOutputService,
    private readonly companiesHouseService: CompaniesHouseService,
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
    private readonly clientsService: ClientsService,
  ) {
    const configuredStoragePath = this.configService.get<string>('STORAGE_PATH') || './storage';
    const cwd = process.cwd();
    this.storagePath = path.isAbsolute(configuredStoragePath)
      ? configuredStoragePath
      : path.resolve(cwd, configuredStoragePath);
    this.accountsSetsPath = path.join(this.storagePath, 'accounts-sets');
    this.accountsSetsHistoryPath = path.join(this.accountsSetsPath, 'history');
    this.indexPath = path.join(this.storagePath, 'indexes', 'accounts-sets.json');
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    try {
      if (!existsSync(this.accountsSetsPath)) {
        await fs.mkdir(this.accountsSetsPath, { recursive: true });
      }
      if (!existsSync(this.accountsSetsHistoryPath)) {
        await fs.mkdir(this.accountsSetsHistoryPath, { recursive: true });
      }
      if (!existsSync(path.dirname(this.indexPath))) {
        await fs.mkdir(path.dirname(this.indexPath), { recursive: true });
      }
      if (!existsSync(this.indexPath)) {
        await fs.writeFile(this.indexPath, JSON.stringify([]));
      }
    } catch (error) {
      this.logger.error('Failed to create directories:', error);
    }
  }

  async createAccountsSet(
    createDto: CreateAccountsSetDto,
    userId: string,
  ): Promise<AccountsSet> {
    const id = uuidv4();
    const now = new Date().toISOString();

    // Get client data from clients service
    const client = await this.clientsService.findOne(createDto.clientId);
    if (!client) {
      throw new NotFoundException(`Client ${createDto.clientId} not found`);
    }

    const isSoleTraderClient = client.type === 'SOLE_TRADER' || client.type === 'INDIVIDUAL';
    const resolvedFramework: AccountingFramework = isSoleTraderClient
      ? client.type === 'INDIVIDUAL'
        ? 'INDIVIDUAL'
        : 'SOLE_TRADER'
      : createDto.framework;

    // Determine if this is the first year by checking for existing accounts sets
    const clientAccountsSets = await this.getClientAccountsSets(createDto.clientId);
    const priorAccountsSet = clientAccountsSets[0];
    const inferredFirstYear = clientAccountsSets.length === 0;
    const isFirstYear = typeof createDto.isFirstYear === 'boolean' ? createDto.isFirstYear : inferredFirstYear;

    // Get company details from Companies House if we have a company number
    let companyDetails = null;
    let officers = [];
    if (!isSoleTraderClient && client.registeredNumber) {
      try {
        companyDetails = await this.companiesHouseService.getCompanyDetails(client.registeredNumber);
        officers = await this.companiesHouseService.getCompanyOfficers(client.registeredNumber);
        this.logger.log(`Fetched Companies House data for ${client.registeredNumber}`);
      } catch (error) {
        this.logger.warn(`Failed to fetch Companies House data for ${client.registeredNumber}: ${error.message}`);
        // Continue without Companies House data
      }
    }

    const defaultProfitAndLossLines = {
      turnover: 0,
      costOfSales: 0,
      otherIncome: 0,
      adminExpenses: 0,
      wages: 0,
      rent: 0,
      motor: 0,
      professionalFees: 0,
      otherExpenses: 0,
      interestPayable: 0,
      taxCharge: 0,
      dividendsDeclared: 0,
    };

    const defaultBalanceSheet = {
      assets: {
        fixedAssets: {
          tangibleFixedAssets: 0,
          intangibleAssets: 0,
          investments: 0,
        },
        currentAssets: {
          stock: 0,
          debtors: 0,
          cash: 0,
          prepayments: 0,
        },
      },
      liabilities: {
        creditorsWithinOneYear: {
          tradeCreditors: 0,
          taxes: 0,
          accrualsDeferredIncome: 0,
          directorsLoan: 0,
          otherCreditors: 0,
        },
        creditorsAfterOneYear: {
          loans: 0,
          other: 0,
        },
      },
      equity: {
        shareCapital: 1,
        retainedEarnings: 0,
        otherReserves: 0,
      },
    };

    const accountsSet: AccountsSet = {
      id,
      clientId: createDto.clientId,
      companyNumber: isSoleTraderClient ? '' : client.registeredNumber || '',
      framework: resolvedFramework,
      status: 'DRAFT' as AccountsSetStatus,
      period: {
        startDate: createDto.periodStart,
        endDate: createDto.periodEnd,
        isFirstYear,
      },
      sections: {
        // Pre-populate company period section with client and Companies House data
        companyPeriod: {
          framework: resolvedFramework,
          company: {
            name: companyDetails?.company_name || client.name,
            companyNumber: isSoleTraderClient ? '' : client.registeredNumber || '',
            registeredOffice: this.mapAddressFromCompaniesHouse(companyDetails?.registered_office_address) || this.mapAddressFromClient(client),
            directors: isSoleTraderClient ? [] : this.mapDirectorsFromCompaniesHouse(officers) || [{ name: '' }],
          },
          period: {
            startDate: createDto.periodStart,
            endDate: createDto.periodEnd,
            isFirstYear,
          },
        },
        accountingPolicies: priorAccountsSet?.sections?.accountingPolicies,
        notes: priorAccountsSet?.sections?.notes,
        ...(isFirstYear
          ? {}
          : {
              profitAndLoss: {
                lines: { ...defaultProfitAndLossLines },
                comparatives: {
                  priorYearLines:
                    priorAccountsSet?.sections?.profitAndLoss?.lines
                      ? { ...priorAccountsSet.sections.profitAndLoss.lines }
                      : { ...defaultProfitAndLossLines },
                },
              },
              balanceSheet: {
                ...defaultBalanceSheet,
                comparatives: {
                  prior:
                    priorAccountsSet?.sections?.balanceSheet
                      ? {
                          assets: {
                            fixedAssets: {
                              ...priorAccountsSet.sections.balanceSheet.assets.fixedAssets,
                            },
                            currentAssets: {
                              ...priorAccountsSet.sections.balanceSheet.assets.currentAssets,
                            },
                          },
                          liabilities: {
                            creditorsWithinOneYear: {
                              ...priorAccountsSet.sections.balanceSheet.liabilities.creditorsWithinOneYear,
                            },
                            creditorsAfterOneYear: {
                              ...priorAccountsSet.sections.balanceSheet.liabilities.creditorsAfterOneYear,
                            },
                          },
                          equity: {
                            ...priorAccountsSet.sections.balanceSheet.equity,
                          },
                        }
                      : { ...defaultBalanceSheet },
                },
              },
            }),
      },
      validation: {
        errors: [],
        warnings: [],
        isBalanced: false,
      },
      outputs: {
        htmlUrl: null,
        pdfUrl: null,
      },
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      lastEditedBy: userId,
    };

    await this.saveAccountsSet(accountsSet);
    await this.updateIndex(accountsSet);

    // Log audit event for accounts set creation
    await this.auditService.logEvent({
      actor: userId,
      actorType: 'USER',
      action: 'CREATE_ACCOUNTS_SET',
      entity: 'ACCOUNTS_SET',
      entityId: accountsSet.id,
      entityRef: `${client.name} (${createDto.clientId})`,
      metadata: {
        framework: resolvedFramework,
        isFirstYear,
        companyNumber: client.registeredNumber,
      },
      severity: 'MEDIUM',
      category: 'DATA',
    });

    this.logger.log(`Created accounts set ${id} for client ${createDto.clientId} with Companies House integration`);
    return accountsSet;
  }

  async getAllAccountsSets(): Promise<AccountsSet[]> {
    try {
      const indexData = await fs.readFile(this.indexPath, 'utf8');
      const index = JSON.parse(indexData) as Array<{ id: string; clientId: string; createdAt: string }>;
      
      // Sort by most recent first
      const sortedIndex = index.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const accountsSets = await Promise.all(
        sortedIndex.map(item => this.getAccountsSet(item.id))
      );

      return accountsSets;
    } catch (error) {
      this.logger.error(`Failed to get all accounts sets:`, error);
      return [];
    }
  }

  async getAccountsSet(id: string): Promise<AccountsSet> {
    const filePath = path.join(this.accountsSetsPath, `accounts_set_${id}.json`);
    
    if (!existsSync(filePath)) {
      throw new NotFoundException(`Accounts set ${id} not found`);
    }

    try {
      const data = await fs.readFile(filePath, 'utf8');
      const accountsSet = JSON.parse(data) as AccountsSet;
      
      // Add calculated totals and financial ratios to the response
      const calculations = this.calculationService.calculateTotals(accountsSet);
      const ratios = this.calculationService.calculateFinancialRatios(accountsSet);
      
      // Add percentage changes if comparatives exist
      let percentageChanges = null;
      if (accountsSet.sections.profitAndLoss?.comparatives?.priorYearLines && 
          accountsSet.sections.profitAndLoss?.lines) {
        percentageChanges = this.calculationService.calculatePercentageChanges(
          accountsSet.sections.profitAndLoss.lines,
          accountsSet.sections.profitAndLoss.comparatives.priorYearLines
        );
      }

      // Enhance the response with calculated data
      (accountsSet as any).calculations = calculations;
      (accountsSet as any).ratios = ratios;
      if (percentageChanges) {
        (accountsSet as any).percentageChanges = percentageChanges;
      }

      return accountsSet;
    } catch (error) {
      this.logger.error(`Failed to read accounts set ${id}:`, error);
      throw new NotFoundException(`Failed to load accounts set ${id}`);
    }
  }

  async getClientAccountsSets(clientId: string): Promise<AccountsSet[]> {
    try {
      const indexData = await fs.readFile(this.indexPath, 'utf8');
      const index = JSON.parse(indexData) as Array<{ id: string; clientId: string; createdAt: string }>;

      const resolvedClient = await this.clientsService.findOne(clientId);
      const acceptableClientIds = new Set(
        [clientId, resolvedClient?.id, resolvedClient?.ref].filter(Boolean).map(String),
      );
      
      const clientAccountsSets = index
        .filter(item => item.clientId && acceptableClientIds.has(String(item.clientId)))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const accountsSets = await Promise.all(
        clientAccountsSets.map(item => this.getAccountsSet(item.id))
      );

      return accountsSets;
    } catch (error) {
      this.logger.error(`Failed to get client accounts sets for ${clientId}:`, error);
      return [];
    }
  }

  async updateSection(
    id: string,
    sectionKey: string,
    sectionData: any,
    userId: string,
  ): Promise<AccountsSet> {
    const accountsSet = await this.getAccountsSet(id);

    if (accountsSet.status === 'LOCKED') {
      throw new Error('Cannot update locked accounts set');
    }

    // Validate that calculated fields are not being manually edited
    const calculatedFieldErrors = this.calculationService.validateCalculatedFields(sectionKey, sectionData);
    if (calculatedFieldErrors.length > 0) {
      throw new Error(`Cannot edit calculated fields: ${calculatedFieldErrors.join(', ')}`);
    }

    // Validate section data
    const validationResult = await this.validationService.validateSection(
      sectionKey,
      sectionData,
      accountsSet,
    );

    if (validationResult.errors.length > 0) {
      throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }

    // Store previous section data for audit trail
    const previousData = accountsSet.sections[sectionKey];

    // Update the section
    accountsSet.sections[sectionKey] = sectionData;
    accountsSet.updatedAt = new Date().toISOString();
    accountsSet.lastEditedBy = userId;

    if (sectionKey === 'companyPeriod') {
      if (sectionData?.period) {
        accountsSet.period = {
          ...accountsSet.period,
          ...sectionData.period,
        };
      }
      if (sectionData?.framework) {
        accountsSet.framework = sectionData.framework;
      }
      if (sectionData?.framework === 'SOLE_TRADER' || sectionData?.framework === 'INDIVIDUAL') {
        accountsSet.companyNumber = '';
        if (sectionData?.company) {
          sectionData.company.companyNumber = '';
          sectionData.company.directors = [];
        }
      }

      const isFirstYear = sectionData?.period?.isFirstYear;
      if (isFirstYear === false) {
        const defaultProfitAndLossLines = this.getDefaultProfitAndLossLines();
        const defaultBalanceSheet = this.getDefaultBalanceSheetData();

        if (!accountsSet.sections.profitAndLoss) {
          accountsSet.sections.profitAndLoss = {
            lines: { ...defaultProfitAndLossLines },
            comparatives: { priorYearLines: { ...defaultProfitAndLossLines } },
          };
        } else if (!accountsSet.sections.profitAndLoss.comparatives) {
          accountsSet.sections.profitAndLoss.comparatives = {
            priorYearLines: { ...defaultProfitAndLossLines },
          };
        }

        if (!accountsSet.sections.balanceSheet) {
          accountsSet.sections.balanceSheet = {
            ...defaultBalanceSheet,
            comparatives: { prior: { ...defaultBalanceSheet } },
          };
        } else if (!accountsSet.sections.balanceSheet.comparatives) {
          accountsSet.sections.balanceSheet.comparatives = {
            prior: { ...defaultBalanceSheet },
          };
        }
      } else if (isFirstYear === true) {
        if (accountsSet.sections.profitAndLoss?.comparatives) {
          delete accountsSet.sections.profitAndLoss.comparatives;
        }
        if (accountsSet.sections.balanceSheet?.comparatives) {
          delete accountsSet.sections.balanceSheet.comparatives;
        }
      }
    }

    // Re-validate the entire accounts set
    const fullValidation = await this.validationService.validateAccountsSet(accountsSet);
    accountsSet.validation = fullValidation;

    // Update status based on validation and completion
    if (fullValidation.errors.length === 0 && this.isAccountsSetComplete(accountsSet)) {
      if (accountsSet.sections.directorsApproval?.approved) {
        accountsSet.status = 'READY';
      } else {
        accountsSet.status = 'IN_REVIEW';
      }
    }

    await this.saveAccountsSet(accountsSet);

    // Log audit event for section update
    await this.auditService.logDataChange(
      userId,
      'USER',
      'UPDATE_SECTION',
      'ACCOUNTS_SET',
      accountsSet.id,
      `${accountsSet.sections.companyPeriod?.company?.name || accountsSet.clientId} - ${sectionKey}`,
      previousData,
      sectionData,
      {
        sectionKey,
        validationErrors: fullValidation.errors.length,
        statusChange: accountsSet.status,
      }
    );

    this.logger.log(`Updated section ${sectionKey} for accounts set ${id} by user ${userId}`);
    
    // Return the updated accounts set with fresh calculations
    return this.getAccountsSet(id);
  }

  async validateAccountsSet(id: string): Promise<{
    errors: any[];
    warnings: any[];
    isBalanced: boolean;
    isValid: boolean;
  }> {
    const accountsSet = await this.getAccountsSet(id);
    const validation = await this.validationService.validateAccountsSet(accountsSet);
    
    // Update stored validation
    accountsSet.validation = validation;
    await this.saveAccountsSet(accountsSet);

    return {
      errors: validation.errors,
      warnings: validation.warnings,
      isBalanced: validation.isBalanced,
      isValid: validation.errors.length === 0,
    };
  }

  async getCalculations(id: string): Promise<{
    calculations: any;
    ratios: any;
    percentageChanges?: any;
    isBalanced: boolean;
    imbalance?: number;
  }> {
    const accountsSet = await this.getAccountsSet(id);
    
    const calculations = this.calculationService.calculateTotals(accountsSet);
    const ratios = this.calculationService.calculateFinancialRatios(accountsSet);
    const isBalanced = this.calculationService.isBalanceSheetBalanced(accountsSet.sections.balanceSheet);
    
    let percentageChanges = null;
    if (accountsSet.sections.profitAndLoss?.comparatives?.priorYearLines && 
        accountsSet.sections.profitAndLoss?.lines) {
      percentageChanges = this.calculationService.calculatePercentageChanges(
        accountsSet.sections.profitAndLoss.lines,
        accountsSet.sections.profitAndLoss.comparatives.priorYearLines
      );
    }

    const result: any = {
      calculations,
      ratios,
      isBalanced,
    };

    if (percentageChanges) {
      result.percentageChanges = percentageChanges;
    }

    if (!isBalanced) {
      result.imbalance = this.calculationService.getBalanceSheetImbalance(accountsSet.sections.balanceSheet);
    }

    return result;
  }

  async generateOutputs(id: string, userId: string): Promise<{ htmlUrl: string; pdfUrl: string }> {
    const accountsSet = await this.getAccountsSet(id);

    if (accountsSet.status !== 'READY') {
      throw new Error('Accounts set must be in READY status to generate outputs');
    }

    const outputs = await this.outputService.generateOutputs(accountsSet, userId);
    
    // Update accounts set with output URLs
    accountsSet.outputs = outputs;
    accountsSet.updatedAt = new Date().toISOString();
    accountsSet.lastEditedBy = userId;
    
    await this.saveAccountsSet(accountsSet);

    // Log audit event for output generation
    await this.auditService.logEvent({
      actor: userId,
      actorType: 'USER',
      action: 'GENERATE_OUTPUTS',
      entity: 'ACCOUNTS_SET',
      entityId: accountsSet.id,
      entityRef: `${accountsSet.sections.companyPeriod?.company?.name || accountsSet.clientId}`,
      metadata: {
        htmlUrl: outputs.htmlUrl,
        pdfUrl: outputs.pdfUrl,
        framework: accountsSet.framework,
      },
      severity: 'HIGH',
      category: 'DATA',
    });

    this.logger.log(`Generated outputs for accounts set ${id}`);
    return outputs;
  }

  async lockAccountsSet(id: string, userId: string): Promise<AccountsSet> {
    const accountsSet = await this.getAccountsSet(id);

    if (accountsSet.status !== 'READY') {
      throw new Error('Accounts set must be in READY status to lock');
    }

    if (!accountsSet.outputs.htmlUrl || !accountsSet.outputs.pdfUrl) {
      throw new Error('Outputs must be generated before locking');
    }

    accountsSet.status = 'LOCKED';
    accountsSet.updatedAt = new Date().toISOString();
    accountsSet.lastEditedBy = userId;

    await this.saveAccountsSet(accountsSet);

    // Log audit event for locking
    await this.auditService.logEvent({
      actor: userId,
      actorType: 'USER',
      action: 'LOCK_ACCOUNTS_SET',
      entity: 'ACCOUNTS_SET',
      entityId: accountsSet.id,
      entityRef: `${accountsSet.sections.companyPeriod?.company?.name || accountsSet.clientId}`,
      metadata: {
        previousStatus: 'READY',
        newStatus: 'LOCKED',
        hasOutputs: !!(accountsSet.outputs.htmlUrl && accountsSet.outputs.pdfUrl),
      },
      severity: 'HIGH',
      category: 'DATA',
    });

    this.logger.log(`Locked accounts set ${id}`);
    return accountsSet;
  }

  async unlockAccountsSet(id: string, userId: string): Promise<AccountsSet> {
    const accountsSet = await this.getAccountsSet(id);

    if (accountsSet.status !== 'LOCKED') {
      throw new Error('Accounts set must be locked to unlock');
    }

    // Set status back to READY since it was locked from READY status
    accountsSet.status = 'READY';
    accountsSet.updatedAt = new Date().toISOString();
    accountsSet.lastEditedBy = userId;

    await this.saveAccountsSet(accountsSet);

    // Log audit event for unlocking
    await this.auditService.logEvent({
      actor: userId,
      actorType: 'USER',
      action: 'UNLOCK_ACCOUNTS_SET',
      entity: 'ACCOUNTS_SET',
      entityId: accountsSet.id,
      entityRef: `${accountsSet.sections.companyPeriod?.company?.name || accountsSet.clientId}`,
      metadata: {
        previousStatus: 'LOCKED',
        newStatus: 'READY',
      },
      severity: 'HIGH',
      category: 'DATA',
    });

    this.logger.log(`Unlocked accounts set ${id}`);
    return accountsSet;
  }

  async deleteAccountsSet(id: string, userId: string): Promise<void> {
    const accountsSet = await this.getAccountsSet(id);

    if (accountsSet.status === 'LOCKED') {
      throw new Error('Cannot delete locked accounts set');
    }

    // Delete the file
    const filePath = path.join(this.accountsSetsPath, `accounts_set_${id}.json`);
    await fs.unlink(filePath);

    const historyPath = path.join(this.accountsSetsHistoryPath, `accounts_set_${id}`);
    if (existsSync(historyPath)) {
      await fs.rm(historyPath, { recursive: true, force: true });
    }

    // Remove from index
    await this.removeFromIndex(id);

    // Clean up any output files
    if (accountsSet.outputs.htmlUrl || accountsSet.outputs.pdfUrl) {
      await this.outputService.cleanupOutputs(accountsSet);
    }

    // Log audit event for deletion
    await this.auditService.logEvent({
      actor: userId,
      actorType: 'USER',
      action: 'DELETE_ACCOUNTS_SET',
      entity: 'ACCOUNTS_SET',
      entityId: accountsSet.id,
      entityRef: `${accountsSet.sections.companyPeriod?.company?.name || accountsSet.clientId}`,
      metadata: {
        status: accountsSet.status,
        framework: accountsSet.framework,
        hadOutputs: !!(accountsSet.outputs.htmlUrl || accountsSet.outputs.pdfUrl),
      },
      severity: 'HIGH',
      category: 'DATA',
    });

    this.logger.log(`Deleted accounts set ${id}`);
  }

  private async isFirstYearForClient(clientId: string): Promise<boolean> {
    try {
      const clientAccountsSets = await this.getClientAccountsSets(clientId);
      return clientAccountsSets.length === 0;
    } catch (error) {
      // If we can't determine, assume it's the first year
      return true;
    }
  }

  private async saveAccountsSet(accountsSet: AccountsSet): Promise<void> {
    const filePath = path.join(this.accountsSetsPath, `accounts_set_${accountsSet.id}.json`);
    if (existsSync(filePath)) {
      await this.writeAccountsSetHistory(accountsSet.id, filePath);
    }
    await fs.writeFile(filePath, JSON.stringify(accountsSet, null, 2));
  }

  private async writeAccountsSetHistory(accountsSetId: string, filePath: string): Promise<void> {
    try {
      const historyDir = path.join(this.accountsSetsHistoryPath, `accounts_set_${accountsSetId}`);
      if (!existsSync(historyDir)) {
        await fs.mkdir(historyDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const historyFile = path.join(historyDir, `accounts_set_${accountsSetId}_${timestamp}.json`);
      await fs.copyFile(filePath, historyFile);
      await this.pruneAccountsSetHistory(historyDir, 10);
    } catch (error) {
      this.logger.warn(`Failed to write accounts set history for ${accountsSetId}:`, error);
    }
  }

  private async pruneAccountsSetHistory(historyDir: string, keep: number): Promise<void> {
    try {
      const entries = await fs.readdir(historyDir);
      const snapshots = entries
        .filter((entry) => entry.endsWith('.json'))
        .sort();
      if (snapshots.length <= keep) {
        return;
      }
      const toRemove = snapshots.slice(0, snapshots.length - keep);
      await Promise.all(
        toRemove.map((entry) => fs.unlink(path.join(historyDir, entry)))
      );
    } catch (error) {
      this.logger.warn(`Failed to prune accounts set history in ${historyDir}:`, error);
    }
  }

  private async updateIndex(accountsSet: AccountsSet): Promise<void> {
    try {
      const indexData = await fs.readFile(this.indexPath, 'utf8');
      const index = JSON.parse(indexData) as Array<{ id: string; clientId: string; createdAt: string }>;
      
      // Remove existing entry if it exists
      const filteredIndex = index.filter(item => item.id !== accountsSet.id);
      
      // Add new entry
      filteredIndex.push({
        id: accountsSet.id,
        clientId: accountsSet.clientId,
        createdAt: accountsSet.createdAt,
      });

      await fs.writeFile(this.indexPath, JSON.stringify(filteredIndex, null, 2));
    } catch (error) {
      this.logger.error('Failed to update index:', error);
    }
  }

  private async removeFromIndex(id: string): Promise<void> {
    try {
      const indexData = await fs.readFile(this.indexPath, 'utf8');
      const index = JSON.parse(indexData) as Array<{ id: string; clientId: string; createdAt: string }>;
      
      const filteredIndex = index.filter(item => item.id !== id);
      await fs.writeFile(this.indexPath, JSON.stringify(filteredIndex, null, 2));
    } catch (error) {
      this.logger.error('Failed to remove from index:', error);
    }
  }

  private mapAddressFromCompaniesHouse(chAddress: any): any {
    if (!chAddress) return null;

    return {
      line1: chAddress.address_line_1 || '',
      line2: chAddress.address_line_2 || '',
      town: chAddress.locality || '',
      county: chAddress.region || '',
      postcode: chAddress.postal_code || '',
      country: chAddress.country || 'England',
    };
  }

  private mapAddressFromClient(client: any): any {
    if (!client.registeredAddress && !client.address) return {
      line1: '',
      line2: '',
      town: '',
      county: '',
      postcode: '',
      country: 'England',
    };

    const address = client.registeredAddress || client.address;
    return {
      line1: address.line1 || '',
      line2: address.line2 || '',
      town: address.city || address.town || '',
      county: address.county || '',
      postcode: address.postcode || '',
      country: address.country || 'England',
    };
  }

  private mapDirectorsFromCompaniesHouse(officers: any[]): any[] {
    if (!officers || officers.length === 0) return [{ name: '' }];

    return officers
      .filter(officer => officer.officer_role && officer.officer_role.toLowerCase().includes('director'))
      .map(officer => ({
        name: officer.name || '',
      }));
  }

  private isAccountsSetComplete(accountsSet: AccountsSet): boolean {
    const requiredSections = [
      'companyPeriod',
      'frameworkDisclosures',
      'accountingPolicies',
      'profitAndLoss',
      'balanceSheet',
      'notes',
      'directorsApproval',
    ];

    return requiredSections.every(section => accountsSet.sections[section]);
  }

  private getDefaultProfitAndLossLines() {
    return {
      turnover: 0,
      costOfSales: 0,
      otherIncome: 0,
      adminExpenses: 0,
      wages: 0,
      rent: 0,
      motor: 0,
      professionalFees: 0,
      otherExpenses: 0,
      interestPayable: 0,
      taxCharge: 0,
      dividendsDeclared: 0,
    };
  }

  private getDefaultBalanceSheetData() {
    return {
      assets: {
        fixedAssets: {
          tangibleFixedAssets: 0,
          intangibleAssets: 0,
          investments: 0,
        },
        currentAssets: {
          stock: 0,
          debtors: 0,
          cash: 0,
          prepayments: 0,
        },
      },
      liabilities: {
        creditorsWithinOneYear: {
          tradeCreditors: 0,
          taxes: 0,
          accrualsDeferredIncome: 0,
          directorsLoan: 0,
          otherCreditors: 0,
        },
        creditorsAfterOneYear: {
          loans: 0,
          other: 0,
        },
      },
      equity: {
        shareCapital: 1,
        retainedEarnings: 0,
        otherReserves: 0,
      },
    };
  }
}

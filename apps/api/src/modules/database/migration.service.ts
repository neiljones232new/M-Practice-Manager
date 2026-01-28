import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { Client, TaxCalculationResult, OperationResult } from './interfaces/database.interface';

export interface MigrationStats {
  clientsMigrated: number;
  calculationsMigrated: number;
  reportsMigrated: number;
  filesProcessed: number;
  filesSkipped: number;
  errors: string[];
}

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);
  private readonly storagePath: string;
  private readonly backupPath: string;

  constructor(
    private configService: ConfigService,
    private databaseService: DatabaseService,
    private fileStorageService: FileStorageService
  ) {
    this.storagePath = this.configService.get<string>('STORAGE_PATH') || './mdj-data';
    this.backupPath = path.join(this.storagePath, 'migration-backup');
  }

  async migrateAllData(): Promise<MigrationStats> {
    const stats: MigrationStats = {
      clientsMigrated: 0,
      calculationsMigrated: 0,
      reportsMigrated: 0,
      filesProcessed: 0,
      filesSkipped: 0,
      errors: []
    };

    this.logger.log('Starting data migration from JSON to SQLite...');

    try {
      // Create backup before migration
      await this.createMigrationBackup();

      // Test database connection
      const connectionTest = await this.databaseService.testConnection();
      if (!connectionTest.success) {
        throw new Error(`Database connection failed: ${connectionTest.message}`);
      }

      // Migrate clients from all portfolios
      await this.migrateClients(stats);

      // Migrate tax calculations
      await this.migrateTaxCalculations(stats);

      // Migrate generated reports (if any exist)
      await this.migrateReports(stats);

      this.logger.log('Data migration completed successfully', stats);
      return stats;

    } catch (error) {
      this.logger.error('Data migration failed:', error);
      stats.errors.push(`Migration failed: ${error.message}`);
      throw error;
    }
  }

  private async createMigrationBackup(): Promise<void> {
    this.logger.log('Creating migration backup...');
    
    try {
      // Ensure backup directory exists
      if (!existsSync(this.backupPath)) {
        await fs.mkdir(this.backupPath, { recursive: true });
      }

      // Create snapshot using file storage service
      const snapshotPath = await this.fileStorageService.createSnapshot();
      this.logger.log(`Migration backup created at: ${snapshotPath}`);
    } catch (error) {
      this.logger.error('Failed to create migration backup:', error);
      throw error;
    }
  }

  private async migrateClients(stats: MigrationStats): Promise<void> {
    this.logger.log('Migrating clients...');

    try {
      // Get all client files from all portfolios
      const clientPortfolios = await this.fileStorageService.listAllClientFiles();
      
      for (const portfolio of clientPortfolios) {
        this.logger.log(`Migrating portfolio ${portfolio.portfolioCode} with ${portfolio.files.length} clients`);
        
        // Process clients in batches to avoid overwhelming the database
        const batchSize = 10;
        for (let i = 0; i < portfolio.files.length; i += batchSize) {
          const batch = portfolio.files.slice(i, i + batchSize);
          
          // Begin transaction for this batch
          await this.databaseService.beginTransaction();
          
          try {
            for (const clientId of batch) {
              try {
                stats.filesProcessed++;
                
                // Read client data from JSON
                const clientData = await this.fileStorageService.readJson<any>('clients', clientId, portfolio.portfolioCode);
                
                if (!clientData) {
                  stats.filesSkipped++;
                  continue;
                }

                // Transform and validate client data
                const transformedClient = this.transformClientData(clientData);
                
                // Check if client already exists in database
                const existing = await this.databaseService.getClientByNumber(transformedClient.companyNumber);
                if (existing) {
                  this.logger.debug(`Client ${transformedClient.companyNumber} already exists, skipping`);
                  stats.filesSkipped++;
                  continue;
                }

                // Add client to database
                const result = await this.databaseService.addClient(transformedClient);
                
                if (result.success) {
                  stats.clientsMigrated++;
                  this.logger.debug(`Migrated client: ${transformedClient.companyNumber}`);
                } else {
                  stats.errors.push(`Failed to migrate client ${transformedClient.companyNumber}: ${result.message}`);
                }

              } catch (error) {
                stats.errors.push(`Error migrating client ${clientId}: ${error.message}`);
                this.logger.warn(`Failed to migrate client ${clientId}:`, error);
              }
            }
            
            // Commit the batch transaction
            await this.databaseService.commitTransaction();
            this.logger.debug(`Committed batch of ${batch.length} clients`);
            
          } catch (error) {
            // Rollback the batch transaction on error
            await this.databaseService.rollbackTransaction();
            this.logger.error(`Failed to migrate client batch, rolled back:`, error);
            throw error;
          }
        }
      }

      this.logger.log(`Client migration completed: ${stats.clientsMigrated} clients migrated`);
    } catch (error) {
      this.logger.error('Client migration failed:', error);
      throw error;
    }
  }

  private async migrateTaxCalculations(stats: MigrationStats): Promise<void> {
    this.logger.log('Migrating tax calculations...');

    try {
      // Get all tax calculation files
      const calculationFiles = await this.fileStorageService.listFiles('tax-calculations');
      
      // Process calculations in batches
      const batchSize = 5;
      for (let i = 0; i < calculationFiles.length; i += batchSize) {
        const batch = calculationFiles.slice(i, i + batchSize);
        
        for (const calculationId of batch) {
          try {
            stats.filesProcessed++;
            
            // Read calculation data from JSON
            const calculationData = await this.fileStorageService.readJson<any>('tax-calculations', calculationId);
            
            if (!calculationData) {
              stats.filesSkipped++;
              continue;
            }

            // Transform calculation data
            const transformedCalculation = this.transformCalculationData(calculationData);
            
            // Verify that the referenced client exists in the database
            const clientExists = await this.databaseService.getClientByNumber(transformedCalculation.clientId);
            if (!clientExists) {
              this.logger.warn(`Skipping calculation ${calculationId}: referenced client ${transformedCalculation.clientId} not found in database`);
              stats.filesSkipped++;
              continue;
            }
            
            // Check if calculation already exists
            const existingCalcs = await this.databaseService.getClientCalculations(transformedCalculation.clientId, 1000);
            const exists = existingCalcs.some(calc => calc.id === transformedCalculation.id);
            if (exists) {
              this.logger.debug(`Calculation ${calculationId} already exists, skipping`);
              stats.filesSkipped++;
              continue;
            }
            
            // Store calculation in database
            const result = await this.databaseService.storeCalculation(transformedCalculation);
            
            if (result.success) {
              stats.calculationsMigrated++;
              this.logger.debug(`Migrated calculation: ${calculationId}`);
            } else {
              stats.errors.push(`Failed to migrate calculation ${calculationId}: ${result.message}`);
            }

          } catch (error) {
            stats.errors.push(`Error migrating calculation ${calculationId}: ${error.message}`);
            this.logger.warn(`Failed to migrate calculation ${calculationId}:`, error);
          }
        }
      }

      this.logger.log(`Tax calculation migration completed: ${stats.calculationsMigrated} calculations migrated`);
    } catch (error) {
      this.logger.error('Tax calculation migration failed:', error);
      throw error;
    }
  }

  private async migrateReports(stats: MigrationStats): Promise<void> {
    this.logger.log('Migrating generated reports...');

    try {
      // Check if reports directory exists
      const reportsPath = path.join(this.storagePath, 'reports');
      if (!existsSync(reportsPath)) {
        this.logger.log('No reports directory found, skipping report migration');
        return;
      }

      // This would be implemented if there are existing reports to migrate
      // For now, we'll just log that reports migration is ready
      this.logger.log('Report migration structure ready for future reports');
      
    } catch (error) {
      this.logger.error('Report migration failed:', error);
      throw error;
    }
  }

  private transformClientData(jsonData: any): Partial<Client> {
    // Transform JSON client data to match database schema
    const client: Partial<Client> = {
      companyNumber: jsonData.companyNumber || jsonData.company_number || jsonData.id,
      companyName: jsonData.companyName || jsonData.company_name || jsonData.name,
      tradingName: jsonData.tradingName || jsonData.trading_name,
      status: jsonData.status || 'active',
      companyType: jsonData.companyType || jsonData.company_type,
      incorporationDate: jsonData.incorporationDate || jsonData.incorporation_date,
      registeredAddress: jsonData.registeredAddress || jsonData.registered_address,
      
      // Practice fields
      corporationTaxUtr: jsonData.corporationTaxUtr || jsonData.corporation_tax_utr,
      vatNumber: jsonData.vatNumber || jsonData.vat_number,
      vatRegistrationDate: jsonData.vatRegistrationDate || jsonData.vat_registration_date,
      vatScheme: jsonData.vatScheme || jsonData.vat_scheme,
      vatStagger: jsonData.vatStagger || jsonData.vat_stagger,
      payeReference: jsonData.payeReference || jsonData.paye_reference,
      payeAccountsOfficeReference: jsonData.payeAccountsOfficeReference || jsonData.paye_accounts_office_reference,
      authenticationCode: jsonData.authenticationCode || jsonData.authentication_code,
      accountsOfficeReference: jsonData.accountsOfficeReference || jsonData.accounts_office_reference,
      employeeCount: jsonData.employeeCount || jsonData.employee_count,
      payrollFrequency: jsonData.payrollFrequency || jsonData.payroll_frequency,
      payrollPayDay: jsonData.payrollPayDay || jsonData.payroll_pay_day,
      payrollPeriodEndDay: jsonData.payrollPeriodEndDay || jsonData.payroll_period_end_day,
      cisRegistered: jsonData.cisRegistered || jsonData.cis_registered,
      cisUtr: jsonData.cisUtr || jsonData.cis_utr,
      mainContactName: jsonData.mainContactName || jsonData.main_contact_name,
      contactPosition: jsonData.contactPosition || jsonData.contact_position,
      telephone: jsonData.telephone,
      mobile: jsonData.mobile,
      email: jsonData.email,
      preferredContactMethod: jsonData.preferredContactMethod || jsonData.preferred_contact_method,
      correspondenceAddress: jsonData.correspondenceAddress || jsonData.correspondence_address,
      clientManager: jsonData.clientManager || jsonData.client_manager,
      partnerResponsible: jsonData.partnerResponsible || jsonData.partner_responsible,
      engagementType: jsonData.engagementType || jsonData.engagement_type,
      onboardingDate: jsonData.onboardingDate || jsonData.onboarding_date,
      disengagementDate: jsonData.disengagementDate || jsonData.disengagement_date,
      engagementLetterSigned: jsonData.engagementLetterSigned || jsonData.engagement_letter_signed,
      amlCompleted: jsonData.amlCompleted || jsonData.aml_completed,
      lifecycleStatus: jsonData.lifecycleStatus || jsonData.lifecycle_status || 'ACTIVE',
      onboardingStartedAt: jsonData.onboardingStartedAt || jsonData.onboarding_started_at,
      wentLiveAt: jsonData.wentLiveAt || jsonData.went_live_at,
      ceasedAt: jsonData.ceasedAt || jsonData.ceased_at,
      dormantSince: jsonData.dormantSince || jsonData.dormant_since,
      feeArrangement: jsonData.feeArrangement || jsonData.fee_arrangement,
      monthlyFee: jsonData.monthlyFee || jsonData.monthly_fee,
      annualFee: jsonData.annualFee || jsonData.annual_fee,
      accountingPeriodEnd: jsonData.accountingPeriodEnd || jsonData.accounting_period_end,
      nextAccountsDueDate: jsonData.nextAccountsDueDate || jsonData.next_accounts_due_date,
      nextCorporationTaxDueDate: jsonData.nextCorporationTaxDueDate || jsonData.next_corporation_tax_due_date,
      statutoryYearEnd: jsonData.statutoryYearEnd || jsonData.statutory_year_end,
      vatReturnFrequency: jsonData.vatReturnFrequency || jsonData.vat_return_frequency,
      vatQuarter: jsonData.vatQuarter || jsonData.vat_quarter,
      vatPeriodStart: jsonData.vatPeriodStart || jsonData.vat_period_start,
      vatPeriodEnd: jsonData.vatPeriodEnd || jsonData.vat_period_end,
      payrollRtiRequired: jsonData.payrollRtiRequired || jsonData.payroll_rti_required,
      businessBankName: jsonData.businessBankName || jsonData.business_bank_name,
      accountLastFour: jsonData.accountLastFour || jsonData.account_last_four,
      directDebitInPlace: jsonData.directDebitInPlace || jsonData.direct_debit_in_place,
      paymentIssues: jsonData.paymentIssues || jsonData.payment_issues,
      notes: jsonData.notes,
      specialCircumstances: jsonData.specialCircumstances || jsonData.special_circumstances,
      seasonalBusiness: jsonData.seasonalBusiness || jsonData.seasonal_business,
      dormant: jsonData.dormant,
      clientRiskRating: jsonData.clientRiskRating || jsonData.client_risk_rating,
      doNotContact: jsonData.doNotContact || jsonData.do_not_contact,
      
      // Personal client fields
      personalUtr: jsonData.personalUtr || jsonData.personal_utr,
      nationalInsuranceNumber: jsonData.nationalInsuranceNumber || jsonData.national_insurance_number,
      dateOfBirth: jsonData.dateOfBirth || jsonData.date_of_birth,
      personalAddress: jsonData.personalAddress || jsonData.personal_address,
      personalTaxYear: jsonData.personalTaxYear || jsonData.personal_tax_year,
      selfAssessmentTaxYear: jsonData.selfAssessmentTaxYear || jsonData.self_assessment_tax_year,
      selfAssessmentRequired: jsonData.selfAssessmentRequired || jsonData.self_assessment_required,
      selfAssessmentFiled: jsonData.selfAssessmentFiled || jsonData.self_assessment_filed,
      linkedCompanyNumber: jsonData.linkedCompanyNumber || jsonData.linked_company_number,
      directorRole: jsonData.directorRole || jsonData.director_role,
      clientType: jsonData.clientType || jsonData.client_type || 'company',
      
      // Companies House fields
      companyStatusDetail: jsonData.companyStatusDetail || jsonData.company_status_detail,
      jurisdiction: jsonData.jurisdiction,
      registeredOfficeFull: jsonData.registeredOfficeFull || jsonData.registered_office_full,
      sicCodes: jsonData.sicCodes || jsonData.sic_codes,
      sicDescriptions: jsonData.sicDescriptions || jsonData.sic_descriptions,
      accountsOverdue: jsonData.accountsOverdue || jsonData.accounts_overdue,
      confirmationStatementOverdue: jsonData.confirmationStatementOverdue || jsonData.confirmation_statement_overdue,
      nextAccountsMadeUpTo: jsonData.nextAccountsMadeUpTo || jsonData.next_accounts_made_up_to,
      nextAccountsDueBy: jsonData.nextAccountsDueBy || jsonData.next_accounts_due_by,
      lastAccountsMadeUpTo: jsonData.lastAccountsMadeUpTo || jsonData.last_accounts_made_up_to,
      nextConfirmationStatementDate: jsonData.nextConfirmationStatementDate || jsonData.next_confirmation_statement_date,
      confirmationStatementDueBy: jsonData.confirmationStatementDueBy || jsonData.confirmation_statement_due_by,
      lastConfirmationStatementDate: jsonData.lastConfirmationStatementDate || jsonData.last_confirmation_statement_date,
      directorCount: jsonData.directorCount || jsonData.director_count,
      pscCount: jsonData.pscCount || jsonData.psc_count,
      currentDirectors: jsonData.currentDirectors || jsonData.current_directors,
      currentPscs: jsonData.currentPscs || jsonData.current_pscs,
      lastChRefresh: jsonData.lastChRefresh || jsonData.last_ch_refresh,
      
      // Metadata
      createdAt: jsonData.createdAt ? new Date(jsonData.createdAt) : new Date(),
      updatedAt: jsonData.updatedAt ? new Date(jsonData.updatedAt) : new Date()
    };

    // Ensure required fields have values
    if (!client.companyNumber) {
      throw new Error('Client missing required company number');
    }
    if (!client.companyName) {
      throw new Error('Client missing required company name');
    }

    return client;
  }

  private transformCalculationData(jsonData: any): TaxCalculationResult {
    // Transform JSON calculation data to match database schema
    return {
      id: jsonData.id || this.generateId(),
      clientId: jsonData.clientId || jsonData.client_id,
      companyId: jsonData.companyId || jsonData.company_id,
      calculationType: jsonData.calculationType || jsonData.calculation_type || 'SALARY_OPTIMIZATION',
      taxYear: jsonData.taxYear || jsonData.tax_year || '2024-25',
      parameters: jsonData.parameters || {},
      optimizedSalary: jsonData.optimizedSalary || jsonData.optimized_salary || 0,
      optimizedDividend: jsonData.optimizedDividend || jsonData.optimized_dividend || 0,
      totalTakeHome: jsonData.totalTakeHome || jsonData.total_take_home || 0,
      totalTaxLiability: jsonData.totalTaxLiability || jsonData.total_tax_liability || 0,
      estimatedSavings: jsonData.estimatedSavings || jsonData.estimated_savings || 0,
      recommendations: jsonData.recommendations || [],
      calculatedAt: jsonData.calculatedAt ? new Date(jsonData.calculatedAt) : new Date(),
      calculatedBy: jsonData.calculatedBy || jsonData.calculated_by || 'system',
      notes: jsonData.notes
    };
  }

  private generateId(): string {
    return `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async auditJsonFiles(): Promise<{
    connectedFiles: string[];
    disconnectedFiles: string[];
    totalFiles: number;
  }> {
    this.logger.log('Auditing JSON files for migration...');
    
    const connectedFiles: string[] = [];
    const disconnectedFiles: string[] = [];
    
    try {
      // Check each storage category
      const categories = [
        'clients', 'people', 'client-parties', 'services', 'tasks',
        'service-templates', 'task-templates', 'calendar', 'documents',
        'compliance', 'events', 'config', 'templates', 'tax-calculations'
      ];

      for (const category of categories) {
        const categoryPath = path.join(this.storagePath, category);
        if (existsSync(categoryPath)) {
          const files = await this.getJsonFilesInDirectory(categoryPath);
          
          for (const file of files) {
            // Check if file is actively used by trying to read it
            try {
              const data = await this.fileStorageService.readJson(category, path.basename(file, '.json'));
              if (data) {
                connectedFiles.push(file);
              } else {
                disconnectedFiles.push(file);
              }
            } catch (error) {
              disconnectedFiles.push(file);
            }
          }
        }
      }

      const totalFiles = connectedFiles.length + disconnectedFiles.length;
      
      this.logger.log(`File audit completed: ${connectedFiles.length} connected, ${disconnectedFiles.length} disconnected, ${totalFiles} total`);
      
      return {
        connectedFiles,
        disconnectedFiles,
        totalFiles
      };

    } catch (error) {
      this.logger.error('File audit failed:', error);
      throw error;
    }
  }

  private async getJsonFilesInDirectory(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively check subdirectories
          const subFiles = await this.getJsonFilesInDirectory(fullPath);
          files.push(...subFiles);
        } else if (entry.name.endsWith('.json') && !entry.name.includes('index.json')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to read directory ${dirPath}:`, error);
    }
    
    return files;
  }

  async cleanupDisconnectedFiles(dryRun: boolean = true): Promise<{
    filesRemoved: string[];
    filesBackedUp: string[];
    errors: string[];
  }> {
    const result = {
      filesRemoved: [],
      filesBackedUp: [],
      errors: []
    };

    try {
      const audit = await this.auditJsonFiles();
      
      if (audit.disconnectedFiles.length === 0) {
        this.logger.log('No disconnected files found to clean up');
        return result;
      }

      this.logger.log(`Found ${audit.disconnectedFiles.length} disconnected files to clean up`);

      if (dryRun) {
        this.logger.log('DRY RUN: Would remove the following files:', audit.disconnectedFiles);
        return result;
      }

      // Create cleanup backup directory
      const cleanupBackupPath = path.join(this.backupPath, `cleanup_${Date.now()}`);
      await fs.mkdir(cleanupBackupPath, { recursive: true });

      for (const filePath of audit.disconnectedFiles) {
        try {
          // Create backup
          const relativePath = path.relative(this.storagePath, filePath);
          const backupFilePath = path.join(cleanupBackupPath, relativePath);
          const backupDir = path.dirname(backupFilePath);
          
          await fs.mkdir(backupDir, { recursive: true });
          await fs.copyFile(filePath, backupFilePath);
          result.filesBackedUp.push(backupFilePath);

          // Remove original file
          await fs.unlink(filePath);
          result.filesRemoved.push(filePath);

        } catch (error) {
          result.errors.push(`Failed to clean up ${filePath}: ${error.message}`);
        }
      }

      this.logger.log(`Cleanup completed: ${result.filesRemoved.length} files removed, ${result.filesBackedUp.length} files backed up`);
      
    } catch (error) {
      this.logger.error('Cleanup failed:', error);
      result.errors.push(`Cleanup failed: ${error.message}`);
    }

    return result;
  }

  async verifyMigration(): Promise<OperationResult> {
    try {
      this.logger.log('Verifying migration integrity...');

      // Test database connection
      const connectionTest = await this.databaseService.testConnection();
      if (!connectionTest.success) {
        return { success: false, message: `Database connection failed: ${connectionTest.message}` };
      }

      // Count records in database
      const clientsResult = await this.databaseService.executeQuery('SELECT COUNT(*) as count FROM clients');
      const calculationsResult = await this.databaseService.executeQuery('SELECT COUNT(*) as count FROM tax_calculations');

      const clientsCount = clientsResult.data?.[0]?.count || 0;
      const calculationsCount = calculationsResult.data?.[0]?.count || 0;

      // Count original JSON files
      const clientPortfolios = await this.fileStorageService.listAllClientFiles();
      const originalClientsCount = clientPortfolios.reduce((sum, portfolio) => sum + portfolio.files.length, 0);
      
      const calculationFiles = await this.fileStorageService.listFiles('tax-calculations');
      const originalCalculationsCount = calculationFiles.length;

      // Verify counts match
      const clientsMatch = clientsCount >= originalClientsCount;
      const calculationsMatch = calculationsCount >= originalCalculationsCount;

      if (clientsMatch && calculationsMatch) {
        return {
          success: true,
          message: `Migration verified: ${clientsCount} clients, ${calculationsCount} calculations migrated successfully`
        };
      } else {
        return {
          success: false,
          message: `Migration verification failed: Expected ${originalClientsCount} clients (got ${clientsCount}), ${originalCalculationsCount} calculations (got ${calculationsCount})`
        };
      }

    } catch (error) {
      this.logger.error('Migration verification failed:', error);
      return { success: false, message: `Migration verification failed: ${error.message}` };
    }
  }
}

import { Injectable, Logger, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { FileStorageService } from '../file-storage/file-storage.service';
import { IntegrationConfigService } from '../integrations/services/integration-config.service';
import { ClientsService } from '../clients/clients.service';
import { PersonService } from '../clients/services/person.service';
import { ClientPartyService } from '../clients/services/client-party.service';
import { ComplianceService } from '../filings/compliance.service';
import { ServicesService } from '../services/services.service';
import {
  CompanySearchResult,
  CompanyDetails,
  CompanyOfficer,
  PersonWithSignificantControl,
  FilingHistory,
  PSCList,
  ChargesList,
  CompaniesHouseSearchParams,
  CompaniesHouseImportData,
  ComplianceItem,
  CreateComplianceItemDto,
} from './interfaces/companies-house.interface';
import { Client, CreateClientDto, Person, CreatePersonDto, CreateClientPartyDto, Address } from '../clients/interfaces/client.interface';

@Injectable()
export class CompaniesHouseService {
  private readonly logger = new Logger(CompaniesHouseService.name);
  private readonly baseUrl = 'https://api.company-information.service.gov.uk';
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly fileStorageService: FileStorageService,
    private readonly integrationConfigService: IntegrationConfigService,
    private readonly clientsService: ClientsService,
    private readonly personService: PersonService,
    private readonly clientPartyService: ClientPartyService,
    private readonly complianceService: ComplianceService,
    @Inject(forwardRef(() => ServicesService))
    private readonly servicesService: ServicesService,
  ) {
    // Try to get API key from environment first, then from integration config
    this.apiKey = this.configService.get<string>('COMPANIES_HOUSE_API_KEY');
  }

  private async getAuthHeaders() {
    let apiKey = this.apiKey;
    
    // If no environment API key, try to get from integration config
    if (!apiKey) {
      try {
        apiKey = await this.integrationConfigService.getDecryptedApiKey('COMPANIES_HOUSE');
      } catch (error) {
        this.logger.warn('Could not load integration config', error);
      }
    }
    
    if (!apiKey) {
      throw new BadRequestException('Companies House API key not configured. Please add it in Settings > Integrations.');
    }
    
    return {
      Authorization: `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    };
  }

  async searchCompanies(params: CompaniesHouseSearchParams): Promise<CompanySearchResult[]> {
    try {
      this.logger.log(`Searching companies with query: ${params.q}`);
      
      const url = `${this.baseUrl}/search/companies`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: await this.getAuthHeaders(),
          params: {
            q: params.q,
            items_per_page: params.items_per_page || 20,
            start_index: params.start_index || 0,
          },
        })
      );

      return response.data.items || [];
    } catch (error) {
      this.logger.error(`Error searching companies: ${error.message}`, error.stack);
      if (error.response?.status === 401) {
        throw new BadRequestException('Invalid Companies House API key');
      }
      throw new BadRequestException(`Failed to search companies: ${error.message}`);
    }
  }

  async getCompanyDetails(companyNumber: string): Promise<CompanyDetails> {
    try {
      this.logger.log(`Fetching company details for: ${companyNumber}`);
      
      const url = `${this.baseUrl}/company/${companyNumber}`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: await this.getAuthHeaders(),
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching company details: ${error.message}`, error.stack);
      if (error.response?.status === 404) {
        throw new NotFoundException(`Company ${companyNumber} not found`);
      }
      throw new BadRequestException(`Failed to fetch company details: ${error.message}`);
    }
  }

  async getCompanyOfficers(companyNumber: string): Promise<CompanyOfficer[]> {
    try {
      this.logger.log(`Fetching officers for company: ${companyNumber}`);
      
      const url = `${this.baseUrl}/company/${companyNumber}/officers`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: await this.getAuthHeaders(),
        })
      );

      return response.data.items || [];
    } catch (error) {
      this.logger.error(`Error fetching company officers: ${error.message}`, error.stack);
      if (error.response?.status === 404) {
        throw new NotFoundException(`Officers for company ${companyNumber} not found`);
      }
      throw new BadRequestException(`Failed to fetch company officers: ${error.message}`);
    }
  }



  async getFilingHistory(companyNumber: string): Promise<FilingHistory> {
    try {
      this.logger.log(`Fetching filing history for company: ${companyNumber}`);
      
      const url = `${this.baseUrl}/company/${companyNumber}/filing-history`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: await this.getAuthHeaders(),
          params: {
            items_per_page: 20,
          },
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching filing history: ${error.message}`, error.stack);
      if (error.response?.status === 404) {
        throw new NotFoundException(`Filing history for company ${companyNumber} not found`);
      }
      throw new BadRequestException(`Failed to fetch filing history: ${error.message}`);
    }
  }

  async getPersonsWithSignificantControl(companyNumber: string): Promise<PSCList> {
    try {
      this.logger.log(`Fetching PSCs for company: ${companyNumber}`);
      
      const url = `${this.baseUrl}/company/${companyNumber}/persons-with-significant-control`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: await this.getAuthHeaders(),
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching PSCs: ${error.message}`, error.stack);
      if (error.response?.status === 404) {
        throw new NotFoundException(`PSCs for company ${companyNumber} not found`);
      }
      throw new BadRequestException(`Failed to fetch PSCs: ${error.message}`);
    }
  }

  async getCharges(companyNumber: string): Promise<ChargesList> {
    try {
      this.logger.log(`Fetching charges for company: ${companyNumber}`);
      
      const url = `${this.baseUrl}/company/${companyNumber}/charges`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: await this.getAuthHeaders(),
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching charges: ${error.message}`, error.stack);
      if (error.response?.status === 404) {
        throw new NotFoundException(`Charges for company ${companyNumber} not found`);
      }
      throw new BadRequestException(`Failed to fetch charges: ${error.message}`);
    }
  }

  async importCompany(importData: CompaniesHouseImportData): Promise<Client> {
    try {
      this.logger.log(`Importing company: ${importData.companyNumber}`);

      // Get company details from Companies House
      const companyDetails = await this.getCompanyDetails(importData.companyNumber);
      
      // Try to locate an existing client by registered number across portfolios
      const existing = (await this.fileStorageService.searchFiles<Client>('clients', (c) => {
        return (c as any)?.registeredNumber === companyDetails.company_number;
      }))[0] || null;

      let client: Client;
      if (existing) {
        // Update existing client with any newer CH details
        client = await this.clientsService.update(existing.id, {
          name: companyDetails.company_name,
          status: companyDetails.company_status === 'active' ? 'ACTIVE' : 'INACTIVE',
          registeredNumber: companyDetails.company_number,
          address: this.mapCompaniesHouseAddress(companyDetails.registered_office_address),
          incorporationDate: companyDetails.date_of_creation ? new Date(companyDetails.date_of_creation) : undefined,
          accountsLastMadeUpTo: companyDetails.accounts?.last_accounts?.made_up_to
            ? new Date(companyDetails.accounts.last_accounts.made_up_to)
            : undefined,
          accountsNextDue: companyDetails.accounts?.next_due ? new Date(companyDetails.accounts.next_due) : undefined,
          confirmationLastMadeUpTo: companyDetails.confirmation_statement?.last_made_up_to
            ? new Date(companyDetails.confirmation_statement.last_made_up_to)
            : undefined,
          confirmationNextDue: companyDetails.confirmation_statement?.next_due
            ? new Date(companyDetails.confirmation_statement.next_due)
            : undefined,
        });
      } else {
        // Create client from company data
        const createClientDto: CreateClientDto = {
          name: companyDetails.company_name,
          type: this.mapCompanyTypeToClientType(companyDetails.type),
          portfolioCode: importData.portfolioCode,
          status: companyDetails.company_status === 'active' ? 'ACTIVE' : 'INACTIVE',
          registeredNumber: companyDetails.company_number,
          address: this.mapCompaniesHouseAddress(companyDetails.registered_office_address),
          incorporationDate: companyDetails.date_of_creation ? new Date(companyDetails.date_of_creation) : undefined,
          accountsLastMadeUpTo: companyDetails.accounts?.last_accounts?.made_up_to
            ? new Date(companyDetails.accounts.last_accounts.made_up_to)
            : undefined,
          accountsNextDue: companyDetails.accounts?.next_due ? new Date(companyDetails.accounts.next_due) : undefined,
          confirmationLastMadeUpTo: companyDetails.confirmation_statement?.last_made_up_to
            ? new Date(companyDetails.confirmation_statement.last_made_up_to)
            : undefined,
          confirmationNextDue: companyDetails.confirmation_statement?.next_due
            ? new Date(companyDetails.confirmation_statement.next_due)
            : undefined,
        };
        client = await this.clientsService.create(createClientDto);
      }

      // Import officers if requested
      if (importData.importOfficers) {
        await this.importCompanyOfficers(client.id, importData.companyNumber, {
          createOfficerClients: !!importData.createOfficerClients,
          portfolioCode: importData.portfolioCode,
          companyRef: client.ref,
          selfAssessmentFee: importData.selfAssessmentFee,
        });
      }

      // Create compliance items if requested
      if (importData.createComplianceItems) {
        if (existing) {
          await this.updateComplianceItemsFromCompanyData(client.id, companyDetails);
        } else {
          await this.createComplianceItemsFromCompanyData(client.id, companyDetails);
        }
      }

      this.logger.log(`Successfully imported company ${importData.companyNumber} as client ${client.ref}`);
      return client;
    } catch (error) {
      this.logger.error(`Error importing company: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to import company: ${error.message}`);
    }
  }

  async syncCompanyData(clientRef: string): Promise<void> {
    try {
      this.logger.log(`Syncing company data for client: ${clientRef}`);

      const client = await this.clientsService.findByRef(clientRef);
      if (!client.registeredNumber) {
        throw new BadRequestException('Client does not have a registered company number');
      }

      // Get latest company details
      const companyDetails = await this.getCompanyDetails(client.registeredNumber);
      
      // Update client with latest data (status/address/incorporation)
      await this.clientsService.update(clientRef, {
        name: companyDetails.company_name,
        status: companyDetails.company_status === 'active' ? 'ACTIVE' : 'INACTIVE',
        address: this.mapCompaniesHouseAddress(companyDetails.registered_office_address),
        incorporationDate: companyDetails.date_of_creation ? new Date(companyDetails.date_of_creation) : undefined,
        accountsLastMadeUpTo: companyDetails.accounts?.last_accounts?.made_up_to
          ? new Date(companyDetails.accounts.last_accounts.made_up_to)
          : undefined,
        accountsNextDue: companyDetails.accounts?.next_due
          ? new Date(companyDetails.accounts.next_due)
          : undefined,
        confirmationLastMadeUpTo: companyDetails.confirmation_statement?.last_made_up_to
          ? new Date(companyDetails.confirmation_statement.last_made_up_to)
          : undefined,
        confirmationNextDue: companyDetails.confirmation_statement?.next_due
          ? new Date(companyDetails.confirmation_statement.next_due)
          : undefined,
      });

      // Update compliance items
      await this.updateComplianceItemsFromCompanyData(client.id, companyDetails);

      this.logger.log(`Successfully synced company data for client ${clientRef}`);
    } catch (error) {
      this.logger.error(`Error syncing company data: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to sync company data: ${error.message}`);
    }
  }

  /**
   * Compare stored client data with live Companies House data and return field-level differences.
   * Useful for UI to show a preview before applying updates.
   */
  async compareClientWithCompany(clientRef: string): Promise<{
    client: Client;
    company: CompanyDetails;
    diffs: Array<{ field: string; clientValue: any; companiesHouseValue: any }>;
  }> {
    const client = await this.clientsService.findByRef(clientRef);
    if (!client) {
      throw new BadRequestException(`Client ${clientRef} not found`);
    }

    if (!client.registeredNumber) {
      throw new BadRequestException('Client does not have a registered company number');
    }

    const companyDetails = await this.getCompanyDetails(client.registeredNumber);

    // Map CH address to same shape used by clients
    const chAddress = this.mapCompaniesHouseAddress(companyDetails.registered_office_address);

    const diffs: Array<{ field: string; clientValue: any; companiesHouseValue: any }> = [];

    // Compare simple fields
    if ((client.name || '') !== (companyDetails.company_name || '')) {
      diffs.push({ field: 'name', clientValue: client.name, companiesHouseValue: companyDetails.company_name });
    }

    const clientStatus = client.status === 'ACTIVE' ? 'active' : 'inactive';
    if ((companyDetails.company_status || '') !== clientStatus) {
      diffs.push({ field: 'status', clientValue: client.status, companiesHouseValue: companyDetails.company_status });
    }

    if ((client.registeredNumber || '') !== (companyDetails.company_number || '')) {
      diffs.push({ field: 'registeredNumber', clientValue: client.registeredNumber, companiesHouseValue: companyDetails.company_number });
    }

    // Compare address fields
    const addressFields: Array<keyof typeof chAddress> = ['line1', 'line2', 'city', 'county', 'postcode', 'country'];
    for (const f of addressFields) {
      const cVal = (client.address && (client.address as any)[f]) || '';
      const chVal = (chAddress && (chAddress as any)[f]) || '';
      if ((cVal || '').toString().trim() !== (chVal || '').toString().trim()) {
        diffs.push({ field: `address.${String(f)}`, clientValue: cVal, companiesHouseValue: chVal });
      }
    }

    return { client, company: companyDetails, diffs };
  }

  private async importCompanyOfficers(
    clientId: string,
    companyNumber: string,
    options?: { createOfficerClients?: boolean; portfolioCode?: number; companyRef?: string; selfAssessmentFee?: number }
  ): Promise<void> {
    try {
      const officers = await this.getCompanyOfficers(companyNumber);
      
      // Get the company client to use its ref for director naming
      const companyClient = await this.clientsService.findOne(clientId);
      const companyRef = options?.companyRef || companyClient?.ref;
      
      // Track which letter suffix to use for each director (A, B, C, etc.)
      let directorIndex = 0;
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      
      for (const officer of officers) {
        // If creating officers as clients, create standalone client records and link them
        if (options?.createOfficerClients) {
          try {
            // Generate director ref: CompanyRef + Letter (e.g., CLI001A, CLI001B)
            let directorRef: string | undefined;
            if (companyRef && directorIndex < alphabet.length) {
              directorRef = `${companyRef}${alphabet[directorIndex]}`;
            }
            
            // Check if director client already exists
            let directorClient = directorRef ? await this.clientsService.findByRef(directorRef) : null;
            
            if (directorClient) {
              this.logger.log(`Director client ${directorRef} already exists, will link to company`);
            } else {
              directorIndex++; // Increment for next director
              
              directorClient = await this.clientsService.create({
                ref: directorRef, // Use the generated ref
                name: officer.name,
                type: 'INDIVIDUAL',
                portfolioCode: options.portfolioCode || 1,
                status: 'ACTIVE',
                address: this.mapCompaniesHouseAddress(officer.address),
              });
              
              this.logger.log(`Created director client ${directorRef} for ${officer.name}`);
              
              // Add Self Assessment service if fee is provided
              if (options?.selfAssessmentFee && options.selfAssessmentFee > 0) {
                try {
                  await this.servicesService.create({
                    clientId: directorClient.id,
                    kind: 'Self Assessment',
                    frequency: 'ANNUAL',
                    fee: options.selfAssessmentFee,
                    status: 'ACTIVE',
                    description: 'Personal Tax Return',
                  });
                  this.logger.log(`Added Self Assessment service (£${options.selfAssessmentFee}) to director ${directorRef}`);
                } catch (serviceError) {
                  this.logger.warn(`Failed to create Self Assessment service for director ${directorRef}: ${serviceError?.message || serviceError}`);
                }
              }
            }
            
            // Create party record linking director client to company client
            const sourceId = (officer as any)?.links?.officer?.appointments || officer.name;
            await this.clientPartyService.upsertFromExternal({
              clientId,
              source: 'CH_OFFICER',
              sourceId,
              payload: {
                name: officer.name,
                role: this.mapOfficerRoleToClientPartyRole(officer.officer_role),
                address: this.mapCompaniesHouseAddress(officer.address),
                appointedAt: officer.appointed_on ? new Date(officer.appointed_on) : undefined,
                personId: directorClient.id, // Link to the director client
              },
            });
            
            this.logger.log(`Linked director client ${directorRef} to company ${companyRef}`);
            
          } catch (e) {
            this.logger.warn(`Creating officer as client failed: ${e?.message || e}`);
          }
        } else {
          // Create officers as parties linked to the company (not as separate clients)
          const sourceId = (officer as any)?.links?.officer?.appointments || officer.name;
          await this.clientPartyService.upsertFromExternal({
            clientId,
            source: 'CH_OFFICER',
            sourceId,
            payload: {
              name: officer.name,
              role: this.mapOfficerRoleToClientPartyRole(officer.officer_role),
              address: this.mapCompaniesHouseAddress(officer.address),
              appointedAt: officer.appointed_on ? new Date(officer.appointed_on) : undefined,
              personId: undefined,
            },
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error importing company officers: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async createComplianceItemsFromCompanyData(clientId: string, companyDetails: CompanyDetails): Promise<void> {
    const complianceItems: CreateComplianceItemDto[] = [];

    // Create accounts filing compliance item
    if (companyDetails.accounts?.next_due) {
      // Attempt to find matching service for Annual Accounts
      const matchingService = await this.findMatchingService(clientId, 'ANNUAL_ACCOUNTS');
      
      complianceItems.push({
        clientId,
        serviceId: matchingService?.id,
        type: 'ANNUAL_ACCOUNTS',
        description: 'Annual Accounts Filing',
        dueDate: new Date(companyDetails.accounts.next_due),
        status: companyDetails.accounts.overdue ? 'OVERDUE' : 'PENDING',
        source: 'COMPANIES_HOUSE',
        reference: companyDetails.company_number,
        period: companyDetails.accounts.next_made_up_to,
      });

      if (matchingService) {
        this.logger.log(`Linked ANNUAL_ACCOUNTS compliance item to service ${matchingService.id} (${matchingService.kind})`);
      } else {
        this.logger.log(`No matching service found for ANNUAL_ACCOUNTS compliance item`);
      }
    }

    // Create confirmation statement compliance item
    if (companyDetails.confirmation_statement?.next_due) {
      // Attempt to find matching service for Confirmation Statement
      const matchingService = await this.findMatchingService(clientId, 'CONFIRMATION_STATEMENT');
      
      complianceItems.push({
        clientId,
        serviceId: matchingService?.id,
        type: 'CONFIRMATION_STATEMENT',
        description: 'Confirmation Statement Filing',
        dueDate: new Date(companyDetails.confirmation_statement.next_due),
        status: companyDetails.confirmation_statement.overdue ? 'OVERDUE' : 'PENDING',
        source: 'COMPANIES_HOUSE',
        reference: companyDetails.company_number,
        period: companyDetails.confirmation_statement.last_made_up_to,
      });

      if (matchingService) {
        this.logger.log(`Linked CONFIRMATION_STATEMENT compliance item to service ${matchingService.id} (${matchingService.kind})`);
      } else {
        this.logger.log(`No matching service found for CONFIRMATION_STATEMENT compliance item`);
      }
    }

    // Save compliance items
    for (const item of complianceItems) {
      await this.complianceService.createComplianceItem(item);
    }
  }

  private async updateComplianceItemsFromCompanyData(clientId: string, companyDetails: CompanyDetails): Promise<void> {
    // Get existing compliance items for this client
    const existingItems = await this.complianceService.getComplianceItemsByClient(clientId);
    
    // Update or create accounts filing item
    if (companyDetails.accounts?.next_due) {
      const accountsItem = existingItems.find(item => item.type === 'ANNUAL_ACCOUNTS');
      
      // Attempt to find matching service for Annual Accounts
      const matchingService = await this.findMatchingService(clientId, 'ANNUAL_ACCOUNTS');
      
      if (accountsItem) {
        await this.complianceService.updateComplianceItem(accountsItem.id, {
          serviceId: matchingService?.id,
          dueDate: new Date(companyDetails.accounts.next_due),
          status: companyDetails.accounts.overdue ? 'OVERDUE' : 'PENDING',
          period: companyDetails.accounts.next_made_up_to,
        });

        if (matchingService) {
          this.logger.log(`Updated ANNUAL_ACCOUNTS compliance item ${accountsItem.id} with service link ${matchingService.id}`);
        }
      } else {
        await this.complianceService.createComplianceItem({
          clientId,
          serviceId: matchingService?.id,
          type: 'ANNUAL_ACCOUNTS',
          description: 'Annual Accounts Filing',
          dueDate: new Date(companyDetails.accounts.next_due),
          status: companyDetails.accounts.overdue ? 'OVERDUE' : 'PENDING',
          source: 'COMPANIES_HOUSE',
          reference: companyDetails.company_number,
          period: companyDetails.accounts.next_made_up_to,
        });

        if (matchingService) {
          this.logger.log(`Created ANNUAL_ACCOUNTS compliance item linked to service ${matchingService.id}`);
        }
      }
    }

    // Update or create confirmation statement item
    if (companyDetails.confirmation_statement?.next_due) {
      const confirmationItem = existingItems.find(item => item.type === 'CONFIRMATION_STATEMENT');
      
      // Attempt to find matching service for Confirmation Statement
      const matchingService = await this.findMatchingService(clientId, 'CONFIRMATION_STATEMENT');
      
      if (confirmationItem) {
        await this.complianceService.updateComplianceItem(confirmationItem.id, {
          serviceId: matchingService?.id,
          dueDate: new Date(companyDetails.confirmation_statement.next_due),
          status: companyDetails.confirmation_statement.overdue ? 'OVERDUE' : 'PENDING',
          period: companyDetails.confirmation_statement.last_made_up_to,
        });

        if (matchingService) {
          this.logger.log(`Updated CONFIRMATION_STATEMENT compliance item ${confirmationItem.id} with service link ${matchingService.id}`);
        }
      } else {
        await this.complianceService.createComplianceItem({
          clientId,
          serviceId: matchingService?.id,
          type: 'CONFIRMATION_STATEMENT',
          description: 'Confirmation Statement Filing',
          dueDate: new Date(companyDetails.confirmation_statement.next_due),
          status: companyDetails.confirmation_statement.overdue ? 'OVERDUE' : 'PENDING',
          source: 'COMPANIES_HOUSE',
          reference: companyDetails.company_number,
          period: companyDetails.confirmation_statement.last_made_up_to,
        });

        if (matchingService) {
          this.logger.log(`Created CONFIRMATION_STATEMENT compliance item linked to service ${matchingService.id}`);
        }
      }
    }
  }



  /**
   * Find a matching service for a compliance item type
   * Requirements: 4.5, 7.1, 7.2
   */
  private async findMatchingService(clientId: string, complianceType: string): Promise<{ id: string; kind: string } | null> {
    try {
      // Get all services for this client
      const services = await this.servicesService.findByClient(clientId);
      
      // Filter to active services only
      const activeServices = services.filter(s => s.status === 'ACTIVE');
      
      // Map compliance type to service kind
      const serviceKindMapping: Record<string, string[]> = {
        'ANNUAL_ACCOUNTS': ['Annual Accounts', 'Accounts Preparation', 'Year End Accounts'],
        'CONFIRMATION_STATEMENT': ['Confirmation Statement', 'Annual Return'],
        'VAT_RETURN': ['VAT Returns', 'VAT'],
        'CT600': ['Corporation Tax', 'CT600', 'Tax Return'],
      };
      
      const possibleServiceKinds = serviceKindMapping[complianceType] || [];
      
      // Find first matching service
      for (const serviceKind of possibleServiceKinds) {
        const matchingService = activeServices.find(s => 
          s.kind.toLowerCase().includes(serviceKind.toLowerCase())
        );
        
        if (matchingService) {
          return { id: matchingService.id, kind: matchingService.kind };
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Error finding matching service for compliance type ${complianceType}: ${error.message}`, error.stack);
      return null;
    }
  }

  private mapCompanyTypeToClientType(companyType: string): 'COMPANY' | 'INDIVIDUAL' | 'SOLE_TRADER' | 'PARTNERSHIP' | 'LLP' {
    const lowerType = companyType.toLowerCase();
    
    if (lowerType.includes('llp') || lowerType.includes('limited liability partnership')) {
      return 'LLP';
    }
    if (lowerType.includes('partnership')) {
      return 'PARTNERSHIP';
    }
    if (lowerType.includes('sole') || lowerType.includes('trader')) {
      return 'SOLE_TRADER';
    }
    if (lowerType.includes('individual')) {
      return 'INDIVIDUAL';
    }
    
    return 'COMPANY'; // Default to company
  }

  private mapCompaniesHouseAddress(chAddress: any): Address | undefined {
    if (!chAddress) return undefined;

    return {
      line1: chAddress.address_line_1 || '',
      line2: chAddress.address_line_2,
      city: chAddress.locality || '',
      county: chAddress.region,
      postcode: chAddress.postal_code || '',
      country: chAddress.country || 'United Kingdom',
    };
  }

  private mapOfficerRoleToClientPartyRole(officerRole: string): 'DIRECTOR' | 'SHAREHOLDER' | 'PARTNER' | 'MEMBER' | 'OWNER' | 'UBO' | 'SECRETARY' | 'CONTACT' {
    const lowerRole = officerRole.toLowerCase();
    
    if (lowerRole.includes('director')) return 'DIRECTOR';
    if (lowerRole.includes('secretary')) return 'SECRETARY';
    if (lowerRole.includes('member')) return 'MEMBER';
    if (lowerRole.includes('partner')) return 'PARTNER';
    if (lowerRole.includes('shareholder')) return 'SHAREHOLDER';
    
    return 'DIRECTOR'; // Default to director
  }

  private extractFirstName(fullName: string): string {
    const parts = fullName.trim().split(' ');
    return parts[0] || '';
  }

  private extractLastName(fullName: string): string {
    const parts = fullName.trim().split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  }
}

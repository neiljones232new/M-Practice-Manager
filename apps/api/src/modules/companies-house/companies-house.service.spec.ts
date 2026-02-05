import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { CompaniesHouseService } from './companies-house.service';
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
  FilingHistory,
  CompaniesHouseImportData,
} from './interfaces/companies-house.interface';
import { Client, Person, CreatePersonDto, CreateClientPartyDto } from '../clients/interfaces/client.interface';

describe('CompaniesHouseService', () => {
  let service: CompaniesHouseService;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;
  let fileStorageService: jest.Mocked<FileStorageService>;
  let integrationConfigService: jest.Mocked<IntegrationConfigService>;
  let clientsService: jest.Mocked<ClientsService>;
  let personService: jest.Mocked<PersonService>;
  let clientPartyService: jest.Mocked<ClientPartyService>;
  let complianceService: jest.Mocked<ComplianceService>;
  let servicesService: jest.Mocked<ServicesService>;

  const mockApiKey = 'test-api-key';
  
  const mockCompanySearchResult: CompanySearchResult = {
    kind: 'searchresults#company',
    company_number: '12345678',
    title: 'TEST COMPANY LIMITED',
    company_status: 'active',
    company_type: 'ltd',
    date_of_creation: '2020-01-01',
    address: {
      address_line_1: '123 Test Street',
      locality: 'London',
      postal_code: 'SW1A 1AA',
      country: 'United Kingdom',
    },
    address_snippet: '123 Test Street, London, SW1A 1AA',
    links: {
      self: '/company/12345678',
    },
  };

  const mockCompanyDetails: CompanyDetails = {
    company_number: '12345678',
    company_name: 'TEST COMPANY LIMITED',
    type: 'ltd',
    can_file: true,
    links: {
      self: '/company/12345678',
      filing_history: '/company/12345678/filing-history',
      officers: '/company/12345678/officers',
      charges: '/company/12345678/charges',
    },
    company_status: 'active',
    company_type: 'ltd',
    date_of_creation: '2020-01-01',
    registered_office_address: {
      address_line_1: '123 Test Street',
      locality: 'London',
      postal_code: 'SW1A 1AA',
      country: 'United Kingdom',
    },
    accounts: {
      next_due: '2024-12-31',
      overdue: false,
      next_made_up_to: '2024-03-31',
    },
    confirmation_statement: {
      next_due: '2024-06-30',
      overdue: false,
      last_made_up_to: '2023-06-30',
    },
  };

  const mockCompanyOfficer: CompanyOfficer = {
    name: 'SMITH, John',
    officer_role: 'director',
    appointed_on: '2020-01-01',
    nationality: 'British',
    country_of_residence: 'United Kingdom',
    address: {
      address_line_1: '456 Officer Street',
      locality: 'London',
      postal_code: 'SW1A 2BB',
      country: 'United Kingdom',
    },
    links: {
      self: '/company/12345678/officers/abc',
      officer: {
        appointments: '/officers/abc/appointments',
      },
    },
  };

  const mockFilingHistory: FilingHistory = {
    etag: 'etag-123',
    items_per_page: 2,
    kind: 'filing-history',
    start_index: 0,
    total_count: 2,
    items: [
      {
        transaction_id: 'MzAwOTM2MDg5OGFkaXF6a2N4',
        category: 'accounts',
        description: 'accounts-with-accounts-type-full',
        type: 'AA',
        date: '2023-12-31',
        action_date: '2023-12-31',
      },
      {
        transaction_id: 'MzAwOTM2MDg5OGFkaXF6a2N4',
        category: 'confirmation-statement',
        description: 'confirmation-statement-with-no-updates',
        type: 'CS01',
        date: '2023-06-30',
        action_date: '2023-06-30',
      },
    ],
  };

  const mockClient: Client = {
    id: 'client_123',
    ref: '1A001',
    name: 'TEST COMPANY LIMITED',
    type: 'COMPANY',
    portfolioCode: 1,
    status: 'ACTIVE',
    registeredNumber: '12345678',
    address: {
      line1: '123 Test Street',
      city: 'London',
      postcode: 'SW1A 1AA',
      country: 'United Kingdom',
    },
    parties: [],
    services: [],
    tasks: [],
    documents: [],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockPerson: Person = {
    id: '1A001A',
    ref: '1A001A',
    firstName: 'John',
    lastName: 'Smith',
    fullName: 'John Smith',
    nationality: 'British',
    address: {
      line1: '456 Officer Street',
      city: 'London',
      postcode: 'SW1A 2BB',
      country: 'United Kingdom',
    },
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockFileStorageService = {
      writeFile: jest.fn(),
      readFile: jest.fn(),
      listFiles: jest.fn(),
      searchFiles: jest.fn(),
    };

    const mockIntegrationConfigService = {
      getDecryptedApiKey: jest.fn(),
    };

    const mockClientsService = {
      create: jest.fn(),
      findByIdentifier: jest.fn(),
      update: jest.fn(),
    };

    const mockPersonService = {
      create: jest.fn(),
    };

    const mockClientPartyService = {
      create: jest.fn(),
    };

    const mockComplianceService = {
      createComplianceItem: jest.fn(),
      getComplianceItemsByClient: jest.fn(),
      updateComplianceItem: jest.fn(),
    };

    const mockServicesService = {
      findByClient: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesHouseService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
        {
          provide: IntegrationConfigService,
          useValue: mockIntegrationConfigService,
        },
        {
          provide: ClientsService,
          useValue: mockClientsService,
        },
        {
          provide: PersonService,
          useValue: mockPersonService,
        },
        {
          provide: ClientPartyService,
          useValue: mockClientPartyService,
        },
        {
          provide: ComplianceService,
          useValue: mockComplianceService,
        },
        {
          provide: ServicesService,
          useValue: mockServicesService,
        },
      ],
    }).compile();

    service = module.get<CompaniesHouseService>(CompaniesHouseService);
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);
    fileStorageService = module.get(FileStorageService);
    integrationConfigService = module.get(IntegrationConfigService);
    clientsService = module.get(ClientsService);
    personService = module.get(PersonService);
    clientPartyService = module.get(ClientPartyService);
    complianceService = module.get(ComplianceService);
    servicesService = module.get(ServicesService);

    // Setup default mocks
    configService.get.mockReturnValue(mockApiKey);
  });

  describe('searchCompanies', () => {
    it('should search companies successfully', async () => {
      const mockResponse: AxiosResponse = {
        data: { items: [mockCompanySearchResult] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValue(of(mockResponse));

      const result = await service.searchCompanies({ q: 'TEST COMPANY' });

      expect(result).toEqual([mockCompanySearchResult]);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.company-information.service.gov.uk/search/companies',
        {
          headers: {
            Authorization: `Basic ${Buffer.from(mockApiKey + ':').toString('base64')}`,
            'Content-Type': 'application/json',
          },
          params: {
            q: 'TEST COMPANY',
            items_per_page: 20,
            start_index: 0,
          },
        }
      );
    });

    it('should handle search with custom parameters', async () => {
      const mockResponse: AxiosResponse = {
        data: { items: [mockCompanySearchResult] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValue(of(mockResponse));

      await service.searchCompanies({
        q: 'TEST COMPANY',
        items_per_page: 10,
        start_index: 5,
      });

      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: {
            q: 'TEST COMPANY',
            items_per_page: 10,
            start_index: 5,
          },
        })
      );
    });

    it('should throw BadRequestException when API key is not configured', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(service.searchCompanies({ q: 'TEST' })).rejects.toThrow(
        BadRequestException
      );
    });

    it('should handle API authentication errors', async () => {
      httpService.get.mockReturnValue(
        throwError(() => ({
          response: { status: 401 },
          message: 'Unauthorized',
        }))
      );

      await expect(service.searchCompanies({ q: 'TEST' })).rejects.toThrow(
        'Invalid Companies House API key'
      );
    });

    it('should handle general API errors', async () => {
      httpService.get.mockReturnValue(
        throwError(() => ({
          response: { status: 500 },
          message: 'Internal Server Error',
        }))
      );

      await expect(service.searchCompanies({ q: 'TEST' })).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('getCompanyDetails', () => {
    it('should get company details successfully', async () => {
      const mockResponse: AxiosResponse = {
        data: mockCompanyDetails,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getCompanyDetails('12345678');

      expect(result).toEqual(mockCompanyDetails);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.company-information.service.gov.uk/company/12345678',
        {
          headers: {
            Authorization: `Basic ${Buffer.from(mockApiKey + ':').toString('base64')}`,
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should handle company not found', async () => {
      httpService.get.mockReturnValue(
        throwError(() => ({
          response: { status: 404 },
          message: 'Not Found',
        }))
      );

      await expect(service.getCompanyDetails('99999999')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getCompanyOfficers', () => {
    it('should get company officers successfully', async () => {
      const mockResponse: AxiosResponse = {
        data: { items: [mockCompanyOfficer] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getCompanyOfficers('12345678');

      expect(result).toEqual([mockCompanyOfficer]);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.company-information.service.gov.uk/company/12345678/officers',
        expect.any(Object)
      );
    });

    it('should handle officers not found', async () => {
      httpService.get.mockReturnValue(
        throwError(() => ({
          response: { status: 404 },
          message: 'Not Found',
        }))
      );

      await expect(service.getCompanyOfficers('99999999')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getFilingHistory', () => {
    it('should get filing history successfully', async () => {
      const mockResponse: AxiosResponse = {
        data: mockFilingHistory,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getFilingHistory('12345678');

      expect(result).toEqual(mockFilingHistory);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.company-information.service.gov.uk/company/12345678/filing-history',
        expect.objectContaining({
          params: {
            items_per_page: 100,
          },
        })
      );
    });
  });

  describe('importCompany', () => {
    const importData: CompaniesHouseImportData = {
      companyNumber: '12345678',
      portfolioCode: 1,
      importOfficers: true,
      createComplianceItems: true,
    };

    it('should import company successfully', async () => {
      // Mock Companies House API calls
      const companyDetailsResponse: AxiosResponse = {
        data: mockCompanyDetails,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const officersResponse: AxiosResponse = {
        data: { items: [mockCompanyOfficer] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get
        .mockReturnValueOnce(of(companyDetailsResponse)) // getCompanyDetails
        .mockReturnValueOnce(of(officersResponse)); // getCompanyOfficers

      // Mock service calls
      clientsService.create.mockResolvedValue(mockClient);
      personService.create.mockResolvedValue(mockPerson);
      clientPartyService.create.mockResolvedValue({
        id: 'party_123',
        clientId: 'client_123',
        personId: '1A001A',
        role: 'DIRECTOR',
        primaryContact: false,
        suffixLetter: 'A',
      });
      servicesService.findByClient.mockResolvedValue([
        {
          id: 'service_123',
          clientId: 'client_123',
          kind: 'Annual Accounts',
          frequency: 'ANNUAL' as const,
          fee: 1000,
          annualized: 1000,
          status: 'ACTIVE' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      complianceService.createComplianceItem.mockResolvedValue({
        id: 'compliance_123',
        clientId: 'client_123',
        type: 'ANNUAL_ACCOUNTS',
        description: 'Annual Accounts Filing',
        dueDate: new Date('2024-12-31'),
        status: 'PENDING',
        source: 'COMPANIES_HOUSE',
        reference: '12345678',
        period: '2024-03-31',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.importCompany(importData);

      expect(result).toEqual(mockClient);
      expect(clientsService.create).toHaveBeenCalledWith({
        name: 'TEST COMPANY LIMITED',
        type: 'COMPANY',
        portfolioCode: 1,
        status: 'ACTIVE',
        registeredNumber: '12345678',
        address: {
          line1: '123 Test Street',
          line2: undefined,
          city: 'London',
          county: undefined,
          postcode: 'SW1A 1AA',
          country: 'United Kingdom',
        },
      });
      expect(personService.create).toHaveBeenCalledWith(mockClient.ref, {
        firstName: 'John',
        lastName: 'SMITH',
        nationality: 'British',
        countryOfResidence: 'United Kingdom',
        address: {
          line1: '456 Officer Street',
          city: 'London',
          postcode: 'SW1A 2BB',
          country: 'United Kingdom',
        },
      });
      expect(clientPartyService.create).toHaveBeenCalledWith({
        clientId: 'client_123',
        personId: '1A001A',
        role: 'DIRECTOR',
        appointedAt: new Date('2020-01-01'),
        primaryContact: false,
      });
      expect(complianceService.createComplianceItem).toHaveBeenCalledTimes(2);
    });

    it('should import company without officers', async () => {
      const importDataWithoutOfficers = {
        ...importData,
        importOfficers: false,
      };

      const companyDetailsResponse: AxiosResponse = {
        data: mockCompanyDetails,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValueOnce(of(companyDetailsResponse));
      clientsService.create.mockResolvedValue(mockClient);
      servicesService.findByClient.mockResolvedValue([]);
      complianceService.createComplianceItem.mockResolvedValue({
        id: 'compliance_123',
        clientId: 'client_123',
        type: 'ANNUAL_ACCOUNTS',
        description: 'Annual Accounts Filing',
        dueDate: new Date('2024-12-31'),
        status: 'PENDING',
        source: 'COMPANIES_HOUSE',
        reference: '12345678',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.importCompany(importDataWithoutOfficers);

      expect(result).toEqual(mockClient);
      expect(personService.create).not.toHaveBeenCalled();
      expect(clientPartyService.create).not.toHaveBeenCalled();
    });

    it('should import company without compliance items', async () => {
      const importDataWithoutCompliance = {
        ...importData,
        createComplianceItems: false,
      };

      const companyDetailsResponse: AxiosResponse = {
        data: mockCompanyDetails,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const officersResponse: AxiosResponse = {
        data: { items: [mockCompanyOfficer] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get
        .mockReturnValueOnce(of(companyDetailsResponse))
        .mockReturnValueOnce(of(officersResponse));

      clientsService.create.mockResolvedValue(mockClient);
      personService.create.mockResolvedValue(mockPerson);
      clientPartyService.create.mockResolvedValue({
        id: 'party_123',
        clientId: 'client_123',
        personId: '1A001A',
        role: 'DIRECTOR',
        primaryContact: false,
        suffixLetter: 'A',
      });

      const result = await service.importCompany(importDataWithoutCompliance);

      expect(result).toEqual(mockClient);
      expect(complianceService.createComplianceItem).not.toHaveBeenCalled();
    });

    it('should handle import errors', async () => {
      httpService.get.mockReturnValue(
        throwError(() => ({
          response: { status: 404 },
          message: 'Company not found',
        }))
      );

      await expect(service.importCompany(importData)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('syncCompanyData', () => {
    it('should sync company data successfully', async () => {
      const companyDetailsResponse: AxiosResponse = {
        data: mockCompanyDetails,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValue(of(companyDetailsResponse));
      clientsService.findByIdentifier.mockResolvedValue(mockClient);
      clientsService.update.mockResolvedValue({
        ...mockClient,
        name: 'TEST COMPANY LIMITED',
        updatedAt: new Date(),
      });
      servicesService.findByClient.mockResolvedValue([]);
      complianceService.getComplianceItemsByClient.mockResolvedValue([]);
      complianceService.createComplianceItem.mockResolvedValue({
        id: 'compliance_123',
        clientId: 'client_123',
        type: 'ANNUAL_ACCOUNTS',
        description: 'Annual Accounts Filing',
        dueDate: new Date('2024-12-31'),
        status: 'PENDING',
        source: 'COMPANIES_HOUSE',
        reference: '12345678',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.syncCompanyData('1A001');

      expect(clientsService.findByIdentifier).toHaveBeenCalledWith('1A001');
      expect(clientsService.update).toHaveBeenCalledWith('1A001', {
        name: 'TEST COMPANY LIMITED',
        status: 'ACTIVE',
        address: {
          line1: '123 Test Street',
          line2: undefined,
          city: 'London',
          county: undefined,
          postcode: 'SW1A 1AA',
          country: 'United Kingdom',
        },
      });
      expect(complianceService.createComplianceItem).toHaveBeenCalledTimes(2);
    });

    it('should handle client without registered number', async () => {
      const clientWithoutRegNumber = {
        ...mockClient,
        registeredNumber: undefined,
      };

      clientsService.findByIdentifier.mockResolvedValue(clientWithoutRegNumber);

      await expect(service.syncCompanyData('1A001')).rejects.toThrow(
        'Client does not have a registered company number'
      );
    });

    it('should update existing compliance items', async () => {
      const existingComplianceItem = {
        id: 'compliance_123',
        clientId: 'client_123',
        type: 'ANNUAL_ACCOUNTS',
        description: 'Annual Accounts Filing',
        dueDate: new Date('2023-12-31'),
        status: 'PENDING' as const,
        source: 'COMPANIES_HOUSE' as const,
        reference: '12345678',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const companyDetailsResponse: AxiosResponse = {
        data: mockCompanyDetails,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValue(of(companyDetailsResponse));
      clientsService.findByIdentifier.mockResolvedValue(mockClient);
      clientsService.update.mockResolvedValue(mockClient);
      servicesService.findByClient.mockResolvedValue([]);
      complianceService.getComplianceItemsByClient.mockResolvedValue([existingComplianceItem]);
      complianceService.updateComplianceItem.mockResolvedValue({
        ...existingComplianceItem,
        dueDate: new Date('2024-12-31'),
        updatedAt: new Date(),
      });

      await service.syncCompanyData('1A001');

      expect(complianceService.updateComplianceItem).toHaveBeenCalledWith(
        'compliance_123',
        {
          dueDate: new Date('2024-12-31'),
          status: 'PENDING',
          period: '2024-03-31',
        }
      );
    });
  });

  describe('data mapping methods', () => {
    it('should map company type correctly', async () => {
      const testCases = [
        { input: 'ltd', expected: 'COMPANY' },
        { input: 'llp', expected: 'LLP' },
        { input: 'limited-liability-partnership', expected: 'LLP' },
        { input: 'partnership', expected: 'PARTNERSHIP' },
        { input: 'sole-trader', expected: 'SOLE_TRADER' },
        { input: 'individual', expected: 'INDIVIDUAL' },
        { input: 'unknown-type', expected: 'COMPANY' },
      ];

      for (const testCase of testCases) {
        const companyDetails = {
          ...mockCompanyDetails,
          company_type: testCase.input,
        };

        const companyDetailsResponse: AxiosResponse = {
          data: companyDetails,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };

        httpService.get.mockReturnValue(of(companyDetailsResponse));
        clientsService.create.mockResolvedValue({
          ...mockClient,
          type: testCase.expected as any,
        });

        const result = await service.importCompany({
          companyNumber: '12345678',
          portfolioCode: 1,
          importOfficers: false,
          createComplianceItems: false,
        });

        expect(clientsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            type: testCase.expected,
          })
        );
      }
    });

    it('should map officer role correctly', async () => {
      const testCases = [
        { input: 'director', expected: 'DIRECTOR' },
        { input: 'company-secretary', expected: 'SECRETARY' },
        { input: 'member', expected: 'MEMBER' },
        { input: 'partner', expected: 'PARTNER' },
        { input: 'shareholder', expected: 'SHAREHOLDER' },
        { input: 'unknown-role', expected: 'DIRECTOR' },
      ];

      for (const testCase of testCases) {
        const officer = {
          ...mockCompanyOfficer,
          officer_role: testCase.input,
        };

        const companyDetailsResponse: AxiosResponse = {
          data: mockCompanyDetails,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };

        const officersResponse: AxiosResponse = {
          data: { items: [officer] },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };

        httpService.get
          .mockReturnValueOnce(of(companyDetailsResponse))
          .mockReturnValueOnce(of(officersResponse));

        clientsService.create.mockResolvedValue(mockClient);
        personService.create.mockResolvedValue(mockPerson);
        clientPartyService.create.mockResolvedValue({
          id: 'party_123',
          clientId: 'client_123',
          personId: '1A001A',
          role: testCase.expected as any,
          primaryContact: false,
          suffixLetter: 'A',
        });

        await service.importCompany({
          companyNumber: '12345678',
          portfolioCode: 1,
          importOfficers: true,
          createComplianceItems: false,
        });

        expect(clientPartyService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            role: testCase.expected,
          })
        );
      }
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { EnhancedTaxCalculationsService } from './enhanced-tax-calculations.service';
import { DatabaseService } from '../database/database.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import { TaxRatesService } from './services/tax-rates.service';
import { TaxCalculationPersistenceService } from './services/tax-calculation-persistence.service';
import { TaxRecommendationService } from './services/tax-recommendation.service';

describe('EnhancedTaxCalculationsService', () => {
  let service: EnhancedTaxCalculationsService;
  let databaseService: jest.Mocked<DatabaseService>;
  let fileStorageService: jest.Mocked<FileStorageService>;
  let taxRatesService: jest.Mocked<TaxRatesService>;
  let persistenceService: jest.Mocked<TaxCalculationPersistenceService>;
  let recommendationService: jest.Mocked<TaxRecommendationService>;

  beforeEach(async () => {
    const mockDatabaseService = {
      executeQuery: jest.fn(),
      storeCalculation: jest.fn(),
    };

    const mockFileStorageService = {
      readJson: jest.fn(),
      writeJson: jest.fn(),
      searchFiles: jest.fn(),
      deleteJson: jest.fn(),
    };

    const mockTaxRatesService = {
      getTaxRates: jest.fn(),
      getPersonalAllowance: jest.fn().mockReturnValue(12570),
    };

    const mockPersistenceService = {
      storeCalculation: jest.fn().mockResolvedValue({ success: true }),
      getCalculation: jest.fn(),
      getLatestCalculation: jest.fn(),
      getClientCalculations: jest.fn().mockResolvedValue([]),
      getCalculationHistory: jest.fn().mockResolvedValue({ calculations: [], total: 0, summary: {} }),
      deleteCalculation: jest.fn().mockResolvedValue({ success: true }),
    };

    const mockRecommendationService = {
      generateRecommendations: jest.fn().mockResolvedValue([]),
      getRecommendations: jest.fn().mockResolvedValue([]),
      getClientRecommendations: jest.fn().mockResolvedValue([]),
      calculatePotentialSavings: jest.fn().mockResolvedValue({
        totalPotentialSavings: 0,
        savingsByType: {},
        implementationPriority: [],
      }),
      generateActionableAdvice: jest.fn().mockResolvedValue([]),
      storeRecommendations: jest.fn().mockResolvedValue({ success: true, message: 'Stored' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnhancedTaxCalculationsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: FileStorageService, useValue: mockFileStorageService },
        { provide: TaxRatesService, useValue: mockTaxRatesService },
        { provide: TaxCalculationPersistenceService, useValue: mockPersistenceService },
        { provide: TaxRecommendationService, useValue: mockRecommendationService },
      ],
    }).compile();

    service = module.get<EnhancedTaxCalculationsService>(EnhancedTaxCalculationsService);
    databaseService = module.get(DatabaseService);
    fileStorageService = module.get(FileStorageService);
    taxRatesService = module.get(TaxRatesService);
    persistenceService = module.get(TaxCalculationPersistenceService);
    recommendationService = module.get(TaxRecommendationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateOptimalSalary', () => {
    it('should calculate optimal salary/dividend split', async () => {
      // Mock tax rates
      const mockTaxRates = {
        taxYear: '2024-25',
        incomeTax: {
          personalAllowance: 12570,
          basicRate: 20,
          basicRateThreshold: 37700,
          higherRate: 40,
          higherRateThreshold: 125140,
          additionalRate: 45,
        },
        nationalInsurance: {
          employeePrimaryThreshold: 12570,
          employeeUpperEarningsLimit: 50270,
          employeeRate: 12,
          employeeAdditionalRate: 2,
          employerPrimaryThreshold: 9100,
          employerUpperSecondaryThreshold: 50270,
          employerRate: 13.8,
          employerAdditionalRate: 13.8,
        },
        corporationTax: {
          smallCompaniesRate: 19,
          mainRate: 25,
          marginalReliefThreshold: 50000,
          marginalReliefUpperLimit: 250000,
        },
        dividendTax: {
          allowance: 1000,
          basicRate: 8.75,
          higherRate: 33.75,
          additionalRate: 39.35,
        },
      };

      taxRatesService.getTaxRates.mockResolvedValue(mockTaxRates);
      persistenceService.storeCalculation.mockResolvedValue({ success: true, id: 'test-id', message: 'Stored successfully' });

      const params = {
        clientId: 'test-client',
        availableProfit: 50000,
        taxYear: '2024-25',
      };

      const result = await service.calculateOptimalSalary(params, 'test-user');

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.clientId).toBe('test-client');
      expect(result.calculationType).toBe('SALARY_OPTIMIZATION');
      expect(result.optimizedSalary).toBeGreaterThan(0);
      expect(result.optimizedDividend).toBeGreaterThan(0);
      expect(result.scenarios).toBeDefined();
      expect(result.scenarios.length).toBeGreaterThan(0);
    });

    it('should satisfy summary invariants', async () => {
      const mockTaxRates = {
        taxYear: '2024-25',
        incomeTax: {
          personalAllowance: 12570,
          basicRate: 20,
          basicRateThreshold: 37700,
          higherRate: 40,
          higherRateThreshold: 125140,
          additionalRate: 45,
        },
        nationalInsurance: {
          employeePrimaryThreshold: 12570,
          employeeUpperEarningsLimit: 50270,
          employeeRate: 12,
          employeeAdditionalRate: 2,
          employerPrimaryThreshold: 9100,
          employerUpperSecondaryThreshold: 50270,
          employerRate: 13.8,
          employerAdditionalRate: 13.8,
        },
        corporationTax: {
          smallCompaniesRate: 19,
          mainRate: 25,
          marginalReliefThreshold: 50000,
          marginalReliefUpperLimit: 250000,
        },
        dividendTax: {
          allowance: 1000,
          basicRate: 8.75,
          higherRate: 33.75,
          additionalRate: 39.35,
        },
      };

      taxRatesService.getTaxRates.mockResolvedValue(mockTaxRates);
      persistenceService.storeCalculation.mockResolvedValue({ success: true, id: 'test-id', message: 'Stored successfully' });

      const params = {
        clientId: 'test-client',
        availableProfit: 50000,
        taxYear: '2024-25',
      };

      const result = await service.calculateOptimalSalary(params, 'test-user');
      const summary = result.result?.summary;

      expect(summary).toBeDefined();
      if (!summary) return;

      expect(summary.netIncome).toBeGreaterThanOrEqual(0);
      expect(summary.totalTax).toBeCloseTo(summary.grossIncome - summary.netIncome, 2);
      expect(summary.effectiveTaxRate).toBeCloseTo(
        summary.grossIncome > 0 ? summary.totalTax / summary.grossIncome : 0,
        4
      );
    });

    it('should validate calculation parameters', async () => {
      const params = {
        clientId: 'test-client',
        availableProfit: -1000, // Invalid negative profit
        taxYear: '2024-25',
      };

      await expect(service.calculateOptimalSalary(params, 'test-user'))
        .rejects
        .toThrow('Available profit must be greater than zero');
    });

    it('should validate tax year format', async () => {
      const params = {
        clientId: 'test-client',
        availableProfit: 50000,
        taxYear: '2024', // Invalid format
      };

      await expect(service.calculateOptimalSalary(params, 'test-user'))
        .rejects
        .toThrow('Tax year must be in format YYYY-YY');
    });
  });

  describe('getCalculation', () => {
    it('should retrieve calculation from persistence service', async () => {
      const mockCalculation = {
        id: 'test-id',
        clientId: 'test-client',
        calculationType: 'SALARY_OPTIMIZATION' as const,
        taxYear: '2024-25',
        optimizedSalary: 12570,
        optimizedDividend: 37430,
        totalTakeHome: 45000,
        totalTaxLiability: 5000,
        estimatedSavings: 1000,
        parameters: {},
        recommendations: [],
        calculatedAt: new Date(),
        calculatedBy: 'test-user',
        scenarios: [],
      };

      persistenceService.getCalculation.mockResolvedValue(mockCalculation);

      const result = await service.getCalculation('test-id');

      expect(result).toBeDefined();
      expect(result.id).toBe('test-id');
      expect(result.clientId).toBe('test-client');
      expect(result.calculationType).toBe('SALARY_OPTIMIZATION');
      expect(persistenceService.getCalculation).toHaveBeenCalledWith('test-id');
    });

    it('should throw NotFoundException when calculation not found', async () => {
      persistenceService.getCalculation.mockResolvedValue(null);

      await expect(service.getCalculation('non-existent-id'))
        .rejects
        .toThrow('Tax calculation non-existent-id not found');
    });
  });
});

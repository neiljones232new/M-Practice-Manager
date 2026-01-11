import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fc from 'fast-check';
import { TaxCalculationsService } from './tax-calculations.service';
import { TaxEngineService } from './services/tax-engine.service';
import { TaxRatesService } from './services/tax-rates.service';
import { FileStorageService } from '../file-storage/file-storage.service';

/**
 * **Feature: practice-manager-upgrade, Property 1: Tax Calculation Mathematical Accuracy**
 * 
 * Property-based tests for tax calculation mathematical accuracy.
 * Validates Requirements 1.1, 5.1, 5.2 from the specification.
 * 
 * This test ensures that for any valid client profit amount and tax year,
 * the salary optimization algorithm produces mathematically correct results
 * with proper marginal relief calculations, National Insurance thresholds,
 * and dividend tax considerations.
 */
describe('Tax Calculations Mathematical Accuracy Property Tests', () => {
  let taxCalculationsService: TaxCalculationsService;
  let taxEngineService: TaxEngineService;
  let taxRatesService: TaxRatesService;
  let fileStorageService: FileStorageService;

  beforeEach(async () => {
    const mockFileStorageService = {
      searchFiles: jest.fn().mockResolvedValue([]),
      readJson: jest.fn().mockResolvedValue(null),
      writeJson: jest.fn().mockResolvedValue(undefined),
      deleteJson: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxCalculationsService,
        TaxEngineService,
        TaxRatesService,
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test'),
          },
        },
      ],
    }).compile();

    taxCalculationsService = module.get<TaxCalculationsService>(TaxCalculationsService);
    taxEngineService = module.get<TaxEngineService>(TaxEngineService);
    taxRatesService = module.get<TaxRatesService>(TaxRatesService);
    fileStorageService = module.get<FileStorageService>(FileStorageService);
  });

  // Generators for property-based testing
  const validTaxYearArbitrary = fc.constantFrom('2022-23', '2023-24', '2024-25');
  
  const validProfitArbitrary = fc.float({ 
    min: 1000, 
    max: 1000000, 
    noDefaultInfinity: true, 
    noNaN: true 
  });

  const validSalaryArbitrary = fc.float({ 
    min: 0, 
    max: 200000, 
    noDefaultInfinity: true, 
    noNaN: true 
  });

  const validDividendArbitrary = fc.float({ 
    min: 0, 
    max: 800000, 
    noDefaultInfinity: true, 
    noNaN: true 
  });

  const validPensionContributionsArbitrary = fc.float({ 
    min: 0, 
    max: 40000, 
    noDefaultInfinity: true, 
    noNaN: true 
  });

  describe('Property 1: Tax Calculation Mathematical Accuracy', () => {
    it('should produce mathematically correct corporation tax calculations with proper marginal relief', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            profit: validProfitArbitrary,
            taxYear: validTaxYearArbitrary,
            isSmallCompany: fc.boolean(),
          }),
          async (params) => {
            const result = await taxCalculationsService.calculateCorporationTax(params);
            
            // Basic mathematical correctness
            expect(result.profit).toBe(params.profit);
            expect(result.corporationTax).toBeGreaterThanOrEqual(0);
            expect(result.netProfit).toBe(params.profit - result.corporationTax);
            expect(result.corporationTaxRate).toBeGreaterThan(0);
            expect(result.corporationTaxRate).toBeLessThanOrEqual(1);
            
            // Verify marginal relief calculations for profits between thresholds
            const rates = await taxRatesService.getTaxRates(params.taxYear);
            const smallCompanyThreshold = rates.corporationTax?.marginalReliefThreshold || 50000;
            const marginalReliefUpperLimit = rates.corporationTax?.marginalReliefUpperLimit || 250000;
            
            // Get expected rates as decimals (the method returns decimals)
            let expectedSmallRate, expectedMainRate;
            if (rates.corporationTax) {
              expectedSmallRate = (rates.corporationTax.smallCompaniesRate || 19) / 100;
              expectedMainRate = (rates.corporationTax.mainRate || 25) / 100;
            } else {
              const legacySmallRate = rates.smallCompanyRate || 19;
              const legacyMainRate = rates.corporationTaxRate || 0.25;
              expectedSmallRate = legacySmallRate > 1 ? legacySmallRate / 100 : legacySmallRate;
              expectedMainRate = legacyMainRate > 1 ? legacyMainRate / 100 : legacyMainRate;
            }
            
            if (params.profit <= smallCompanyThreshold) {
              // Should use small company rate
              expect(Math.abs(result.corporationTaxRate - expectedSmallRate)).toBeLessThan(0.001);
            } else if (params.profit >= marginalReliefUpperLimit) {
              // Should use main rate
              expect(Math.abs(result.corporationTaxRate - expectedMainRate)).toBeLessThan(0.001);
            } else {
              // Should be between small company rate and main rate (marginal relief)
              expect(result.corporationTaxRate).toBeGreaterThanOrEqual(expectedSmallRate);
              expect(result.corporationTaxRate).toBeLessThanOrEqual(expectedMainRate);
            }
            
            // Corporation tax should equal profit * rate
            expect(Math.abs(result.corporationTax - (params.profit * result.corporationTaxRate))).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce mathematically correct dividend tax calculations with proper allowances and bands', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            dividendAmount: validDividendArbitrary,
            otherIncome: validSalaryArbitrary,
            taxYear: validTaxYearArbitrary,
          }),
          async (params) => {
            const result = await taxCalculationsService.calculateDividendTax(params);
            
            // Basic mathematical correctness
            expect(result.dividendAmount).toBe(params.dividendAmount);
            expect(result.totalDividendTax).toBeGreaterThanOrEqual(0);
            expect(result.netDividend).toBe(params.dividendAmount - result.totalDividendTax);
            
            // Verify dividend allowance is applied correctly
            const rates = await taxRatesService.getTaxRates(params.taxYear);
            const dividendAllowance = rates.dividendTax?.allowance || rates.dividendAllowance || 1000;
            
            expect(result.dividendAllowance).toBe(dividendAllowance);
            expect(result.taxableDividend).toBe(Math.max(0, params.dividendAmount - dividendAllowance));
            
            // If dividend is within allowance, no tax should be charged
            if (params.dividendAmount <= dividendAllowance) {
              expect(result.totalDividendTax).toBe(0);
              expect(result.taxableDividend).toBe(0);
            }
            
            // Total dividend tax should equal sum of band taxes
            const totalCalculatedTax = result.basicRateTax + result.higherRateTax + result.additionalRateTax;
            expect(Math.abs(result.totalDividendTax - totalCalculatedTax)).toBeLessThan(0.01);
            
            // Each tax band should be non-negative
            expect(result.basicRateTax).toBeGreaterThanOrEqual(0);
            expect(result.higherRateTax).toBeGreaterThanOrEqual(0);
            expect(result.additionalRateTax).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce mathematically correct income tax and National Insurance calculations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            salary: validSalaryArbitrary,
            taxYear: validTaxYearArbitrary,
            pensionContributions: fc.option(validPensionContributionsArbitrary),
          }),
          async (params) => {
            const result = await taxCalculationsService.calculateIncomeTax(params);
            
            // Basic mathematical correctness
            expect(result.salary).toBe(params.salary);
            expect(result.incomeTax).toBeGreaterThanOrEqual(0);
            expect(result.employeeNI).toBeGreaterThanOrEqual(0);
            expect(result.employerNI).toBeGreaterThanOrEqual(0);
            expect(result.totalDeductions).toBe(result.incomeTax + result.employeeNI);
            expect(result.netSalary).toBe(params.salary - result.totalDeductions);
            
            // Personal allowance should be correctly applied
            const rates = await taxRatesService.getTaxRates(params.taxYear);
            const expectedPersonalAllowance = taxRatesService.getPersonalAllowance(params.salary, params.taxYear);
            expect(result.personalAllowance).toBe(expectedPersonalAllowance);
            
            // Taxable income calculation
            const pensionContributions = params.pensionContributions || 0;
            const adjustedSalary = Math.max(0, params.salary - pensionContributions);
            const expectedTaxableIncome = Math.max(0, adjustedSalary - result.personalAllowance);
            expect(result.taxableIncome).toBe(expectedTaxableIncome);
            
            // If salary is below personal allowance, no income tax should be charged
            if (adjustedSalary <= result.personalAllowance) {
              expect(result.incomeTax).toBe(0);
              expect(result.taxableIncome).toBe(0);
            }
            
            // National Insurance thresholds
            const niLowerLimit = rates.niLowerEarningsLimit || rates.nationalInsurance?.employeePrimaryThreshold || 12570;
            const niUpperLimit = rates.niUpperEarningsLimit || rates.nationalInsurance?.employeeUpperEarningsLimit || 50270;
            
            // If salary is below NI lower limit, no NI should be charged
            if (params.salary <= niLowerLimit) {
              expect(result.employeeNI).toBe(0);
              expect(result.employerNI).toBe(0);
            }
            
            // Employee NI should not exceed the amount calculated on upper earnings limit
            if (params.salary > niUpperLimit) {
              const maxEmployeeNI = (niUpperLimit - niLowerLimit) * (rates.niEmployeeRate || 0.12);
              expect(result.employeeNI).toBeLessThanOrEqual(maxEmployeeNI + 0.01); // Allow small rounding
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce mathematically consistent comprehensive tax calculations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            salary: validSalaryArbitrary,
            dividend: validDividendArbitrary,
            taxYear: validTaxYearArbitrary,
            pensionContributions: fc.option(validPensionContributionsArbitrary),
          }).filter(params => params.salary + params.dividend > 0), // Ensure some income
          async (params) => {
            const companyProfit = params.salary + params.dividend;
            const result = await taxEngineService.calculateComprehensiveTax({
              salary: params.salary,
              dividend: params.dividend,
              taxYear: params.taxYear,
              pensionContributions: params.pensionContributions,
              companyProfit,
            });
            
            // Basic structure validation
            expect(result.salary).toBeDefined();
            expect(result.dividend).toBeDefined();
            expect(result.corporation).toBeDefined();
            expect(result.total).toBeDefined();
            expect(result.breakdown).toBeDefined();
            
            // Mathematical consistency checks
            expect(result.total.totalIncome).toBe(params.salary + params.dividend);
            expect(result.breakdown.netTakeHome).toBeGreaterThanOrEqual(0);
            expect(result.breakdown.effectiveRate).toBeGreaterThanOrEqual(0);
            expect(result.breakdown.effectiveRate).toBeLessThanOrEqual(1);
            
            // Total tax should equal sum of all tax components
            const expectedTotalTax = result.breakdown.incomeTax + 
                                   result.breakdown.employeeNI + 
                                   result.breakdown.employerNI + 
                                   result.breakdown.corporationTax + 
                                   result.breakdown.dividendTax;
            expect(Math.abs(result.breakdown.totalTax - expectedTotalTax)).toBeLessThan(0.01);
            
            // Net take home should equal total income minus personal taxes
            const expectedNetTakeHome = params.salary + params.dividend - 
                                       result.breakdown.incomeTax - 
                                       result.breakdown.employeeNI - 
                                       result.breakdown.dividendTax;
            expect(Math.abs(result.breakdown.netTakeHome - expectedNetTakeHome)).toBeLessThan(0.01);
            
            // Effective rate should equal total tax divided by total income
            if (result.total.totalIncome > 0) {
              const expectedEffectiveRate = result.breakdown.totalTax / result.total.totalIncome;
              expect(Math.abs(result.breakdown.effectiveRate - expectedEffectiveRate)).toBeLessThan(0.001);
            }
            
            // Individual component consistency
            expect(result.salary.totalIncome).toBe(params.salary);
            expect(result.dividend.totalIncome).toBe(params.dividend);
            expect(result.salary.netIncome).toBe(params.salary - result.breakdown.incomeTax - result.breakdown.employeeNI);
            expect(result.dividend.netIncome).toBe(params.dividend - result.breakdown.dividendTax);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce optimal salary/dividend splits that minimize total tax liability', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            totalIncome: fc.float({ min: 20000, max: 500000, noDefaultInfinity: true, noNaN: true }),
            taxYear: validTaxYearArbitrary,
            minSalary: fc.option(fc.float({ min: 0, max: 50000, noDefaultInfinity: true, noNaN: true })),
            maxSalary: fc.option(fc.float({ min: 50000, max: 200000, noDefaultInfinity: true, noNaN: true })),
          }).filter(params => {
            const minSal = params.minSalary || 0;
            const maxSal = params.maxSalary || params.totalIncome;
            return minSal <= maxSal && maxSal <= params.totalIncome && minSal < params.totalIncome;
          }),
          async (params) => {
            const constraints = {
              minSalary: params.minSalary,
              maxSalary: params.maxSalary,
            };
            
            const result = await taxEngineService.findOptimalSplit(
              params.totalIncome,
              params.taxYear,
              constraints
            );
            
            // Basic validation
            expect(result.optimalSalary).toBeGreaterThanOrEqual(0);
            expect(result.optimalDividend).toBeGreaterThanOrEqual(0);
            expect(result.totalTax).toBeGreaterThanOrEqual(0);
            expect(result.netIncome).toBeGreaterThanOrEqual(0);
            // Note: savings can be negative if the optimization doesn't improve over all-salary approach
            
            // Salary + dividend should equal total income
            expect(Math.abs((result.optimalSalary + result.optimalDividend) - params.totalIncome)).toBeLessThan(0.01);
            
            // Net income should equal total income minus total tax
            expect(Math.abs(result.netIncome - (params.totalIncome - result.totalTax))).toBeLessThan(0.01);
            
            // Salary should respect constraints
            const effectiveMinSalary = params.minSalary || 0;
            const effectiveMaxSalary = params.maxSalary || params.totalIncome;
            
            expect(result.optimalSalary).toBeGreaterThanOrEqual(effectiveMinSalary - 0.01);
            expect(result.optimalSalary).toBeLessThanOrEqual(effectiveMaxSalary + 0.01);
            
            // Verify the optimization is actually optimal by testing a few alternative splits
            const rates = await taxRatesService.getTaxRates(params.taxYear);
            const niLowerLimit = rates.niLowerEarningsLimit || 12570;
            
            // Test alternative salary levels
            const testSalaries = [
              Math.max(niLowerLimit, params.minSalary || 0),
              Math.min(50000, params.maxSalary || params.totalIncome),
              Math.min(100000, params.maxSalary || params.totalIncome),
            ].filter(s => s <= params.totalIncome && s >= (params.minSalary || 0) && s <= (params.maxSalary || params.totalIncome));
            
            for (const testSalary of testSalaries) {
              if (Math.abs(testSalary - result.optimalSalary) > 1000) { // Only test significantly different salaries
                const testDividend = params.totalIncome - testSalary;
                const testCalc = await taxEngineService.calculateComprehensiveTax({
                  salary: testSalary,
                  dividend: testDividend,
                  taxYear: params.taxYear,
                  companyProfit: params.totalIncome,
                });
                
                // The optimal solution should have lower or equal total tax
                expect(result.totalTax).toBeLessThanOrEqual(testCalc.breakdown.totalTax + 1); // Allow small tolerance
              }
            }
          }
        ),
        { numRuns: 50 } // Reduced runs due to complexity of optimization testing
      );
    });
  });
});
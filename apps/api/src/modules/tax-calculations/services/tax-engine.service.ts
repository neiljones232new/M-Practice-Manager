import { Injectable, Logger } from '@nestjs/common';
import { TaxRatesService } from './tax-rates.service';
import { TaxRates, TaxCalculationSummary } from '../interfaces/tax-calculation.interface';

/**
 * M Powered™ Tax Engine
 * 
 * Core tax calculation engine providing accurate UK tax calculations
 * for income tax, National Insurance, corporation tax, and dividend tax.
 * 
 * Features:
 * - Multi-year tax rate support
 * - Accurate marginal rate calculations
 * - Corporation tax integration
 * - Dividend tax optimization
 * - National Insurance calculations
 */
@Injectable()
export class TaxEngineService {
  private readonly logger = new Logger(TaxEngineService.name);

  constructor(private readonly taxRatesService: TaxRatesService) {}

  /**
   * Calculate comprehensive tax liability for salary and dividends
   */
  async calculateComprehensiveTax(params: {
    salary: number;
    dividend: number;
    taxYear: string;
    pensionContributions?: number;
    companyProfit?: number;
  }): Promise<{
    salary: TaxCalculationSummary;
    dividend: TaxCalculationSummary;
    corporation: TaxCalculationSummary;
    total: TaxCalculationSummary;
    breakdown: {
      incomeTax: number;
      employeeNI: number;
      employerNI: number;
      corporationTax: number;
      dividendTax: number;
      totalTax: number;
      netTakeHome: number;
      effectiveRate: number;
    };
  }> {
    const rates = await this.taxRatesService.getTaxRates(params.taxYear);
    const totalIncome = params.salary + params.dividend;
    
    // Calculate salary taxes
    const salaryCalc = this.calculateSalaryTax(
      params.salary,
      rates,
      params.pensionContributions,
      totalIncome,
      params.taxYear
    );
    
    // Calculate corporation tax on profits
    const companyProfit = params.companyProfit || (params.salary + params.dividend);
    const corporationCalc = this.calculateCorporationTax(companyProfit - params.salary, rates);
    
    // Calculate dividend tax
    const dividendCalc = this.calculateDividendTax(
      params.dividend,
      params.salary,
      rates,
      params.taxYear
    );
    
    // Calculate totals
    const totalTax = salaryCalc.incomeTax + salaryCalc.employeeNI + salaryCalc.employerNI + 
                    corporationCalc.corporationTax + dividendCalc.dividendTax;
    const netTakeHome = params.salary + params.dividend - salaryCalc.incomeTax - 
                       salaryCalc.employeeNI - dividendCalc.dividendTax;
    const effectiveRate = totalTax / (params.salary + params.dividend);

    return {
      salary: {
        totalIncome: params.salary,
        totalTax: salaryCalc.incomeTax,
        totalNI: salaryCalc.employeeNI,
        netIncome: params.salary - salaryCalc.incomeTax - salaryCalc.employeeNI,
        effectiveTaxRate: (salaryCalc.incomeTax + salaryCalc.employeeNI) / params.salary,
        marginalTaxRate: this.calculateMarginalRate(params.salary, rates),
      },
      dividend: {
        totalIncome: params.dividend,
        totalTax: dividendCalc.dividendTax,
        totalNI: 0,
        netIncome: params.dividend - dividendCalc.dividendTax,
        effectiveTaxRate: dividendCalc.dividendTax / params.dividend,
        marginalTaxRate: this.calculateDividendMarginalRate(params.dividend, params.salary, rates),
      },
      corporation: {
        totalIncome: companyProfit - params.salary,
        totalTax: corporationCalc.corporationTax,
        totalNI: salaryCalc.employerNI,
        netIncome: companyProfit - params.salary - corporationCalc.corporationTax - salaryCalc.employerNI,
        effectiveTaxRate: (corporationCalc.corporationTax + salaryCalc.employerNI) / (companyProfit - params.salary),
        marginalTaxRate: rates.corporationTaxRate,
      },
      total: {
        totalIncome: params.salary + params.dividend,
        totalTax: totalTax,
        totalNI: salaryCalc.employeeNI + salaryCalc.employerNI,
        netIncome: netTakeHome,
        effectiveTaxRate: effectiveRate,
        marginalTaxRate: this.calculateOverallMarginalRate(params.salary, params.dividend, rates),
      },
      breakdown: {
        incomeTax: salaryCalc.incomeTax,
        employeeNI: salaryCalc.employeeNI,
        employerNI: salaryCalc.employerNI,
        corporationTax: corporationCalc.corporationTax,
        dividendTax: dividendCalc.dividendTax,
        totalTax,
        netTakeHome,
        effectiveRate,
      },
    };
  }

  /**
   * Calculate income tax and National Insurance on salary
   */
  private calculateSalaryTax(
    salary: number,
    rates: TaxRates,
    pensionContributions: number = 0,
    totalIncome?: number,
    taxYear?: string
  ) {
    const adjustedSalary = Math.max(0, salary - pensionContributions);
    const personalAllowance = taxYear
      ? this.taxRatesService.getPersonalAllowance(totalIncome ?? adjustedSalary, taxYear)
      : rates.personalAllowance;
    const basicRateThreshold = rates.basicRateThreshold ?? rates.incomeTax?.basicRateThreshold ?? 0;
    const higherRateThreshold = rates.higherRateThreshold ?? rates.incomeTax?.higherRateThreshold ?? 0;
    const basicRate = rates.basicRate ?? ((rates.incomeTax?.basicRate ?? 0) / 100);
    const higherRate = rates.higherRate ?? ((rates.incomeTax?.higherRate ?? 0) / 100);
    const additionalRate = rates.additionalRate ?? ((rates.incomeTax?.additionalRate ?? 0) / 100);
    
    // Income Tax
    let incomeTax = 0;
    const taxableIncome = Math.max(0, adjustedSalary - personalAllowance);
    
    if (taxableIncome > 0) {
      // Basic rate
      const basicRateTaxable = Math.min(taxableIncome, basicRateThreshold - personalAllowance);
      incomeTax += basicRateTaxable * basicRate;
      
      // Higher rate
      if (taxableIncome > basicRateThreshold - personalAllowance) {
        const higherRateTaxable = Math.min(
          taxableIncome - (basicRateThreshold - personalAllowance),
          higherRateThreshold - basicRateThreshold
        );
        incomeTax += higherRateTaxable * higherRate;
        
        // Additional rate
        if (taxableIncome > higherRateThreshold - personalAllowance) {
          const additionalRateTaxable = taxableIncome - (higherRateThreshold - personalAllowance);
          incomeTax += additionalRateTaxable * additionalRate;
        }
      }
    }
    
    // National Insurance (Employee)
    let employeeNI = 0;
    const employeeLowerLimit = rates.niLowerEarningsLimit ?? rates.nationalInsurance?.employeePrimaryThreshold ?? 12570;
    const employeeUpperLimit = rates.niUpperEarningsLimit ?? rates.nationalInsurance?.employeeUpperEarningsLimit ?? 50270;
    const employeeRate = rates.niEmployeeRate ?? ((rates.nationalInsurance?.employeeRate ?? 0) / 100);
    const employeeAdditionalRate = rates.nationalInsurance?.employeeAdditionalRate
      ? rates.nationalInsurance.employeeAdditionalRate / 100
      : 0.02;
    if (salary > employeeLowerLimit) {
      const mainBandEarnings = Math.min(salary, employeeUpperLimit) - employeeLowerLimit;
      employeeNI = Math.max(0, mainBandEarnings) * employeeRate;
      if (salary > employeeUpperLimit) {
        const additionalEarnings = salary - employeeUpperLimit;
        employeeNI += additionalEarnings * employeeAdditionalRate;
      }
    }
    
    // National Insurance (Employer)
    let employerNI = 0;
    const employerLowerLimit = rates.nationalInsurance?.employerPrimaryThreshold ?? rates.niLowerEarningsLimit ?? 9100;
    const employerRate = rates.niEmployerRate ?? ((rates.nationalInsurance?.employerRate ?? 0) / 100);
    if (salary > employerLowerLimit) {
      employerNI = (salary - employerLowerLimit) * employerRate;
    }
    
    return { incomeTax, employeeNI, employerNI };
  }

  /**
   * Calculate corporation tax
   */
  private calculateCorporationTax(profit: number, rates: TaxRates) {
    let corporationTax = 0;
    
    if (profit > 0) {
      if (rates.smallCompanyThreshold && profit <= rates.smallCompanyThreshold && rates.smallCompanyRate) {
        corporationTax = profit * rates.smallCompanyRate;
      } else {
        corporationTax = profit * rates.corporationTaxRate;
      }
    }
    
    return { corporationTax };
  }

  /**
   * Calculate dividend tax
   */
  private calculateDividendTax(
    dividend: number,
    otherIncome: number,
    rates: TaxRates,
    taxYear?: string
  ) {
    let dividendTax = 0;
    
    if (dividend > 0) {
      const totalIncome = otherIncome + dividend;
      const personalAllowance = taxYear
        ? this.taxRatesService.getPersonalAllowance(totalIncome, taxYear)
        : rates.personalAllowance;
      const dividendAllowance = rates.dividendAllowance ?? rates.dividendTax?.allowance ?? 0;
      const dividendBasicRate = rates.dividendBasicRate ?? ((rates.dividendTax?.basicRate ?? 0) / 100);
      const dividendHigherRate = rates.dividendHigherRate ?? ((rates.dividendTax?.higherRate ?? 0) / 100);
      const dividendAdditionalRate = rates.dividendAdditionalRate ?? ((rates.dividendTax?.additionalRate ?? 0) / 100);
      const basicRateThreshold = rates.basicRateThreshold ?? rates.incomeTax?.basicRateThreshold ?? 0;
      const higherRateThreshold = rates.higherRateThreshold ?? rates.incomeTax?.higherRateThreshold ?? 0;

      const remainingPersonalAllowance = Math.max(0, personalAllowance - otherIncome);
      const dividendAfterAllowance = Math.max(0, dividend - remainingPersonalAllowance);
      const taxableNonDividend = Math.max(0, otherIncome - personalAllowance);
      const basicRateLimit = Math.max(0, basicRateThreshold - personalAllowance);
      const higherRateLimit = Math.max(0, higherRateThreshold - personalAllowance);
      const basicRateRemaining = Math.max(0, basicRateLimit - taxableNonDividend);
      const higherRateRemaining = Math.max(0, higherRateLimit - taxableNonDividend - basicRateRemaining);

      if (dividendAfterAllowance > 0) {
        let remainingDividendForBands = dividendAfterAllowance;
        const bandDividends = {
          basicRate: 0,
          higherRate: 0,
          additionalRate: 0,
        };

        if (remainingDividendForBands > 0 && basicRateRemaining > 0) {
          const basicRateDividend = Math.min(remainingDividendForBands, basicRateRemaining);
          bandDividends.basicRate = basicRateDividend;
          remainingDividendForBands -= basicRateDividend;
        }

        if (remainingDividendForBands > 0 && higherRateRemaining > 0) {
          const higherRateDividend = Math.min(remainingDividendForBands, higherRateRemaining);
          bandDividends.higherRate = higherRateDividend;
          remainingDividendForBands -= higherRateDividend;
        }

        if (remainingDividendForBands > 0) {
          bandDividends.additionalRate = remainingDividendForBands;
        }

        let remainingAllowance = dividendAllowance;
        const applyAllowance = (amount: number) => {
          const applied = Math.min(amount, remainingAllowance);
          remainingAllowance -= applied;
          return amount - applied;
        };

        const taxableBands = {
          basicRate: applyAllowance(bandDividends.basicRate),
          higherRate: applyAllowance(bandDividends.higherRate),
          additionalRate: applyAllowance(bandDividends.additionalRate),
        };

        if (taxableBands.basicRate > 0) {
          dividendTax += taxableBands.basicRate * dividendBasicRate;
        }

        if (taxableBands.higherRate > 0) {
          dividendTax += taxableBands.higherRate * dividendHigherRate;
        }

        if (taxableBands.additionalRate > 0) {
          dividendTax += taxableBands.additionalRate * dividendAdditionalRate;
        }
      }
    }
    
    return { dividendTax };
  }

  /**
   * Calculate marginal tax rate for salary
   */
  private calculateMarginalRate(salary: number, rates: TaxRates): number {
    if (salary <= rates.personalAllowance) return 0;
    if (salary <= rates.basicRateThreshold) return rates.basicRate + rates.niEmployeeRate;
    if (salary <= rates.higherRateThreshold) return rates.higherRate + rates.niEmployeeRate;
    return rates.additionalRate + rates.niEmployeeRate;
  }

  /**
   * Calculate marginal tax rate for dividends
   */
  private calculateDividendMarginalRate(dividend: number, otherIncome: number, rates: TaxRates): number {
    const totalIncome = otherIncome + dividend;
    
    if (dividend <= rates.dividendAllowance) return 0;
    if (totalIncome <= rates.basicRateThreshold) return rates.dividendBasicRate;
    if (totalIncome <= rates.higherRateThreshold) return rates.dividendHigherRate;
    return rates.dividendAdditionalRate;
  }

  /**
   * Calculate overall marginal tax rate
   */
  private calculateOverallMarginalRate(salary: number, dividend: number, rates: TaxRates): number {
    // This is a simplified calculation - in practice, the marginal rate depends on which income source is increased
    const salaryMarginal = this.calculateMarginalRate(salary, rates);
    const dividendMarginal = this.calculateDividendMarginalRate(dividend, salary, rates);
    
    // Weight by income amounts
    const totalIncome = salary + dividend;
    if (totalIncome === 0) return 0;
    
    return (salaryMarginal * salary + dividendMarginal * dividend) / totalIncome;
  }

  /**
   * Find optimal salary/dividend split for a given total income
   */
  async findOptimalSplit(totalIncome: number, taxYear: string, constraints?: {
    minSalary?: number;
    maxSalary?: number;
  }): Promise<{
    optimalSalary: number;
    optimalDividend: number;
    totalTax: number;
    netIncome: number;
    savings: number;
  }> {
    const rates = await this.taxRatesService.getTaxRates(taxYear);
    const minSalary = constraints?.minSalary || rates.niLowerEarningsLimit;
    const maxSalary = constraints?.maxSalary || totalIncome;
    
    let bestSalary = minSalary;
    let lowestTax = Infinity;
    
    // Test different salary levels
    for (let salary = minSalary; salary <= maxSalary; salary += 1000) {
      const dividend = Math.max(0, totalIncome - salary);
      const calc = await this.calculateComprehensiveTax({
        salary,
        dividend,
        taxYear,
        companyProfit: totalIncome,
      });
      
      if (calc.breakdown.totalTax < lowestTax) {
        lowestTax = calc.breakdown.totalTax;
        bestSalary = salary;
      }
    }
    
    const bestDividend = Math.max(0, totalIncome - bestSalary);
    
    // Calculate savings compared to all salary
    const allSalaryCalc = await this.calculateComprehensiveTax({
      salary: totalIncome,
      dividend: 0,
      taxYear,
      companyProfit: totalIncome,
    });
    
    const savings = allSalaryCalc.breakdown.totalTax - lowestTax;
    
    return {
      optimalSalary: bestSalary,
      optimalDividend: bestDividend,
      totalTax: lowestTax,
      netIncome: totalIncome - lowestTax,
      savings,
    };
  }
}

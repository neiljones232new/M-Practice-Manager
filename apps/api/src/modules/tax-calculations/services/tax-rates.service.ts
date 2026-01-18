import { Injectable, Logger } from '@nestjs/common';
import { TaxRates } from '../interfaces/tax-calculation.interface';

/**
 * Tax Rates Service
 * 
 * Provides accurate UK tax rates for different tax years.
 * Rates are updated annually and include all major tax types.
 */
@Injectable()
export class TaxRatesService {
  private readonly logger = new Logger(TaxRatesService.name);

  private readonly taxRatesData: Record<string, TaxRates> = {
    '2025-26': {
      taxYear: '2025-26',

      // New structured format
      incomeTax: {
        personalAllowance: 12570,
        basicRate: 20,
        basicRateThreshold: 50270,
        higherRate: 40,
        higherRateThreshold: 125140,
        additionalRate: 45,
      },

      nationalInsurance: {
        employeePrimaryThreshold: 12570,
        employeeUpperEarningsLimit: 50270,
        employeeRate: 12,
        employeeAdditionalRate: 2,
        employerPrimaryThreshold: 5000,
        employerUpperSecondaryThreshold: 50270,
        employerRate: 15,
        employerAdditionalRate: 15,
      },

      corporationTax: {
        smallCompaniesRate: 19,
        mainRate: 25,
        marginalReliefThreshold: 50000,
        marginalReliefUpperLimit: 250000,
        marginalReliefFraction: 0.015,
      },

      dividendTax: {
        allowance: 500,
        basicRate: 8.75,
        higherRate: 33.75,
        additionalRate: 39.35,
      },

      // Legacy support
      personalAllowance: 12570,
      basicRateThreshold: 50270,
      higherRateThreshold: 125140,
      basicRate: 0.20,
      higherRate: 0.40,
      additionalRate: 0.45,
      niLowerEarningsLimit: 12570,
      niUpperEarningsLimit: 50270,
      niEmployeeRate: 0.12,
      niEmployerRate: 0.15,
      corporationTaxRate: 0.25,
      smallCompanyRate: 0.19,
      smallCompanyThreshold: 250000,
      dividendAllowance: 500,
      dividendBasicRate: 0.0875,
      dividendHigherRate: 0.3375,
      dividendAdditionalRate: 0.3935,
    },

    '2024-25': {
      taxYear: '2024-25',
      
      // New structured format
      incomeTax: {
        personalAllowance: 12570,
        basicRate: 20,
        basicRateThreshold: 50270,
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
        marginalReliefFraction: 0.015,
      },
      
      dividendTax: {
        allowance: 500,
        basicRate: 8.75,
        higherRate: 33.75,
        additionalRate: 39.35,
      },
      
      // Legacy support
      personalAllowance: 12570,
      basicRateThreshold: 50270,
      higherRateThreshold: 125140,
      basicRate: 0.20,
      higherRate: 0.40,
      additionalRate: 0.45,
      niLowerEarningsLimit: 12570,
      niUpperEarningsLimit: 50270,
      niEmployeeRate: 0.12,
      niEmployerRate: 0.138,
      corporationTaxRate: 0.25,
      smallCompanyRate: 0.19,
      smallCompanyThreshold: 250000,
      dividendAllowance: 500,
      dividendBasicRate: 0.0875,
      dividendHigherRate: 0.3375,
      dividendAdditionalRate: 0.3935,
    },
    
    '2023-24': {
      taxYear: '2023-24',
      
      // New structured format
      incomeTax: {
        personalAllowance: 12570,
        basicRate: 20,
        basicRateThreshold: 50270,
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
        marginalReliefFraction: 0.015,
      },
      
      dividendTax: {
        allowance: 1000,
        basicRate: 8.75,
        higherRate: 33.75,
        additionalRate: 39.35,
      },
      
      // Legacy support
      personalAllowance: 12570,
      basicRateThreshold: 50270,
      higherRateThreshold: 125140,
      basicRate: 0.20,
      higherRate: 0.40,
      additionalRate: 0.45,
      niLowerEarningsLimit: 12570,
      niUpperEarningsLimit: 50270,
      niEmployeeRate: 0.12,
      niEmployerRate: 0.138,
      corporationTaxRate: 0.25,
      smallCompanyRate: 0.19,
      smallCompanyThreshold: 250000,
      dividendAllowance: 1000,
      dividendBasicRate: 0.0875,
      dividendHigherRate: 0.3375,
      dividendAdditionalRate: 0.3935,
    },
    
    '2022-23': {
      taxYear: '2022-23',
      
      // New structured format
      incomeTax: {
        personalAllowance: 12570,
        basicRate: 20,
        basicRateThreshold: 50270,
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
        mainRate: 19,
        marginalReliefThreshold: 50000,
        marginalReliefUpperLimit: 250000,
        marginalReliefFraction: 0.015,
      },
      
      dividendTax: {
        allowance: 2000,
        basicRate: 8.75,
        higherRate: 33.75,
        additionalRate: 39.35,
      },
      
      // Legacy support
      personalAllowance: 12570,
      basicRateThreshold: 50270,
      higherRateThreshold: 125140,
      basicRate: 0.20,
      higherRate: 0.40,
      additionalRate: 0.45,
      niLowerEarningsLimit: 12570,
      niUpperEarningsLimit: 50270,
      niEmployeeRate: 0.12,
      niEmployerRate: 0.138,
      corporationTaxRate: 0.19,
      dividendAllowance: 2000,
      dividendBasicRate: 0.0875,
      dividendHigherRate: 0.3375,
      dividendAdditionalRate: 0.3935,
    },
  };

  /**
   * Get tax rates for a specific tax year
   */
  async getTaxRates(taxYear: string): Promise<TaxRates> {
    const rates = this.taxRatesData[taxYear];
    
    if (!rates) {
      this.logger.warn(`Tax rates not found for year ${taxYear}, using 2024-25 as default`);
      return this.taxRatesData['2024-25'];
    }
    
    return rates;
  }

  /**
   * Get all available tax years
   */
  getAvailableTaxYears(): string[] {
    return Object.keys(this.taxRatesData).sort().reverse();
  }

  /**
   * Get current tax year (April to April)
   */
  getCurrentTaxYear(): string {
    const now = new Date();
    const currentYear = now.getFullYear();
    const isAfterApril = now.getMonth() >= 3; // April is month 3 (0-indexed)
    
    if (isAfterApril) {
      return `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
    } else {
      return `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
    }
  }

  /**
   * Calculate tax year from date
   */
  getTaxYearFromDate(date: Date): string {
    const year = date.getFullYear();
    const isAfterApril = date.getMonth() >= 3; // April is month 3 (0-indexed)
    
    if (isAfterApril) {
      return `${year}-${(year + 1).toString().slice(-2)}`;
    } else {
      return `${year - 1}-${year.toString().slice(-2)}`;
    }
  }

  /**
   * Get tax year start and end dates
   */
  getTaxYearDates(taxYear: string): { start: Date; end: Date } {
    const [startYear] = taxYear.split('-');
    const start = new Date(parseInt(startYear), 3, 6); // April 6th
    const end = new Date(parseInt(startYear) + 1, 3, 5); // April 5th next year
    
    return { start, end };
  }

  /**
   * Check if a date falls within a tax year
   */
  isDateInTaxYear(date: Date, taxYear: string): boolean {
    const { start, end } = this.getTaxYearDates(taxYear);
    return date >= start && date <= end;
  }

  /**
   * Get National Insurance thresholds for weekly/monthly calculations
   */
  getNIThresholds(taxYear: string, period: 'weekly' | 'monthly' | 'annual' = 'annual'): {
    lowerEarningsLimit: number;
    upperEarningsLimit: number;
  } {
    const rates = this.taxRatesData[taxYear] || this.taxRatesData['2024-25'];
    
    const divisor = period === 'weekly' ? 52 : period === 'monthly' ? 12 : 1;
    
    return {
      lowerEarningsLimit: Math.round((rates.niLowerEarningsLimit || rates.nationalInsurance?.employeePrimaryThreshold || 12570) / divisor),
      upperEarningsLimit: Math.round((rates.niUpperEarningsLimit || rates.nationalInsurance?.employeeUpperEarningsLimit || 50270) / divisor),
    };
  }

  /**
   * Get personal allowance with tapering for high earners
   */
  getPersonalAllowance(totalIncome: number, taxYear: string): number {
    const rates = this.taxRatesData[taxYear] || this.taxRatesData['2024-25'];
    let personalAllowance = rates.personalAllowance || rates.incomeTax?.personalAllowance || 12570;
    
    // Personal allowance is reduced by £1 for every £2 of income over £100,000
    const taperThreshold = 100000;
    if (totalIncome > taperThreshold) {
      const reduction = Math.min(personalAllowance, (totalIncome - taperThreshold) / 2);
      personalAllowance = Math.max(0, personalAllowance - reduction);
    }
    
    return personalAllowance;
  }

  /**
   * Calculate effective corporation tax rate including marginal relief
   */
  getEffectiveCorporationTaxRate(profit: number, taxYear: string): number {
    const rates = this.taxRatesData[taxYear] || this.taxRatesData['2024-25'];
    
    // Handle both new structured format (percentages) and legacy format (decimals)
    let smallCompanyRate: number;
    let mainRate: number;
    
    if (rates.corporationTax) {
      // New structured format - values are percentages, need to convert to decimals
      smallCompanyRate = (rates.corporationTax.smallCompaniesRate || 19) / 100;
      mainRate = (rates.corporationTax.mainRate || 25) / 100;
    } else {
      // Legacy format - check if values are already decimals or percentages
      const legacySmallRate = rates.smallCompanyRate || 19;
      const legacyMainRate = rates.corporationTaxRate || 0.25;
      
      // If legacy rate is > 1, it's a percentage; if <= 1, it's already a decimal
      smallCompanyRate = legacySmallRate > 1 ? legacySmallRate / 100 : legacySmallRate;
      mainRate = legacyMainRate > 1 ? legacyMainRate / 100 : legacyMainRate;
    }
    
    const smallCompanyThreshold = rates.smallCompanyThreshold || rates.corporationTax?.marginalReliefThreshold || 50000;
    const marginalReliefUpperLimit = rates.corporationTax?.marginalReliefUpperLimit || 250000;

    if (profit <= smallCompanyThreshold) {
      return smallCompanyRate;
    }

    if (profit >= marginalReliefUpperLimit) {
      return mainRate;
    }

    if (mainRate <= smallCompanyRate || marginalReliefUpperLimit <= smallCompanyThreshold) {
      return mainRate;
    }
    
    const marginalReliefFraction = rates.corporationTax?.marginalReliefFraction ?? 0.015;
    const mainRateTax = profit * mainRate;
    const marginalRelief = (marginalReliefUpperLimit - profit) * marginalReliefFraction;
    return (mainRateTax - marginalRelief) / profit;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { TaxEngineService } from './tax-engine.service';
import { TaxRatesService } from './tax-rates.service';
import { FileStorageService } from '../../file-storage/file-storage.service';
import { 
  OptimizeSalaryDto, 
  TaxCalculationResult, 
  OptimizationResult,
  TaxRecommendation 
} from '../interfaces/tax-calculation.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SalaryOptimizationService {
  private readonly logger = new Logger(SalaryOptimizationService.name);

  constructor(
    private readonly taxEngine: TaxEngineService,
    private readonly taxRates: TaxRatesService,
    private readonly fileStorage: FileStorageService,
  ) {}

  /**
   * Optimize salary/dividend split for maximum take-home pay
   */
  async optimizeSalaryDividendSplit(dto: OptimizeSalaryDto): Promise<TaxCalculationResult> {
    this.logger.log(`Optimizing salary/dividend split for client ${dto.clientId}`);

    const rates = await this.taxRates.getTaxRates(dto.taxYear);
    
    // Find optimal split
    const optimization = await this.taxEngine.findOptimalSplit(
      dto.targetTakeHome,
      dto.taxYear,
      dto.constraints
    );

    // Generate detailed calculation
    const detailedCalc = await this.taxEngine.calculateComprehensiveTax({
      salary: optimization.optimalSalary,
      dividend: optimization.optimalDividend,
      taxYear: dto.taxYear,
      companyProfit: dto.targetTakeHome,
    });

    // Generate recommendations
    const recommendations = await this.generateOptimizationRecommendations(
      optimization,
      detailedCalc,
      rates,
      dto
    );

    // Create result object
    const result: TaxCalculationResult = {
      id: uuidv4(),
      clientId: dto.clientId,
      calculationType: 'SALARY_OPTIMIZATION',
      taxYear: dto.taxYear,
      parameters: {
        targetTakeHome: dto.targetTakeHome,
        constraints: dto.constraints,
      },
      result: {
        optimizedSalary: optimization.optimalSalary,
        optimizedDividend: optimization.optimalDividend,
        totalTakeHome: optimization.netIncome,
        totalTax: optimization.totalTax,
        estimatedSavings: optimization.savings,
        breakdown: detailedCalc.breakdown,
        summary: detailedCalc.total,
        comparisonWithAllSalary: {
          allSalaryTax: optimization.totalTax + optimization.savings,
          optimizedTax: optimization.totalTax,
          savings: optimization.savings,
          savingsPercentage: (optimization.savings / (optimization.totalTax + optimization.savings)) * 100,
        },
      },
      recommendations,
      createdAt: new Date(),
      createdBy: 'system', // This should come from the authenticated user
    };

    // Save the calculation
    await this.saveCalculation(result);

    return result;
  }

  /**
   * Generate optimization recommendations
   */
  private async generateOptimizationRecommendations(
    optimization: any,
    calculation: any,
    rates: any,
    dto: OptimizeSalaryDto
  ): Promise<TaxRecommendation[]> {
    const recommendations: TaxRecommendation[] = [];

    // Salary level recommendations
    if (optimization.optimalSalary < rates.personalAllowance) {
      recommendations.push({
        type: 'OPTIMIZATION',
        priority: 'MEDIUM',
        title: 'Consider Higher Salary',
        message: `Current optimal salary (£${optimization.optimalSalary.toLocaleString()}) is below the personal allowance. Consider increasing to £${rates.personalAllowance.toLocaleString()} to maximize tax-free income.`,
        potentialSaving: 0,
        actionRequired: false,
      });
    }

    if (optimization.optimalSalary > rates.niUpperEarningsLimit) {
      recommendations.push({
        type: 'OPTIMIZATION',
        priority: 'HIGH',
        title: 'High Salary Alert',
        message: `Salary exceeds the National Insurance upper earnings limit. Consider reducing salary and increasing dividends for better tax efficiency.`,
        potentialSaving: (optimization.optimalSalary - rates.niUpperEarningsLimit) * rates.niEmployeeRate,
        actionRequired: true,
      });
    }

    // Dividend allowance optimization
    if (optimization.optimalDividend > 0 && optimization.optimalDividend < rates.dividendAllowance) {
      recommendations.push({
        type: 'OPTIMIZATION',
        priority: 'LOW',
        title: 'Dividend Allowance Available',
        message: `You have unused dividend allowance of £${(rates.dividendAllowance - optimization.optimalDividend).toLocaleString()}. Consider taking additional dividends tax-free.`,
        potentialSaving: 0,
        actionRequired: false,
      });
    }

    // Pension contribution recommendations
    if (!dto.constraints?.pensionContributions || dto.constraints.pensionContributions === 0) {
      const pensionSaving = optimization.optimalSalary * 0.05 * (rates.basicRate + rates.niEmployeeRate);
      recommendations.push({
        type: 'PLANNING',
        priority: 'MEDIUM',
        title: 'Consider Pension Contributions',
        message: `Contributing 5% of salary (£${(optimization.optimalSalary * 0.05).toLocaleString()}) to a pension could save approximately £${pensionSaving.toLocaleString()} in tax and National Insurance.`,
        potentialSaving: pensionSaving,
        actionRequired: false,
      });
    }

    // Corporation tax efficiency
    if (calculation.corporation.effectiveTaxRate > rates.smallCompanyRate && rates.smallCompanyThreshold) {
      recommendations.push({
        type: 'PLANNING',
        priority: 'MEDIUM',
        title: 'Corporation Tax Planning',
        message: `Consider timing of income and expenses to optimize corporation tax liability. Small company rate of ${(rates.smallCompanyRate * 100).toFixed(1)}% applies to profits up to £${rates.smallCompanyThreshold.toLocaleString()}.`,
        actionRequired: false,
      });
    }

    // Timing recommendations
    const taxYearEnd = new Date(parseInt(dto.taxYear.split('-')[0]) + 1, 3, 5); // April 5th
    const daysToYearEnd = Math.ceil((taxYearEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysToYearEnd > 0 && daysToYearEnd < 90) {
      recommendations.push({
        type: 'PLANNING',
        priority: 'HIGH',
        title: 'Tax Year End Planning',
        message: `Tax year ends in ${daysToYearEnd} days. Consider timing of dividend payments and other income to optimize tax position.`,
        actionRequired: true,
        deadline: taxYearEnd,
      });
    }

    return recommendations;
  }

  /**
   * Save calculation to storage
   */
  private async saveCalculation(calculation: TaxCalculationResult): Promise<void> {
    try {
      await this.fileStorage.writeJson(
        'tax-calculations',
        calculation.id,
        calculation
      );
      this.logger.log(`Saved tax calculation ${calculation.id} for client ${calculation.clientId}`);
    } catch (error) {
      this.logger.error(`Failed to save tax calculation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Compare current setup with optimization
   */
  async compareWithCurrent(
    currentSalary: number,
    currentDividend: number,
    dto: OptimizeSalaryDto
  ): Promise<{
    current: any;
    optimized: any;
    comparison: {
      taxSavings: number;
      takeHomeDifference: number;
      percentageImprovement: number;
    };
  }> {
    // Calculate current scenario
    const currentCalc = await this.taxEngine.calculateComprehensiveTax({
      salary: currentSalary,
      dividend: currentDividend,
      taxYear: dto.taxYear,
      companyProfit: currentSalary + currentDividend,
    });

    // Calculate optimized scenario
    const optimizedResult = await this.optimizeSalaryDividendSplit(dto);
    const optimizedCalc = optimizedResult.result;

    return {
      current: currentCalc,
      optimized: optimizedCalc,
      comparison: {
        taxSavings: currentCalc.breakdown.totalTax - optimizedCalc.totalTax,
        takeHomeDifference: optimizedCalc.totalTakeHome - currentCalc.breakdown.netTakeHome,
        percentageImprovement: ((optimizedCalc.totalTakeHome - currentCalc.breakdown.netTakeHome) / currentCalc.breakdown.netTakeHome) * 100,
      },
    };
  }

  /**
   * Get optimization suggestions for different income levels
   */
  async getOptimizationSuggestions(
    incomeRange: { min: number; max: number; step: number },
    taxYear: string
  ): Promise<Array<{
    totalIncome: number;
    optimalSalary: number;
    optimalDividend: number;
    effectiveRate: number;
    marginalRate: number;
  }>> {
    const suggestions = [];

    for (let income = incomeRange.min; income <= incomeRange.max; income += incomeRange.step) {
      const optimization = await this.taxEngine.findOptimalSplit(income, taxYear);
      const calc = await this.taxEngine.calculateComprehensiveTax({
        salary: optimization.optimalSalary,
        dividend: optimization.optimalDividend,
        taxYear,
        companyProfit: income,
      });

      suggestions.push({
        totalIncome: income,
        optimalSalary: optimization.optimalSalary,
        optimalDividend: optimization.optimalDividend,
        effectiveRate: calc.total.effectiveTaxRate,
        marginalRate: calc.total.marginalTaxRate,
      });
    }

    return suggestions;
  }
}
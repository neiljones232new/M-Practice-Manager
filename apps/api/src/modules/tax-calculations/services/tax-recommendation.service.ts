import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { TaxRatesService } from './tax-rates.service';
import { 
  TaxCalculationResult, 
  TaxScenario, 
  TaxRecommendation,
  TaxRates,
  TaxCalculationParams 
} from '../interfaces/tax-calculation.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Tax Recommendation Service
 * 
 * Provides comprehensive tax recommendation capabilities:
 * - Recommendation generation based on calculation results
 * - Potential savings calculation and comparison
 * - Actionable advice generation with implementation steps
 * - Recommendation storage and retrieval system
 * 
 * Validates Requirements 5.4: Tax recommendation system
 */
@Injectable()
export class TaxRecommendationService {
  private readonly logger = new Logger(TaxRecommendationService.name);

  constructor(
    private databaseService: DatabaseService,
    private taxRatesService: TaxRatesService,
  ) {}

  /**
   * Generate comprehensive tax recommendations based on calculation results
   */
  async generateRecommendations(
    calculation: TaxCalculationResult,
    taxRates: TaxRates,
    currentArrangement?: { salary: number; dividend: number }
  ): Promise<TaxRecommendation[]> {
    this.logger.log(`Generating recommendations for calculation ${calculation.id}`);

    const recommendations: TaxRecommendation[] = [];

    // 1. Salary optimization recommendations
    const salaryRecommendations = await this.generateSalaryOptimizationRecommendations(
      calculation,
      taxRates,
      currentArrangement
    );
    recommendations.push(...salaryRecommendations);

    // 2. Tax efficiency recommendations
    const efficiencyRecommendations = await this.generateTaxEfficiencyRecommendations(
      calculation,
      taxRates
    );
    recommendations.push(...efficiencyRecommendations);

    // 3. Compliance and planning recommendations
    const complianceRecommendations = await this.generateComplianceRecommendations(
      calculation,
      taxRates
    );
    recommendations.push(...complianceRecommendations);

    // 4. Strategic planning recommendations
    const strategicRecommendations = await this.generateStrategicRecommendations(
      calculation,
      taxRates
    );
    recommendations.push(...strategicRecommendations);

    // Sort by priority and potential savings
    recommendations.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return (b.potentialSaving || 0) - (a.potentialSaving || 0);
    });

    this.logger.log(`Generated ${recommendations.length} recommendations for calculation ${calculation.id}`);
    return recommendations;
  }

  /**
   * Calculate potential savings from implementing recommendations
   */
  async calculatePotentialSavings(
    calculation: TaxCalculationResult,
    recommendations: TaxRecommendation[]
  ): Promise<{
    totalPotentialSavings: number;
    savingsByType: Record<string, number>;
    implementationPriority: Array<{
      recommendation: TaxRecommendation;
      savingsToEffortRatio: number;
    }>;
  }> {
    const totalPotentialSavings = recommendations.reduce(
      (sum, rec) => sum + (rec.potentialSaving || 0),
      0
    );

    const savingsByType: Record<string, number> = {};
    recommendations.forEach(rec => {
      savingsByType[rec.type] = (savingsByType[rec.type] || 0) + (rec.potentialSaving || 0);
    });

    // Calculate implementation priority based on savings-to-effort ratio
    const implementationPriority = recommendations
      .map(rec => ({
        recommendation: rec,
        savingsToEffortRatio: this.calculateSavingsToEffortRatio(rec),
      }))
      .sort((a, b) => b.savingsToEffortRatio - a.savingsToEffortRatio);

    return {
      totalPotentialSavings,
      savingsByType,
      implementationPriority,
    };
  }

  /**
   * Generate actionable advice with implementation steps
   */
  async generateActionableAdvice(
    recommendations: TaxRecommendation[],
    clientId: string
  ): Promise<Array<{
    recommendation: TaxRecommendation;
    implementationSteps: string[];
    timeline: string;
    requiredDocuments: string[];
    estimatedEffort: 'LOW' | 'MEDIUM' | 'HIGH';
    dependencies: string[];
  }>> {
    const actionableAdvice = [];

    for (const recommendation of recommendations) {
      const advice = {
        recommendation,
        implementationSteps: this.getImplementationSteps(recommendation),
        timeline: this.getImplementationTimeline(recommendation),
        requiredDocuments: this.getRequiredDocuments(recommendation),
        estimatedEffort: this.getEstimatedEffort(recommendation),
        dependencies: this.getDependencies(recommendation),
      };

      actionableAdvice.push(advice);
    }

    return actionableAdvice;
  }

  /**
   * Store recommendations in database
   */
  async storeRecommendations(
    calculationId: string,
    recommendations: TaxRecommendation[]
  ): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.databaseService.storeRecommendations(calculationId, recommendations);
      
      if (result.success) {
        this.logger.log(`Successfully stored ${recommendations.length} recommendations for calculation ${calculationId}`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to store recommendations: ${error.message}`, error);
      return { success: false, message: 'Failed to store recommendations' };
    }
  }

  /**
   * Retrieve recommendations for a calculation
   */
  async getRecommendations(calculationId: string): Promise<TaxRecommendation[]> {
    try {
      return await this.databaseService.getRecommendations(calculationId);
    } catch (error) {
      this.logger.error(`Failed to get recommendations: ${error.message}`);
      return [];
    }
  }

  /**
   * Get recommendations by client with filtering
   */
  async getClientRecommendations(
    clientId: string,
    options: {
      priority?: 'HIGH' | 'MEDIUM' | 'LOW';
      type?: string;
      implemented?: boolean;
      limit?: number;
    } = {}
  ): Promise<TaxRecommendation[]> {
    try {
      return await this.databaseService.getClientRecommendations(clientId, options);
    } catch (error) {
      this.logger.error(`Failed to get client recommendations: ${error.message}`);
      return [];
    }
  }

  // Private methods for generating specific types of recommendations

  private async generateSalaryOptimizationRecommendations(
    calculation: TaxCalculationResult,
    taxRates: TaxRates,
    currentArrangement?: { salary: number; dividend: number }
  ): Promise<TaxRecommendation[]> {
    const recommendations: TaxRecommendation[] = [];

    if (!calculation.scenarios || calculation.scenarios.length === 0) {
      return recommendations;
    }

    const optimalScenario = calculation.scenarios[0]; // Assuming sorted by best outcome
    const currentScenario = currentArrangement 
      ? calculation.scenarios.find(s => 
          Math.abs(s.salary - currentArrangement.salary) < 100 &&
          Math.abs(s.dividend - currentArrangement.dividend) < 100
        )
      : null;

    // Salary optimization recommendation
    if (currentScenario && optimalScenario.takeHome > currentScenario.takeHome) {
      const saving = optimalScenario.takeHome - currentScenario.takeHome;
      const priority = saving > 2000 ? 'HIGH' : saving > 1000 ? 'MEDIUM' : 'LOW';

      recommendations.push({
        type: 'SALARY_OPTIMIZATION',
        priority,
        title: 'Optimize Salary/Dividend Split',
        description: `Adjusting your salary to £${optimalScenario.salary.toLocaleString()} and dividend to £${optimalScenario.dividend.toLocaleString()} could increase your take-home pay by £${saving.toLocaleString()} annually.`,
        potentialSaving: saving,
        actionRequired: 'Review and implement new salary/dividend structure with payroll provider',
        deadline: this.getNextTaxYearDeadline(),
      });
    }

    // National Insurance threshold recommendations
    if (optimalScenario.salary > taxRates.nationalInsurance.employeePrimaryThreshold) {
      const niThresholdSaving = this.calculateNIThresholdSaving(optimalScenario, taxRates);
      if (niThresholdSaving > 500) {
        recommendations.push({
          type: 'OPTIMIZATION',
          priority: 'MEDIUM',
          title: 'National Insurance Threshold Optimization',
          description: `Consider salary adjustments around National Insurance thresholds to minimize contributions while maximizing benefits.`,
          potentialSaving: niThresholdSaving,
          actionRequired: 'Review salary structure against NI thresholds',
        });
      }
    }

    return recommendations;
  }

  private async generateTaxEfficiencyRecommendations(
    calculation: TaxCalculationResult,
    taxRates: TaxRates
  ): Promise<TaxRecommendation[]> {
    const recommendations: TaxRecommendation[] = [];

    if (!calculation.scenarios || calculation.scenarios.length === 0) {
      return recommendations;
    }

    const optimalScenario = calculation.scenarios[0];

    // Pension contribution recommendations
    const pensionRecommendation = this.generatePensionRecommendation(optimalScenario, taxRates);
    if (pensionRecommendation) {
      recommendations.push(pensionRecommendation);
    }

    // Corporation tax marginal relief recommendations
    const marginalReliefRecommendation = this.generateMarginalReliefRecommendation(
      optimalScenario,
      taxRates,
      calculation.parameters
    );
    if (marginalReliefRecommendation) {
      recommendations.push(marginalReliefRecommendation);
    }

    // Dividend allowance optimization
    const dividendAllowanceRecommendation = this.generateDividendAllowanceRecommendation(
      optimalScenario,
      taxRates
    );
    if (dividendAllowanceRecommendation) {
      recommendations.push(dividendAllowanceRecommendation);
    }

    return recommendations;
  }

  private async generateComplianceRecommendations(
    calculation: TaxCalculationResult,
    taxRates: TaxRates
  ): Promise<TaxRecommendation[]> {
    const recommendations: TaxRecommendation[] = [];

    // PAYE/RTI compliance
    if (calculation.optimizedSalary && calculation.optimizedSalary > 0) {
      recommendations.push({
        type: 'COMPLIANCE',
        priority: 'HIGH',
        title: 'PAYE/RTI Compliance',
        description: 'Ensure PAYE and RTI submissions are updated to reflect new salary structure.',
        actionRequired: 'Update payroll system and submit RTI returns',
        deadline: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 19), // Next month's RTI deadline
      });
    }

    // Corporation tax return implications
    recommendations.push({
      type: 'COMPLIANCE',
      priority: 'MEDIUM',
      title: 'Corporation Tax Return',
      description: 'Salary and dividend changes will affect corporation tax calculations and CT600 preparation.',
      actionRequired: 'Review CT600 preparation with accountant',
      deadline: this.getCorporationTaxDeadline(calculation.taxYear),
    });

    // Self Assessment implications
    if (calculation.optimizedDividend && calculation.optimizedDividend > taxRates.dividendTax.allowance) {
      recommendations.push({
        type: 'COMPLIANCE',
        priority: 'MEDIUM',
        title: 'Self Assessment Requirements',
        description: 'Dividend income above the allowance requires Self Assessment registration and filing.',
        actionRequired: 'Ensure Self Assessment registration and prepare SA100',
        deadline: new Date(new Date().getFullYear() + 1, 0, 31), // 31st January deadline
      });
    }

    return recommendations;
  }

  private async generateStrategicRecommendations(
    calculation: TaxCalculationResult,
    taxRates: TaxRates
  ): Promise<TaxRecommendation[]> {
    const recommendations: TaxRecommendation[] = [];

    // Multi-year planning
    recommendations.push({
      type: 'PLANNING',
      priority: 'LOW',
      title: 'Multi-Year Tax Planning',
      description: 'Consider spreading income across tax years to optimize overall tax efficiency.',
      actionRequired: 'Review multi-year income and tax planning strategy',
    });

    // Business structure optimization
    if (calculation.totalTaxLiability && calculation.totalTaxLiability > 20000) {
      recommendations.push({
        type: 'PLANNING',
        priority: 'MEDIUM',
        title: 'Business Structure Review',
        description: 'High tax liability suggests potential benefits from reviewing business structure and incorporation alternatives.',
        actionRequired: 'Consult with tax advisor on business structure optimization',
      });
    }

    return recommendations;
  }

  // Helper methods for specific recommendation types

  private generatePensionRecommendation(
    scenario: TaxScenario,
    taxRates: TaxRates
  ): TaxRecommendation | null {
    const totalIncome = scenario.salary + scenario.dividend;
    const annualAllowance = 60000; // 2024-25 annual allowance
    
    if (totalIncome > 50000) { // Threshold where pension contributions become very beneficial
      const potentialContribution = Math.min(totalIncome * 0.1, annualAllowance);
      const taxRelief = potentialContribution * 0.4; // Assuming higher rate relief
      
      return {
        type: 'PENSION_CONTRIBUTION',
        priority: 'MEDIUM',
        title: 'Pension Contribution Opportunity',
        description: `Consider pension contributions up to £${potentialContribution.toLocaleString()} to reduce tax liability and build retirement savings.`,
        potentialSaving: taxRelief,
        actionRequired: 'Review pension contribution options with pension provider',
      };
    }
    
    return null;
  }

  private generateMarginalReliefRecommendation(
    scenario: TaxScenario,
    taxRates: TaxRates,
    parameters: any
  ): TaxRecommendation | null {
    const profit = parameters?.availableProfit || 0;
    
    if (profit > taxRates.corporationTax.marginalReliefThreshold && 
        profit < taxRates.corporationTax.marginalReliefUpperLimit) {
      
      return {
        type: 'OPTIMIZATION',
        priority: 'MEDIUM',
        title: 'Corporation Tax Marginal Relief',
        description: 'Company profits fall within marginal relief band. Consider timing of income and expenses to optimize corporation tax.',
        actionRequired: 'Review timing of income recognition and expense claims',
      };
    }
    
    return null;
  }

  private generateDividendAllowanceRecommendation(
    scenario: TaxScenario,
    taxRates: TaxRates
  ): TaxRecommendation | null {
    if (scenario.dividend > 0 && scenario.dividend < taxRates.dividendTax.allowance * 0.8) {
      const additionalDividend = taxRates.dividendTax.allowance - scenario.dividend;
      
      return {
        type: 'OPTIMIZATION',
        priority: 'LOW',
        title: 'Dividend Allowance Utilization',
        description: `You could take an additional £${additionalDividend.toLocaleString()} in tax-free dividends within your annual allowance.`,
        potentialSaving: 0, // No tax saving, but additional income
        actionRequired: 'Consider increasing dividend within allowance',
      };
    }
    
    return null;
  }

  // Utility methods

  private calculateSavingsToEffortRatio(recommendation: TaxRecommendation): number {
    const saving = recommendation.potentialSaving || 0;
    const effortMultiplier = {
      'SALARY_OPTIMIZATION': 0.8, // Medium effort
      'PENSION_CONTRIBUTION': 0.6, // Higher effort
      'COMPLIANCE': 1.0, // Must do anyway
      'PLANNING': 0.4, // High effort, long-term
      'OPTIMIZATION': 0.7, // Medium effort
      'WARNING': 1.0, // Must address
    };
    
    return saving * (effortMultiplier[recommendation.type] || 0.5);
  }

  private getImplementationSteps(recommendation: TaxRecommendation): string[] {
    const stepMap: Record<string, string[]> = {
      'SALARY_OPTIMIZATION': [
        'Review current salary and dividend arrangements',
        'Calculate optimal salary/dividend split',
        'Update employment contract if necessary',
        'Notify payroll provider of salary changes',
        'Update dividend resolutions and board minutes',
        'Implement changes from next payroll period',
      ],
      'PENSION_CONTRIBUTION': [
        'Review current pension arrangements',
        'Calculate optimal contribution levels',
        'Set up or increase pension contributions',
        'Update payroll for pension deductions',
        'Obtain pension contribution certificates',
      ],
      'COMPLIANCE': [
        'Review compliance requirements',
        'Update relevant systems and processes',
        'Submit required returns or notifications',
        'Maintain compliance records',
      ],
    };
    
    return stepMap[recommendation.type] || ['Review recommendation with tax advisor'];
  }

  private getImplementationTimeline(recommendation: TaxRecommendation): string {
    const timelineMap: Record<string, string> = {
      'SALARY_OPTIMIZATION': '2-4 weeks',
      'PENSION_CONTRIBUTION': '1-2 weeks',
      'COMPLIANCE': 'Immediate',
      'PLANNING': '1-3 months',
      'OPTIMIZATION': '2-6 weeks',
      'WARNING': 'Immediate',
    };
    
    return timelineMap[recommendation.type] || '2-4 weeks';
  }

  private getRequiredDocuments(recommendation: TaxRecommendation): string[] {
    const docMap: Record<string, string[]> = {
      'SALARY_OPTIMIZATION': [
        'Current employment contract',
        'Board resolution for salary changes',
        'Dividend vouchers and resolutions',
        'Updated payroll information',
      ],
      'PENSION_CONTRIBUTION': [
        'Pension scheme documentation',
        'Contribution certificates',
        'Payroll records',
      ],
      'COMPLIANCE': [
        'Relevant tax returns',
        'Supporting documentation',
        'Compliance certificates',
      ],
    };
    
    return docMap[recommendation.type] || ['Relevant supporting documentation'];
  }

  private getEstimatedEffort(recommendation: TaxRecommendation): 'LOW' | 'MEDIUM' | 'HIGH' {
    const effortMap: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'> = {
      'SALARY_OPTIMIZATION': 'MEDIUM',
      'PENSION_CONTRIBUTION': 'LOW',
      'COMPLIANCE': 'HIGH',
      'PLANNING': 'HIGH',
      'OPTIMIZATION': 'MEDIUM',
      'WARNING': 'HIGH',
    };
    
    return effortMap[recommendation.type] || 'MEDIUM';
  }

  private getDependencies(recommendation: TaxRecommendation): string[] {
    const depMap: Record<string, string[]> = {
      'SALARY_OPTIMIZATION': [
        'Payroll provider availability',
        'Board approval for changes',
        'Updated employment contracts',
      ],
      'PENSION_CONTRIBUTION': [
        'Pension provider setup',
        'Payroll system updates',
      ],
      'COMPLIANCE': [
        'Required documentation',
        'System access and updates',
      ],
    };
    
    return depMap[recommendation.type] || [];
  }

  private calculateNIThresholdSaving(scenario: TaxScenario, taxRates: TaxRates): number {
    // Simplified calculation - would need more complex logic for actual implementation
    const thresholdDifference = scenario.salary - taxRates.nationalInsurance.employeePrimaryThreshold;
    return Math.max(0, thresholdDifference * 0.02); // Approximate saving
  }

  private getNextTaxYearDeadline(): Date {
    const now = new Date();
    const taxYearEnd = new Date(now.getFullYear(), 3, 5); // April 5th
    
    if (now > taxYearEnd) {
      return new Date(now.getFullYear() + 1, 3, 5);
    }
    
    return taxYearEnd;
  }

  private getCorporationTaxDeadline(taxYear: string): Date {
    const year = parseInt(taxYear.split('-')[0]);
    return new Date(year + 1, 11, 31); // 31st December following tax year
  }
}
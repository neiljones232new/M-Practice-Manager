import { Injectable, Logger } from '@nestjs/common';
import { TaxEngineService } from './tax-engine.service';
import { FileStorageService } from '../../file-storage/file-storage.service';
import { 
  CompareScenariosDto, 
  TaxScenario, 
  TaxCalculationResult 
} from '../interfaces/tax-calculation.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ScenarioComparisonService {
  private readonly logger = new Logger(ScenarioComparisonService.name);

  constructor(
    private readonly taxEngine: TaxEngineService,
    private readonly fileStorage: FileStorageService,
  ) {}

  /**
   * Compare multiple tax scenarios
   */
  async compareScenarios(dto: CompareScenariosDto): Promise<{ scenarios: TaxScenario[] }> {
    this.logger.log(`Comparing ${dto.scenarios.length} tax scenarios for client ${dto.clientId}`);

    const scenarios: TaxScenario[] = [];

    for (let i = 0; i < dto.scenarios.length; i++) {
      const scenario = dto.scenarios[i];
      const scenarioId = uuidv4();
      
      // Calculate comprehensive tax for this scenario
      const calc = await this.taxEngine.calculateComprehensiveTax({
        salary: scenario.salary,
        dividend: scenario.dividend,
        taxYear: dto.taxYear,
        pensionContributions: scenario.pensionContributions,
        companyProfit: scenario.salary + scenario.dividend,
      });

      const taxScenario: TaxScenario = {
        id: scenarioId,
        name: scenario.name || `Scenario ${i + 1}`,
        salary: scenario.salary,
        dividend: scenario.dividend,
        pensionContributions: scenario.pensionContributions || 0,
        
        // Tax calculations
        incomeTax: calc.breakdown.incomeTax,
        employeeNI: calc.breakdown.employeeNI,
        employerNI: calc.breakdown.employerNI,
        corporationTax: calc.breakdown.corporationTax,
        dividendTax: calc.breakdown.dividendTax,
        totalTax: calc.breakdown.totalTax,
        takeHome: calc.breakdown.netTakeHome,
        effectiveRate: calc.breakdown.effectiveRate,
        
        // Additional metrics
        totalEmploymentCosts: scenario.salary + calc.breakdown.employerNI,
        companyNetProfit: (scenario.salary + scenario.dividend) - scenario.salary - calc.breakdown.employerNI - calc.breakdown.corporationTax,
        personalNetIncome: calc.breakdown.netTakeHome,
      };

      scenarios.push(taxScenario);
    }

    // Sort scenarios by take-home pay (highest first)
    scenarios.sort((a, b) => b.takeHome - a.takeHome);

    // Save the comparison
    await this.saveScenarioComparison(dto, scenarios);

    return { scenarios };
  }

  /**
   * Generate standard comparison scenarios
   */
  async generateStandardScenarios(
    totalIncome: number,
    taxYear: string,
    clientId: string
  ): Promise<{ scenarios: TaxScenario[] }> {
    const rates = await this.taxEngine['taxRatesService'].getTaxRates(taxYear);
    
    const standardScenarios = [
      {
        name: 'All Salary',
        salary: totalIncome,
        dividend: 0,
      },
      {
        name: 'Personal Allowance Salary',
        salary: rates.personalAllowance,
        dividend: Math.max(0, totalIncome - rates.personalAllowance),
      },
      {
        name: 'NI Threshold Salary',
        salary: rates.niLowerEarningsLimit,
        dividend: Math.max(0, totalIncome - rates.niLowerEarningsLimit),
      },
      {
        name: 'Basic Rate Threshold',
        salary: Math.min(totalIncome, rates.basicRateThreshold),
        dividend: Math.max(0, totalIncome - rates.basicRateThreshold),
      },
      {
        name: 'All Dividends',
        salary: 0,
        dividend: totalIncome,
      },
    ];

    return this.compareScenarios({
      clientId,
      scenarios: standardScenarios,
      taxYear,
    });
  }

  /**
   * Compare scenarios with pension contributions
   */
  async compareScenariosWithPensions(
    dto: CompareScenariosDto,
    pensionPercentages: number[] = [0, 3, 5, 10]
  ): Promise<{ scenarios: TaxScenario[] }> {
    const allScenarios = [];

    for (const baseScenario of dto.scenarios) {
      for (const pensionPercent of pensionPercentages) {
        const pensionContribution = baseScenario.salary * (pensionPercent / 100);
        
        allScenarios.push({
          name: `${baseScenario.name || 'Scenario'} (${pensionPercent}% pension)`,
          salary: baseScenario.salary,
          dividend: baseScenario.dividend,
          pensionContributions: pensionContribution,
        });
      }
    }

    return this.compareScenarios({
      clientId: dto.clientId,
      scenarios: allScenarios,
      taxYear: dto.taxYear,
    });
  }

  /**
   * Find the most tax-efficient scenario
   */
  async findMostEfficientScenario(scenarios: TaxScenario[]): Promise<{
    mostEfficient: TaxScenario;
    leastEfficient: TaxScenario;
    maxSavings: number;
    analysis: {
      bestForTakeHome: TaxScenario;
      bestForEffectiveRate: TaxScenario;
      bestForCompany: TaxScenario;
    };
  }> {
    if (scenarios.length === 0) {
      throw new Error('No scenarios provided for analysis');
    }

    // Sort by different criteria
    const byTakeHome = [...scenarios].sort((a, b) => b.takeHome - a.takeHome);
    const byEffectiveRate = [...scenarios].sort((a, b) => a.effectiveRate - b.effectiveRate);
    const byCompanyProfit = [...scenarios].sort((a, b) => b.companyNetProfit - a.companyNetProfit);

    const mostEfficient = byTakeHome[0];
    const leastEfficient = byTakeHome[byTakeHome.length - 1];
    const maxSavings = mostEfficient.takeHome - leastEfficient.takeHome;

    return {
      mostEfficient,
      leastEfficient,
      maxSavings,
      analysis: {
        bestForTakeHome: byTakeHome[0],
        bestForEffectiveRate: byEffectiveRate[0],
        bestForCompany: byCompanyProfit[0],
      },
    };
  }

  /**
   * Generate scenario comparison report
   */
  async generateComparisonReport(scenarios: TaxScenario[]): Promise<{
    summary: {
      totalScenarios: number;
      incomeRange: { min: number; max: number };
      taxRange: { min: number; max: number };
      takeHomeRange: { min: number; max: number };
    };
    recommendations: Array<{
      scenario: TaxScenario;
      reason: string;
      benefit: string;
    }>;
    insights: string[];
  }> {
    const totalIncomes = scenarios.map(s => s.salary + s.dividend);
    const taxes = scenarios.map(s => s.totalTax);
    const takeHomes = scenarios.map(s => s.takeHome);

    const summary = {
      totalScenarios: scenarios.length,
      incomeRange: {
        min: Math.min(...totalIncomes),
        max: Math.max(...totalIncomes),
      },
      taxRange: {
        min: Math.min(...taxes),
        max: Math.max(...taxes),
      },
      takeHomeRange: {
        min: Math.min(...takeHomes),
        max: Math.max(...takeHomes),
      },
    };

    // Generate recommendations
    const recommendations = [];
    const bestTakeHome = scenarios.reduce((best, current) => 
      current.takeHome > best.takeHome ? current : best
    );
    
    recommendations.push({
      scenario: bestTakeHome,
      reason: 'Highest take-home pay',
      benefit: `£${(bestTakeHome.takeHome - Math.min(...takeHomes)).toLocaleString()} more than worst scenario`,
    });

    const bestEfficiency = scenarios.reduce((best, current) => 
      current.effectiveRate < best.effectiveRate ? current : best
    );
    
    if (bestEfficiency.id !== bestTakeHome.id) {
      recommendations.push({
        scenario: bestEfficiency,
        reason: 'Most tax efficient',
        benefit: `${((Math.max(...scenarios.map(s => s.effectiveRate)) - bestEfficiency.effectiveRate) * 100).toFixed(1)}% lower effective rate`,
      });
    }

    // Generate insights
    const insights = [];
    
    const salaryOnlyScenario = scenarios.find(s => s.dividend === 0);
    const dividendOnlyScenario = scenarios.find(s => s.salary === 0);
    
    if (salaryOnlyScenario && dividendOnlyScenario) {
      const salaryTax = salaryOnlyScenario.totalTax;
      const dividendTax = dividendOnlyScenario.totalTax;
      
      if (salaryTax > dividendTax) {
        insights.push(`Taking income as dividends saves £${(salaryTax - dividendTax).toLocaleString()} compared to salary`);
      } else {
        insights.push(`Taking income as salary saves £${(dividendTax - salaryTax).toLocaleString()} compared to dividends`);
      }
    }

    const highSalaryScenarios = scenarios.filter(s => s.salary > 50000);
    if (highSalaryScenarios.length > 0) {
      insights.push('High salary scenarios may trigger higher rate tax and reduced personal allowance');
    }

    const pensionScenarios = scenarios.filter(s => s.pensionContributions > 0);
    if (pensionScenarios.length > 0) {
      const bestPension = pensionScenarios.reduce((best, current) => 
        current.takeHome > best.takeHome ? current : best
      );
      insights.push(`Pension contributions of £${bestPension.pensionContributions.toLocaleString()} optimize the tax position`);
    }

    return {
      summary,
      recommendations,
      insights,
    };
  }

  /**
   * Save scenario comparison to storage
   */
  private async saveScenarioComparison(dto: CompareScenariosDto, scenarios: TaxScenario[]): Promise<void> {
    const result: TaxCalculationResult = {
      id: uuidv4(),
      clientId: dto.clientId,
      calculationType: 'SCENARIO_COMPARISON',
      taxYear: dto.taxYear,
      parameters: {
        scenarios: dto.scenarios,
      },
      result: {
        scenarios,
        comparison: await this.generateComparisonReport(scenarios),
      },
      recommendations: [],
      createdAt: new Date(),
      createdBy: 'system',
    };

    try {
      await this.fileStorage.writeJson('tax-calculations', result.id, result);
      this.logger.log(`Saved scenario comparison ${result.id} for client ${dto.clientId}`);
    } catch (error) {
      this.logger.error(`Failed to save scenario comparison: ${error.message}`);
    }
  }
}
import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import { TaxRatesService } from './services/tax-rates.service';
import { TaxCalculationPersistenceService } from './services/tax-calculation-persistence.service';
import { TaxRecommendationService } from './services/tax-recommendation.service';
import { 
  TaxCalculationParams, 
  TaxCalculationResult, 
  TaxScenario, 
  TaxRates, 
  TaxRecommendation,
  SalaryOptimizationParams,
  TaxAmountType,
  TaxCalculationReport,
  ScenarioInput,
  CompanyResult,
  PersonalResult,
  ScenarioResult,
} from './interfaces/tax-calculation.interface';
import { Client } from '../clients/interfaces/client.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enhanced M Powered™ Tax Calculation Service
 * 
 * Provides comprehensive tax calculation and optimization capabilities:
 * - Salary/dividend optimization for director-shareholders
 * - Multi-scenario tax planning comparisons
 * - HMRC-compliant calculations with current rates
 * - Marginal relief calculations for corporation tax
 * - National Insurance optimization
 * - Pension contribution planning
 * 
 * Key features:
 * - Real-time tax rate updates
 * - Multiple tax year support
 * - Scottish tax rate handling
 * - Student loan considerations
 * - Marriage allowance optimization
 * - SQLite database persistence
 */
@Injectable()
export class EnhancedTaxCalculationsService {
  private readonly logger = new Logger(EnhancedTaxCalculationsService.name);

  constructor(
    private databaseService: DatabaseService,
    private fileStorageService: FileStorageService,
    private taxRatesService: TaxRatesService,
    private persistenceService: TaxCalculationPersistenceService,
    private recommendationService: TaxRecommendationService,
  ) {}

  /**
   * Calculate optimal salary/dividend split
   */
  async calculateOptimalSalary(params: SalaryOptimizationParams, userId: string): Promise<TaxCalculationResult> {
    this.logger.log(`Starting salary optimization for client ${params.clientId}`);

    // Validate parameters
    await this.validateCalculationParams(params);

    // Get current tax rates
    const taxRates = await this.taxRatesService.getTaxRates(params.taxYear);

    // Generate salary scenarios
    const scenarios = await this.generateSalaryScenarios(params, taxRates);

    // Find optimal scenario
    const optimalScenario = this.findOptimalScenario(scenarios, params.considerEmployerNI);

    // Calculate savings compared to current arrangement
    const currentScenario = params.currentSalary && params.currentDividend 
      ? await this.calculateSingleScenario({
          ...params,
          salary: params.currentSalary,
          dividend: params.currentDividend,
        }, taxRates)
      : null;

    const estimatedSavings = currentScenario 
      ? currentScenario.totalTax - optimalScenario.totalTax
      : 0;

    const result = this.buildOptimalSalaryResult(
      params,
      userId,
      optimalScenario,
      scenarios,
      estimatedSavings,
      currentScenario || undefined,
      undefined,
      taxRates
    );

    result.scenarioResults = scenarios.map((scenario) =>
      this.calculateScenarioResult(params, scenario.salary, taxRates)
    );

    // Generate recommendations using the recommendation service
    const recommendations = await this.recommendationService.generateRecommendations(
      result,
      taxRates,
      currentScenario ? { salary: currentScenario.salary, dividend: currentScenario.dividend } : undefined
    );

    // Update result with recommendations
    result.recommendations = recommendations;

    await this.persistenceService.storeCalculation(result);

    this.logger.log(`Completed salary optimization for client ${params.clientId}: optimal salary £${optimalScenario.salary}, dividend £${optimalScenario.dividend}`);

    return result;
  }

  /**
   * Compare multiple tax scenarios
   */
  async compareScenarios(
    scenarios: Array<{ salary: number; dividend: number }>,
    params: TaxCalculationParams,
    userId: string
  ): Promise<TaxCalculationResult> {
    const taxRates = await this.taxRatesService.getTaxRates(params.taxYear);
    const calculatedScenarios: TaxScenario[] = [];
    const scenarioResults: ScenarioResult[] = [];

    const baseParams: TaxCalculationParams = {
      ...params,
      availableProfit: params.availableProfit || Math.max(...scenarios.map((scenario) => scenario.salary), 0),
    };

    for (const scenario of scenarios) {
      const scenarioResult = this.calculateScenarioResult(
        {
          ...baseParams,
        },
        scenario.salary,
        taxRates
      );
      scenarioResults.push(scenarioResult);
      calculatedScenarios.push(this.scenarioResultToLegacyScenario(scenarioResult));
    }

    // Find best scenario
    const optimalScenario = calculatedScenarios.reduce((best, current) => 
      current.takeHome > best.takeHome ? current : best
    );

    const result = this.buildScenarioComparisonResult(
      baseParams,
      userId,
      calculatedScenarios,
      optimalScenario,
      uuidv4(),
      taxRates
    );

    result.scenarioResults = scenarioResults;
    await this.persistenceService.storeCalculation(result);
    return result;
  }

  async calculateCorporationTax(params: {
    clientId: string;
    companyId?: string;
    profit?: number;
    revenue?: number;
    expenses?: number;
    pensionContributions?: number;
    salaryExpense?: number;
    taxYear?: string;
    accountingPeriodEndYear?: number;
  }, userId: string): Promise<TaxCalculationResult> {
    if (!params.clientId) {
      throw new BadRequestException('clientId is required for corporation tax calculations');
    }
    const hasProfit = params.profit !== null && params.profit !== undefined;
    const hasRevenue = params.revenue !== null && params.revenue !== undefined;
    if (!hasProfit && !hasRevenue) {
      throw new BadRequestException('profit or revenue is required for corporation tax calculations');
    }
    if (hasProfit && params.profit !== undefined && params.profit < 0) {
      throw new BadRequestException('profit must be zero or greater');
    }

    const result = await this.buildCorporationTaxResult(params, userId);
    await this.persistenceService.storeCalculation(result);
    return result;
  }

  async calculatePersonalTax(
    params: {
      clientId: string;
      salary: number;
      dividends: number;
      otherIncome?: number;
      pensionContributions?: number;
      taxYear: string;
    },
    userId: string,
    calculationId?: string
  ): Promise<TaxCalculationResult> {
    if (!params.clientId) {
      throw new BadRequestException('clientId is required for personal tax calculations');
    }
    if (!params.taxYear) {
      throw new BadRequestException('taxYear is required for personal tax calculations');
    }

    const taxRates = await this.taxRatesService.getTaxRates(params.taxYear);
    const salary = Number(params.salary) || 0;
    const dividends = Number(params.dividends) || 0;
    const otherIncome = Number(params.otherIncome) || 0;

    const incomeTax = this.calculateIncomeTax(
      salary,
      taxRates,
      params.taxYear,
      0,
      otherIncome,
      false,
      salary + otherIncome + dividends
    );
    const employeeNI = this.calculateEmployeeNI(salary, taxRates);
    const dividendTax = this.calculateDividendTax(
      dividends,
      salary + otherIncome,
      taxRates,
      params.taxYear,
      0,
      0
    );

    const totalTax = incomeTax + employeeNI + dividendTax;
    const grossIncome = salary + dividends + otherIncome;
    const netIncome = grossIncome - totalTax;
    const effectiveTaxRate = grossIncome > 0 ? totalTax / grossIncome : 0;

    const scenario: TaxScenario = {
      salary,
      dividend: dividends,
      incomeTax,
      employeeNI,
      employerNI: 0,
      corporationTax: 0,
      dividendTax,
      totalTax,
      takeHome: netIncome,
      effectiveRate: effectiveTaxRate,
    };

    const report = this.buildReportFromScenario(
      {
        clientId: params.clientId,
        availableProfit: 0,
        taxYear: params.taxYear,
        otherIncome,
      },
      scenario,
      taxRates,
      calculationId || uuidv4(),
      'personalTax'
    );

    const result: TaxCalculationResult = {
      id: report.calculationId,
      clientId: params.clientId,
      calculationType: 'INCOME_TAX',
      taxYear: params.taxYear,
      parameters: {
        salary,
        dividends,
        otherIncome,
        pensionContributions: params.pensionContributions || 0,
        amountType: 'salary',
      },
      amountType: 'salary',
      totalTakeHome: netIncome,
      totalTaxLiability: totalTax,
      report,
      result: {
        summary: {
          grossIncome,
          totalTax,
          netIncome,
          effectiveTaxRate,
        },
        breakdown: {
          incomeTax,
          employeeNI,
          employerNI: 0,
          nationalInsurance: employeeNI,
          corporationTax: 0,
          dividendTax,
          totalTax,
        },
      },
      recommendations: [],
      calculatedAt: new Date(),
      calculatedBy: userId,
    };

    await this.persistenceService.storeCalculation(result);
    return result;
  }

  async calculateSoleTraderTax(
    params: {
      clientId: string;
      revenue: number;
      expenses: number;
      taxYear: string;
      payClass2?: boolean;
    },
    userId: string,
    calculationId?: string
  ): Promise<TaxCalculationResult> {
    if (!params.clientId) {
      throw new BadRequestException('clientId is required for sole trader calculations');
    }
    if (!params.taxYear) {
      throw new BadRequestException('taxYear is required for sole trader calculations');
    }

    const revenue = Number(params.revenue) || 0;
    const expenses = Number(params.expenses) || 0;
    if (revenue < 0 || expenses < 0) {
      throw new BadRequestException('revenue and expenses must be zero or greater');
    }

    const profitBeforeTax = Math.max(0, revenue - expenses);
    const taxRates = await this.taxRatesService.getTaxRates(params.taxYear);

    const incomeTax = this.calculateIncomeTax(
      profitBeforeTax,
      taxRates,
      params.taxYear,
      0,
      0,
      false,
      profitBeforeTax
    );

    const class4NIC = this.calculateClass4NIC(profitBeforeTax);
    const class2NIC = this.calculateClass2NIC(profitBeforeTax, params.payClass2);
    const totalTax = incomeTax + class4NIC + class2NIC;
    const netProfitAfterTax = profitBeforeTax - totalTax;
    const effectiveTaxRate = profitBeforeTax > 0 ? totalTax / profitBeforeTax : 0;

    const result: TaxCalculationResult = {
      id: calculationId || uuidv4(),
      clientId: params.clientId,
      calculationType: 'SOLE_TRADER',
      taxYear: params.taxYear,
      parameters: {
        revenue,
        expenses,
        profitBeforeTax,
        payClass2: params.payClass2 || false,
      },
      amountType: 'profit',
      totalTakeHome: netProfitAfterTax,
      totalTaxLiability: totalTax,
      result: {
        summary: {
          grossIncome: profitBeforeTax,
          totalTax,
          netIncome: netProfitAfterTax,
          effectiveTaxRate,
        },
        breakdown: {
          incomeTax,
          class4NIC,
          class2NIC,
          totalTax,
        },
      },
      calculatedAt: new Date(),
      calculatedBy: userId,
      recommendations: [],
    };

    await this.persistenceService.storeCalculation(result);
    return result;
  }

  async recalculateCalculation(id: string, userId: string): Promise<TaxCalculationResult> {
    const calculation = await this.persistenceService.getCalculation(id);
    if (!calculation) {
      throw new NotFoundException(`Tax calculation ${id} not found`);
    }

    if (calculation.calculationType === 'SALARY_OPTIMIZATION') {
      const params = this.normalizeSalaryOptimizationParams(calculation);
      await this.validateCalculationParams(params);
      const taxRates = await this.taxRatesService.getTaxRates(params.taxYear);
      const scenarios = await this.generateSalaryScenarios(params, taxRates);
      const optimalScenario = this.findOptimalScenario(scenarios, params.considerEmployerNI);
      const currentScenario = params.currentSalary && params.currentDividend
        ? await this.calculateSingleScenario({
            ...params,
            salary: params.currentSalary,
            dividend: params.currentDividend,
          }, taxRates)
        : null;
      const estimatedSavings = currentScenario ? currentScenario.totalTax - optimalScenario.totalTax : 0;
      const result = this.buildOptimalSalaryResult(
        params,
        userId,
        optimalScenario,
        scenarios,
        estimatedSavings,
        currentScenario || undefined,
        calculation.id,
        taxRates
      );
      result.scenarioResults = scenarios.map((scenario) =>
        this.calculateScenarioResult(params, scenario.salary, taxRates)
      );
      await this.persistenceService.storeCalculation(result);
      return result;
    }

    if (calculation.calculationType === 'SCENARIO_COMPARISON') {
      const { scenarios, params } = this.normalizeScenarioComparisonParams(calculation);
      const taxRates = await this.taxRatesService.getTaxRates(params.taxYear);
      const calculatedScenarios: TaxScenario[] = [];
      for (const scenario of scenarios) {
        const calculated = await this.calculateSingleScenario({
          ...params,
          salary: scenario.salary,
          dividend: scenario.dividend,
        }, taxRates);
        calculatedScenarios.push({ ...scenario, ...calculated, name: scenario.name });
      }
      const optimalScenario = calculatedScenarios.reduce((best, current) =>
        current.takeHome > best.takeHome ? current : best
      );
      const result = this.buildScenarioComparisonResult(
        params,
        userId,
        calculatedScenarios,
        optimalScenario,
        calculation.id,
        taxRates
      );
      result.scenarioResults = scenarios.map((scenario) =>
        this.calculateScenarioResult(params, scenario.salary, taxRates)
      );
      await this.persistenceService.storeCalculation(result);
      return result;
    }

    if (calculation.calculationType === 'CORPORATION_TAX') {
      const params = calculation.parameters || {};
      const profit = Number(params.profit ?? calculation.result?.summary?.grossIncome ?? 0);
      const result = await this.buildCorporationTaxResult({
        clientId: calculation.clientId,
        companyId: calculation.companyId,
        profit,
        taxYear: calculation.taxYear,
        accountingPeriodEndYear: params.accountingPeriodEndYear,
      }, userId, calculation.id);
      await this.persistenceService.storeCalculation(result);
      return result;
    }

    if (calculation.calculationType === 'INCOME_TAX') {
      const params = calculation.parameters || {};
      const result = await this.calculatePersonalTax(
        {
          clientId: calculation.clientId,
          salary: Number(params.salary ?? 0),
          dividends: Number(params.dividends ?? 0),
          otherIncome: Number(params.otherIncome ?? 0),
          pensionContributions: Number(params.pensionContributions ?? 0),
          taxYear: calculation.taxYear,
        },
        userId,
        calculation.id
      );
      await this.persistenceService.storeCalculation(result);
      return result;
    }

    throw new BadRequestException(`Recalculation for ${calculation.calculationType} is not supported yet.`);
  }

  private buildOptimalSalaryResult(
    params: SalaryOptimizationParams,
    userId: string,
    optimalScenario: TaxScenario,
    scenarios: TaxScenario[],
    estimatedSavings: number,
    currentScenario?: TaxScenario,
    calculationId?: string,
    taxRates?: TaxRates
  ): TaxCalculationResult {
    const id = calculationId || uuidv4();
    const report = taxRates
      ? this.buildReportFromScenario(
          params,
          optimalScenario,
          taxRates,
          id,
          'salaryDividendOptimisation',
          scenarios
        )
      : undefined;
    const result: TaxCalculationResult = {
      id,
      clientId: params.clientId,
      companyId: params.companyId,
      calculationType: 'SALARY_OPTIMIZATION',
      taxYear: params.taxYear,
      parameters: {
        ...params,
        amountType: 'targetTakeHome',
      },
      amountType: 'targetTakeHome',
      optimizedSalary: optimalScenario.salary,
      optimizedDividend: optimalScenario.dividend,
      totalTakeHome: optimalScenario.takeHome,
      totalTaxLiability: optimalScenario.totalTax,
      estimatedSavings,
      report,
      scenarios: scenarios.map((scenario) => ({
        ...scenario,
        amountType: 'targetTakeHome' as TaxAmountType,
      })),
      result: {
        summary: this.buildSummaryFromScenario(optimalScenario, params.otherIncome || 0),
        breakdown: this.buildBreakdownFromScenario(optimalScenario),
        scenarios: scenarios.map((scenario) => ({
          ...scenario,
          amountType: 'targetTakeHome' as TaxAmountType,
        })),
      },
      recommendations: [],
      calculatedAt: new Date(),
      calculatedBy: userId,
    };

    if (currentScenario) {
      result.result = {
        ...result.result,
        comparisonWithCurrent: {
          currentTotalTax: currentScenario.totalTax,
          optimizedTotalTax: optimalScenario.totalTax,
          savings: currentScenario.totalTax - optimalScenario.totalTax,
          savingsPercentage: currentScenario.totalTax > 0
            ? ((currentScenario.totalTax - optimalScenario.totalTax) / currentScenario.totalTax) * 100
            : 0,
        },
      };
    }

    return result;
  }

  private buildScenarioComparisonResult(
    params: TaxCalculationParams,
    userId: string,
    scenarios: TaxScenario[],
    optimalScenario: TaxScenario,
    calculationId: string,
    taxRates?: TaxRates
  ): TaxCalculationResult {
    const normalizedScenarios: TaxScenario[] = scenarios.map((scenario) => ({
      ...scenario,
      amountType: 'targetTakeHome' as TaxAmountType,
    }));
    const report = taxRates
      ? this.buildReportFromScenario(
          params,
          optimalScenario,
          taxRates,
          calculationId,
          'scenarioComparison',
          normalizedScenarios
        )
      : undefined;
    return {
      id: calculationId,
      clientId: params.clientId,
      companyId: params.companyId,
      calculationType: 'SCENARIO_COMPARISON',
      taxYear: params.taxYear,
      parameters: {
        ...params,
        amountType: 'targetTakeHome',
      },
      amountType: 'targetTakeHome',
      optimizedSalary: optimalScenario.salary,
      optimizedDividend: optimalScenario.dividend,
      totalTakeHome: optimalScenario.takeHome,
      totalTaxLiability: optimalScenario.totalTax,
      estimatedSavings: 0,
      report,
      scenarios: normalizedScenarios,
      result: {
        summary: this.buildSummaryFromScenario(optimalScenario, params.otherIncome || 0),
        breakdown: this.buildBreakdownFromScenario(optimalScenario),
        scenarios: normalizedScenarios,
        comparison: this.buildComparisonReport(normalizedScenarios),
      },
      recommendations: [],
      calculatedAt: new Date(),
      calculatedBy: userId,
    };
  }

  private normalizeSalaryOptimizationParams(calculation: TaxCalculationResult): SalaryOptimizationParams {
    const params = calculation.parameters || {};
    const availableProfit = params.availableProfit
      || params.targetTakeHome
      || calculation.totalTakeHome
      || (calculation.optimizedSalary || 0) + (calculation.optimizedDividend || 0);

    return {
      clientId: calculation.clientId,
      companyId: calculation.companyId,
      availableProfit,
      taxYear: calculation.taxYear,
      minSalary: params.minSalary,
      maxSalary: params.maxSalary,
      salaryIncrement: params.salaryIncrement,
      currentSalary: params.currentSalary,
      currentDividend: params.currentDividend,
      personalAllowanceUsed: params.personalAllowanceUsed,
      dividendAllowanceUsed: params.dividendAllowanceUsed,
      otherIncome: params.otherIncome,
      scottishTaxpayer: params.scottishTaxpayer,
      studentLoan: params.studentLoan,
      considerEmployerNI: params.considerEmployerNI,
    };
  }

  private normalizeScenarioComparisonParams(calculation: TaxCalculationResult): {
    scenarios: Array<{ salary: number; dividend: number; name?: string }>;
    params: TaxCalculationParams;
  } {
    const params = calculation.parameters || {};
    const scenarios = (params.scenarios || calculation.scenarios || calculation.result?.scenarios || []).map((scenario: any) => ({
      name: scenario.name,
      salary: Number(scenario.salary) || 0,
      dividend: Number(scenario.dividend) || 0,
    }));
    const availableProfit = params.availableProfit
      || Math.max(...scenarios.map((scenario: any) => (scenario.salary || 0) + (scenario.dividend || 0)), 0);

    return {
      scenarios,
      params: {
        clientId: calculation.clientId,
        companyId: calculation.companyId,
        availableProfit,
        taxYear: calculation.taxYear,
        personalAllowanceUsed: params.personalAllowanceUsed,
        dividendAllowanceUsed: params.dividendAllowanceUsed,
        otherIncome: params.otherIncome,
        scottishTaxpayer: params.scottishTaxpayer,
        studentLoan: params.studentLoan,
        currentSalary: params.currentSalary,
        currentDividend: params.currentDividend,
      },
    };
  }

  private async findClientById(clientId: string): Promise<Client | null> {
    const matches = await this.fileStorageService.searchFiles<Client>('clients', (client) => client.id === clientId);
    return matches.length > 0 ? matches[0] : null;
  }

  private deriveAccountingPeriod(input: {
    client: Client | null;
    taxYear?: string;
    accountingPeriodEndYear?: number;
  }): { startDate: string; endDate: string; taxYear: string } {
    const { client, taxYear, accountingPeriodEndYear } = input;
    const { day, month } = this.getAccountingReference(client);

    let endYear = accountingPeriodEndYear;
    if (!endYear && taxYear) {
      const startYear = parseInt(String(taxYear).split('-')[0], 10);
      if (Number.isFinite(startYear)) {
        endYear = startYear + 1;
      }
    }
    if (!endYear && client?.accountsLastMadeUpTo) {
      endYear = new Date(client.accountsLastMadeUpTo).getFullYear();
    }
    if (!endYear) {
      endYear = new Date().getFullYear();
    }

    const { startDate, endDate } = this.buildAccountingPeriodDates(endYear, month, day);
    const periodTaxYear = this.deriveTaxYearFromEndYear(endYear);

    return { startDate, endDate, taxYear: periodTaxYear };
  }

  private getAccountingReference(client: Client | null): { day: number; month: number } {
    const fallbackDay = 31;
    const fallbackMonth = 3;
    if (!client) {
      return { day: fallbackDay, month: fallbackMonth };
    }

    if (client.accountsAccountingReferenceDay && client.accountsAccountingReferenceMonth) {
      return {
        day: client.accountsAccountingReferenceDay,
        month: client.accountsAccountingReferenceMonth,
      };
    }

    if (client.accountsLastMadeUpTo) {
      const last = new Date(client.accountsLastMadeUpTo);
      if (!Number.isNaN(last.getTime())) {
        return { day: last.getDate(), month: last.getMonth() + 1 };
      }
    }

    return { day: fallbackDay, month: fallbackMonth };
  }

  private buildAccountingPeriodDates(endYear: number, month: number, day: number): { startDate: string; endDate: string } {
    const cappedMonth = Math.min(Math.max(month, 1), 12);
    const daysInMonth = new Date(Date.UTC(endYear, cappedMonth, 0)).getUTCDate();
    const cappedDay = Math.min(Math.max(day, 1), daysInMonth);

    const end = new Date(Date.UTC(endYear, cappedMonth - 1, cappedDay));
    const start = new Date(Date.UTC(endYear - 1, cappedMonth - 1, cappedDay));
    start.setUTCDate(start.getUTCDate() + 1);

    return {
      startDate: end ? start.toISOString().slice(0, 10) : '',
      endDate: end.toISOString().slice(0, 10),
    };
  }

  private deriveTaxYearFromEndYear(endYear: number): string {
    const startYear = endYear - 1;
    const suffix = String(endYear).slice(-2);
    return `${startYear}-${suffix}`;
  }

  private async buildCorporationTaxResult(
    params: {
      clientId: string;
      companyId?: string;
      profit?: number;
      revenue?: number;
      expenses?: number;
      pensionContributions?: number;
      salaryExpense?: number;
      taxYear?: string;
      accountingPeriodEndYear?: number;
    },
    userId: string,
    calculationId?: string
  ): Promise<TaxCalculationResult> {
    const client = await this.findClientById(params.clientId);
    const { endDate, startDate, taxYear } = this.deriveAccountingPeriod({
      client,
      taxYear: params.taxYear,
      accountingPeriodEndYear: params.accountingPeriodEndYear,
    });

    const taxRates = await this.taxRatesService.getTaxRates(taxYear);
    const revenue = Number(params.revenue) || 0;
    const expenses = Number(params.expenses) || 0;
    const pensionContributions = Number(params.pensionContributions) || 0;
    const salaryExpense = Number(params.salaryExpense) || 0;
    const employerNIC = salaryExpense > 0 ? this.calculateEmployerNI(salaryExpense, taxRates) : 0;
    const totalExpenses = expenses + pensionContributions + salaryExpense + employerNIC;
    const profitBeforeTax = params.profit ?? (revenue - totalExpenses);
    const taxableProfit = Math.max(0, profitBeforeTax);

    const effectiveRate = this.taxRatesService.getEffectiveCorporationTaxRate(taxableProfit, taxYear);
    const corporationTax = taxableProfit * effectiveRate;
    const netProfit = taxableProfit - corporationTax;
    const summary = {
      grossIncome: taxableProfit,
      totalTax: corporationTax,
      netIncome: netProfit,
      effectiveTaxRate: taxableProfit > 0 ? corporationTax / taxableProfit : 0,
    };
    const breakdown = {
      incomeTax: 0,
      employeeNI: 0,
      employerNI: employerNIC,
      nationalInsurance: 0,
      corporationTax,
      dividendTax: 0,
      totalTax: corporationTax,
    };
    const id = calculationId || uuidv4();
    const report: TaxCalculationReport = {
      calculationId: id,
      clientId: params.clientId,
      calculationType: 'corporationTax',
      inputs: {
        companyProfitBeforeTax: profitBeforeTax,
        expenses,
        salaryExpense,
        employerNIC,
        taxYear,
        yearEndDate: endDate,
      },
      results: {
        company: {
          profitBeforeTax,
          salaryExpense,
          employerNIC,
          taxableProfit,
          corporationTax,
          dividendsPaid: 0,
          netCompanyCashAfterTax: netProfit,
        },
      },
      reportSummary: {},
    };

    return {
      id,
      clientId: params.clientId,
      companyId: params.companyId,
      calculationType: 'CORPORATION_TAX',
      taxYear,
      parameters: {
        ...params,
        revenue,
        expenses,
        pensionContributions,
        salaryExpense,
        employerNIC,
        totalExpenses,
        profitBeforeTax,
        taxableProfit,
        amountType: 'profit',
        accountingPeriodStart: startDate,
        accountingPeriodEnd: endDate,
      },
      amountType: 'profit',
      accountingPeriodStart: startDate,
      accountingPeriodEnd: endDate,
      totalTaxLiability: corporationTax,
      totalTakeHome: netProfit,
      estimatedSavings: 0,
      report,
      result: {
        summary,
        breakdown,
      },
      recommendations: [],
      calculatedAt: new Date(),
      calculatedBy: userId,
    };
  }

  /**
   * Get calculation by ID
   */
  async getCalculation(id: string): Promise<TaxCalculationResult> {
    const calculation = await this.persistenceService.getCalculation(id);
    
    if (!calculation) {
      throw new NotFoundException(`Tax calculation ${id} not found`);
    }
    
    return calculation;
  }

  /**
   * Get latest calculation for client
   */
  async getLatestCalculation(clientId: string): Promise<TaxCalculationResult | null> {
    return this.persistenceService.getLatestCalculation(clientId);
  }

  /**
   * Get calculations for client
   */
  async getClientCalculations(clientId: string, limit: number = 10): Promise<TaxCalculationResult[]> {
    return this.persistenceService.getClientCalculations(clientId, limit);
  }

  // Private calculation methods

  private buildScenarioInput(params: TaxCalculationParams, salary: number): ScenarioInput {
    return {
      availableProfit: params.availableProfit || 0,
      salary,
      taxYear: params.taxYear,
      personal: {
        otherIncome: params.otherIncome || 0,
      },
    };
  }

  private calculateCompanyResult(input: ScenarioInput, taxRates: TaxRates): CompanyResult {
    const salary = input.salary;
    const employerNI = this.calculateEmployerNI(salary, taxRates);
    const taxableProfit = input.availableProfit - salary - employerNI;
    const corporationTax = this.calculateCorporationTaxLiability(taxableProfit, taxRates);
    const profitAfterTax = taxableProfit - corporationTax;

    return {
      salary,
      employerNI,
      taxableProfit,
      corporationTax,
      profitAfterTax,
      dividendPool: Math.max(0, profitAfterTax),
    };
  }

  private calculatePersonalResult(
    company: CompanyResult,
    input: ScenarioInput,
    taxRates: TaxRates,
    params: TaxCalculationParams
  ): PersonalResult {
    const salary = company.salary;
    const dividends = company.dividendPool;
    const otherIncome = input.personal.otherIncome || 0;

    const incomeTax = this.calculateIncomeTax(
      salary,
      taxRates,
      input.taxYear,
      params.personalAllowanceUsed || 0,
      otherIncome,
      params.scottishTaxpayer || false,
      salary + otherIncome + dividends
    );

    const employeeNI = this.calculateEmployeeNI(salary, taxRates, params.studentLoan);

    const dividendTax = this.calculateDividendTax(
      dividends,
      salary + otherIncome,
      taxRates,
      input.taxYear,
      params.personalAllowanceUsed || 0,
      params.dividendAllowanceUsed || 0
    );

    const totalPersonalTax = incomeTax + employeeNI + dividendTax;
    const netPersonalCash = salary + dividends - totalPersonalTax;

    return {
      salary,
      dividends,
      incomeTax,
      employeeNI,
      dividendTax,
      totalPersonalTax,
      netPersonalCash,
    };
  }

  private calculateScenarioResult(
    params: TaxCalculationParams,
    salary: number,
    taxRates: TaxRates
  ): ScenarioResult {
    const input = this.buildScenarioInput(params, salary);
    const company = this.calculateCompanyResult(input, taxRates);
    const personal = this.calculatePersonalResult(company, input, taxRates, params);
    const totalTax = company.corporationTax + company.employerNI + personal.totalPersonalTax;
    const effectiveTaxRate = input.availableProfit > 0 ? totalTax / input.availableProfit : 0;

    return {
      input,
      company,
      personal,
      summary: {
        totalTax,
        effectiveTaxRate,
      },
    };
  }

  private scenarioResultToLegacyScenario(result: ScenarioResult): TaxScenario {
    return {
      salary: result.personal.salary,
      dividend: result.personal.dividends,
      incomeTax: result.personal.incomeTax,
      employeeNI: result.personal.employeeNI,
      employerNI: result.company.employerNI,
      corporationTax: result.company.corporationTax,
      dividendTax: result.personal.dividendTax,
      totalTax: result.summary.totalTax,
      takeHome: result.personal.netPersonalCash,
      effectiveRate: result.summary.effectiveTaxRate,
      netCost: result.company.salary + result.company.employerNI + result.company.corporationTax,
      personalNetIncome: result.personal.netPersonalCash,
      companyNetProfit: result.company.profitAfterTax,
    };
  }

  private async generateSalaryScenarios(
    params: SalaryOptimizationParams, 
    taxRates: TaxRates
  ): Promise<TaxScenario[]> {
    const scenarios: TaxScenario[] = [];
    
    // Determine salary range
    const minSalary = params.minSalary || 0;
    const maxSalary = params.maxSalary || Math.min(params.availableProfit, 100000);
    const increment = params.salaryIncrement || 1000;

    // Key thresholds to always include
    const keyThresholds = [
      0,
      taxRates.nationalInsurance.employeePrimaryThreshold,
      taxRates.incomeTax.personalAllowance,
      taxRates.incomeTax.basicRateThreshold,
      taxRates.nationalInsurance.employeeUpperEarningsLimit,
      taxRates.incomeTax.higherRateThreshold,
    ].filter(threshold => threshold >= minSalary && threshold <= maxSalary);

    // Generate scenarios
    const salariesToTest = new Set([
      ...this.generateRange(minSalary, maxSalary, increment),
      ...keyThresholds,
    ]);

    for (const salary of Array.from(salariesToTest).sort((a, b) => a - b)) {
      const scenarioResult = this.calculateScenarioResult(
        {
          ...params,
          availableProfit: params.availableProfit,
        },
        salary,
        taxRates
      );

      if (scenarioResult.company.dividendPool < 0) continue;

      scenarios.push(this.scenarioResultToLegacyScenario(scenarioResult));
    }

    return scenarios.sort((a, b) => b.takeHome - a.takeHome);
  }

  private async calculateSingleScenario(
    params: TaxCalculationParams & { salary: number; dividend: number },
    taxRates: TaxRates
  ): Promise<TaxScenario> {
    const scenarioResult = this.calculateScenarioResult(params, params.salary, taxRates);
    return this.scenarioResultToLegacyScenario(scenarioResult);
  }

  private buildSummaryFromScenario(scenario: TaxScenario, additionalIncome: number = 0): {
    grossIncome: number;
    totalTax: number;
    netIncome: number;
    effectiveTaxRate: number;
  } {
    const grossIncome = scenario.salary + scenario.dividend + additionalIncome;
    const totalTax = scenario.totalTax ?? ((scenario.incomeTax || 0) + (scenario.employeeNI || 0) + (scenario.dividendTax || 0));
    const netIncome = scenario.takeHome || Math.max(0, grossIncome - totalTax);
    const effectiveTaxRate = scenario.effectiveRate ?? (grossIncome > 0 ? totalTax / grossIncome : 0);
    return {
      grossIncome,
      totalTax,
      netIncome,
      effectiveTaxRate,
    };
  }

  private buildBreakdownFromScenario(scenario: TaxScenario): {
    incomeTax: number;
    employeeNI: number;
    employerNI: number;
    nationalInsurance: number;
    corporationTax: number;
    dividendTax: number;
    totalTax: number;
  } {
    const employeeNI = scenario.employeeNI || 0;
    const employerNI = scenario.employerNI || 0;
    const incomeTax = scenario.incomeTax || 0;
    const dividendTax = scenario.dividendTax || 0;
    return {
      incomeTax,
      employeeNI,
      employerNI,
      nationalInsurance: employeeNI + employerNI,
      corporationTax: scenario.corporationTax || 0,
      dividendTax,
      totalTax: incomeTax + employeeNI + dividendTax,
    };
  }

  private buildComparisonReport(scenarios: TaxScenario[]): {
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
  } {
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

    const recommendations: Array<{ scenario: TaxScenario; reason: string; benefit: string }> = [];
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

    return {
      summary,
      recommendations,
      insights: [],
    };
  }

  private buildIncomeTaxBands(
    nonDividendIncome: number,
    taxRates: TaxRates,
    taxYear: string,
    personalAllowanceUsed: number = 0,
    allowanceIncome?: number
  ): {
    taxableIncome: number;
    taxByBand: {
      basicRate: number;
      higherRate: number;
      additionalRate: number;
    };
    totalTax: number;
    personalAllowance: number;
  } {
    const allowanceBasis = allowanceIncome ?? nonDividendIncome;
    const personalAllowance = Math.max(
      0,
      this.taxRatesService.getPersonalAllowance(allowanceBasis, taxYear) - personalAllowanceUsed
    );
    const taxableIncome = Math.max(0, nonDividendIncome - personalAllowance);
    const basicRateLimit = Math.max(0, taxRates.incomeTax.basicRateThreshold - personalAllowance);
    const higherRateLimit = Math.max(0, taxRates.incomeTax.higherRateThreshold - personalAllowance);

    const basicRateIncome = Math.min(taxableIncome, basicRateLimit);
    const higherRateIncome = Math.min(
      Math.max(0, taxableIncome - basicRateLimit),
      Math.max(0, higherRateLimit - basicRateLimit)
    );
    const additionalRateIncome = Math.max(0, taxableIncome - higherRateLimit);

    const taxByBand = {
      basicRate: basicRateIncome * (taxRates.incomeTax.basicRate / 100),
      higherRate: higherRateIncome * (taxRates.incomeTax.higherRate / 100),
      additionalRate: additionalRateIncome * (taxRates.incomeTax.additionalRate / 100),
    };

    return {
      taxableIncome,
      taxByBand,
      totalTax: taxByBand.basicRate + taxByBand.higherRate + taxByBand.additionalRate,
      personalAllowance,
    };
  }

  private buildDividendTaxBands(
    dividend: number,
    nonDividendIncome: number,
    taxRates: TaxRates,
    taxYear: string,
    personalAllowanceUsed: number = 0,
    dividendAllowanceUsed: number = 0
  ): {
    taxableDividend: number;
    taxByBand: {
      basicRate: number;
      higherRate: number;
      additionalRate: number;
    };
    totalTax: number;
  } {
    if (dividend <= 0) {
      return {
        taxableDividend: 0,
        taxByBand: { basicRate: 0, higherRate: 0, additionalRate: 0 },
        totalTax: 0,
      };
    }

    const totalIncome = nonDividendIncome + dividend;
    const personalAllowance = Math.max(
      0,
      this.taxRatesService.getPersonalAllowance(totalIncome, taxYear) - personalAllowanceUsed
    );
    const remainingPersonalAllowance = Math.max(0, personalAllowance - nonDividendIncome);
    const dividendAfterPersonalAllowance = Math.max(0, dividend - remainingPersonalAllowance);
    const availableDividendAllowance = Math.max(0, taxRates.dividendTax.allowance - dividendAllowanceUsed);
    const taxableDividend = Math.max(0, dividendAfterPersonalAllowance - availableDividendAllowance);

    if (dividendAfterPersonalAllowance === 0) {
      return {
        taxableDividend: 0,
        taxByBand: { basicRate: 0, higherRate: 0, additionalRate: 0 },
        totalTax: 0,
      };
    }

    const taxableNonDividend = Math.max(0, nonDividendIncome - personalAllowance);
    const basicRateLimit = Math.max(0, taxRates.incomeTax.basicRateThreshold - personalAllowance);
    const higherRateLimit = Math.max(0, taxRates.incomeTax.higherRateThreshold - personalAllowance);
    const basicRateRemaining = Math.max(0, basicRateLimit - taxableNonDividend);
    const higherRateRemaining = Math.max(0, higherRateLimit - taxableNonDividend - basicRateRemaining);

    let remainingDividendForBands = dividendAfterPersonalAllowance;
    const bandDividends = {
      basicRate: 0,
      higherRate: 0,
      additionalRate: 0,
    };

    if (basicRateRemaining > 0 && remainingDividendForBands > 0) {
      const basicRateDividend = Math.min(remainingDividendForBands, basicRateRemaining);
      bandDividends.basicRate = basicRateDividend;
      remainingDividendForBands -= basicRateDividend;
    }

    if (higherRateRemaining > 0 && remainingDividendForBands > 0) {
      const higherRateDividend = Math.min(remainingDividendForBands, higherRateRemaining);
      bandDividends.higherRate = higherRateDividend;
      remainingDividendForBands -= higherRateDividend;
    }

    if (remainingDividendForBands > 0) {
      bandDividends.additionalRate = remainingDividendForBands;
    }

    let remainingAllowance = availableDividendAllowance;
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

    const taxByBand = {
      basicRate: 0,
      higherRate: 0,
      additionalRate: 0,
    };

    if (taxableBands.basicRate > 0) {
      taxByBand.basicRate = taxableBands.basicRate * (taxRates.dividendTax.basicRate / 100);
    }

    if (taxableBands.higherRate > 0) {
      taxByBand.higherRate = taxableBands.higherRate * (taxRates.dividendTax.higherRate / 100);
    }

    if (taxableBands.additionalRate > 0) {
      taxByBand.additionalRate = taxableBands.additionalRate * (taxRates.dividendTax.additionalRate / 100);
    }

    return {
      taxableDividend,
      taxByBand,
      totalTax: taxByBand.basicRate + taxByBand.higherRate + taxByBand.additionalRate,
    };
  }

  private calculateIncomeTax(
    salary: number, 
    taxRates: TaxRates, 
    taxYear: string,
    personalAllowanceUsed: number = 0,
    otherIncome: number = 0,
    scottishTaxpayer: boolean = false,
    allowanceIncome?: number
  ): number {
    const totalIncome = salary + otherIncome;
    const { totalTax } = this.buildIncomeTaxBands(
      totalIncome,
      taxRates,
      taxYear,
      personalAllowanceUsed,
      allowanceIncome
    );

    return totalTax;
  }

  private calculateEmployeeNI(
    salary: number, 
    taxRates: TaxRates, 
    studentLoan?: boolean
  ): number {
    if (salary <= taxRates.nationalInsurance.employeePrimaryThreshold) {
      return 0;
    }

    let ni = 0;

    // Primary rate
    const primaryRateIncome = Math.min(
      salary - taxRates.nationalInsurance.employeePrimaryThreshold,
      taxRates.nationalInsurance.employeeUpperEarningsLimit - taxRates.nationalInsurance.employeePrimaryThreshold
    );
    ni += primaryRateIncome * (taxRates.nationalInsurance.employeeRate / 100);

    // Additional rate (above UEL)
    if (salary > taxRates.nationalInsurance.employeeUpperEarningsLimit) {
      const additionalRateIncome = salary - taxRates.nationalInsurance.employeeUpperEarningsLimit;
      ni += additionalRateIncome * (taxRates.nationalInsurance.employeeAdditionalRate / 100);
    }

    return ni;
  }

  private calculateEmployerNI(salary: number, taxRates: TaxRates): number {
    if (salary <= taxRates.nationalInsurance.employerPrimaryThreshold) {
      return 0;
    }

    let ni = 0;

    // Primary rate
    const primaryRateIncome = Math.min(
      salary - taxRates.nationalInsurance.employerPrimaryThreshold,
      taxRates.nationalInsurance.employerUpperSecondaryThreshold - taxRates.nationalInsurance.employerPrimaryThreshold
    );
    ni += primaryRateIncome * (taxRates.nationalInsurance.employerRate / 100);

    // Additional rate (above UST)
    if (salary > taxRates.nationalInsurance.employerUpperSecondaryThreshold) {
      const additionalRateIncome = salary - taxRates.nationalInsurance.employerUpperSecondaryThreshold;
      ni += additionalRateIncome * (taxRates.nationalInsurance.employerAdditionalRate / 100);
    }

    return ni;
  }

  private calculateClass4NIC(profit: number): number {
    const lowerThreshold = 12570;
    const upperThreshold = 50270;
    if (profit <= lowerThreshold) return 0;
    const mainBand = Math.min(profit, upperThreshold) - lowerThreshold;
    const additionalBand = Math.max(0, profit - upperThreshold);
    return mainBand * 0.06 + additionalBand * 0.02;
  }

  private calculateClass2NIC(profit: number, payClass2?: boolean): number {
    const smallProfitsThreshold = 6845;
    if (!payClass2 || profit >= smallProfitsThreshold) return 0;
    const weeklyRate = 3.5;
    return weeklyRate * 52;
  }

  private calculateDividendTax(
    dividend: number,
    nonDividendIncome: number,
    taxRates: TaxRates,
    taxYear: string,
    personalAllowanceUsed: number = 0,
    dividendAllowanceUsed: number = 0
  ): number {
    const { totalTax } = this.buildDividendTaxBands(
      dividend,
      nonDividendIncome,
      taxRates,
      taxYear,
      personalAllowanceUsed,
      dividendAllowanceUsed
    );

    return totalTax;
  }

  private buildPersonalResults(
    params: TaxCalculationParams,
    scenario: TaxScenario,
    taxRates: TaxRates
  ): TaxCalculationReport['results']['personal'] {
    const benefits = 0;
    const otherIncome = params.otherIncome || 0;
    const nonDividendIncome = scenario.salary + otherIncome + benefits;
    const totalDividends = scenario.dividend || 0;

    const totalGrossIncome = nonDividendIncome + totalDividends;
    const incomeTaxBands = this.buildIncomeTaxBands(
      nonDividendIncome,
      taxRates,
      params.taxYear,
      params.personalAllowanceUsed || 0,
      totalGrossIncome
    );

    const dividendTaxBands = this.buildDividendTaxBands(
      totalDividends,
      nonDividendIncome,
      taxRates,
      params.taxYear,
      params.personalAllowanceUsed || 0,
      params.dividendAllowanceUsed || 0
    );

    const taxableIncome = incomeTaxBands.taxableIncome + dividendTaxBands.taxableDividend;
    const employeeNIC = scenario.employeeNI || 0;
    const employerNIC = scenario.employerNI || 0;
    const totalTax = incomeTaxBands.totalTax + dividendTaxBands.totalTax + employeeNIC;
    const netTakeHome = totalGrossIncome - incomeTaxBands.totalTax - dividendTaxBands.totalTax - employeeNIC;

    return {
      totalGrossIncome,
      taxableIncome,
      incomeTaxByBand: incomeTaxBands.taxByBand,
      dividendTaxByBand: dividendTaxBands.taxByBand,
      nationalInsurance: {
        employeeNIC,
        employerNIC,
      },
      personalAllowance: incomeTaxBands.personalAllowance,
      dividendAllowance: taxRates.dividendTax.allowance,
      totalTax,
      netTakeHome,
    };
  }

  private buildCompanyResults(
    params: TaxCalculationParams,
    scenario: TaxScenario
  ): TaxCalculationReport['results']['company'] {
    const profitBeforeTax = params.availableProfit || 0;
    const salaryExpense = scenario.salary || 0;
    const employerNIC = scenario.employerNI || 0;
    const taxableProfit = profitBeforeTax - salaryExpense - employerNIC;
    const corporationTax = scenario.corporationTax || 0;
    const dividendsPaid = scenario.dividend || 0;
    const netCompanyCashAfterTax = taxableProfit - corporationTax - dividendsPaid;

    return {
      profitBeforeTax,
      salaryExpense,
      employerNIC,
      taxableProfit,
      corporationTax,
      dividendsPaid,
      netCompanyCashAfterTax,
    };
  }

  private buildOptimizationScenarioEntry(
    params: TaxCalculationParams,
    scenario: TaxScenario
  ): NonNullable<TaxCalculationReport['results']['scenarioComparison']>[number] {
    const availableProfit = params.availableProfit || 0;
    const salary = scenario.salary || 0;
    const employerNI = scenario.employerNI || 0;
    const taxableProfit = Math.max(0, availableProfit - salary - employerNI);
    const corporationTax = scenario.corporationTax || 0;
    const dividendPool = Math.max(0, taxableProfit - corporationTax);
    const otherIncome = params.otherIncome || 0;
    const incomeTax = scenario.incomeTax || 0;
    const employeeNI = scenario.employeeNI || 0;
    const dividendTax = scenario.dividendTax || 0;
    const totalPersonalTax = incomeTax + employeeNI + dividendTax;
    const netPersonalIncome = salary + dividendPool + otherIncome - totalPersonalTax;
    const totalTaxAndNI = totalPersonalTax + employerNI + corporationTax;
    const netTakeHome = Math.max(0, salary + dividendPool + otherIncome - totalPersonalTax);
    const effectiveRate = availableProfit > 0 ? totalTaxAndNI / availableProfit : 0;

    return {
      scenarioName: scenario.name || `Salary £${salary.toLocaleString('en-GB')}`,
      company: {
        availableProfit,
        salary,
        employerNI,
        taxableProfit,
        corporationTax,
        dividendPool,
      },
      personal: {
        salary,
        dividends: dividendPool,
        otherIncome,
        incomeTax,
        employeeNI,
        dividendTax,
        totalPersonalTax,
        netPersonalIncome,
      },
      summary: {
        totalTaxAndNI,
        netTakeHome,
        effectiveRate,
      },
    };
  }

  private buildReportFromScenario(
    params: TaxCalculationParams,
    scenario: TaxScenario,
    taxRates: TaxRates,
    calculationId: string,
    calculationType: TaxCalculationReport['calculationType'],
    scenarios?: TaxScenario[]
  ): TaxCalculationReport {
    const personal = this.buildPersonalResults(params, scenario, taxRates);
    const company = this.buildCompanyResults(params, scenario);
    const totalTaxAndNI = personal.totalTax + (company.employerNIC || 0) + (company.corporationTax || 0);
    const netTakeHome = Math.max(
      0,
      (scenario.salary || 0) + (scenario.dividend || 0) + (params.otherIncome || 0) - personal.totalTax
    );
    const optimisation = {
      optimalSalary: scenario.salary || 0,
      optimalDividends: scenario.dividend || 0,
      takeHomeOptimised: scenario.takeHome || personal.netTakeHome,
      effectiveTaxRate: scenario.effectiveRate || 0,
      totalTaxAndNI,
      netTakeHome,
    };

    return {
      calculationId,
      clientId: params.clientId,
      calculationType,
      inputs: {
        salaryGross: scenario.salary || 0,
        benefits: 0,
        otherIncome: params.otherIncome || 0,
        dividends: scenario.dividend || 0,
        personalTaxYear: params.taxYear,
        companyProfitBeforeTax: params.availableProfit || 0,
        salaryExpense: scenario.salary || 0,
        employerNIC: scenario.employerNI || 0,
        taxYear: params.taxYear,
        dividendsPaid: scenario.dividend || 0,
      },
      results: {
        personal,
        company,
        optimisation,
        scenarioComparison: scenarios?.map((item) =>
          this.buildOptimizationScenarioEntry(params, item)
        ),
      },
      reportSummary: {},
    };
  }

  private calculateCorporationTaxLiability(profit: number, taxRates: TaxRates): number {
    if (profit <= 0) return 0;

    // Small companies rate applies up to marginal relief threshold
    if (profit <= taxRates.corporationTax.marginalReliefThreshold) {
      return profit * (taxRates.corporationTax.smallCompaniesRate / 100);
    }

    // Main rate applies above marginal relief upper limit
    if (profit >= taxRates.corporationTax.marginalReliefUpperLimit) {
      return profit * (taxRates.corporationTax.mainRate / 100);
    }

    // Marginal relief applies between thresholds
    const mainRateTax = profit * (taxRates.corporationTax.mainRate / 100);
    const marginalReliefFraction = taxRates.corporationTax.marginalReliefFraction ?? 0.015;
    const marginalRelief = (taxRates.corporationTax.marginalReliefUpperLimit - profit) * marginalReliefFraction;

    return mainRateTax - marginalRelief;
  }

  private findOptimalScenario(scenarios: TaxScenario[], considerEmployerNI: boolean = true): TaxScenario {
    if (considerEmployerNI) {
      // Optimize for lowest total cost to company
      return scenarios.reduce((best, current) => 
        current.netCost < best.netCost ? current : best
      );
    } else {
      // Optimize for highest take-home pay
      return scenarios.reduce((best, current) => 
        current.takeHome > best.takeHome ? current : best
      );
    }
  }

  /**
   * Get recommendations for a calculation
   */
  async getCalculationRecommendations(calculationId: string): Promise<TaxRecommendation[]> {
    return this.recommendationService.getRecommendations(calculationId);
  }

  /**
   * Get client recommendations with filtering
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
    return this.recommendationService.getClientRecommendations(clientId, options);
  }

  /**
   * Generate actionable advice for recommendations
   */
  async generateActionableAdvice(
    calculationId: string
  ): Promise<Array<{
    recommendation: TaxRecommendation;
    implementationSteps: string[];
    timeline: string;
    requiredDocuments: string[];
    estimatedEffort: 'LOW' | 'MEDIUM' | 'HIGH';
    dependencies: string[];
  }>> {
    const calculation = await this.getCalculation(calculationId);
    if (!calculation || !calculation.recommendations) {
      return [];
    }

    return this.recommendationService.generateActionableAdvice(
      calculation.recommendations,
      calculation.clientId
    );
  }

  /**
   * Calculate potential savings from recommendations
   */
  async calculateRecommendationSavings(
    calculationId: string
  ): Promise<{
    totalPotentialSavings: number;
    savingsByType: Record<string, number>;
    implementationPriority: Array<{
      recommendation: TaxRecommendation;
      savingsToEffortRatio: number;
    }>;
  }> {
    const calculation = await this.getCalculation(calculationId);
    if (!calculation || !calculation.recommendations) {
      return {
        totalPotentialSavings: 0,
        savingsByType: {},
        implementationPriority: [],
      };
    }

    return this.recommendationService.calculatePotentialSavings(
      calculation,
      calculation.recommendations
    );
  }

  private async validateCalculationParams(params: TaxCalculationParams): Promise<void> {
    if (params.availableProfit <= 0) {
      throw new BadRequestException('Available profit must be greater than zero');
    }

    if (!params.taxYear.match(/^\d{4}-\d{2}$/)) {
      throw new BadRequestException('Tax year must be in format YYYY-YY (e.g., 2024-25)');
    }
  }

  // Legacy methods for backward compatibility
  async getAllCalculations(limit?: number, offset?: number): Promise<TaxCalculationResult[]> {
    const { calculations } = await this.persistenceService.getCalculationHistory({
      limit: limit || 50,
      offset: offset || 0,
    });
    return calculations;
  }

  async saveCalculation(calculation: TaxCalculationResult): Promise<void> {
    await this.persistenceService.storeCalculation(calculation);
  }

  async deleteCalculation(id: string): Promise<boolean> {
    const result = await this.persistenceService.deleteCalculation(id);
    return result.success;
  }

  // Private utility methods
  private generateRange(min: number, max: number, increment: number): number[] {
    const range: number[] = [];
    for (let i = min; i <= max; i += increment) {
      range.push(i);
    }
    return range;
  }
}

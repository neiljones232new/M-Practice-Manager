import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { FileStorageService } from '../../file-storage/file-storage.service';
import { 
  TaxCalculationResult, 
  TaxScenario, 
  TaxRecommendation,
  TaxAmountType,
} from '../interfaces/tax-calculation.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enhanced Tax Calculation Persistence Service
 * 
 * Provides comprehensive persistence and retrieval capabilities for tax calculations:
 * - SQLite database storage with proper indexing
 * - Calculation history with advanced filtering
 * - Scenario storage in relational format
 * - Result formatting and display logic
 * - Migration from JSON to database storage
 */
@Injectable()
export class TaxCalculationPersistenceService {
  private readonly logger = new Logger(TaxCalculationPersistenceService.name);

  constructor(
    private databaseService: DatabaseService,
    private fileStorageService: FileStorageService,
  ) {}

  /**
   * Store tax calculation with scenarios in database
   */
  async storeCalculation(calculation: TaxCalculationResult): Promise<{ success: boolean; message: string; id?: string }> {
    try {
      // Ensure calculation has an ID
      if (!calculation.id) {
        calculation.id = uuidv4();
      }
      this.applyAmountTypeDefaults(calculation);

      // Store in database with enhanced error handling
      const result = await this.databaseService.storeCalculation(calculation);
      
      if (result.success) {
        this.logger.log(`Successfully stored tax calculation ${calculation.id} for client ${calculation.clientId}`);
        
        // Also store in file storage as backup (for migration period)
        try {
          await this.fileStorageService.writeJson('tax-calculations', calculation.id, calculation);
        } catch (fileError) {
          this.logger.warn(`Failed to store backup in file storage: ${fileError.message}`);
          // Don't fail the operation if backup fails
        }
        
        return result;
      } else {
        // Fallback to file storage if database fails
        this.logger.warn(`Database storage failed, falling back to file storage: ${result.message}`);
        await this.fileStorageService.writeJson('tax-calculations', calculation.id, calculation);
        return { success: true, message: 'Tax calculation stored in file storage (fallback)', id: calculation.id };
      }
    } catch (error) {
      this.logger.error(`Failed to store tax calculation: ${error.message}`, error);
      return { success: false, message: 'Failed to store tax calculation' };
    }
  }

  /**
   * Retrieve calculation by ID with full scenario data
   */
  async getCalculation(id: string): Promise<TaxCalculationResult | null> {
    try {
      // Try database first
      const calculation = await this.databaseService.getCalculationById(id);
      
      if (calculation) {
        const formatted = this.formatCalculationForDisplay(calculation);
        const hydrated = await this.hydrateReportFromFileStorage(formatted);
        return this.ensureAccountingPeriodForCorpTax(hydrated);
      }

      // Fallback to file storage for legacy calculations
      const fileCalculation = await this.fileStorageService.readJson<TaxCalculationResult>('tax-calculations', id);
      
      if (fileCalculation) {
        const formatted = this.formatCalculationForDisplay(fileCalculation);
        return this.ensureAccountingPeriodForCorpTax(formatted);
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get tax calculation ${id}: ${error.message}`);
      return null;
    }
  }

  private async hydrateReportFromFileStorage(
    calculation: TaxCalculationResult
  ): Promise<TaxCalculationResult> {
    if (calculation.report?.results?.scenarioComparison?.length) {
      return calculation;
    }
    try {
      const fileCalculation = await this.fileStorageService.readJson<TaxCalculationResult>(
        'tax-calculations',
        calculation.id
      );
      if (!fileCalculation?.report) {
        return calculation;
      }
      return { ...calculation, report: fileCalculation.report };
    } catch (error) {
      this.logger.warn(`Failed to load report for calculation ${calculation.id}: ${error.message}`);
      return calculation;
    }
  }

  /**
   * Get calculation history with advanced filtering and pagination
   */
  async getCalculationHistory(options: {
    clientId?: string;
    taxYear?: string;
    calculationType?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
    includeScenarios?: boolean;
  }): Promise<{
    calculations: TaxCalculationResult[];
    total: number;
    summary: {
      totalSavingsIdentified: number;
      averageEffectiveRate: number;
      mostCommonOptimization: string;
    };
  }> {
    const { calculations, total } = await this.databaseService.getCalculationHistory(
      options.clientId,
      options.taxYear,
      options.calculationType,
      options.limit || 50,
      options.offset || 0
    );

    // Format calculations for display
    const formattedCalculations = await Promise.all(
      calculations.map(async (calc) => {
        const formatted = this.formatCalculationForDisplay(calc);
        return this.ensureAccountingPeriodForCorpTax(formatted);
      })
    );

    // Calculate summary statistics
    const summary = this.calculateHistorySummary(formattedCalculations);

    return {
      calculations: formattedCalculations,
      total,
      summary,
    };
  }

  /**
   * Get client calculations with enhanced formatting
   */
  async getClientCalculations(clientId: string, limit: number = 10): Promise<TaxCalculationResult[]> {
    try {
      const calculations = await this.databaseService.getClientCalculations(clientId, limit);
      return Promise.all(
        calculations.map(async (calc) => {
          const formatted = this.formatCalculationForDisplay(calc);
          return this.ensureAccountingPeriodForCorpTax(formatted);
        })
      );
    } catch (error) {
      this.logger.error(`Failed to get client calculations: ${error.message}`);
      
      // Fallback to file storage
      try {
        const fileCalculations = await this.fileStorageService.searchFiles<TaxCalculationResult>(
          'tax-calculations',
          (calc) => calc.clientId === clientId
        );

        fileCalculations.sort((a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime());
        
        return Promise.all(
          fileCalculations
            .slice(0, limit)
            .map(async (calc) => {
              const formatted = this.formatCalculationForDisplay(calc);
              return this.ensureAccountingPeriodForCorpTax(formatted);
            })
        );
      } catch (fileError) {
        this.logger.error(`File storage fallback failed: ${fileError.message}`);
        return [];
      }
    }
  }

  /**
   * Get latest calculation for client
   */
  async getLatestCalculation(clientId: string): Promise<TaxCalculationResult | null> {
    const calculations = await this.getClientCalculations(clientId, 1);
    return calculations.length > 0 ? calculations[0] : null;
  }

  /**
   * Get tax calculation statistics
   */
  async getTaxCalculationStats(clientId?: string): Promise<{
    totalCalculations: number;
    calculationsByType: Record<string, number>;
    calculationsByTaxYear: Record<string, number>;
    averageSavings: number;
    totalSavingsIdentified: number;
    latestCalculation?: TaxCalculationResult;
    topOptimizations: Array<{ type: string; count: number; averageSaving: number }>;
  }> {
    const stats = await this.databaseService.getTaxCalculationStats(clientId);
    
    // Calculate total savings identified
    const { calculations } = await this.getCalculationHistory({ 
      clientId, 
      limit: 1000 // Get all for accurate totals
    });
    
    const totalSavingsIdentified = calculations.reduce((sum, calc) => 
      sum + (calc.estimatedSavings || 0), 0
    );

    // Analyze top optimizations
    const optimizationCounts: Record<string, { count: number; totalSaving: number }> = {};
    
    calculations.forEach(calc => {
      if (calc.recommendations) {
        calc.recommendations.forEach((rec: TaxRecommendation) => {
          if (!optimizationCounts[rec.type]) {
            optimizationCounts[rec.type] = { count: 0, totalSaving: 0 };
          }
          optimizationCounts[rec.type].count++;
          optimizationCounts[rec.type].totalSaving += rec.potentialSaving || 0;
        });
      }
    });

    const topOptimizations = Object.entries(optimizationCounts)
      .map(([type, data]) => ({
        type,
        count: data.count,
        averageSaving: data.count > 0 ? data.totalSaving / data.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      ...stats,
      totalSavingsIdentified,
      topOptimizations,
    };
  }

  /**
   * Delete calculation and all related data
   */
  async deleteCalculation(id: string): Promise<{ success: boolean; message: string }> {
    try {
      // Delete from database
      const dbResult = await this.databaseService.deleteCalculation(id);
      
      // Also delete from file storage if exists
      try {
        await this.fileStorageService.deleteJson('tax-calculations', id);
      } catch (fileError) {
        // Ignore file storage errors during deletion
        this.logger.warn(`Failed to delete from file storage: ${fileError.message}`);
      }

      return dbResult;
    } catch (error) {
      this.logger.error(`Failed to delete tax calculation ${id}: ${error.message}`);
      return { success: false, message: 'Failed to delete tax calculation' };
    }
  }

  /**
   * Migrate calculations from file storage to database
   */
  async migrateFromFileStorage(): Promise<{ migrated: number; errors: number; details: string[] }> {
    let migrated = 0;
    let errors = 0;
    const details: string[] = [];

    try {
      // Get all calculations from file storage
      const fileCalculations = await this.fileStorageService.searchFiles<TaxCalculationResult>(
        'tax-calculations',
        () => true
      );

      this.logger.log(`Found ${fileCalculations.length} calculations in file storage to migrate`);

      for (const calculation of fileCalculations) {
        try {
          // Check if already exists in database
          const existing = await this.databaseService.getCalculationById(calculation.id);
          
          if (!existing) {
            // Store in database
            const result = await this.databaseService.storeCalculation(calculation);
            
            if (result.success) {
              migrated++;
              details.push(`Migrated calculation ${calculation.id} for client ${calculation.clientId}`);
            } else {
              errors++;
              details.push(`Failed to migrate calculation ${calculation.id}: ${result.message}`);
            }
          } else {
            details.push(`Calculation ${calculation.id} already exists in database, skipping`);
          }
        } catch (error) {
          errors++;
          details.push(`Error migrating calculation ${calculation.id}: ${error.message}`);
        }
      }

      this.logger.log(`Migration completed: ${migrated} migrated, ${errors} errors`);
      
      return { migrated, errors, details };
    } catch (error) {
      this.logger.error(`Migration failed: ${error.message}`);
      return { migrated, errors: errors + 1, details: [...details, `Migration failed: ${error.message}`] };
    }
  }

  /**
   * Format calculation for display with enhanced presentation
   */
  private formatCalculationForDisplay(calculation: TaxCalculationResult): TaxCalculationResult {
    this.applyAmountTypeDefaults(calculation);
    // Ensure all numeric values are properly formatted
    const formatted = {
      ...calculation,
      optimizedSalary: this.roundCurrency(calculation.optimizedSalary || 0),
      optimizedDividend: this.roundCurrency(calculation.optimizedDividend || 0),
      totalTakeHome: this.roundCurrency(calculation.totalTakeHome || 0),
      totalTaxLiability: this.roundCurrency(calculation.totalTaxLiability || 0),
      estimatedSavings: this.roundCurrency(calculation.estimatedSavings || 0),
    };

    // Format scenarios if present
    if (formatted.scenarios) {
      formatted.scenarios = formatted.scenarios.map(scenario => ({
        ...scenario,
        amountType: scenario.amountType || this.inferAmountType(formatted.calculationType),
        salary: this.roundCurrency(scenario.salary),
        dividend: this.roundCurrency(scenario.dividend),
        incomeTax: this.roundCurrency(scenario.incomeTax),
        employeeNI: this.roundCurrency(scenario.employeeNI),
        employerNI: this.roundCurrency(scenario.employerNI),
        dividendTax: this.roundCurrency(scenario.dividendTax),
        corporationTax: this.roundCurrency(scenario.corporationTax),
        totalTax: this.roundCurrency(scenario.totalTax),
        takeHome: this.roundCurrency(scenario.takeHome),
        effectiveRate: this.roundPercentage(scenario.effectiveRate),
        netCost: this.roundCurrency((scenario as any).netCost || 0),
      }));
    }

    // Add display-friendly properties
    (formatted as any).displayProperties = {
      formattedOptimizedSalary: this.formatCurrency(formatted.optimizedSalary),
      formattedOptimizedDividend: this.formatCurrency(formatted.optimizedDividend),
      formattedTotalTakeHome: this.formatCurrency(formatted.totalTakeHome),
      formattedTotalTaxLiability: this.formatCurrency(formatted.totalTaxLiability),
      formattedEstimatedSavings: this.formatCurrency(formatted.estimatedSavings),
      calculationTypeDisplay: this.getCalculationTypeDisplay(formatted.calculationType),
      taxYearDisplay: this.getTaxYearDisplay(formatted.taxYear),
      calculatedAtDisplay: this.formatDate(formatted.calculatedAt),
    };

    return formatted;
  }

  private applyAmountTypeDefaults(calculation: TaxCalculationResult): void {
    const inferred = this.inferAmountType(calculation.calculationType);
    if (!calculation.amountType) {
      calculation.amountType = inferred;
    }
    if (calculation.parameters && !calculation.parameters.amountType) {
      calculation.parameters.amountType = calculation.amountType;
    }
    if (calculation.scenarios) {
      calculation.scenarios = calculation.scenarios.map((scenario) => ({
        ...scenario,
        amountType: scenario.amountType || inferred,
      }));
    }
  }

  private async ensureAccountingPeriodForCorpTax(calculation: TaxCalculationResult): Promise<TaxCalculationResult> {
    if (calculation.calculationType !== 'CORPORATION_TAX') {
      return calculation;
    }

    const existingStart = calculation.accountingPeriodStart || calculation.parameters?.accountingPeriodStart;
    const existingEnd = calculation.accountingPeriodEnd || calculation.parameters?.accountingPeriodEnd;
    if (existingStart && existingEnd) {
      return calculation;
    }

    const clientMatches = await this.fileStorageService.searchFiles<any>(
      'clients',
      (client) => client.id === calculation.clientId
    );
    const client = clientMatches[0];
    const { day, month } = this.getAccountingReference(client);
    const endYear = this.resolveAccountingPeriodEndYear(calculation, client);
    const { startDate, endDate } = this.buildAccountingPeriodDates(endYear, month, day);

    calculation.accountingPeriodStart = startDate;
    calculation.accountingPeriodEnd = endDate;
    calculation.parameters = {
      ...(calculation.parameters || {}),
      accountingPeriodStart: startDate,
      accountingPeriodEnd: endDate,
    };

    return calculation;
  }

  private getAccountingReference(client: any): { day: number; month: number } {
    const fallbackDay = 31;
    const fallbackMonth = 3;
    if (!client) return { day: fallbackDay, month: fallbackMonth };

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

  private resolveAccountingPeriodEndYear(calculation: TaxCalculationResult, client: any): number {
    if (calculation.parameters?.accountingPeriodEndYear) {
      const parsed = parseInt(String(calculation.parameters.accountingPeriodEndYear), 10);
      if (Number.isFinite(parsed)) return parsed;
    }
    if (calculation.taxYear) {
      const startYear = parseInt(String(calculation.taxYear).split('-')[0], 10);
      if (Number.isFinite(startYear)) return startYear + 1;
    }
    if (client?.accountsLastMadeUpTo) {
      const last = new Date(client.accountsLastMadeUpTo);
      if (!Number.isNaN(last.getTime())) return last.getFullYear();
    }
    return new Date().getFullYear();
  }

  private buildAccountingPeriodDates(endYear: number, month: number, day: number): { startDate: string; endDate: string } {
    const cappedMonth = Math.min(Math.max(month, 1), 12);
    const daysInMonth = new Date(Date.UTC(endYear, cappedMonth, 0)).getUTCDate();
    const cappedDay = Math.min(Math.max(day, 1), daysInMonth);

    const end = new Date(Date.UTC(endYear, cappedMonth - 1, cappedDay));
    const start = new Date(Date.UTC(endYear - 1, cappedMonth - 1, cappedDay));
    start.setUTCDate(start.getUTCDate() + 1);

    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }

  private inferAmountType(calculationType: TaxCalculationResult['calculationType']): TaxAmountType {
    switch (calculationType) {
      case 'CORPORATION_TAX':
        return 'profit';
      case 'DIVIDEND_TAX':
        return 'dividend';
      case 'INCOME_TAX':
        return 'salary';
      case 'SALARY_OPTIMIZATION':
      case 'SCENARIO_COMPARISON':
      default:
        return 'targetTakeHome';
    }
  }

  /**
   * Calculate summary statistics for calculation history
   */
  private calculateHistorySummary(calculations: TaxCalculationResult[]): {
    totalSavingsIdentified: number;
    averageEffectiveRate: number;
    mostCommonOptimization: string;
  } {
    const totalSavingsIdentified = calculations.reduce((sum, calc) => 
      sum + (calc.estimatedSavings || 0), 0
    );

    // Calculate average effective rate from scenarios
    const scenariosWithRates = calculations
      .flatMap(calc => calc.scenarios || [])
      .filter(scenario => scenario.effectiveRate > 0);

    const averageEffectiveRate = scenariosWithRates.length > 0
      ? scenariosWithRates.reduce((sum, scenario) => sum + scenario.effectiveRate, 0) / scenariosWithRates.length
      : 0;

    // Find most common optimization type
    const optimizationCounts: Record<string, number> = {};
    calculations.forEach(calc => {
      if (calc.recommendations) {
        calc.recommendations.forEach((rec: TaxRecommendation) => {
          optimizationCounts[rec.type] = (optimizationCounts[rec.type] || 0) + 1;
        });
      }
    });

    const mostCommonOptimization = Object.entries(optimizationCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'SALARY_OPTIMIZATION';

    return {
      totalSavingsIdentified: this.roundCurrency(totalSavingsIdentified),
      averageEffectiveRate: this.roundPercentage(averageEffectiveRate),
      mostCommonOptimization,
    };
  }

  // Utility methods for formatting
  private roundCurrency(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  private roundPercentage(rate: number): number {
    return Math.round(rate * 100) / 100;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private getCalculationTypeDisplay(type: string): string {
    const displayMap: Record<string, string> = {
      'SALARY_OPTIMIZATION': 'Salary Optimization',
      'SCENARIO_COMPARISON': 'Scenario Comparison',
      'CORPORATION_TAX': 'Corporation Tax',
      'DIVIDEND_TAX': 'Dividend Tax',
      'INCOME_TAX': 'Income Tax',
    };
    return displayMap[type] || type;
  }

  private getTaxYearDisplay(taxYear: string): string {
    // Convert "2024-25" to "2024/25"
    return taxYear.replace('-', '/');
  }
}

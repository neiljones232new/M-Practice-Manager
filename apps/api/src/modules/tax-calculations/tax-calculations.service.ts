import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FileStorageService } from '../file-storage/file-storage.service';
import { TaxEngineService } from './services/tax-engine.service';
import { TaxRatesService } from './services/tax-rates.service';
import { TaxCalculationResult } from './interfaces/tax-calculation.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TaxCalculationsService {
  private readonly logger = new Logger(TaxCalculationsService.name);

  constructor(
    private readonly fileStorage: FileStorageService,
    private readonly taxEngine: TaxEngineService,
    private readonly taxRates: TaxRatesService,
  ) {}

  /**
   * Get all tax calculations across clients (for dashboard/overview)
   */
  async getAllCalculations(limit?: number, offset?: number): Promise<TaxCalculationResult[]> {
    try {
      const allCalculations = await this.fileStorage.searchFiles<TaxCalculationResult>(
        'tax-calculations',
        () => true // Get all calculations
      );

      // Sort by creation date (newest first)
      allCalculations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Apply pagination
      const startIndex = offset || 0;
      const endIndex = limit ? startIndex + limit : undefined;
      
      return allCalculations.slice(startIndex, endIndex);
    } catch (error) {
      this.logger.error(`Failed to get all tax calculations: ${error.message}`);
      return [];
    }
  }

  /**
   * Get tax calculation by ID
   */
  async getCalculation(id: string): Promise<TaxCalculationResult> {
    try {
      const calculation = await this.fileStorage.readJson<TaxCalculationResult>('tax-calculations', id);
      if (!calculation) {
        throw new NotFoundException(`Tax calculation ${id} not found`);
      }
      return calculation;
    } catch (error) {
      this.logger.error(`Failed to get tax calculation ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save result summary/breakdown for reporting
   */
  async saveCalculationResult(
    id: string,
    payload: {
      summary?: {
        totalTax: number;
        effectiveTaxRate: number;
        netIncome: number;
        grossIncome?: number;
      };
      breakdown?: {
        incomeTax: number;
        nationalInsurance: number;
        corporationTax: number;
        dividendTax: number;
      };
    }
  ): Promise<TaxCalculationResult> {
    try {
      const calculation = await this.fileStorage.readJson<TaxCalculationResult>('tax-calculations', id);
      if (!calculation) {
        throw new NotFoundException(`Tax calculation ${id} not found`);
      }
      calculation.result = {
        ...(calculation.result || {}),
        ...(payload.summary ? { summary: payload.summary } : {}),
        ...(payload.breakdown ? { breakdown: payload.breakdown } : {}),
      };
      await this.fileStorage.writeJson('tax-calculations', id, calculation);
      return calculation;
    } catch (error) {
      this.logger.error(`Failed to save result for calculation ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get tax calculations for a client
   */
  async getClientCalculations(clientId: string, limit?: number): Promise<TaxCalculationResult[]> {
    try {
      const calculations = await this.fileStorage.searchFiles<TaxCalculationResult>(
        'tax-calculations',
        (calc) => calc.clientId === clientId
      );

      // Sort by creation date (newest first)
      calculations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return limit ? calculations.slice(0, limit) : calculations;
    } catch (error) {
      this.logger.error(`Failed to get calculations for client ${clientId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get latest tax calculation for a client
   */
  async getLatestCalculation(clientId: string): Promise<TaxCalculationResult | null> {
    const calculations = await this.getClientCalculations(clientId, 1);
    return calculations.length > 0 ? calculations[0] : null;
  }

  /**
   * Calculate corporation tax
   */
  async calculateCorporationTax(dto: {
    profit: number;
    taxYear: string;
    isSmallCompany?: boolean;
  }): Promise<{
    profit: number;
    corporationTaxRate: number;
    corporationTax: number;
    netProfit: number;
  }> {
    const rates = await this.taxRates.getTaxRates(dto.taxYear);
    const effectiveRate = this.taxRates.getEffectiveCorporationTaxRate(dto.profit, dto.taxYear);
    const corporationTax = dto.profit * effectiveRate;

    return {
      profit: dto.profit,
      corporationTaxRate: effectiveRate,
      corporationTax,
      netProfit: dto.profit - corporationTax,
    };
  }

  /**
   * Calculate dividend tax
   */
  async calculateDividendTax(dto: {
    dividendAmount: number;
    otherIncome: number;
    taxYear: string;
  }): Promise<{
    dividendAmount: number;
    dividendAllowance: number;
    taxableDividend: number;
    basicRateTax: number;
    higherRateTax: number;
    additionalRateTax: number;
    totalDividendTax: number;
    netDividend: number;
  }> {
    const rates = await this.taxRates.getTaxRates(dto.taxYear);
    const totalIncome = dto.otherIncome + dto.dividendAmount;
    const personalAllowance = this.taxRates.getPersonalAllowance(totalIncome, dto.taxYear);

    const dividendAllowance = rates.dividendAllowance ?? rates.dividendTax?.allowance ?? 0;
    const dividendBasicRate = rates.dividendBasicRate ?? ((rates.dividendTax?.basicRate ?? 0) / 100);
    const dividendHigherRate = rates.dividendHigherRate ?? ((rates.dividendTax?.higherRate ?? 0) / 100);
    const dividendAdditionalRate = rates.dividendAdditionalRate ?? ((rates.dividendTax?.additionalRate ?? 0) / 100);
    const basicRateThreshold = rates.basicRateThreshold ?? rates.incomeTax?.basicRateThreshold ?? 0;
    const higherRateThreshold = rates.higherRateThreshold ?? rates.incomeTax?.higherRateThreshold ?? 0;

    const remainingPersonalAllowance = Math.max(0, personalAllowance - dto.otherIncome);
    const dividendAfterAllowance = Math.max(0, dto.dividendAmount - remainingPersonalAllowance);
    const taxableDividend = Math.max(0, dividendAfterAllowance - dividendAllowance);

    let basicRateTax = 0;
    let higherRateTax = 0;
    let additionalRateTax = 0;

    if (taxableDividend > 0) {
      const taxableNonDividend = Math.max(0, dto.otherIncome - personalAllowance);
      const basicRateLimit = Math.max(0, basicRateThreshold - personalAllowance);
      const higherRateLimit = Math.max(0, higherRateThreshold - personalAllowance);
      const basicRateRemaining = Math.max(0, basicRateLimit - taxableNonDividend);
      const higherRateRemaining = Math.max(0, higherRateLimit - taxableNonDividend - basicRateRemaining);

      let remainingDividend = taxableDividend;

      if (remainingDividend > 0 && basicRateRemaining > 0) {
        const basicRatePortion = Math.min(remainingDividend, basicRateRemaining);
        basicRateTax = basicRatePortion * dividendBasicRate;
        remainingDividend -= basicRatePortion;
      }

      if (remainingDividend > 0 && higherRateRemaining > 0) {
        const higherRatePortion = Math.min(remainingDividend, higherRateRemaining);
        higherRateTax = higherRatePortion * dividendHigherRate;
        remainingDividend -= higherRatePortion;
      }

      if (remainingDividend > 0) {
        additionalRateTax = remainingDividend * dividendAdditionalRate;
      }
    }

    const totalDividendTax = basicRateTax + higherRateTax + additionalRateTax;

    return {
      dividendAmount: dto.dividendAmount,
      dividendAllowance,
      taxableDividend,
      basicRateTax,
      higherRateTax,
      additionalRateTax,
      totalDividendTax,
      netDividend: dto.dividendAmount - totalDividendTax,
    };
  }

  /**
   * Calculate income tax and National Insurance
   */
  async calculateIncomeTax(dto: {
    salary: number;
    taxYear: string;
    pensionContributions?: number;
  }): Promise<{
    salary: number;
    personalAllowance: number;
    taxableIncome: number;
    incomeTax: number;
    employeeNI: number;
    employerNI: number;
    totalDeductions: number;
    netSalary: number;
  }> {
    const rates = await this.taxRates.getTaxRates(dto.taxYear);
    const pensionContributions = dto.pensionContributions || 0;
    const personalAllowance = this.taxRates.getPersonalAllowance(dto.salary, dto.taxYear);
    const basicRateThreshold = rates.basicRateThreshold ?? rates.incomeTax?.basicRateThreshold ?? 0;
    const higherRateThreshold = rates.higherRateThreshold ?? rates.incomeTax?.higherRateThreshold ?? 0;
    const basicRate = rates.basicRate ?? ((rates.incomeTax?.basicRate ?? 0) / 100);
    const higherRate = rates.higherRate ?? ((rates.incomeTax?.higherRate ?? 0) / 100);
    const additionalRate = rates.additionalRate ?? ((rates.incomeTax?.additionalRate ?? 0) / 100);
    
    // Calculate income tax
    const adjustedSalary = Math.max(0, dto.salary - pensionContributions);
    const taxableIncome = Math.max(0, adjustedSalary - personalAllowance);
    
    let incomeTax = 0;
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
    
    // Calculate National Insurance
    let employeeNI = 0;
    let employerNI = 0;

    const employeeLowerLimit = rates.niLowerEarningsLimit ?? rates.nationalInsurance?.employeePrimaryThreshold ?? 12570;
    const employeeUpperLimit = rates.niUpperEarningsLimit ?? rates.nationalInsurance?.employeeUpperEarningsLimit ?? 50270;
    const employeeRate = rates.niEmployeeRate ?? ((rates.nationalInsurance?.employeeRate ?? 0) / 100);
    const employeeAdditionalRate = rates.nationalInsurance?.employeeAdditionalRate
      ? rates.nationalInsurance.employeeAdditionalRate / 100
      : 0.02;
    const employerLowerLimit = rates.nationalInsurance?.employerPrimaryThreshold ?? rates.niLowerEarningsLimit ?? 9100;
    const employerRate = rates.niEmployerRate ?? ((rates.nationalInsurance?.employerRate ?? 0) / 100);
    
    if (dto.salary > employeeLowerLimit) {
      const mainBandEarnings = Math.min(dto.salary, employeeUpperLimit) - employeeLowerLimit;
      employeeNI = Math.max(0, mainBandEarnings) * employeeRate;
      if (dto.salary > employeeUpperLimit) {
        const additionalEarnings = dto.salary - employeeUpperLimit;
        employeeNI += additionalEarnings * employeeAdditionalRate;
      }
    }

    if (dto.salary > employerLowerLimit) {
      employerNI = (dto.salary - employerLowerLimit) * employerRate;
    }
    
    const totalDeductions = incomeTax + employeeNI;
    const netSalary = dto.salary - totalDeductions;

    return {
      salary: dto.salary,
      personalAllowance,
      taxableIncome,
      incomeTax,
      employeeNI,
      employerNI,
      totalDeductions,
      netSalary,
    };
  }

  /**
   * Save a tax calculation
   */
  async saveCalculation(calculation: TaxCalculationResult): Promise<void> {
    try {
      await this.fileStorage.writeJson('tax-calculations', calculation.id, calculation);
      this.logger.log(`Saved tax calculation ${calculation.id} for client ${calculation.clientId}`);
    } catch (error) {
      this.logger.error(`Failed to save tax calculation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a tax calculation
   */
  async deleteCalculation(id: string): Promise<boolean> {
    try {
      await this.fileStorage.deleteJson('tax-calculations', id);
      this.logger.log(`Deleted tax calculation ${id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete tax calculation ${id}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get tax calculation statistics for a client
   */
  async getClientTaxStats(clientId: string): Promise<{
    totalCalculations: number;
    latestCalculation?: TaxCalculationResult;
    averageEffectiveRate?: number;
    totalTaxSavingsIdentified?: number;
  }> {
    const calculations = await this.getClientCalculations(clientId);
    
    if (calculations.length === 0) {
      return { totalCalculations: 0 };
    }

    const latestCalculation = calculations[0];
    
    // Calculate average effective rate from optimization results
    const optimizationCalcs = calculations.filter(c => c.calculationType === 'SALARY_OPTIMIZATION');
    const averageEffectiveRate = optimizationCalcs.length > 0 
      ? optimizationCalcs.reduce((sum, calc) => sum + (calc.result.summary?.effectiveTaxRate || 0), 0) / optimizationCalcs.length
      : undefined;

    // Calculate total tax savings identified
    const totalTaxSavingsIdentified = optimizationCalcs.reduce((sum, calc) => {
      return sum + (calc.result.estimatedSavings || 0);
    }, 0);

    return {
      totalCalculations: calculations.length,
      latestCalculation,
      averageEffectiveRate,
      totalTaxSavingsIdentified,
    };
  }
}

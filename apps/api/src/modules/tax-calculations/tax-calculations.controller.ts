import { Controller, Get, Post, Body, Param, Query, UseGuards, Delete, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TaxCalculationsService } from './tax-calculations.service';
import { EnhancedTaxCalculationsService } from './enhanced-tax-calculations.service';
import { SalaryOptimizationService } from './services/salary-optimization.service';
import { ScenarioComparisonService } from './services/scenario-comparison.service';
import { TaxCalculationPersistenceService } from './services/tax-calculation-persistence.service';
import { TaxRecommendationService } from './services/tax-recommendation.service';
import { TaxRatesService } from './services/tax-rates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  OptimizeSalaryDto,
  CompareScenariosDto,
  TaxCalculationResult,
  TaxScenario,
  TaxRecommendation,
  SalaryOptimizationParams,
  TaxCalculationParams,
} from './interfaces/tax-calculation.interface';

@ApiTags('Tax Calculations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tax-calculations')
export class TaxCalculationsController {
  constructor(
    private readonly taxCalculationsService: TaxCalculationsService,
    private readonly enhancedTaxCalculationsService: EnhancedTaxCalculationsService,
    private readonly salaryOptimizationService: SalaryOptimizationService,
    private readonly scenarioComparisonService: ScenarioComparisonService,
    private readonly persistenceService: TaxCalculationPersistenceService,
    private readonly recommendationService: TaxRecommendationService,
    private readonly taxRatesService: TaxRatesService,
  ) {}

  @Post('optimize-salary')
  @ApiOperation({ summary: 'Optimize salary/dividend split using M Powered™ Tax Engine' })
  @ApiResponse({ status: 200, description: 'Optimization result returned successfully' })
  async optimizeSalary(@Body() dto: OptimizeSalaryDto): Promise<TaxCalculationResult> {
    return this.salaryOptimizationService.optimizeSalaryDividendSplit(dto);
  }

  @Post('compare-scenarios')
  @ApiOperation({ summary: 'Compare multiple tax scenarios' })
  @ApiResponse({ status: 200, description: 'Scenario comparison returned successfully' })
  async compareScenarios(@Body() dto: CompareScenariosDto): Promise<{ scenarios: TaxScenario[] }> {
    return this.scenarioComparisonService.compareScenarios(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get recent tax calculations across all clients' })
  async getAllCalculations(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<TaxCalculationResult[]> {
    return this.taxCalculationsService.getAllCalculations(limit, offset);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tax calculation by ID' })
  async getCalculation(@Param('id') id: string): Promise<TaxCalculationResult> {
    return this.taxCalculationsService.getCalculation(id);
  }

  @Post(':id/save-result')
  @ApiOperation({ summary: 'Save calculation summary/breakdown for reporting' })
  async saveCalculationResult(
    @Param('id') id: string,
    @Body() payload: {
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
    return this.taxCalculationsService.saveCalculationResult(id, payload);
  }

  @Get('client/:clientId')
  @ApiOperation({ summary: 'Get tax calculations for client' })
  async getClientCalculations(
    @Param('clientId') clientId: string,
    @Query('limit') limit?: number,
  ): Promise<TaxCalculationResult[]> {
    return this.taxCalculationsService.getClientCalculations(clientId, limit);
  }

  @Get('client/:clientId/latest')
  @ApiOperation({ summary: 'Get latest tax calculation for client' })
  async getLatestCalculation(@Param('clientId') clientId: string): Promise<TaxCalculationResult | null> {
    return this.taxCalculationsService.getLatestCalculation(clientId);
  }

  @Post('calculate-corporation-tax')
  @ApiOperation({ summary: 'Calculate corporation tax liability' })
  async calculateCorporationTax(@Body() dto: {
    profit: number;
    taxYear: string;
    isSmallCompany?: boolean;
  }): Promise<{
    profit: number;
    corporationTaxRate: number;
    corporationTax: number;
    netProfit: number;
  }> {
    return this.taxCalculationsService.calculateCorporationTax(dto);
  }

  @Post('calculate-dividend-tax')
  @ApiOperation({ summary: 'Calculate dividend tax for individual' })
  async calculateDividendTax(@Body() dto: {
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
    return this.taxCalculationsService.calculateDividendTax(dto);
  }

  @Post('calculate-income-tax')
  @ApiOperation({ summary: 'Calculate income tax and National Insurance' })
  async calculateIncomeTax(@Body() dto: {
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
    return this.taxCalculationsService.calculateIncomeTax(dto);
  }

  // Enhanced M Powered Tax Engine endpoints
  @Post('enhanced/optimize-salary')
  @ApiOperation({ summary: 'Enhanced salary optimization with M Powered™ Tax Engine v2' })
  @ApiResponse({ status: 200, description: 'Enhanced optimization result with comprehensive scenarios' })
  async enhancedOptimizeSalary(
    @Body() params: SalaryOptimizationParams,
    @Query('userId') userId: string = 'system'
  ): Promise<TaxCalculationResult> {
    return this.enhancedTaxCalculationsService.calculateOptimalSalary(params, userId);
  }

  @Post('enhanced/compare-scenarios')
  @ApiOperation({ summary: 'Enhanced scenario comparison with detailed tax breakdown' })
  @ApiResponse({ status: 200, description: 'Enhanced scenario comparison with marginal relief calculations' })
  async enhancedCompareScenarios(
    @Body() dto: {
      scenarios: Array<{ salary: number; dividend: number }>;
      params: TaxCalculationParams;
    },
    @Query('userId') userId: string = 'system'
  ): Promise<TaxCalculationResult> {
    return this.enhancedTaxCalculationsService.compareScenarios(dto.scenarios, dto.params, userId);
  }

  @Post('enhanced/corporation-tax')
  @ApiOperation({ summary: 'Enhanced corporation tax calculation with accounting period derivation' })
  async enhancedCorporationTax(
    @Body() dto: {
      clientId: string;
      companyId?: string;
      profit: number;
      taxYear?: string;
      accountingPeriodEndYear?: number;
    },
    @Query('userId') userId: string = 'system'
  ): Promise<TaxCalculationResult> {
    return this.enhancedTaxCalculationsService.calculateCorporationTax(dto, userId);
  }

  @Post('enhanced/personal-tax')
  @ApiOperation({ summary: 'Enhanced personal tax calculation with SA302-style breakdown' })
  async enhancedPersonalTax(
    @Body() dto: {
      clientId: string;
      salary: number;
      dividends: number;
      otherIncome?: number;
      pensionContributions?: number;
      taxYear: string;
    },
    @Query('userId') userId: string = 'system'
  ): Promise<TaxCalculationResult> {
    return this.enhancedTaxCalculationsService.calculatePersonalTax(dto, userId);
  }

  @Post('enhanced/sole-trader')
  @ApiOperation({ summary: 'Enhanced sole trader tax calculation' })
  async enhancedSoleTraderTax(
    @Body() dto: {
      clientId: string;
      revenue: number;
      expenses: number;
      taxYear: string;
      payClass2?: boolean;
    },
    @Query('userId') userId: string = 'system'
  ): Promise<TaxCalculationResult> {
    return this.enhancedTaxCalculationsService.calculateSoleTraderTax(dto, userId);
  }

  @Get('enhanced/:id')
  @ApiOperation({ summary: 'Get enhanced tax calculation by ID with full scenario data' })
  async getEnhancedCalculation(@Param('id') id: string): Promise<TaxCalculationResult> {
    return this.enhancedTaxCalculationsService.getCalculation(id);
  }

  @Post('enhanced/:id/recalculate')
  @ApiOperation({ summary: 'Recalculate an existing enhanced tax calculation' })
  async recalculateEnhancedCalculation(
    @Param('id') id: string,
    @Query('userId') userId: string = 'system'
  ): Promise<TaxCalculationResult> {
    return this.enhancedTaxCalculationsService.recalculateCalculation(id, userId);
  }

  @Get('enhanced/client/:clientId')
  @ApiOperation({ summary: 'Get enhanced tax calculations for client' })
  async getEnhancedClientCalculations(
    @Param('clientId') clientId: string,
    @Query('limit') limit?: number,
  ): Promise<TaxCalculationResult[]> {
    return this.enhancedTaxCalculationsService.getClientCalculations(clientId, limit);
  }

  @Get('enhanced/client/:clientId/latest')
  @ApiOperation({ summary: 'Get latest enhanced tax calculation for client' })
  async getLatestEnhancedCalculation(@Param('clientId') clientId: string): Promise<TaxCalculationResult | null> {
    return this.enhancedTaxCalculationsService.getLatestCalculation(clientId);
  }

  // Enhanced persistence endpoints
  @Get('history')
  @ApiOperation({ summary: 'Get calculation history with advanced filtering' })
  @ApiQuery({ name: 'clientId', required: false, description: 'Filter by client ID' })
  @ApiQuery({ name: 'taxYear', required: false, description: 'Filter by tax year (e.g., 2024-25)' })
  @ApiQuery({ name: 'calculationType', required: false, description: 'Filter by calculation type' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results to return' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of results to skip' })
  async getCalculationHistory(
    @Query('clientId') clientId?: string,
    @Query('taxYear') taxYear?: string,
    @Query('calculationType') calculationType?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{
    calculations: TaxCalculationResult[];
    total: number;
    summary: {
      totalSavingsIdentified: number;
      averageEffectiveRate: number;
      mostCommonOptimization: string;
    };
  }> {
    return this.persistenceService.getCalculationHistory({
      clientId,
      taxYear,
      calculationType,
      limit,
      offset,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get tax calculation statistics' })
  @ApiQuery({ name: 'clientId', required: false, description: 'Get stats for specific client' })
  async getTaxCalculationStats(
    @Query('clientId') clientId?: string,
  ): Promise<{
    totalCalculations: number;
    calculationsByType: Record<string, number>;
    calculationsByTaxYear: Record<string, number>;
    averageSavings: number;
    totalSavingsIdentified: number;
    latestCalculation?: TaxCalculationResult;
    topOptimizations: Array<{ type: string; count: number; averageSaving: number }>;
  }> {
    return this.persistenceService.getTaxCalculationStats(clientId);
  }

  @Post('migrate-from-files')
  @ApiOperation({ summary: 'Migrate tax calculations from file storage to database' })
  @ApiResponse({ status: 200, description: 'Migration completed successfully' })
  async migrateFromFileStorage(): Promise<{
    migrated: number;
    errors: number;
    details: string[];
  }> {
    return this.persistenceService.migrateFromFileStorage();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete tax calculation and all related data' })
  @ApiResponse({ status: 200, description: 'Tax calculation deleted successfully' })
  async deleteCalculation(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    return this.persistenceService.deleteCalculation(id);
  }

  // Tax Recommendation endpoints
  @Get(':id/recommendations')
  @ApiOperation({ summary: 'Get recommendations for a specific tax calculation' })
  @ApiResponse({ status: 200, description: 'Recommendations retrieved successfully' })
  async getCalculationRecommendations(@Param('id') id: string): Promise<TaxRecommendation[]> {
    return this.enhancedTaxCalculationsService.getCalculationRecommendations(id);
  }

  @Get('client/:clientId/recommendations')
  @ApiOperation({ summary: 'Get tax recommendations for a client with filtering options' })
  @ApiQuery({ name: 'priority', required: false, enum: ['HIGH', 'MEDIUM', 'LOW'] })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by recommendation type' })
  @ApiQuery({ name: 'implemented', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getClientRecommendations(
    @Param('clientId') clientId: string,
    @Query('priority') priority?: 'HIGH' | 'MEDIUM' | 'LOW',
    @Query('type') type?: string,
    @Query('implemented') implemented?: boolean,
    @Query('limit') limit?: number,
  ): Promise<TaxRecommendation[]> {
    return this.enhancedTaxCalculationsService.getClientRecommendations(clientId, {
      priority,
      type,
      implemented,
      limit,
    });
  }

  @Get(':id/actionable-advice')
  @ApiOperation({ summary: 'Get actionable advice with implementation steps for calculation recommendations' })
  @ApiResponse({ status: 200, description: 'Actionable advice generated successfully' })
  async getActionableAdvice(@Param('id') id: string): Promise<Array<{
    recommendation: TaxRecommendation;
    implementationSteps: string[];
    timeline: string;
    requiredDocuments: string[];
    estimatedEffort: 'LOW' | 'MEDIUM' | 'HIGH';
    dependencies: string[];
  }>> {
    return this.enhancedTaxCalculationsService.generateActionableAdvice(id);
  }

  @Get(':id/potential-savings')
  @ApiOperation({ summary: 'Calculate potential savings from implementing recommendations' })
  @ApiResponse({ status: 200, description: 'Potential savings calculated successfully' })
  async getRecommendationSavings(@Param('id') id: string): Promise<{
    totalPotentialSavings: number;
    savingsByType: Record<string, number>;
    implementationPriority: Array<{
      recommendation: TaxRecommendation;
      savingsToEffortRatio: number;
    }>;
  }> {
    return this.enhancedTaxCalculationsService.calculateRecommendationSavings(id);
  }

  @Post('recommendations/generate')
  @ApiOperation({ summary: 'Generate recommendations for an existing calculation' })
  @ApiResponse({ status: 200, description: 'Recommendations generated successfully' })
  async generateRecommendations(
    @Body() dto: { calculationId: string; currentArrangement?: { salary: number; dividend: number } }
  ): Promise<TaxRecommendation[]> {
    const calculation = await this.enhancedTaxCalculationsService.getCalculation(dto.calculationId);
    if (!calculation) {
      throw new NotFoundException(`Tax calculation ${dto.calculationId} not found`);
    }

    // Get tax rates for the calculation's tax year
    const taxRates = await this.taxRatesService.getTaxRates(calculation.taxYear);

    return this.recommendationService.generateRecommendations(
      calculation,
      taxRates,
      dto.currentArrangement
    );
  }
}

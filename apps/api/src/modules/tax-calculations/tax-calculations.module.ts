import { Module } from '@nestjs/common';
import { TaxCalculationsController } from './tax-calculations.controller';
import { TaxCalculationsService } from './tax-calculations.service';
import { EnhancedTaxCalculationsService } from './enhanced-tax-calculations.service';
import { TaxEngineService } from './services/tax-engine.service';
import { SalaryOptimizationService } from './services/salary-optimization.service';
import { ScenarioComparisonService } from './services/scenario-comparison.service';
import { TaxRatesService } from './services/tax-rates.service';
import { TaxCalculationPersistenceService } from './services/tax-calculation-persistence.service';
import { TaxRecommendationService } from './services/tax-recommendation.service';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [FileStorageModule, DatabaseModule, AuditModule],
  controllers: [TaxCalculationsController],
  providers: [
    TaxCalculationsService,
    EnhancedTaxCalculationsService,
    TaxEngineService,
    SalaryOptimizationService,
    ScenarioComparisonService,
    TaxRatesService,
    TaxCalculationPersistenceService,
    TaxRecommendationService,
  ],
  exports: [
    TaxCalculationsService, 
    EnhancedTaxCalculationsService, 
    TaxEngineService,
    TaxCalculationPersistenceService,
    TaxRecommendationService,
  ],
})
export class TaxCalculationsModule {}
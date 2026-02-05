import {
  Client,
  GeneratedReport,
  OperationResult,
  QueryResult,
  TaxCalculationResult,
} from './interfaces/database.interface';

// Abstract contract for database operations. Implemented by PrismaDatabaseService.
export abstract class DatabaseService {
  abstract testConnection(): Promise<OperationResult>;

  abstract executeQuery<T = any>(query: string, params?: any[]): Promise<QueryResult<T>>;

  abstract getClientByNumber(companyNumber: string): Promise<Client | null>;

  abstract searchClientsByName(name: string, limit?: number): Promise<Client[]>;

  abstract getClientList(filters?: any, fields?: string[]): Promise<Client[]>;

  abstract addClient(client: Partial<Client>): Promise<OperationResult>;

  abstract storeCalculation(calculation: TaxCalculationResult): Promise<OperationResult>;

  abstract getCalculationById(id: string): Promise<TaxCalculationResult | null>;

  abstract getClientCalculations(clientId: string, limit?: number): Promise<TaxCalculationResult[]>;

  abstract getCalculationHistory(
    clientId?: string,
    taxYear?: string,
    calculationType?: string,
    limit?: number,
    offset?: number
  ): Promise<{ calculations: TaxCalculationResult[]; total: number }>;

  abstract getTaxCalculationStats(clientId?: string): Promise<{
    totalCalculations: number;
    calculationsByType: Record<string, number>;
    calculationsByTaxYear: Record<string, number>;
    averageSavings: number;
    totalSavingsIdentified: number;
    latestCalculation?: TaxCalculationResult;
    topOptimizations: Array<{ type: string; count: number; averageSaving: number }>;
  }>;

  abstract deleteCalculation(id: string): Promise<{ success: boolean; message: string }>;

  abstract storeReport(report: GeneratedReport): Promise<OperationResult>;

  abstract getClientReports(clientId: string, limit?: number): Promise<GeneratedReport[]>;

  abstract getReportById(id: string): Promise<GeneratedReport | null>;

  abstract storeRecommendations(calculationId: string, recommendations: any[]): Promise<OperationResult>;

  abstract getRecommendations(calculationId: string): Promise<any[]>;

  abstract getClientRecommendations(clientId: string, options?: any): Promise<any[]>;

  abstract beginTransaction(): Promise<void>;

  abstract commitTransaction(): Promise<void>;

  abstract rollbackTransaction(): Promise<void>;
}

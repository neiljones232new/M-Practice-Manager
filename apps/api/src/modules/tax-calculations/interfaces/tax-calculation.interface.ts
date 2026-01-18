export type TaxAmountType = 'profit' | 'dividend' | 'salary' | 'targetTakeHome';

export interface TaxCalculationResult {
  id: string;
  clientId: string;
  companyId?: string;
  calculationType: 'SALARY_OPTIMIZATION' | 'SCENARIO_COMPARISON' | 'CORPORATION_TAX' | 'DIVIDEND_TAX' | 'INCOME_TAX' | 'SOLE_TRADER';
  taxYear: string;
  parameters: Record<string, any>;
  amountType?: TaxAmountType;
  accountingPeriodStart?: string;
  accountingPeriodEnd?: string;
  report?: TaxCalculationReport;
  
  // Enhanced optimization results (optional for backward compatibility)
  optimizedSalary?: number;
  optimizedDividend?: number;
  totalTakeHome?: number;
  totalTaxLiability?: number;
  estimatedSavings?: number;
  
  // Detailed scenarios
  scenarios?: TaxScenario[];
  scenarioResults?: ScenarioResult[];
  recommendations?: TaxRecommendation[];
  
  // Metadata (flexible for backward compatibility)
  calculatedAt?: Date;
  calculatedBy?: string;
  notes?: string;
  
  // Legacy support
  result?: Record<string, any>;
  createdAt?: Date;
  createdBy?: string;
}

export interface TaxCalculationReport {
  calculationId: string;
  clientId: string;
  calculationType: 'salaryDividendOptimisation' | 'personalTax' | 'corporationTax' | 'scenarioComparison' | 'soleTraderTax';
  inputs: {
    salaryGross?: number;
    benefits?: number;
    otherIncome?: number;
    dividends?: number;
    personalTaxYear?: string;
    companyProfitBeforeTax?: number;
    salaryExpense?: number;
    employerNIC?: number;
    yearEndDate?: string;
    taxYear?: string;
    expenses?: number;
    dividendsPaid?: number;
  };
  results: {
    personal?: {
      totalGrossIncome: number;
      taxableIncome: number;
      incomeTaxByBand: {
        basicRate: number;
        higherRate: number;
        additionalRate: number;
      };
      dividendTaxByBand: {
        basicRate: number;
        higherRate: number;
        additionalRate: number;
      };
      nationalInsurance: {
        employeeNIC: number;
        employerNIC: number;
      };
      personalAllowance?: number;
      dividendAllowance?: number;
      totalTax: number;
      netTakeHome: number;
    };
    company?: {
      profitBeforeTax: number;
      salaryExpense: number;
      employerNIC: number;
      taxableProfit: number;
      corporationTax: number;
      dividendsPaid: number;
      netCompanyCashAfterTax: number;
    };
    optimisation?: {
      optimalSalary: number;
      optimalDividends: number;
      takeHomeOptimised: number;
      effectiveTaxRate: number;
      totalTaxAndNI?: number;
      netTakeHome?: number;
    };
    scenarioComparison?: Array<{
      scenarioName: string;
      company: {
        availableProfit: number;
        salary: number;
        employerNI: number;
        taxableProfit: number;
        corporationTax: number;
        dividendPool: number;
      };
      personal: {
        salary: number;
        dividends: number;
        otherIncome: number;
        incomeTax: number;
        employeeNI: number;
        dividendTax: number;
        totalPersonalTax: number;
        netPersonalIncome: number;
      };
      summary: {
        totalTaxAndNI: number;
        netTakeHome: number;
        effectiveRate: number;
      };
    }>;
  };
  reportSummary?: {
    executiveSummary?: string;
    recommendations?: string[];
  };
}

export interface TaxScenario {
  id?: string;
  name?: string;
  amountType?: TaxAmountType;
  salary: number;
  dividend: number;
  pensionContributions?: number;
  
  // Calculated values
  incomeTax: number;
  employeeNI: number;
  employerNI: number;
  corporationTax: number;
  dividendTax: number;
  totalTax: number;
  takeHome: number;
  effectiveRate: number;
  
  // Enhanced metrics
  netCost?: number; // Total cost to company - optional for backward compatibility
  totalEmploymentCosts?: number; // Legacy support
  companyNetProfit?: number; // Legacy support
  personalNetIncome?: number; // Legacy support
}

export interface ScenarioInput {
  availableProfit: number;
  salary: number;
  taxYear: string;
  personal: {
    otherIncome?: number;
  };
}

export interface CompanyResult {
  salary: number;
  employerNI: number;
  taxableProfit: number;
  corporationTax: number;
  profitAfterTax: number;
  dividendPool: number;
}

export interface PersonalResult {
  salary: number;
  dividends: number;
  incomeTax: number;
  employeeNI: number;
  dividendTax: number;
  totalPersonalTax: number;
  netPersonalCash: number;
}

export interface ScenarioResult {
  input: ScenarioInput;
  company: CompanyResult;
  personal: PersonalResult;
  summary: {
    totalTax: number;
    effectiveTaxRate: number;
  };
}

export interface TaxRecommendation {
  type: 'SALARY_OPTIMIZATION' | 'PENSION_CONTRIBUTION' | 'COMPLIANCE' | 'PLANNING' | 'WARNING' | 'OPTIMIZATION';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description?: string; // Optional for backward compatibility
  potentialSaving?: number; // Optional for backward compatibility
  actionRequired?: string | boolean; // Optional for backward compatibility
  deadline?: Date;
  
  // Legacy support
  message?: string;
}

// Enhanced DTOs for salary optimization
export interface SalaryOptimizationParams {
  clientId: string;
  companyId?: string;
  availableProfit: number;
  taxYear: string;
  
  // Optional constraints
  minSalary?: number;
  maxSalary?: number;
  salaryIncrement?: number;
  currentSalary?: number;
  currentDividend?: number;
  
  // Tax considerations
  personalAllowanceUsed?: number;
  dividendAllowanceUsed?: number;
  otherIncome?: number;
  scottishTaxpayer?: boolean;
  studentLoan?: boolean;
  considerEmployerNI?: boolean;
}

export interface TaxCalculationParams {
  clientId: string;
  companyId?: string;
  availableProfit: number;
  taxYear: string;
  personalAllowanceUsed?: number;
  dividendAllowanceUsed?: number;
  otherIncome?: number;
  scottishTaxpayer?: boolean;
  studentLoan?: boolean;
  currentSalary?: number;
  currentDividend?: number;
}

export interface TaxRates {
  taxYear: string;
  
  // Income Tax
  incomeTax: {
    personalAllowance: number;
    basicRate: number;
    basicRateThreshold: number;
    higherRate: number;
    higherRateThreshold: number;
    additionalRate: number;
  };
  
  // National Insurance
  nationalInsurance: {
    employeePrimaryThreshold: number;
    employeeUpperEarningsLimit: number;
    employeeRate: number;
    employeeAdditionalRate: number;
    employerPrimaryThreshold: number;
    employerUpperSecondaryThreshold: number;
    employerRate: number;
    employerAdditionalRate: number;
  };
  
  // Corporation Tax
  corporationTax: {
    smallCompaniesRate: number;
    mainRate: number;
    marginalReliefThreshold: number;
    marginalReliefUpperLimit: number;
    marginalReliefFraction?: number;
  };
  
  // Dividend Tax
  dividendTax: {
    allowance: number;
    basicRate: number;
    higherRate: number;
    additionalRate: number;
  };
  
  // Legacy support
  personalAllowance?: number;
  basicRateThreshold?: number;
  higherRateThreshold?: number;
  basicRate?: number;
  higherRate?: number;
  additionalRate?: number;
  niLowerEarningsLimit?: number;
  niUpperEarningsLimit?: number;
  niEmployeeRate?: number;
  niEmployerRate?: number;
  corporationTaxRate?: number;
  smallCompanyRate?: number;
  smallCompanyThreshold?: number;
  dividendAllowance?: number;
  dividendBasicRate?: number;
  dividendHigherRate?: number;
  dividendAdditionalRate?: number;
}

// Legacy DTOs for backward compatibility
export interface OptimizeSalaryDto {
  clientId: string;
  targetTakeHome: number;
  taxYear: string;
  constraints?: {
    minSalary?: number;
    maxSalary?: number;
    pensionContributions?: number;
  };
}

export interface CompareScenariosDto {
  clientId: string;
  scenarios: Array<{
    name?: string;
    salary: number;
    dividend: number;
    pensionContributions?: number;
  }>;
  taxYear: string;
}

export interface TaxCalculationSummary {
  totalIncome: number;
  totalTax: number;
  totalNI: number;
  netIncome: number;
  effectiveTaxRate: number;
  marginalTaxRate: number;
}

export interface OptimizationResult {
  optimizedSalary: number;
  optimizedDividend: number;
  totalTakeHome: number;
  totalTax: number;
  estimatedSavings: number;
  recommendations: TaxRecommendation[];
  comparisonWithCurrent?: {
    currentTotalTax: number;
    optimizedTotalTax: number;
    savings: number;
    savingsPercentage: number;
  };
}

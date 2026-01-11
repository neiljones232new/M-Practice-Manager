import { Injectable } from '@nestjs/common';
import { AccountsSet, BalanceSheetSection, ProfitAndLossSection } from './interfaces/accounts-set.interface';

@Injectable()
export class FinancialCalculationService {
  
  calculateTotals(accountsSet: AccountsSet): {
    profitAndLoss: {
      grossProfit: number;
      operatingProfit: number;
      profitBeforeTax: number;
      profitAfterTax: number;
      totalIncome: number;
      totalExpenses: number;
    };
    balanceSheet: {
      totalFixedAssets: number;
      totalCurrentAssets: number;
      totalAssets: number;
      totalCurrentLiabilities: number;
      totalLongTermLiabilities: number;
      totalLiabilities: number;
      totalEquity: number;
      netAssets: number;
    };
  } {
    const profitAndLoss = this.calculateProfitAndLossTotals(accountsSet.sections.profitAndLoss);
    const balanceSheet = this.calculateBalanceSheetTotals(accountsSet.sections.balanceSheet);

    return {
      profitAndLoss,
      balanceSheet,
    };
  }

  calculateProfitAndLossTotals(profitAndLoss?: ProfitAndLossSection): {
    grossProfit: number;
    operatingProfit: number;
    profitBeforeTax: number;
    profitAfterTax: number;
    totalIncome: number;
    totalExpenses: number;
  } {
    if (!profitAndLoss?.lines) {
      return {
        grossProfit: 0,
        operatingProfit: 0,
        profitBeforeTax: 0,
        profitAfterTax: 0,
        totalIncome: 0,
        totalExpenses: 0,
      };
    }

    const lines = profitAndLoss.lines;
    
    const grossProfit = lines.turnover - lines.costOfSales;
    const totalIncome = grossProfit + lines.otherIncome;
    const totalExpenses = lines.adminExpenses + lines.wages + lines.rent + 
                         lines.motor + lines.professionalFees + lines.otherExpenses;
    const operatingProfit = totalIncome - totalExpenses;
    const profitBeforeTax = operatingProfit - lines.interestPayable;
    const profitAfterTax = profitBeforeTax - lines.taxCharge;

    return {
      grossProfit,
      operatingProfit,
      profitBeforeTax,
      profitAfterTax,
      totalIncome,
      totalExpenses,
    };
  }

  calculateBalanceSheetTotals(balanceSheet?: BalanceSheetSection): {
    totalFixedAssets: number;
    totalCurrentAssets: number;
    totalAssets: number;
    totalCurrentLiabilities: number;
    totalLongTermLiabilities: number;
    totalLiabilities: number;
    totalEquity: number;
    netAssets: number;
  } {
    if (!balanceSheet) {
      return {
        totalFixedAssets: 0,
        totalCurrentAssets: 0,
        totalAssets: 0,
        totalCurrentLiabilities: 0,
        totalLongTermLiabilities: 0,
        totalLiabilities: 0,
        totalEquity: 0,
        netAssets: 0,
      };
    }

    const totalFixedAssets = balanceSheet.assets.fixedAssets.tangibleFixedAssets + 
                            balanceSheet.assets.fixedAssets.intangibleAssets + 
                            balanceSheet.assets.fixedAssets.investments;

    const totalCurrentAssets = balanceSheet.assets.currentAssets.stock + 
                              balanceSheet.assets.currentAssets.debtors + 
                              balanceSheet.assets.currentAssets.cash + 
                              balanceSheet.assets.currentAssets.prepayments;

    const totalAssets = totalFixedAssets + totalCurrentAssets;

    const totalCurrentLiabilities = balanceSheet.liabilities.creditorsWithinOneYear.tradeCreditors + 
                                   balanceSheet.liabilities.creditorsWithinOneYear.taxes + 
                                   balanceSheet.liabilities.creditorsWithinOneYear.accrualsDeferredIncome + 
                                   balanceSheet.liabilities.creditorsWithinOneYear.directorsLoan + 
                                   balanceSheet.liabilities.creditorsWithinOneYear.otherCreditors;

    const totalLongTermLiabilities = balanceSheet.liabilities.creditorsAfterOneYear.loans + 
                                    balanceSheet.liabilities.creditorsAfterOneYear.other;

    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;

    const totalEquity = balanceSheet.equity.shareCapital + 
                       balanceSheet.equity.retainedEarnings + 
                       balanceSheet.equity.otherReserves;

    const netAssets = totalAssets - totalLiabilities;

    return {
      totalFixedAssets,
      totalCurrentAssets,
      totalAssets,
      totalCurrentLiabilities,
      totalLongTermLiabilities,
      totalLiabilities,
      totalEquity,
      netAssets,
    };
  }

  calculateFinancialRatios(accountsSet: AccountsSet): {
    currentRatio?: number;
    quickRatio?: number;
    debtToEquityRatio?: number;
    returnOnAssets?: number;
    returnOnEquity?: number;
    grossProfitMargin?: number;
    netProfitMargin?: number;
  } {
    const totals = this.calculateTotals(accountsSet);
    const ratios: any = {};

    // Current Ratio = Current Assets / Current Liabilities
    if (totals.balanceSheet.totalCurrentLiabilities > 0) {
      ratios.currentRatio = totals.balanceSheet.totalCurrentAssets / totals.balanceSheet.totalCurrentLiabilities;
    }

    // Quick Ratio = (Current Assets - Stock) / Current Liabilities
    if (totals.balanceSheet.totalCurrentLiabilities > 0 && accountsSet.sections.balanceSheet) {
      const quickAssets = totals.balanceSheet.totalCurrentAssets - accountsSet.sections.balanceSheet.assets.currentAssets.stock;
      ratios.quickRatio = quickAssets / totals.balanceSheet.totalCurrentLiabilities;
    }

    // Debt to Equity Ratio = Total Liabilities / Total Equity
    if (totals.balanceSheet.totalEquity > 0) {
      ratios.debtToEquityRatio = totals.balanceSheet.totalLiabilities / totals.balanceSheet.totalEquity;
    }

    // Return on Assets = Net Profit / Total Assets
    if (totals.balanceSheet.totalAssets > 0) {
      ratios.returnOnAssets = (totals.profitAndLoss.profitAfterTax / totals.balanceSheet.totalAssets) * 100;
    }

    // Return on Equity = Net Profit / Total Equity
    if (totals.balanceSheet.totalEquity > 0) {
      ratios.returnOnEquity = (totals.profitAndLoss.profitAfterTax / totals.balanceSheet.totalEquity) * 100;
    }

    // Gross Profit Margin = Gross Profit / Turnover
    if (accountsSet.sections.profitAndLoss?.lines.turnover > 0) {
      ratios.grossProfitMargin = (totals.profitAndLoss.grossProfit / accountsSet.sections.profitAndLoss.lines.turnover) * 100;
    }

    // Net Profit Margin = Net Profit / Turnover
    if (accountsSet.sections.profitAndLoss?.lines.turnover > 0) {
      ratios.netProfitMargin = (totals.profitAndLoss.profitAfterTax / accountsSet.sections.profitAndLoss.lines.turnover) * 100;
    }

    return ratios;
  }

  calculatePercentageChanges(currentYear: any, priorYear: any): any {
    const changes: any = {};

    Object.keys(currentYear).forEach(key => {
      const current = currentYear[key] || 0;
      const prior = priorYear[key] || 0;

      if (prior !== 0) {
        changes[key] = ((current - prior) / Math.abs(prior)) * 100;
      } else if (current !== 0) {
        changes[key] = 100; // 100% increase from zero
      } else {
        changes[key] = 0; // No change
      }
    });

    return changes;
  }

  isBalanceSheetBalanced(balanceSheet?: BalanceSheetSection): boolean {
    if (!balanceSheet) return false;

    const totals = this.calculateBalanceSheetTotals(balanceSheet);
    const difference = Math.abs(totals.totalAssets - (totals.totalLiabilities + totals.totalEquity));
    
    // Allow for small rounding differences (less than 1 penny)
    return difference < 0.01;
  }

  getBalanceSheetImbalance(balanceSheet?: BalanceSheetSection): number {
    if (!balanceSheet) return 0;

    const totals = this.calculateBalanceSheetTotals(balanceSheet);
    return totals.totalAssets - (totals.totalLiabilities + totals.totalEquity);
  }

  validateCalculatedFields(sectionKey: string, sectionData: any): string[] {
    const errors: string[] = [];

    // Define which fields are calculated and should not be manually edited
    const calculatedFields: Record<string, string[]> = {
      profitAndLoss: [
        'grossProfit',
        'operatingProfit', 
        'profitBeforeTax',
        'profitAfterTax',
        'totalIncome',
        'totalExpenses'
      ],
      balanceSheet: [
        'totalFixedAssets',
        'totalCurrentAssets', 
        'totalAssets',
        'totalCurrentLiabilities',
        'totalLongTermLiabilities',
        'totalLiabilities',
        'totalEquity',
        'netAssets'
      ]
    };

    const fieldsForSection = calculatedFields[sectionKey] || [];
    
    fieldsForSection.forEach(field => {
      if (sectionData.hasOwnProperty(field)) {
        errors.push(field);
      }
    });

    return errors;
  }
}
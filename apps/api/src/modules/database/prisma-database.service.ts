import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Client,
  GeneratedReport,
  OperationResult,
  QueryResult,
  TaxCalculationResult,
} from './interfaces/database.interface';

@Injectable()
export class PrismaDatabaseService {
  constructor(private readonly prisma: PrismaService) {}

  private get isDbEnabled(): boolean {
    return !!process.env.DATABASE_URL;
  }

  private get clientModel(): any {
    return (this.prisma as any).client;
  }

  private get taxCalculationModel(): any {
    return (this.prisma as any).taxCalculation;
  }

  private get taxScenarioModel(): any {
    return (this.prisma as any).taxScenario;
  }

  private get generatedReportModel(): any {
    return (this.prisma as any).generatedReport;
  }

  async testConnection(): Promise<OperationResult> {
    try {
      if (!this.isDbEnabled) {
        return { success: false, message: 'Database connection not configured (DATABASE_URL missing)' };
      }
      await this.prisma.$queryRaw`SELECT 1`;
      return { success: true, message: 'Database connection successful.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Database connection failed' };
    }
  }

  async executeQuery<T = any>(_query: string, _params: any[] = []): Promise<QueryResult<T>> {
    return {
      success: false,
      error: 'executeQuery is not supported for Prisma-backed DatabaseService',
      rowCount: 0,
    };
  }

  async getClientByNumber(companyNumber: string): Promise<Client | null> {
    if (!this.isDbEnabled) return null;
    const c: any = await this.clientModel.findFirst({ where: { companyNumber } });
    if (!c) return null;
    return {
      companyNumber: c.companyNumber || companyNumber,
      companyName: c.name,
      tradingName: c.tradingName || undefined,
      status: c.status,
      companyType: c.companyType || undefined,
      incorporationDate: c.dateOfCreation ? c.dateOfCreation.toISOString() : undefined,
      registeredAddress: c.registeredAddress || undefined,
      corporationTaxUtr: c.corporationTaxUtr || undefined,
      vatNumber: c.vatNumber || undefined,
      vatRegistrationDate: c.vatRegistrationDate || undefined,
      vatScheme: c.vatScheme || undefined,
      vatStagger: (c.vatStagger as any) || undefined,
      payeReference: c.payeReference || undefined,
      payeAccountsOfficeReference: c.payeAccountsOfficeReference || undefined,
      authenticationCode: c.authenticationCode || undefined,
      accountsOfficeReference: c.accountsOfficeReference || undefined,
      employeeCount: c.employeeCount ?? undefined,
      payrollFrequency: c.payrollFrequency || undefined,
      payrollPayDay: c.payrollPayDay ?? undefined,
      payrollPeriodEndDay: c.payrollPeriodEndDay ?? undefined,
      cisRegistered: c.cisRegistered ?? undefined,
      cisUtr: c.cisUtr || undefined,
      mainContactName: c.mainContactName || undefined,
      contactPosition: c.contactPosition || undefined,
      telephone: c.telephone || undefined,
      mobile: c.mobile || undefined,
      email: c.email || undefined,
      preferredContactMethod: c.preferredContactMethod || undefined,
      correspondenceAddress: c.correspondenceAddress || undefined,
      clientManager: c.clientManager || undefined,
      partnerResponsible: c.partnerResponsible || undefined,
      engagementType: c.engagementType || undefined,
      onboardingDate: c.onboardingDate || undefined,
      disengagementDate: c.disengagementDate || undefined,
      engagementLetterSigned: c.engagementLetterSigned ?? undefined,
      amlCompleted: c.amlCompleted ?? undefined,
      lifecycleStatus: (c.lifecycleStatus as any) || undefined,
      onboardingStartedAt: c.onboardingStartedAt || undefined,
      wentLiveAt: c.wentLiveAt || undefined,
      ceasedAt: c.ceasedAt || undefined,
      dormantSince: c.dormantSince || undefined,
      feeArrangement: c.feeArrangement || undefined,
      monthlyFee: c.monthlyFee ? Number(c.monthlyFee) : undefined,
      annualFee: c.annualFee ? Number(c.annualFee) : undefined,
      accountingPeriodEnd: c.accountingPeriodEnd || undefined,
      nextAccountsDueDate: c.nextAccountsDueDate || undefined,
      nextCorporationTaxDueDate: c.nextCorporationTaxDueDate || undefined,
      statutoryYearEnd: c.statutoryYearEnd || undefined,
      vatReturnFrequency: c.vatReturnFrequency || undefined,
      vatQuarter: c.vatQuarter || undefined,
      vatPeriodStart: c.vatPeriodStart || undefined,
      vatPeriodEnd: c.vatPeriodEnd || undefined,
      payrollRtiRequired: c.payrollRtiRequired ?? undefined,
      businessBankName: c.businessBankName || undefined,
      accountLastFour: c.accountLastFour || undefined,
      directDebitInPlace: c.directDebitInPlace ?? undefined,
      paymentIssues: c.paymentIssues || undefined,
      notes: c.notes || undefined,
      specialCircumstances: c.specialCircumstances || undefined,
      seasonalBusiness: c.seasonalBusiness ?? undefined,
      dormant: c.dormant ?? undefined,
      clientRiskRating: c.clientRiskRating || undefined,
      doNotContact: c.doNotContact ?? undefined,
      personalUtr: c.personalUtr || undefined,
      nationalInsuranceNumber: c.nationalInsuranceNumber || undefined,
      dateOfBirth: c.dateOfBirth || undefined,
      personalAddress: c.personalAddress || undefined,
      personalTaxYear: c.personalTaxYear || undefined,
      selfAssessmentTaxYear: c.selfAssessmentTaxYear || undefined,
      selfAssessmentRequired: c.selfAssessmentRequired ?? undefined,
      selfAssessmentFiled: c.selfAssessmentFiled ?? undefined,
      linkedCompanyNumber: c.linkedCompanyNumber || undefined,
      directorRole: c.directorRole || undefined,
      clientType: c.clientType || undefined,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  async searchClientsByName(name: string, limit = 50): Promise<Client[]> {
    if (!this.isDbEnabled) return [];
    const rows: any[] = await this.clientModel.findMany({
      where: {
        OR: [
          { name: { contains: name, mode: 'insensitive' } },
          { tradingName: { contains: name, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    return rows.map((c) => ({
      companyNumber: c.companyNumber || '',
      companyName: c.name,
      tradingName: c.tradingName || undefined,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    } as Client));
  }

  async getClientList(_filters: any = {}, _fields?: string[]): Promise<Client[]> {
    if (!this.isDbEnabled) return [];
    const rows: any[] = await this.clientModel.findMany({
      orderBy: { name: 'asc' },
      take: 1000,
    });

    return rows.map((c) => ({
      companyNumber: c.companyNumber || '',
      companyName: c.name,
      tradingName: c.tradingName || undefined,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    } as Client));
  }

  async storeCalculation(calculation: TaxCalculationResult): Promise<OperationResult> {
    if (!this.isDbEnabled) {
      return { success: false, message: 'Database not configured (DATABASE_URL missing)', id: calculation.id };
    }
    const resolvedClient = calculation.clientId
      ? await this.clientModel.findFirst({
          where: {
            OR: [
              { companyNumber: calculation.clientId },
              { ref: calculation.clientId },
              { id: calculation.clientId },
            ],
          },
        })
      : null;

    const clientId = resolvedClient?.id || null;
    const clientRef = resolvedClient?.ref || (calculation.clientId ? String(calculation.clientId) : null);

    await this.taxCalculationModel.upsert({
      where: { id: calculation.id },
      create: {
        id: calculation.id,
        clientId,
        clientRef,
        companyId: calculation.companyId || null,
        calculationType: calculation.calculationType as any,
        taxYear: calculation.taxYear,
        parameters: calculation.parameters || undefined,
        optimizedSalary: calculation.optimizedSalary ?? undefined,
        optimizedDividend: calculation.optimizedDividend ?? undefined,
        totalTakeHome: calculation.totalTakeHome ?? undefined,
        totalTaxLiability: calculation.totalTaxLiability ?? undefined,
        estimatedSavings: calculation.estimatedSavings ?? undefined,
        recommendations: calculation.recommendations || undefined,
        calculatedAt: calculation.calculatedAt ? new Date(calculation.calculatedAt) : undefined,
        calculatedBy: calculation.calculatedBy || null,
        notes: calculation.notes || null,
      },
      update: {
        clientId,
        clientRef,
        companyId: calculation.companyId || null,
        calculationType: calculation.calculationType as any,
        taxYear: calculation.taxYear,
        parameters: calculation.parameters || undefined,
        optimizedSalary: calculation.optimizedSalary ?? undefined,
        optimizedDividend: calculation.optimizedDividend ?? undefined,
        totalTakeHome: calculation.totalTakeHome ?? undefined,
        totalTaxLiability: calculation.totalTaxLiability ?? undefined,
        estimatedSavings: calculation.estimatedSavings ?? undefined,
        recommendations: calculation.recommendations || undefined,
        calculatedAt: calculation.calculatedAt ? new Date(calculation.calculatedAt) : undefined,
        calculatedBy: calculation.calculatedBy || null,
        notes: calculation.notes || null,
      },
    });

    return { success: true, message: 'Tax calculation stored successfully', id: calculation.id };
  }

  async getCalculationById(id: string): Promise<TaxCalculationResult | null> {
    if (!this.isDbEnabled) return null;
    const calc: any = await this.taxCalculationModel.findUnique({
      where: { id },
      include: { scenarios: true },
    });

    if (!calc) return null;

    return {
      id: calc.id,
      clientId: calc.clientRef || calc.clientId || '',
      companyId: calc.companyId || undefined,
      calculationType: calc.calculationType as any,
      taxYear: calc.taxYear,
      parameters: calc.parameters || undefined,
      optimizedSalary: calc.optimizedSalary ? Number(calc.optimizedSalary) : undefined,
      optimizedDividend: calc.optimizedDividend ? Number(calc.optimizedDividend) : undefined,
      totalTakeHome: calc.totalTakeHome ? Number(calc.totalTakeHome) : undefined,
      totalTaxLiability: calc.totalTaxLiability ? Number(calc.totalTaxLiability) : undefined,
      estimatedSavings: calc.estimatedSavings ? Number(calc.estimatedSavings) : undefined,
      recommendations: calc.recommendations || undefined,
      calculatedAt: calc.calculatedAt ? calc.calculatedAt.toISOString() : undefined,
      calculatedBy: calc.calculatedBy || undefined,
      notes: calc.notes || undefined,
      scenarios: (calc.scenarios || []).map((s) => ({
        id: s.id,
        calculationId: s.calculationId,
        name: s.name,
        scenarioData: s.scenarioData || undefined,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    };
  }

  async getClientCalculations(clientId: string, limit = 10): Promise<TaxCalculationResult[]> {
    if (!this.isDbEnabled) return [];
    const resolvedClient = await this.clientModel.findFirst({
      where: {
        OR: [{ id: clientId }, { ref: clientId }, { companyNumber: clientId }],
      },
    });

    const where = resolvedClient
      ? { OR: [{ clientId: resolvedClient.id }, { clientRef: resolvedClient.ref }] }
      : { clientRef: clientId };

    const calcs: any[] = await this.taxCalculationModel.findMany({
      where,
      orderBy: { calculatedAt: 'desc' },
      take: limit,
    });

    return calcs.map((c) => ({
      id: c.id,
      clientId: c.clientRef || c.clientId || '',
      companyId: c.companyId || undefined,
      calculationType: c.calculationType as any,
      taxYear: c.taxYear,
      parameters: c.parameters || undefined,
      optimizedSalary: c.optimizedSalary ?? undefined,
      optimizedDividend: c.optimizedDividend ?? undefined,
      totalTakeHome: c.totalTakeHome ?? undefined,
      totalTaxLiability: c.totalTaxLiability ?? undefined,
      estimatedSavings: c.estimatedSavings ?? undefined,
      recommendations: c.recommendations || undefined,
      calculatedAt: c.calculatedAt ? c.calculatedAt.toISOString() : undefined,
      calculatedBy: c.calculatedBy || undefined,
      notes: c.notes || undefined,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    } as any));
  }

  async storeReport(report: GeneratedReport): Promise<OperationResult> {
    if (!this.isDbEnabled) {
      return { success: false, message: 'Database not configured (DATABASE_URL missing)', id: report.id };
    }
    const resolvedClient = report.clientId
      ? await this.clientModel.findFirst({
          where: {
            OR: [{ companyNumber: report.clientId }, { ref: report.clientId }, { id: report.clientId }],
          },
        })
      : null;

    const clientId = resolvedClient?.id || null;
    const clientRef = resolvedClient?.ref || (report.clientId ? String(report.clientId) : null);

    await this.generatedReportModel.upsert({
      where: { id: report.id },
      create: {
        id: report.id,
        clientId,
        clientRef,
        calculationId: report.calculationId || null,
        templateId: report.templateId,
        title: report.title,
        content: report.content || undefined,
        format: report.format as any,
        filePath: report.filePath || null,
        generatedAt: report.generatedAt ? new Date(report.generatedAt) : undefined,
        generatedBy: report.generatedBy,
      },
      update: {
        clientId,
        clientRef,
        calculationId: report.calculationId || null,
        templateId: report.templateId,
        title: report.title,
        content: report.content || undefined,
        format: report.format as any,
        filePath: report.filePath || null,
        generatedAt: report.generatedAt ? new Date(report.generatedAt) : undefined,
        generatedBy: report.generatedBy,
      },
    });

    return { success: true, message: 'Report stored successfully', id: report.id };
  }

  async getClientReports(clientId: string, limit = 10): Promise<GeneratedReport[]> {
    if (!this.isDbEnabled) return [];
    const resolvedClient = await this.clientModel.findFirst({
      where: {
        OR: [{ id: clientId }, { ref: clientId }, { companyNumber: clientId }],
      },
    });

    const where = resolvedClient
      ? { OR: [{ clientId: resolvedClient.id }, { clientRef: resolvedClient.ref }] }
      : { clientRef: clientId };

    const rows: any[] = await this.generatedReportModel.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
      take: limit,
    });

    return rows.map((r) => ({
      id: r.id,
      clientId: r.clientRef || r.clientId || '',
      calculationId: r.calculationId || undefined,
      templateId: r.templateId,
      title: r.title,
      content: r.content || undefined,
      format: r.format as any,
      filePath: r.filePath || undefined,
      generatedAt: r.generatedAt,
      generatedBy: r.generatedBy,
    } as any));
  }

  async getReportById(id: string): Promise<GeneratedReport | null> {
    if (!this.isDbEnabled) return null;
    const r = await this.generatedReportModel.findUnique({ where: { id } });
    if (!r) return null;
    return {
      id: r.id,
      clientId: r.clientRef || r.clientId || '',
      calculationId: r.calculationId || undefined,
      templateId: r.templateId,
      title: r.title,
      content: r.content || undefined,
      format: r.format as any,
      filePath: r.filePath || undefined,
      generatedAt: r.generatedAt,
      generatedBy: r.generatedBy,
    } as any;
  }

  async storeRecommendations(calculationId: string, recommendations: any[]): Promise<OperationResult> {
    if (!this.isDbEnabled) {
      return { success: false, message: 'Database not configured (DATABASE_URL missing)', id: calculationId };
    }
    await this.taxCalculationModel.update({
      where: { id: calculationId },
      data: { recommendations: recommendations || [] },
    });
    return { success: true, message: 'Recommendations stored successfully', id: calculationId };
  }

  async getRecommendations(calculationId: string): Promise<any[]> {
    if (!this.isDbEnabled) return [];
    const row = await this.taxCalculationModel.findUnique({ where: { id: calculationId }, select: { recommendations: true } });
    return (row?.recommendations as any[]) || [];
  }

  async getClientRecommendations(clientId: string, options: any = {}): Promise<any[]> {
    if (!this.isDbEnabled) return [];
    const limit = options.limit || 50;

    const resolvedClient = await this.clientModel.findFirst({
      where: {
        OR: [{ id: clientId }, { ref: clientId }, { companyNumber: clientId }],
      },
    });

    const where = resolvedClient
      ? { OR: [{ clientId: resolvedClient.id }, { clientRef: resolvedClient.ref }] }
      : { clientRef: clientId };

    const rows: any[] = await this.taxCalculationModel.findMany({
      where,
      select: { id: true, recommendations: true },
      orderBy: { calculatedAt: 'desc' },
      take: limit,
    });

    const all: any[] = [];
    for (const r of rows) {
      const recs = (r.recommendations as any[]) || [];
      for (const rec of recs) {
        if (options.priority && rec.priority !== options.priority) continue;
        if (options.type && rec.type !== options.type) continue;
        if (options.implemented !== undefined && rec.implemented !== options.implemented) continue;
        all.push({ ...rec, calculationId: r.id });
      }
    }

    all.sort((a, b) => {
      const order: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const pd = (order[b.priority] || 0) - (order[a.priority] || 0);
      if (pd !== 0) return pd;
      return (b.potentialSaving || 0) - (a.potentialSaving || 0);
    });

    return all.slice(0, limit);
  }

  async beginTransaction(): Promise<void> {
    return;
  }

  async commitTransaction(): Promise<void> {
    return;
  }

  async rollbackTransaction(): Promise<void> {
    return;
  }
}

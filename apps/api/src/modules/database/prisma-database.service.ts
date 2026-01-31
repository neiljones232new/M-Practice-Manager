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
    try {
      const c: any = await this.clientModel.findFirst({ where: { companyNumber } });
      if (!c) return null;
      return {
        companyNumber: c.companyNumber || companyNumber,
        companyName: c.name,
        tradingName: c.tradingName || undefined,
        status: c.status,
        createdAt: c.createdAt || new Date(),
        updatedAt: c.updatedAt || new Date(),
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
        companyStatusDetail: c.companyStatusDetail || undefined,
        jurisdiction: c.jurisdiction || undefined,
        registeredOfficeFull: c.registeredOfficeFull || undefined,
        sicCodes: c.sicCodes || undefined,
        sicDescriptions: c.sicDescriptions || undefined,
        accountsOverdue: c.accountsOverdue ?? undefined,
        confirmationStatementOverdue: c.confirmationStatementOverdue ?? undefined,
        nextAccountsMadeUpTo: c.nextAccountsMadeUpTo || undefined,
        nextAccountsDueBy: c.nextAccountsDueBy || undefined,
        lastAccountsMadeUpTo: c.lastAccountsMadeUpTo || undefined,
        nextConfirmationStatementDate: c.nextConfirmationStatementDate || undefined,
        confirmationStatementDueBy: c.confirmationStatementDueBy || undefined,
        lastConfirmationStatementDate: c.lastConfirmationStatementDate || undefined,
        directorCount: c.directorCount ?? undefined,
        pscCount: c.pscCount ?? undefined,
        currentDirectors: c.currentDirectors || undefined,
        currentPscs: c.currentPscs || undefined,
        lastChRefresh: c.lastChRefresh || undefined,
      };
    } catch (_err) {
      return null;
    }
  }

  async searchClientsByName(name: string, limit = 50): Promise<Client[]> {
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
    try {
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
    } catch (_err) {
      return [];
    }
  }

  async storeCalculation(calculation: TaxCalculationResult): Promise<OperationResult> {
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
      parameters: calc.parameters || {},
      optimizedSalary: calc.optimizedSalary ? Number(calc.optimizedSalary) : undefined,
      optimizedDividend: calc.optimizedDividend ? Number(calc.optimizedDividend) : undefined,
      totalTakeHome: calc.totalTakeHome ? Number(calc.totalTakeHome) : undefined,
      totalTaxLiability: calc.totalTaxLiability ? Number(calc.totalTaxLiability) : undefined,
      estimatedSavings: calc.estimatedSavings ? Number(calc.estimatedSavings) : undefined,
      recommendations: calc.recommendations || [],
      calculatedAt: calc.calculatedAt || undefined,
      calculatedBy: calc.calculatedBy || undefined,
      notes: calc.notes || undefined,
      scenarios: (calc.scenarios || []).map((s) => ({
        id: s.id,
        calculationId: s.calculationId,
        scenarioName: s.scenarioName || '',
        salary: s.salary ? Number(s.salary) : 0,
        dividend: s.dividend ? Number(s.dividend) : 0,
        incomeTax: s.incomeTax ? Number(s.incomeTax) : 0,
        employeeNi: s.employeeNi ? Number(s.employeeNi) : 0,
        employerNi: s.employerNi ? Number(s.employerNi) : 0,
        dividendTax: s.dividendTax ? Number(s.dividendTax) : 0,
        corporationTax: s.corporationTax ? Number(s.corporationTax) : 0,
        totalTax: s.totalTax ? Number(s.totalTax) : 0,
        takeHome: s.takeHome ? Number(s.takeHome) : 0,
        effectiveRate: s.effectiveRate ? Number(s.effectiveRate) : 0,
      })),
    };
  }

  async getClientCalculations(clientId: string, limit = 10): Promise<TaxCalculationResult[]> {
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
      include: { scenarios: true },
    });

    return Promise.all(calcs.map((c) => this.getCalculationById(c.id))).then((rows) => rows.filter(Boolean) as TaxCalculationResult[]);
  }

  async storeReport(report: GeneratedReport): Promise<OperationResult> {
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
        templateId: report.templateId || null,
        title: report.title,
        content: report.content || undefined,
        format: report.format as any,
        filePath: report.filePath || null,
        generatedAt: report.generatedAt ? new Date(report.generatedAt) : undefined,
        generatedBy: report.generatedBy || null,
      },
      update: {
        clientId,
        clientRef,
        calculationId: report.calculationId || null,
        templateId: report.templateId || null,
        title: report.title,
        content: report.content || undefined,
        format: report.format as any,
        filePath: report.filePath || null,
        generatedAt: report.generatedAt ? new Date(report.generatedAt) : undefined,
        generatedBy: report.generatedBy || null,
      },
    });

    return { success: true, message: 'Report stored successfully', id: report.id };
  }

  async getClientReports(clientId: string, limit = 10): Promise<GeneratedReport[]> {
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
      templateId: r.templateId || '',
      title: r.title,
      content: r.content || {},
      format: r.format as any,
      filePath: r.filePath || undefined,
      generatedAt: r.generatedAt || new Date(),
      generatedBy: r.generatedBy || '',
    }));
  }

  async getReportById(id: string): Promise<GeneratedReport | null> {
    const r = await this.generatedReportModel.findUnique({ where: { id } });
    if (!r) return null;
    return {
      id: r.id,
      clientId: r.clientRef || r.clientId || '',
      calculationId: r.calculationId || undefined,
      templateId: r.templateId || '',
      title: r.title,
      content: r.content || {},
      format: r.format as any,
      filePath: r.filePath || undefined,
      generatedAt: r.generatedAt || new Date(),
      generatedBy: r.generatedBy || '',
    };
  }

  async storeRecommendations(calculationId: string, recommendations: any[]): Promise<OperationResult> {
    await this.taxCalculationModel.update({
      where: { id: calculationId },
      data: { recommendations: recommendations || [] },
    });
    return { success: true, message: 'Recommendations stored successfully' };
  }

  async getRecommendations(calculationId: string): Promise<any[]> {
    const row = await this.taxCalculationModel.findUnique({ where: { id: calculationId }, select: { recommendations: true } });
    return (row?.recommendations as any[]) || [];
  }

  async getClientRecommendations(clientId: string, options: any = {}): Promise<any[]> {
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

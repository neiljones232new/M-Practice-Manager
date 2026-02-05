import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DatabaseService } from './database.service';
import {
  Client,
  GeneratedReport,
  OperationResult,
  QueryResult,
  TaxCalculationResult,
} from './interfaces/database.interface';
import { randomUUID } from 'crypto';

@Injectable()
export class PrismaDatabaseService extends DatabaseService {
  constructor(private readonly prisma: PrismaService) {
    super();
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
      const c: any = await this.clientModel.findFirst({
        where: {
          OR: [{ registeredNumber: companyNumber }, { id: companyNumber }],
        },
        include: { clientProfile: true, address: true },
      });
      if (!c) return null;
      const profile = c.clientProfile || {};
      const addressText = c.address
        ? [
            c.address.line1,
            c.address.line2,
            c.address.city,
            c.address.county,
            c.address.postcode,
            c.address.country,
          ]
            .filter(Boolean)
            .join(', ')
        : undefined;
      return {
        companyNumber: c.registeredNumber || companyNumber,
        companyName: c.name,
        tradingName: c.tradingName || undefined,
        status: c.status,
        createdAt: c.createdAt || new Date(),
        updatedAt: c.updatedAt || new Date(),
        companyType: profile.companyType || undefined,
        incorporationDate: c.incorporationDate ? c.incorporationDate.toISOString() : undefined,
        registeredAddress: profile.registeredAddress || addressText,
        corporationTaxUtr: profile.corporationTaxUtr || undefined,
        vatNumber: profile.vatNumber || c.vatNumber || undefined,
        vatRegistrationDate: profile.vatRegistrationDate || undefined,
        vatScheme: profile.vatScheme || undefined,
        vatStagger: (profile.vatStagger as any) || undefined,
        payeReference: profile.payeReference || c.payeReference || undefined,
        payeAccountsOfficeReference: profile.payeAccountsOfficeReference || undefined,
        authenticationCode: profile.authenticationCode || undefined,
        accountsOfficeReference: profile.accountsOfficeReference || c.accountsOfficeReference || undefined,
        employeeCount: profile.employeeCount ?? undefined,
        payrollFrequency: profile.payrollFrequency || undefined,
        payrollPayDay: profile.payrollPayDay ?? undefined,
        payrollPeriodEndDay: profile.payrollPeriodEndDay ?? undefined,
        cisRegistered: profile.cisRegistered ?? undefined,
        cisUtr: profile.cisUtr || undefined,
        mainContactName: profile.mainContactName || undefined,
        contactPosition: profile.contactPosition || undefined,
        telephone: profile.telephone || undefined,
        mobile: profile.mobile || undefined,
        email: profile.email || c.mainEmail || undefined,
        preferredContactMethod: profile.preferredContactMethod || undefined,
        correspondenceAddress: profile.correspondenceAddress || undefined,
        clientManager: profile.clientManager || undefined,
        partnerResponsible: profile.partnerResponsible || undefined,
        engagementType: profile.engagementType || undefined,
        onboardingDate: profile.onboardingDate || undefined,
        disengagementDate: profile.disengagementDate || undefined,
        engagementLetterSigned: profile.engagementLetterSigned ?? undefined,
        amlCompleted: profile.amlCompleted ?? undefined,
        lifecycleStatus: (profile.lifecycleStatus as any) || undefined,
        onboardingStartedAt: profile.onboardingStartedAt || undefined,
        wentLiveAt: profile.wentLiveAt || undefined,
        ceasedAt: profile.ceasedAt || undefined,
        dormantSince: profile.dormantSince || undefined,
        feeArrangement: profile.feeArrangement || undefined,
        monthlyFee: profile.monthlyFee ? Number(profile.monthlyFee) : undefined,
        annualFee: profile.annualFee ? Number(profile.annualFee) : undefined,
        accountingPeriodEnd: profile.accountingPeriodEnd || undefined,
        nextAccountsDueDate: profile.nextAccountsDueDate || undefined,
        nextCorporationTaxDueDate: profile.nextCorporationTaxDueDate || undefined,
        statutoryYearEnd: profile.statutoryYearEnd || undefined,
        vatReturnFrequency: profile.vatReturnFrequency || undefined,
        vatQuarter: profile.vatQuarter || undefined,
        vatPeriodStart: profile.vatPeriodStart || undefined,
        vatPeriodEnd: profile.vatPeriodEnd || undefined,
        payrollRtiRequired: profile.payrollRtiRequired ?? undefined,
        businessBankName: profile.businessBankName || undefined,
        accountLastFour: profile.accountLastFour || undefined,
        directDebitInPlace: profile.directDebitInPlace ?? undefined,
        paymentIssues: profile.paymentIssues || undefined,
        notes: profile.notes || undefined,
        specialCircumstances: profile.specialCircumstances || undefined,
        seasonalBusiness: profile.seasonalBusiness ?? undefined,
        dormant: profile.dormant ?? undefined,
        clientRiskRating: profile.clientRiskRating || undefined,
        doNotContact: profile.doNotContact ?? undefined,
        personalUtr: profile.personalUtr || undefined,
        nationalInsuranceNumber: profile.nationalInsuranceNumber || undefined,
        dateOfBirth: profile.dateOfBirth || undefined,
        personalAddress: profile.personalAddress || undefined,
        personalTaxYear: profile.personalTaxYear || undefined,
        selfAssessmentTaxYear: profile.selfAssessmentTaxYear || undefined,
        selfAssessmentRequired: profile.selfAssessmentRequired ?? undefined,
        selfAssessmentFiled: profile.selfAssessmentFiled ?? undefined,
        linkedCompanyNumber: profile.linkedCompanyNumber || undefined,
        directorRole: profile.directorRole || undefined,
        clientType: profile.clientType || undefined,
        companyStatusDetail: profile.companyStatusDetail || undefined,
        jurisdiction: profile.jurisdiction || undefined,
        registeredOfficeFull: profile.registeredOfficeFull || undefined,
        sicCodes: profile.sicCodes || undefined,
        sicDescriptions: profile.sicDescriptions || undefined,
        accountsOverdue: profile.accountsOverdue ?? undefined,
        confirmationStatementOverdue: profile.confirmationStatementOverdue ?? undefined,
        nextAccountsMadeUpTo: profile.nextAccountsMadeUpTo || undefined,
        nextAccountsDueBy: profile.nextAccountsDueBy || undefined,
        lastAccountsMadeUpTo: profile.lastAccountsMadeUpTo || undefined,
        nextConfirmationStatementDate: profile.nextConfirmationStatementDate || undefined,
        confirmationStatementDueBy: profile.confirmationStatementDueBy || undefined,
        lastConfirmationStatementDate: profile.lastConfirmationStatementDate || undefined,
        directorCount: profile.directorCount ?? undefined,
        pscCount: profile.pscCount ?? undefined,
        currentDirectors: profile.currentDirectors || undefined,
        currentPscs: profile.currentPscs || undefined,
        lastChRefresh: profile.lastChRefresh || undefined,
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
      companyNumber: c.registeredNumber || '',
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
      companyNumber: c.registeredNumber || '',
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

  async addClient(client: Partial<Client>): Promise<OperationResult> {
    try {
      const companyNumber = client.companyNumber || '';
      const id = companyNumber || randomUUID();
      const name = client.companyName || client.tradingName || 'Unknown Client';

      const status = (client.status || 'ACTIVE').toString().toUpperCase();
      const type = (client.clientType || client.companyType || 'COMPANY').toString().toUpperCase();

      const portfolio = await (this.prisma as any).portfolio.findFirst({ orderBy: { code: 'asc' } });
      const portfolioCode = (client as any).portfolioCode ?? portfolio?.code ?? 1;

      await (this.prisma as any).client.create({
        data: {
          id,
          name,
          status: status === 'INACTIVE' || status === 'ARCHIVED' ? status : 'ACTIVE',
          type: ['COMPANY', 'INDIVIDUAL', 'SOLE_TRADER', 'PARTNERSHIP', 'LLP'].includes(type) ? type : 'COMPANY',
          portfolioCode,
          registeredNumber: companyNumber || undefined,
          tradingName: client.tradingName || undefined,
          incorporationDate: client.incorporationDate ? new Date(client.incorporationDate) : undefined,
          accountsOfficeReference: client.accountsOfficeReference || undefined,
          payeReference: client.payeReference || undefined,
          vatNumber: client.vatNumber || undefined,
          cisUtr: client.cisUtr || undefined,
          mainEmail: client.email || undefined,
          mainPhone: client.telephone || client.mobile || undefined,
          clientProfile: {
            create: {
              clientId: id,
              mainContactName: client.mainContactName || undefined,
              partnerResponsible: client.partnerResponsible || undefined,
              clientManager: client.clientManager || undefined,
              lifecycleStatus: (client.lifecycleStatus as any) || 'ACTIVE',
              engagementType: client.engagementType || undefined,
              engagementLetterSigned: client.engagementLetterSigned ?? undefined,
              onboardingDate: client.onboardingDate ? new Date(client.onboardingDate) : undefined,
              disengagementDate: client.disengagementDate ? new Date(client.disengagementDate) : undefined,
              onboardingStartedAt: client.onboardingStartedAt ? new Date(client.onboardingStartedAt) : undefined,
              wentLiveAt: client.wentLiveAt ? new Date(client.wentLiveAt) : undefined,
              ceasedAt: client.ceasedAt ? new Date(client.ceasedAt) : undefined,
              dormantSince: client.dormantSince ? new Date(client.dormantSince) : undefined,
              accountingPeriodEnd: client.accountingPeriodEnd ? new Date(client.accountingPeriodEnd) : undefined,
              nextAccountsDueDate: client.nextAccountsDueDate ? new Date(client.nextAccountsDueDate) : undefined,
              nextCorporationTaxDueDate: client.nextCorporationTaxDueDate ? new Date(client.nextCorporationTaxDueDate) : undefined,
              statutoryYearEnd: client.statutoryYearEnd ? new Date(client.statutoryYearEnd) : undefined,
              vatRegistrationDate: client.vatRegistrationDate ? new Date(client.vatRegistrationDate) : undefined,
              vatPeriodStart: client.vatPeriodStart ? new Date(client.vatPeriodStart) : undefined,
              vatPeriodEnd: client.vatPeriodEnd ? new Date(client.vatPeriodEnd) : undefined,
              vatStagger: (client.vatStagger as any) || undefined,
              payrollPayDay: client.payrollPayDay ?? undefined,
              payrollPeriodEndDay: client.payrollPeriodEndDay ?? undefined,
              corporationTaxUtr: client.corporationTaxUtr || undefined,
              vatNumber: client.vatNumber || undefined,
              vatScheme: client.vatScheme || undefined,
              vatReturnFrequency: client.vatReturnFrequency || undefined,
              vatQuarter: client.vatQuarter || undefined,
              payeReference: client.payeReference || undefined,
              payeAccountsOfficeReference: client.payeAccountsOfficeReference || undefined,
              cisRegistered: client.cisRegistered ?? undefined,
              cisUtr: client.cisUtr || undefined,
              personalUtr: client.personalUtr || undefined,
              nationalInsuranceNumber: client.nationalInsuranceNumber || undefined,
              dateOfBirth: client.dateOfBirth ? new Date(client.dateOfBirth) : undefined,
              personalAddress: client.personalAddress || undefined,
              personalTaxYear: client.personalTaxYear || undefined,
              selfAssessmentTaxYear: client.selfAssessmentTaxYear || undefined,
              selfAssessmentRequired: client.selfAssessmentRequired ?? undefined,
              selfAssessmentFiled: client.selfAssessmentFiled ?? undefined,
              linkedCompanyNumber: client.linkedCompanyNumber || undefined,
              directorRole: client.directorRole || undefined,
              payrollRtiRequired: client.payrollRtiRequired ?? undefined,
              amlCompleted: client.amlCompleted ?? undefined,
              clientRiskRating: client.clientRiskRating || undefined,
              annualFee: client.annualFee ?? undefined,
              monthlyFee: client.monthlyFee ?? undefined,
              tradingName: client.tradingName || undefined,
              companyType: client.companyType || undefined,
              registeredAddress: client.registeredAddress || undefined,
              authenticationCode: client.authenticationCode || undefined,
              employeeCount: client.employeeCount ?? undefined,
              payrollFrequency: client.payrollFrequency || undefined,
              contactPosition: client.contactPosition || undefined,
              telephone: client.telephone || undefined,
              mobile: client.mobile || undefined,
              email: client.email || undefined,
              preferredContactMethod: client.preferredContactMethod || undefined,
              correspondenceAddress: client.correspondenceAddress || undefined,
              feeArrangement: client.feeArrangement || undefined,
              businessBankName: client.businessBankName || undefined,
              accountLastFour: client.accountLastFour || undefined,
              directDebitInPlace: client.directDebitInPlace ?? undefined,
              paymentIssues: client.paymentIssues || undefined,
              notes: client.notes || undefined,
              specialCircumstances: client.specialCircumstances || undefined,
              seasonalBusiness: client.seasonalBusiness ?? undefined,
              dormant: client.dormant ?? undefined,
              doNotContact: client.doNotContact ?? undefined,
              companyStatusDetail: client.companyStatusDetail || undefined,
              jurisdiction: client.jurisdiction || undefined,
              registeredOfficeFull: client.registeredOfficeFull || undefined,
              sicCodes: client.sicCodes || undefined,
              sicDescriptions: client.sicDescriptions || undefined,
              accountsOverdue: client.accountsOverdue ?? undefined,
              confirmationStatementOverdue: client.confirmationStatementOverdue ?? undefined,
              nextAccountsMadeUpTo: client.nextAccountsMadeUpTo ? new Date(client.nextAccountsMadeUpTo) : undefined,
              nextAccountsDueBy: client.nextAccountsDueBy ? new Date(client.nextAccountsDueBy) : undefined,
              lastAccountsMadeUpTo: client.lastAccountsMadeUpTo ? new Date(client.lastAccountsMadeUpTo) : undefined,
              nextConfirmationStatementDate: client.nextConfirmationStatementDate ? new Date(client.nextConfirmationStatementDate) : undefined,
              confirmationStatementDueBy: client.confirmationStatementDueBy ? new Date(client.confirmationStatementDueBy) : undefined,
              lastConfirmationStatementDate: client.lastConfirmationStatementDate ? new Date(client.lastConfirmationStatementDate) : undefined,
              directorCount: client.directorCount ?? undefined,
              pscCount: client.pscCount ?? undefined,
              currentDirectors: client.currentDirectors || undefined,
              currentPscs: client.currentPscs || undefined,
              lastChRefresh: client.lastChRefresh ? new Date(client.lastChRefresh) : undefined,
            },
          },
        },
      });

      return { success: true, message: 'Client added successfully', id };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to add client' };
    }
  }

  async storeCalculation(calculation: TaxCalculationResult): Promise<OperationResult> {
    const resolvedClient = calculation.clientId
      ? await this.clientModel.findFirst({
          where: {
            OR: [
              { registeredNumber: calculation.clientId },
              { id: calculation.clientId },
            ],
          },
        })
      : null;

    const clientId = resolvedClient?.id || calculation.clientId || null;

    await this.taxCalculationModel.upsert({
      where: { id: calculation.id },
      create: {
        id: calculation.id,
        clientId,
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
      clientId: calc.clientId || '',
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
        OR: [{ id: clientId }, { registeredNumber: clientId }],
      },
    });

    const where = resolvedClient ? { clientId: resolvedClient.id } : { clientId };

    const calcs: any[] = await this.taxCalculationModel.findMany({
      where,
      orderBy: { calculatedAt: 'desc' },
      take: limit,
      include: { scenarios: true },
    });

    return Promise.all(calcs.map((c) => this.getCalculationById(c.id))).then((rows) => rows.filter(Boolean) as TaxCalculationResult[]);
  }

  async getCalculationHistory(
    clientId?: string,
    taxYear?: string,
    calculationType?: string,
    limit = 50,
    offset = 0
  ): Promise<{ calculations: TaxCalculationResult[]; total: number }> {
    const resolvedClient = clientId
      ? await this.clientModel.findFirst({
          where: { OR: [{ id: clientId }, { registeredNumber: clientId }] },
        })
      : null;

    const where: any = {};
    if (resolvedClient?.id) where.clientId = resolvedClient.id;
    else if (clientId) where.clientId = clientId;
    if (taxYear) where.taxYear = taxYear;
    if (calculationType) where.calculationType = calculationType as any;

    const [total, rows] = await Promise.all([
      this.taxCalculationModel.count({ where }),
      this.taxCalculationModel.findMany({
        where,
        orderBy: { calculatedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
    ]);

    const calculations = await Promise.all(
      rows.map((c: any) => this.getCalculationById(c.id))
    ).then((list) => list.filter(Boolean) as TaxCalculationResult[]);

    return { calculations, total };
  }

  async getTaxCalculationStats(clientId?: string): Promise<{
    totalCalculations: number;
    calculationsByType: Record<string, number>;
    calculationsByTaxYear: Record<string, number>;
    averageSavings: number;
    totalSavingsIdentified: number;
    latestCalculation?: TaxCalculationResult;
    topOptimizations: Array<{ type: string; count: number; averageSaving: number }>;
  }> {
    const { calculations, total } = await this.getCalculationHistory(clientId, undefined, undefined, 1000, 0);

    const calculationsByType: Record<string, number> = {};
    const calculationsByTaxYear: Record<string, number> = {};
    let totalSavings = 0;

    calculations.forEach((c) => {
      calculationsByType[c.calculationType] = (calculationsByType[c.calculationType] || 0) + 1;
      calculationsByTaxYear[c.taxYear] = (calculationsByTaxYear[c.taxYear] || 0) + 1;
      totalSavings += c.estimatedSavings || 0;
    });

    const latestCalculation = calculations[0];

    return {
      totalCalculations: total,
      calculationsByType,
      calculationsByTaxYear,
      averageSavings: total > 0 ? totalSavings / total : 0,
      totalSavingsIdentified: totalSavings,
      latestCalculation,
      topOptimizations: [],
    };
  }

  async deleteCalculation(id: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.prisma.$transaction([
        this.taxScenarioModel.deleteMany({ where: { calculationId: id } }),
        this.taxCalculationModel.delete({ where: { id } }),
      ]);
      return { success: true, message: 'Deleted tax calculation' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to delete tax calculation' };
    }
  }

  async storeReport(report: GeneratedReport): Promise<OperationResult> {
    const resolvedClient = report.clientId
      ? await this.clientModel.findFirst({
          where: {
            OR: [{ registeredNumber: report.clientId }, { id: report.clientId }],
          },
        })
      : null;

    const clientId = resolvedClient?.id || report.clientId || null;

    await this.generatedReportModel.upsert({
      where: { id: report.id },
      create: {
        id: report.id,
        clientId,
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
        OR: [{ id: clientId }, { registeredNumber: clientId }],
      },
    });

    const where = resolvedClient ? { clientId: resolvedClient.id } : { clientId };

    const rows: any[] = await this.generatedReportModel.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
      take: limit,
    });

    return rows.map((r) => ({
      id: r.id,
      clientId: r.clientId || '',
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
      clientId: r.clientId || '',
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
        OR: [{ id: clientId }, { registeredNumber: clientId }],
      },
    });

    const where = resolvedClient ? { clientId: resolvedClient.id } : { clientId };

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

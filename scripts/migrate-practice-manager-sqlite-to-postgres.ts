import * as path from 'path';
import { existsSync } from 'fs';
import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';

const storagePath = process.env.STORAGE_PATH
  ? path.resolve(process.env.STORAGE_PATH)
  : path.resolve(__dirname, '..', 'storage');

const sqlitePath = process.env.SQLITE_PATH
  ? path.resolve(process.env.SQLITE_PATH)
  : path.join(storagePath, 'practice-manager.db');

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const LEGACY_CLIENT_ID_MAP: Record<string, string> = (() => {
  try {
    const raw = process.env.LEGACY_CLIENT_ID_MAP;
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
})();

type Report = {
  sqlitePath: string;
  mapping: {
    used: number;
    missing: number;
    invalidJson: boolean;
  };
  migrated: {
    taxCalculations: number;
    taxScenarios: number;
    generatedReports: number;
  };
  skipped: {
    taxCalculations: number;
    generatedReports: number;
  };
  warnings: string[];
};

function toDecimalNumber(v: any): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

async function main() {
  const report: Report = {
    sqlitePath,
    mapping: { used: 0, missing: 0, invalidJson: Boolean(process.env.LEGACY_CLIENT_ID_MAP) && Object.keys(LEGACY_CLIENT_ID_MAP).length === 0 },
    migrated: { taxCalculations: 0, taxScenarios: 0, generatedReports: 0 },
    skipped: { taxCalculations: 0, generatedReports: 0 },
    warnings: [],
  };

  if (!existsSync(sqlitePath)) {
    throw new Error(`SQLite DB not found at: ${sqlitePath}`);
  }

  const sqlite = new Database(sqlitePath, { readonly: true });
  const prisma = new PrismaClient();
  const prismaAny = prisma as any;

  try {
    await prisma.$connect();

    const taxCalcs = (sqlite
      .prepare(
        `SELECT id, client_id, company_id, calculation_type, tax_year, parameters,
                optimized_salary, optimized_dividend, total_take_home, total_tax_liability,
                estimated_savings, recommendations, calculated_at, calculated_by, notes
           FROM tax_calculations`
      )
      .all() as any[]);

    for (const row of taxCalcs) {
      const r: any = row;
      const clientIdentifier = String(r.client_id || '');
      const mappedRef = LEGACY_CLIENT_ID_MAP[clientIdentifier];
      if (mappedRef) {
        report.mapping.used += 1;
      } else if (clientIdentifier && clientIdentifier.startsWith('client_')) {
        report.mapping.missing += 1;
      }
      const lookupIdentifier = mappedRef || clientIdentifier;

      const resolvedClient = lookupIdentifier
        ? await prismaAny.client.findFirst({
            where: {
              OR: [{ companyNumber: lookupIdentifier }, { ref: lookupIdentifier }, { id: lookupIdentifier }],
            },
          })
        : null;

      const clientId = resolvedClient?.id || null;
      const clientRef = resolvedClient?.ref || (lookupIdentifier || null);

      if (!clientRef && !clientId) {
        report.skipped.taxCalculations += 1;
        report.warnings.push(`Skipping tax_calculation ${r.id}: cannot resolve client ${clientIdentifier}${mappedRef ? ` (mapped to ${mappedRef})` : ''}`);
        continue;
      }

      const recs = r.recommendations ? JSON.parse(r.recommendations) : undefined;
      const params = r.parameters ? JSON.parse(r.parameters) : undefined;

      if (!DRY_RUN) {
        await prismaAny.taxCalculation.upsert({
          where: { id: String(r.id) },
          create: {
            id: String(r.id),
            clientId,
            clientRef,
            companyId: r.company_id ? String(r.company_id) : null,
            calculationType: String(r.calculation_type) as any,
            taxYear: String(r.tax_year),
            parameters: params,
            optimizedSalary: toDecimalNumber(r.optimized_salary),
            optimizedDividend: toDecimalNumber(r.optimized_dividend),
            totalTakeHome: toDecimalNumber(r.total_take_home),
            totalTaxLiability: toDecimalNumber(r.total_tax_liability),
            estimatedSavings: toDecimalNumber(r.estimated_savings),
            recommendations: recs,
            calculatedAt: r.calculated_at ? new Date(r.calculated_at) : undefined,
            calculatedBy: r.calculated_by ? String(r.calculated_by) : null,
            notes: r.notes ? String(r.notes) : null,
          },
          update: {
            clientId,
            clientRef,
            companyId: r.company_id ? String(r.company_id) : null,
            calculationType: String(r.calculation_type) as any,
            taxYear: String(r.tax_year),
            parameters: params,
            optimizedSalary: toDecimalNumber(r.optimized_salary),
            optimizedDividend: toDecimalNumber(r.optimized_dividend),
            totalTakeHome: toDecimalNumber(r.total_take_home),
            totalTaxLiability: toDecimalNumber(r.total_tax_liability),
            estimatedSavings: toDecimalNumber(r.estimated_savings),
            recommendations: recs,
            calculatedAt: r.calculated_at ? new Date(r.calculated_at) : undefined,
            calculatedBy: r.calculated_by ? String(r.calculated_by) : null,
            notes: r.notes ? String(r.notes) : null,
          },
        });
      }

      report.migrated.taxCalculations += 1;

      const scenarios = (sqlite
        .prepare(
          `SELECT id, calculation_id, scenario_name, salary, dividend, income_tax, employee_ni, employer_ni,
                  dividend_tax, corporation_tax, total_tax, take_home, effective_rate
             FROM tax_scenarios WHERE calculation_id = ?`
        )
        .all([r.id]) as any[]);

      for (const sRow of scenarios) {
        const s: any = sRow;
        if (!DRY_RUN) {
          await prismaAny.taxScenario.upsert({
            where: { id: String(s.id) },
            create: {
              id: String(s.id),
              calculationId: String(s.calculation_id),
              scenarioName: s.scenario_name ? String(s.scenario_name) : null,
              salary: toDecimalNumber(s.salary),
              dividend: toDecimalNumber(s.dividend),
              incomeTax: toDecimalNumber(s.income_tax),
              employeeNi: toDecimalNumber(s.employee_ni),
              employerNi: toDecimalNumber(s.employer_ni),
              dividendTax: toDecimalNumber(s.dividend_tax),
              corporationTax: toDecimalNumber(s.corporation_tax),
              totalTax: toDecimalNumber(s.total_tax),
              takeHome: toDecimalNumber(s.take_home),
              effectiveRate: toDecimalNumber(s.effective_rate),
            },
            update: {
              calculationId: String(s.calculation_id),
              scenarioName: s.scenario_name ? String(s.scenario_name) : null,
              salary: toDecimalNumber(s.salary),
              dividend: toDecimalNumber(s.dividend),
              incomeTax: toDecimalNumber(s.income_tax),
              employeeNi: toDecimalNumber(s.employee_ni),
              employerNi: toDecimalNumber(s.employer_ni),
              dividendTax: toDecimalNumber(s.dividend_tax),
              corporationTax: toDecimalNumber(s.corporation_tax),
              totalTax: toDecimalNumber(s.total_tax),
              takeHome: toDecimalNumber(s.take_home),
              effectiveRate: toDecimalNumber(s.effective_rate),
            },
          });
        }
        report.migrated.taxScenarios += 1;
      }
    }

    const reports = (sqlite
      .prepare(
        `SELECT id, client_id, calculation_id, template_id, title, content, format, file_path, generated_at, generated_by
           FROM generated_reports`
      )
      .all() as any[]);

    for (const reportRow of reports) {
      const r: any = reportRow;
      const clientIdentifier = String(r.client_id || '');
      const mappedRef = LEGACY_CLIENT_ID_MAP[clientIdentifier];
      if (mappedRef) {
        report.mapping.used += 1;
      } else if (clientIdentifier && clientIdentifier.startsWith('client_')) {
        report.mapping.missing += 1;
      }
      const lookupIdentifier = mappedRef || clientIdentifier;

      const resolvedClient = lookupIdentifier
        ? await prismaAny.client.findFirst({
            where: {
              OR: [{ companyNumber: lookupIdentifier }, { ref: lookupIdentifier }, { id: lookupIdentifier }],
            },
          })
        : null;

      const clientId = resolvedClient?.id || null;
      const clientRef = resolvedClient?.ref || (lookupIdentifier || null);

      if (!clientRef && !clientId) {
        report.skipped.generatedReports += 1;
        report.warnings.push(`Skipping generated_report ${r.id}: cannot resolve client ${clientIdentifier}${mappedRef ? ` (mapped to ${mappedRef})` : ''}`);
        continue;
      }

      const content = r.content ? JSON.parse(r.content) : undefined;

      if (!DRY_RUN) {
        await prismaAny.generatedReport.upsert({
          where: { id: String(r.id) },
          create: {
            id: String(r.id),
            clientId,
            clientRef,
            calculationId: r.calculation_id ? String(r.calculation_id) : null,
            templateId: r.template_id ? String(r.template_id) : null,
            title: String(r.title || ''),
            content,
            format: String(r.format || 'PDF') as any,
            filePath: r.file_path ? String(r.file_path) : null,
            generatedAt: r.generated_at ? new Date(r.generated_at) : undefined,
            generatedBy: r.generated_by ? String(r.generated_by) : null,
          },
          update: {
            clientId,
            clientRef,
            calculationId: r.calculation_id ? String(r.calculation_id) : null,
            templateId: r.template_id ? String(r.template_id) : null,
            title: String(r.title || ''),
            content,
            format: String(r.format || 'PDF') as any,
            filePath: r.file_path ? String(r.file_path) : null,
            generatedAt: r.generated_at ? new Date(r.generated_at) : undefined,
            generatedBy: r.generated_by ? String(r.generated_by) : null,
          },
        });
      }

      report.migrated.generatedReports += 1;
    }

    const banner = DRY_RUN ? 'DRY RUN' : 'APPLIED';
    console.log(`SQLite -> Postgres migration (${banner}) complete.`);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    try {
      sqlite.close();
    } catch {}
    try {
      await prisma.$disconnect();
    } catch {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

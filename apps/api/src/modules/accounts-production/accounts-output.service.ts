import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import * as Handlebars from 'handlebars';
import * as puppeteer from 'puppeteer';
import { AccountsSet } from './interfaces/accounts-set.interface';
import { FinancialCalculationService } from './financial-calculation.service';
import { ClientsService } from '../clients/clients.service';

@Injectable()
export class AccountsOutputService {
  private readonly logger = new Logger(AccountsOutputService.name);
  private readonly outputsPath: string;
  private readonly templatesPath: string;
  private readonly storageRoot: string;
  private readonly repoRoot: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly calculationService: FinancialCalculationService,
    private readonly clientsService: ClientsService,
  ) {
    const cwd = process.cwd();
    const repoRoot = cwd.endsWith(path.join('apps', 'api')) ? path.resolve(cwd, '..', '..') : cwd;
    this.repoRoot = repoRoot;
    const storagePath = this.configService.get<string>('STORAGE_PATH') || './storage';
    const resolvedStoragePath = path.isAbsolute(storagePath)
      ? storagePath
      : path.resolve(cwd, storagePath);
    // Use absolute path for outputs to make them easily accessible
    this.outputsPath = path.resolve(resolvedStoragePath, 'outputs');
    this.storageRoot = path.dirname(this.outputsPath);

    const templateCandidates = [
      path.join(repoRoot, 'apps', 'api', 'src', 'modules', 'accounts-production', 'templates'),
      path.join(repoRoot, 'apps', 'api', 'dist', 'modules', 'accounts-production', 'templates'),
      path.join(repoRoot, 'apps', 'api', 'dist', 'src', 'modules', 'accounts-production', 'templates'),
      path.join(__dirname, 'templates'),
    ];
    const templatePath = templateCandidates.find((candidate) => existsSync(candidate)) ?? templateCandidates[0];

    this.logger.log(`Workspace root: ${repoRoot}`);
    this.logger.log(`Checking template paths: ${templateCandidates.join(', ')}`);

    if (existsSync(templatePath)) {
      const templateFile = path.join(templatePath, 'statutory-accounts.hbs');
      if (existsSync(templateFile)) {
        this.templatesPath = templatePath;
        this.logger.log(`✅ Found templates at: ${templatePath}`);
      } else {
        this.logger.error(`❌ Template file not found: ${templateFile}`);
        this.templatesPath = templatePath; // Use it anyway for better error messages
      }
    } else {
      this.logger.error(`❌ Templates directory not found: ${templatePath}`);
      this.templatesPath = templatePath; // Use it anyway for better error messages
    }
    
    this.logger.log(`Using templates path: ${this.templatesPath}`);
    this.logger.log(`Using outputs path: ${this.outputsPath}`);
    
    this.ensureDirectories();
    this.registerHandlebarsHelpers();
  }

  private async ensureDirectories(): Promise<void> {
    try {
      if (!existsSync(this.outputsPath)) {
        await fs.mkdir(this.outputsPath, { recursive: true });
      }
      if (!existsSync(path.join(this.outputsPath, 'html'))) {
        await fs.mkdir(path.join(this.outputsPath, 'html'), { recursive: true });
      }
      if (!existsSync(path.join(this.outputsPath, 'pdf'))) {
        await fs.mkdir(path.join(this.outputsPath, 'pdf'), { recursive: true });
      }
    } catch (error) {
      this.logger.error('Failed to create output directories:', error);
    }
  }

  private registerHandlebarsHelpers(): void {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date: string, format?: string) => {
      if (!date) return '';
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return '';
      if (format === 'YYYY') {
        return d.getFullYear().toString();
      }
      if (format === 'DD/MM/YYYY') {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${day}/${month}/${d.getFullYear()}`;
      }
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    });

    // Currency formatting helper
    Handlebars.registerHelper('formatCurrency', (amount: number | string) => {
      if (amount === null || amount === undefined || amount === '') return '£0';
      const normalized = typeof amount === 'string' ? amount.replace(/,/g, '').trim() : amount;
      const numeric = typeof normalized === 'number' ? normalized : Number(normalized);
      if (!Number.isFinite(numeric)) {
        return String(amount).replace(/\.00\b/g, '');
      }
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.abs(numeric));
    });

    // Equality helper
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);

    // If helper for conditions
    Handlebars.registerHelper('if', function(conditional, options) {
      if (conditional) {
        return options.fn(this);
      } else {
        return options.inverse(this);
      }
    });

    // Unless helper (opposite of if)
    Handlebars.registerHelper('unless', function(conditional, options) {
      if (!conditional) {
        return options.fn(this);
      } else {
        return options.inverse(this);
      }
    });

    // Logical helper
    Handlebars.registerHelper('or', (...args: any[]) => {
      const values = args.slice(0, -1);
      return values.some(Boolean);
    });

    // Math helpers
    Handlebars.registerHelper('add', (a: number, b: number) => a + b);
    Handlebars.registerHelper('subtract', (a: number, b: number) => a - b);
    Handlebars.registerHelper('multiply', (a: number, b: number) => a * b);
    Handlebars.registerHelper('divide', (a: number, b: number) => b !== 0 ? a / b : 0);

    // Comparison helpers
    Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
    Handlebars.registerHelper('lt', (a: number, b: number) => a < b);
    Handlebars.registerHelper('gte', (a: number, b: number) => a >= b);
    Handlebars.registerHelper('lte', (a: number, b: number) => a <= b);
  }

  async generateOutputs(
    accountsSet: AccountsSet,
    userId: string,
  ): Promise<{ htmlUrl: string; pdfUrl: string }> {
    try {
      this.logger.log(`Generating outputs for accounts set ${accountsSet.id}`);

      // Prepare template data
      const templateData = await this.prepareTemplateData(accountsSet);
      const companyName = templateData.company?.name || accountsSet.clientId || 'Client';
      const periodEnd = templateData.period?.endDate || new Date().toISOString().split('T')[0];
      const baseFilename = `FS_${this.sanitizeFilenamePart(companyName)}_${periodEnd}`;

      // Generate HTML
      const htmlContent = await this.generateHTML(templateData);
      const htmlFilename = `${baseFilename}.html`;
      const htmlPath = path.join(this.outputsPath, 'html', htmlFilename);
      await fs.writeFile(htmlPath, htmlContent, 'utf8');
      this.logger.log(`HTML file saved to: ${htmlPath}`);

      // Generate PDF from HTML
      const pdfFilename = `${baseFilename}.pdf`;
      const pdfPath = path.join(this.outputsPath, 'pdf', pdfFilename);
      await this.generatePDF(htmlContent, pdfPath);
      this.logger.log(`PDF file saved to: ${pdfPath}`);

      // Generate secure URLs
      const htmlUrl = `/api/v1/accounts-sets/${accountsSet.id}/outputs/html/${htmlFilename}`;
      const pdfUrl = `/api/v1/accounts-sets/${accountsSet.id}/outputs/pdf/${pdfFilename}`;

      this.logger.log(`Generated outputs for accounts set ${accountsSet.id}:`);
      this.logger.log(`  HTML: ${htmlPath}`);
      this.logger.log(`  PDF: ${pdfPath}`);
      this.logger.log(`  HTML URL: ${htmlUrl}`);
      this.logger.log(`  PDF URL: ${pdfUrl}`);

      return { htmlUrl, pdfUrl };
    } catch (error) {
      this.logger.error(`Failed to generate outputs for accounts set ${accountsSet.id}:`, error);
      throw new Error(`Output generation failed: ${error.message}`);
    }
  }

  async cleanupOutputs(accountsSet: AccountsSet): Promise<void> {
    try {
      this.logger.log(`Cleaning up outputs for accounts set ${accountsSet.id}`);

      // Extract filenames from URLs
      if (accountsSet.outputs.htmlUrl) {
        const htmlFilename = path.basename(accountsSet.outputs.htmlUrl);
        const htmlPath = path.join(this.outputsPath, 'html', htmlFilename);
        if (existsSync(htmlPath)) {
          await fs.unlink(htmlPath);
        }
      }

      if (accountsSet.outputs.pdfUrl) {
        const pdfFilename = path.basename(accountsSet.outputs.pdfUrl);
        const pdfPath = path.join(this.outputsPath, 'pdf', pdfFilename);
        if (existsSync(pdfPath)) {
          await fs.unlink(pdfPath);
        }
      }

      this.logger.log(`Cleaned up outputs for accounts set ${accountsSet.id}`);
    } catch (error) {
      this.logger.error(`Failed to cleanup outputs for accounts set ${accountsSet.id}:`, error);
    }
  }

  private async prepareTemplateData(accountsSet: AccountsSet): Promise<any> {
    // Calculate all financial totals
    const calculations = this.calculationService.calculateTotals(accountsSet);
    const client = await this.clientsService.findOne(accountsSet.clientId);
    const fallbackClient = {
      name: accountsSet.sections.companyPeriod?.company?.name || 'Client',
      type:
        accountsSet.framework === 'SOLE_TRADER' || accountsSet.framework === 'INDIVIDUAL'
          ? 'SOLE_TRADER'
          : 'COMPANY',
    };
    
    // Prepare comparative calculations if needed
    let comparativeCalculations = null;
    if (!accountsSet.period.isFirstYear && accountsSet.sections.balanceSheet?.comparatives?.prior) {
      // Create a temporary accounts set for comparative calculations
      const comparativeAccountsSet = {
        ...accountsSet,
        sections: {
          ...accountsSet.sections,
          balanceSheet: accountsSet.sections.balanceSheet.comparatives.prior,
          profitAndLoss: accountsSet.sections.profitAndLoss?.comparatives?.priorYearLines ? {
            lines: accountsSet.sections.profitAndLoss.comparatives.priorYearLines
          } : undefined,
        },
      };
      comparativeCalculations = this.calculationService.calculateTotals(comparativeAccountsSet as AccountsSet);
    }

    const frameworkDisclosures = accountsSet.sections.frameworkDisclosures ?? {
      framework: accountsSet.framework,
      auditExemption: {
        isAuditExempt: true,
        exemptionStatementKey:
          accountsSet.framework === 'MICRO_FRS105'
            ? 'MICRO_ENTITY'
            : accountsSet.framework === 'DORMANT'
            ? 'DORMANT'
            : accountsSet.framework === 'SOLE_TRADER' || accountsSet.framework === 'INDIVIDUAL'
            ? 'NOT_APPLICABLE'
            : 'CA2006_S477_SMALL',
      },
      includePLInClientPack: true,
      includeDirectorsReport: true,
      includeAccountantsReport: false,
    };

    const practice = await this.getPracticeSettings();

    return {
      client: client ?? fallbackClient,
      framework: accountsSet.framework,
      company: accountsSet.sections.companyPeriod?.company,
      period: accountsSet.period,
      profitAndLoss: accountsSet.sections.profitAndLoss,
      balanceSheet: accountsSet.sections.balanceSheet,
      notes: accountsSet.sections.notes,
      accountingPolicies: accountsSet.sections.accountingPolicies,
      frameworkDisclosures,
      directorsApproval: accountsSet.sections.directorsApproval,
      practice,
      calculations,
      comparatives: {
        calculations: comparativeCalculations,
        priorYear: {
          endDate: this.getPriorYearEndDate(accountsSet.period.endDate),
        },
      },
    };
  }

  private async getPracticeSettings(): Promise<{
    name?: string;
    addressLines?: string[];
    email?: string;
    phone?: string;
  } | null> {
    try {
      const storageSettingsPath = path.join(this.storageRoot, 'config', 'practice-settings.json');
      const repoSettingsPath = path.join(this.repoRoot, 'storage', 'config', 'practice-settings.json');
      const settingsPath = existsSync(storageSettingsPath) ? storageSettingsPath : repoSettingsPath;
      if (!existsSync(settingsPath)) {
        return null;
      }
      const raw = await fs.readFile(settingsPath, 'utf8');
      const settings = JSON.parse(raw);
      const addressLines = typeof settings.practiceAddress === 'string'
        ? settings.practiceAddress.split('\n').map((line: string) => line.trim()).filter(Boolean)
        : [];
      return {
        name: settings.practiceName || settings.tradingName,
        addressLines,
        email: settings.practiceEmail,
        phone: settings.practicePhone,
      };
    } catch (error) {
      this.logger.warn('Failed to load practice settings', error);
      return null;
    }
  }

  private getTemplateName(templateData: any): string {
    const clientType = templateData?.client?.type;
    const framework = templateData?.framework;
    if (
      clientType === 'SOLE_TRADER' ||
      clientType === 'INDIVIDUAL' ||
      framework === 'SOLE_TRADER' ||
      framework === 'INDIVIDUAL'
    ) {
      return 'sole-trader-accounts.hbs';
    }
    return 'statutory-accounts.hbs';
  }

  private async generateHTML(templateData: any): Promise<string> {
    try {
      // Check if templates directory exists
      if (!existsSync(this.templatesPath)) {
        this.logger.error(`Templates directory not found: ${this.templatesPath}`);
        return this.generateFallbackHTML(templateData);
      }

      // Read the Handlebars template
      const templateName = this.getTemplateName(templateData);
      let templatePath = path.join(this.templatesPath, templateName);
      this.logger.log(`Looking for template at: ${templatePath}`);
      
      if (!existsSync(templatePath)) {
        const fallbackPath = path.join(this.templatesPath, 'statutory-accounts.hbs');
        if (templatePath !== fallbackPath && existsSync(fallbackPath)) {
          this.logger.warn(`Template not found (${templatePath}); falling back to statutory template`);
          templatePath = fallbackPath;
        } else {
          this.logger.error(`Template file not found: ${templatePath}`);
          return this.generateFallbackHTML(templateData);
        }
      }

      const templateContent = await fs.readFile(templatePath, 'utf8');
      this.logger.log(`Template loaded successfully, size: ${templateContent.length} characters`);

      // Compile and render the template
      const template = Handlebars.compile(templateContent);
      const result = template(templateData);
      this.logger.log(`HTML generated successfully, size: ${result.length} characters`);
      
      return result;
    } catch (error) {
      this.logger.error('Failed to generate HTML:', error);
      this.logger.log('Falling back to inline template');
      return this.generateFallbackHTML(templateData);
    }
  }

  private generateFallbackHTML(templateData: any): string {
    // Professional statutory accounts template matching MDJ format
    const companyName = templateData.company?.name || 'Company Name';
    const companyNumber = templateData.company?.companyNumber || '[Company Number]';
    const periodEndDate = this.formatDate(templateData.period?.endDate) || '[DD Month YYYY]';
    const isFirstYear = templateData.period?.isFirstYear || false;
    const directors = templateData.company?.directors || [];
    const registeredOffice = templateData.company?.registeredOffice || {};
    
    // Format registered office address
    const registeredOfficeAddress = [
      registeredOffice.line1,
      registeredOffice.line2,
      registeredOffice.town,
      registeredOffice.county,
      registeredOffice.postcode,
      registeredOffice.country
    ].filter(Boolean).join(', ') || '[Registered Office Address]';

    // Format directors list
    const directorsText = directors.length > 0 
      ? directors.map(d => d.name).join('<br>') 
      : '[Director Name(s)]';
    
    const directorsListItems = directors.length > 0 
      ? directors.map(d => `<li>${d.name}</li>`).join('') 
      : '<li>[Director Name]</li>';

    // Financial data
    const profitAndLoss = templateData.profitAndLoss?.lines || {};
    const balanceSheet = templateData.balanceSheet || {};
    const calculations = templateData.calculations || {};
    const notes = templateData.notes || {};
    
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Statutory Financial Statements | ${companyName}</title>
<style>
/* ===============================BRAND TOKENS================================ */
:root{
--purple-900:#2e1065;
--purple-800:#4c1d95;
--purple-700:#6d28d9;
--purple-600:#7c3aed;
--purple-300:#d8b4fe;
--ink:#0f172a;
--muted:#475569;
--line:#e5e7eb;
--panel:#ffffff;
--panel-soft:#f8fafc;
--bg:#ffffff;
--bg-soft:#fbfbff;
--shadow: 0 10px 30px rgba(15,23,42,.08);
--shadow-strong: 0 18px 46px rgba(15,23,42,.12);
}

/* ===============================BASE================================ */
*{box-sizing:border-box}
body{
margin:0;
font-family:Inter, Arial, Helvetica, sans-serif;
font-size:13px;
color:var(--ink);
background: var(--bg-soft);
-webkit-font-smoothing: antialiased;
}

/* ===============================APP SHELL================================ */
.app{
max-width:980px;
margin:22px auto 46px;
padding:0 18px;
}

/* ===============================REPORT HEADER (BRANDED)================================ */
.reportHeader{
margin-top: 18px;
background: linear-gradient(180deg, rgba(124,58,237,.12), rgba(124,58,237,0));
border: 1px solid var(--line);
border-radius: 18px;
padding: 18px 20px;
box-shadow: var(--shadow-strong);
}

.reportHeaderInner{
display:flex;
align-items:center;
justify-content:space-between;
gap: 16px;
}

.reportBrand{
display:flex;
align-items:center;
gap: 12px;
}

.reportLogo{
width: 44px;
height: 44px;
border-radius: 14px;
background: #ffffff;
border: 1px solid rgba(124,58,237,.28);
display:flex;
align-items:center;
justify-content:center;
overflow:hidden;
font-weight: 700;
color: var(--purple-700);
}

.reportBrandText .firm{
font-size: 14px;
font-weight: 700;
letter-spacing: .2px;
}

.reportBrandText .tagline{
font-size: 11px;
color: var(--muted);
margin-top: 2px;
}

.reportTitle{
text-align: right;
max-width: 520px;
}

.reportTitle .doc{
font-size: 15px;
font-weight: 700;
color: var(--purple-900);
}

.reportTitle .meta{
margin-top: 4px;
color: var(--muted);
font-size: 12px;
}

.hrPurple{
height: 4px;
border-radius: 999px;
background: linear-gradient(90deg, var(--purple-600), rgba(124,58,237,.20));
margin-top: 14px;
}

/* ===============================CONTENT PANELS================================ */
.panel{
background:var(--panel);
border:1px solid var(--line);
border-radius:18px;
padding:22px 26px;
margin-top:18px;
box-shadow: var(--shadow);
overflow: hidden;
}

.panel.soft{
background:var(--panel-soft);
border-color: rgba(124,58,237,.10);
}

h1{
font-size:24px;
margin:0 0 6px;
letter-spacing: -0.2px;
}

h2{
font-size:16px;
margin:22px 0 10px;
letter-spacing: -0.15px;
}

h3{
font-size: 13px;
margin: 16px 0 6px;
color: var(--purple-900);
text-transform: uppercase;
letter-spacing: .08em;
}

p{line-height:1.55}

.meta{
color:var(--muted);
font-size:12px;
}

/* ===============================TABLES (REPORT STYLE)================================ */
table{
width:100%;
border-collapse: collapse;
border: 1px solid var(--line);
border-radius: 14px;
overflow: hidden;
margin:10px 0 18px;
font-size:13px;
}

th, td{
padding:10px 12px;
border: 1px solid var(--line);
vertical-align:top;
}

th{
text-align:left;
width:35%;
background: #faf5ff;
color: var(--purple-900);
font-weight: 600;
}

tr:nth-child(even) td{
background: #fcfbff;
}

/* ===============================NOTE / DISCLAIMER================================ */
.note{
background: linear-gradient(90deg, rgba(124,58,237,.10), #ffffff);
border: 1px solid rgba(124,58,237,.18);
border-left: 5px solid var(--purple-600);
padding: 12px 14px;
border-radius: 12px;
margin: 14px 0;
font-size: 12.5px;
color: #1f2937;
}

/* ===============================TWO-COLUMN NUMBERS================================ */
.num{ 
text-align:right; 
white-space:nowrap; 
}

.small{ 
font-size:12px; 
color:var(--muted); 
}

/* ===============================FOOTER================================ */
.footer{
margin-top:26px;
padding:14px 4px;
text-align:center;
font-size:11px;
color:var(--muted);
}

/* ===============================PRINT & PAGE BREAKS================================ */
@media print{
body{background:#fff}
.app{max-width: 100%; margin: 0; padding: 0 14mm;}
.reportHeader{box-shadow:none;}
.panel{box-shadow:none;}
.pagebreak{page-break-before: always;}
.page-header{
  display: none;
}
.page-header.print-header{
  display: block;
  margin-bottom: 20px;
}
}

@media screen {
.page-header{
  display: none;
}
}

/* Page-specific headers for print */
.page-header{
background: linear-gradient(180deg, rgba(124,58,237,.12), rgba(124,58,237,0));
border: 1px solid var(--line);
border-radius: 18px;
padding: 18px 20px;
margin-bottom: 18px;
}

.page-header .reportHeaderInner{
display:flex;
align-items:center;
justify-content:space-between;
gap: 16px;
}

.page-header .reportBrand{
display:flex;
align-items:center;
gap: 12px;
}

.page-header .reportLogo{
width: 44px;
height: 44px;
border-radius: 14px;
background: #ffffff;
border: 1px solid rgba(124,58,237,.28);
display:flex;
align-items:center;
justify-content:center;
overflow:hidden;
font-weight: 700;
color: var(--purple-700);
}

.page-header .reportBrandText .firm{
font-size: 14px;
font-weight: 700;
letter-spacing: .2px;
}

.page-header .reportBrandText .tagline{
font-size: 11px;
color: var(--muted);
margin-top: 2px;
}

.page-header .reportTitle{
text-align: right;
max-width: 520px;
}

.page-header .reportTitle .doc{
font-size: 15px;
font-weight: 700;
color: var(--purple-900);
}

.page-header .reportTitle .meta{
margin-top: 4px;
color: var(--muted);
font-size: 12px;
}

.page-header .hrPurple{
height: 4px;
border-radius: 999px;
background: linear-gradient(90deg, var(--purple-600), rgba(124,58,237,.20));
margin-top: 14px;
}
</style>
</head>
<body>
<div class="app">

<!-- REPORT HEADER -->
<header class="reportHeader">
<div class="reportHeaderInner">
<div class="reportBrand">
<div class="reportLogo">MDJ</div>
<div class="reportBrandText">
<div class="firm">MDJ Practice Manager</div>
<div class="tagline">Directors' Report & Financial Statements</div>
</div>
</div>
<div class="reportTitle">
<div class="doc">Statutory Financial Statements</div>
<div class="meta">Company: <strong>${companyName}</strong> • Year ended: <strong>${periodEndDate}</strong> • Prepared: ${this.formatDate(new Date().toISOString())}</div>
</div>
</div>
<div class="hrPurple"></div>
</header>

<!-- COVER / KEY DETAILS -->
<div class="panel soft">
<h2>Company Details</h2>
<table>
<tr><th>Company name</th><td>${companyName}</td></tr>
<tr><th>Registered number</th><td>${companyNumber}</td></tr>
<tr><th>Registered office</th><td>${registeredOfficeAddress}</td></tr>
<tr><th>Directors</th><td>${directorsText}</td></tr>
<tr><th>Accounting period</th><td>${this.formatDate(templateData.period?.startDate)} to ${periodEndDate}</td></tr>
<tr><th>Reporting framework</th><td>FRS 102 Section 1A Small Entities / Micro-entity provisions (as applicable)</td></tr>
</table>
<div class="note">These financial statements are prepared for the members and for filing at Companies House, where applicable.</div>
</div>

<!-- CONTENTS -->
<div class="panel pagebreak">
<!-- Page Header for Contents -->
<header class="page-header print-header">
<div class="reportHeaderInner">
<div class="reportBrand">
<div class="reportLogo">MDJ</div>
<div class="reportBrandText">
<div class="firm">MDJ Practice Manager</div>
<div class="tagline">Directors' Report & Financial Statements</div>
</div>
</div>
<div class="reportTitle">
<div class="doc">Contents</div>
<div class="meta">Company: <strong>${companyName}</strong> • Year ended: <strong>${periodEndDate}</strong></div>
</div>
</div>
<div class="hrPurple"></div>
</header>

<h2>Contents</h2>
<table>
<tr><th>Company Information</th><td>Page 3</td></tr>
<tr><th>Directors' Report</th><td>Page 4</td></tr>
<tr><th>Profit and Loss Account</th><td>Page 5</td></tr>
<tr><th>Balance Sheet</th><td>Page 6</td></tr>
<tr><th>Notes to the Financial Statements</th><td>Page 7</td></tr>
</table>
</div>

<!-- COMPANY INFORMATION -->
<div class="panel soft pagebreak">
<!-- Page Header for Company Information -->
<header class="page-header print-header">
<div class="reportHeaderInner">
<div class="reportBrand">
<div class="reportLogo">MDJ</div>
<div class="reportBrandText">
<div class="firm">MDJ Practice Manager</div>
<div class="tagline">Directors' Report & Financial Statements</div>
</div>
</div>
<div class="reportTitle">
<div class="doc">Company Information</div>
<div class="meta">Company: <strong>${companyName}</strong> • Year ended: <strong>${periodEndDate}</strong></div>
</div>
</div>
<div class="hrPurple"></div>
</header>

<h2>Company Information</h2>
<table>
<tr><th>Director(s)</th><td>${directorsText}</td></tr>
<tr><th>Company number</th><td>${companyNumber}</td></tr>
<tr><th>Registered office</th><td>${registeredOfficeAddress}</td></tr>
<tr><th>Accountants</th><td>MDJ Practice Manager<br>Professional Accounting Services</td></tr>
</table>
</div>

<!-- DIRECTORS' REPORT -->
<div class="panel pagebreak">
<!-- Page Header for Directors' Report -->
<header class="page-header print-header">
<div class="reportHeaderInner">
<div class="reportBrand">
<div class="reportLogo">MDJ</div>
<div class="reportBrandText">
<div class="firm">MDJ Practice Manager</div>
<div class="tagline">Directors' Report & Financial Statements</div>
</div>
</div>
<div class="reportTitle">
<div class="doc">Directors' Report</div>
<div class="meta">Company: <strong>${companyName}</strong> • Year ended: <strong>${periodEndDate}</strong></div>
</div>
</div>
<div class="hrPurple"></div>
</header>
<h2>Directors' Report</h2>
<p>The director(s) present their report and the financial statements for the ${isFirstYear ? 'period' : 'year'} ended <strong>${periodEndDate}</strong>.</p>

<h3>Directors</h3>
<p>The director(s) who held office during the ${isFirstYear ? 'period' : 'year'} were:</p>
<ul>
${directorsListItems}
</ul>

<h3>Principal Activity</h3>
<p>${notes.principalActivity || 'The principal activity of the company during the period was [describe principal activity].'}</p>

<h3>Statement of Directors' Responsibilities</h3>
<p>The director(s) are responsible for preparing the Directors' Report and the financial statements in accordance with applicable law and regulations. Company law requires the director(s) to prepare financial statements for each financial year. Under that law the director(s) have elected to prepare the financial statements in accordance with United Kingdom Generally Accepted Accounting Practice (United Kingdom Accounting Standards and applicable law).</p>

<p>Under company law the director(s) must not approve the financial statements unless they are satisfied that they give a true and fair view of the state of affairs of the company and of the profit or loss of the company for that period. In preparing the financial statements the director(s) are required to: select suitable accounting policies and then apply them consistently; make judgments and accounting estimates that are reasonable and prudent; prepare the financial statements on the going concern basis unless it is inappropriate to presume that the company will continue in business.</p>

<h3>Small Company Provisions</h3>
<p>This report has been prepared in accordance with the special provisions relating to companies subject to the small companies regime within Part 15 of the Companies Act 2006.</p>

${templateData.directorsApproval?.approved ? `
<table>
<tr><th>On behalf of the board</th><td><strong>${templateData.directorsApproval.directorName}</strong><br>Director</td></tr>
<tr><th>Date</th><td>${this.formatDate(templateData.directorsApproval.approvalDate)}</td></tr>
</table>
` : `
<table>
<tr><th>On behalf of the board</th><td><strong>[Director Name]</strong><br>Director</td></tr>
<tr><th>Date</th><td>[Date]</td></tr>
</table>
`}
</div>

<!-- PROFIT AND LOSS -->
<div class="panel pagebreak">
<!-- Page Header for Profit and Loss -->
<header class="page-header print-header">
<div class="reportHeaderInner">
<div class="reportBrand">
<div class="reportLogo">MDJ</div>
<div class="reportBrandText">
<div class="firm">MDJ Practice Manager</div>
<div class="tagline">Directors' Report & Financial Statements</div>
</div>
</div>
<div class="reportTitle">
<div class="doc">Profit and Loss Account</div>
<div class="meta">Company: <strong>${companyName}</strong> • Year ended: <strong>${periodEndDate}</strong></div>
</div>
</div>
<div class="hrPurple"></div>
</header>
<h2>Profit and Loss Account</h2>
<p class="small">For the ${isFirstYear ? 'period' : 'year'} ended <strong>${periodEndDate}</strong></p>
<table>
<tr><th> </th><th class="num">Current ${isFirstYear ? 'Period' : 'Year'}</th>${!isFirstYear ? '<th class="num">Prior Year</th>' : ''}</tr>
<tr><th> </th><th class="num">£</th>${!isFirstYear ? '<th class="num">£</th>' : ''}</tr>
<tr><th>Turnover</th><td class="num">${this.formatCurrency(profitAndLoss.turnover || 0)}</td>${!isFirstYear ? `<td class="num">${this.formatCurrency(templateData.profitAndLoss?.comparatives?.priorYearLines?.turnover || 0)}</td>` : ''}</tr>
<tr><th>Cost of sales</th><td class="num">(${this.formatCurrency(profitAndLoss.costOfSales || 0)})</td>${!isFirstYear ? `<td class="num">(${this.formatCurrency(templateData.profitAndLoss?.comparatives?.priorYearLines?.costOfSales || 0)})</td>` : ''}</tr>
<tr><th><strong>Gross profit / (loss)</strong></th><td class="num"><strong>${this.formatCurrency(calculations.profitAndLoss?.grossProfit || 0)}</strong></td>${!isFirstYear ? `<td class="num"><strong>${this.formatCurrency(templateData.comparatives?.calculations?.profitAndLoss?.grossProfit || 0)}</strong></td>` : ''}</tr>
<tr><th>Administrative expenses</th><td class="num">(${this.formatCurrency(calculations.profitAndLoss?.totalExpenses || 0)})</td>${!isFirstYear ? `<td class="num">(${this.formatCurrency(templateData.comparatives?.calculations?.profitAndLoss?.totalExpenses || 0)})</td>` : ''}</tr>
<tr><th>Other operating income</th><td class="num">${this.formatCurrency(profitAndLoss.otherIncome || 0)}</td>${!isFirstYear ? `<td class="num">${this.formatCurrency(templateData.profitAndLoss?.comparatives?.priorYearLines?.otherIncome || 0)}</td>` : ''}</tr>
<tr><th><strong>Operating profit / (loss)</strong></th><td class="num"><strong>${this.formatCurrency(calculations.profitAndLoss?.operatingProfit || 0)}</strong></td>${!isFirstYear ? `<td class="num"><strong>${this.formatCurrency(templateData.comparatives?.calculations?.profitAndLoss?.operatingProfit || 0)}</strong></td>` : ''}</tr>
<tr><th>Interest payable and similar charges</th><td class="num">(${this.formatCurrency(profitAndLoss.interestPayable || 0)})</td>${!isFirstYear ? `<td class="num">(${this.formatCurrency(templateData.profitAndLoss?.comparatives?.priorYearLines?.interestPayable || 0)})</td>` : ''}</tr>
<tr><th><strong>Profit / (loss) for the financial ${isFirstYear ? 'period' : 'year'}</strong></th><td class="num"><strong>${this.formatCurrency(calculations.profitAndLoss?.profitAfterTax || 0)}</strong></td>${!isFirstYear ? `<td class="num"><strong>${this.formatCurrency(templateData.comparatives?.calculations?.profitAndLoss?.profitAfterTax || 0)}</strong></td>` : ''}</tr>
</table>
<div class="note">The notes form part of these financial statements.</div>
</div>

<!-- BALANCE SHEET -->
<div class="panel soft pagebreak">
<!-- Page Header for Balance Sheet -->
<header class="page-header print-header">
<div class="reportHeaderInner">
<div class="reportBrand">
<div class="reportLogo">MDJ</div>
<div class="reportBrandText">
<div class="firm">MDJ Practice Manager</div>
<div class="tagline">Directors' Report & Financial Statements</div>
</div>
</div>
<div class="reportTitle">
<div class="doc">Balance Sheet</div>
<div class="meta">Company: <strong>${companyName}</strong> • Year ended: <strong>${periodEndDate}</strong></div>
</div>
</div>
<div class="hrPurple"></div>
</header>
<h2>Balance Sheet</h2>
<p class="small">As at <strong>${periodEndDate}</strong></p>
<table>
<tr><th> </th><th class="num">Current Year</th>${!isFirstYear ? '<th class="num">Prior Year</th>' : ''}</tr>
<tr><th> </th><th class="num">£</th>${!isFirstYear ? '<th class="num">£</th>' : ''}</tr>
<tr><th><strong>Fixed assets</strong></th><td class="num"><strong>${this.formatCurrency(calculations.balanceSheet?.totalFixedAssets || 0)}</strong></td>${!isFirstYear ? `<td class="num"><strong>${this.formatCurrency(templateData.comparatives?.calculations?.balanceSheet?.totalFixedAssets || 0)}</strong></td>` : ''}</tr>
<tr><th>Tangible fixed assets</th><td class="num">${this.formatCurrency(balanceSheet.assets?.fixedAssets?.tangibleFixedAssets || 0)}</td>${!isFirstYear ? `<td class="num">${this.formatCurrency(balanceSheet.comparatives?.prior?.assets?.fixedAssets?.tangibleFixedAssets || 0)}</td>` : ''}</tr>
<tr><th><strong>Current assets</strong></th><td class="num"><strong>${this.formatCurrency(calculations.balanceSheet?.totalCurrentAssets || 0)}</strong></td>${!isFirstYear ? `<td class="num"><strong>${this.formatCurrency(templateData.comparatives?.calculations?.balanceSheet?.totalCurrentAssets || 0)}</strong></td>` : ''}</tr>
<tr><th>Debtors</th><td class="num">${this.formatCurrency(balanceSheet.assets?.currentAssets?.debtors || 0)}</td>${!isFirstYear ? `<td class="num">${this.formatCurrency(balanceSheet.comparatives?.prior?.assets?.currentAssets?.debtors || 0)}</td>` : ''}</tr>
<tr><th>Cash at bank and in hand</th><td class="num">${this.formatCurrency(balanceSheet.assets?.currentAssets?.cash || 0)}</td>${!isFirstYear ? `<td class="num">${this.formatCurrency(balanceSheet.comparatives?.prior?.assets?.currentAssets?.cash || 0)}</td>` : ''}</tr>
<tr><th><strong>Creditors: amounts falling due within one year</strong></th><td class="num"><strong>(${this.formatCurrency(calculations.balanceSheet?.totalCurrentLiabilities || 0)})</strong></td>${!isFirstYear ? `<td class="num"><strong>(${this.formatCurrency(templateData.comparatives?.calculations?.balanceSheet?.totalCurrentLiabilities || 0)})</strong></td>` : ''}</tr>
<tr><th><strong>Net current assets / (liabilities)</strong></th><td class="num"><strong>${this.formatCurrency((calculations.balanceSheet?.totalCurrentAssets || 0) - (calculations.balanceSheet?.totalCurrentLiabilities || 0))}</strong></td>${!isFirstYear ? `<td class="num"><strong>${this.formatCurrency(((templateData.comparatives?.calculations?.balanceSheet?.totalCurrentAssets || 0) - (templateData.comparatives?.calculations?.balanceSheet?.totalCurrentLiabilities || 0)))}</strong></td>` : ''}</tr>
<tr><th><strong>Total assets less current liabilities</strong></th><td class="num"><strong>${this.formatCurrency(((calculations.balanceSheet?.totalFixedAssets || 0) + (calculations.balanceSheet?.totalCurrentAssets || 0)) - (calculations.balanceSheet?.totalCurrentLiabilities || 0))}</strong></td>${!isFirstYear ? `<td class="num"><strong>${this.formatCurrency(((templateData.comparatives?.calculations?.balanceSheet?.totalFixedAssets || 0) + (templateData.comparatives?.calculations?.balanceSheet?.totalCurrentAssets || 0)) - (templateData.comparatives?.calculations?.balanceSheet?.totalCurrentLiabilities || 0))}</strong></td>` : ''}</tr>
<tr><th>Creditors: amounts falling due after more than one year</th><td class="num">(${this.formatCurrency(calculations.balanceSheet?.totalLongTermLiabilities || 0)})</td>${!isFirstYear ? `<td class="num">(${this.formatCurrency(templateData.comparatives?.calculations?.balanceSheet?.totalLongTermLiabilities || 0)})</td>` : ''}</tr>
<tr><th><strong>Net assets / (liabilities)</strong></th><td class="num"><strong>${this.formatCurrency(calculations.balanceSheet?.netAssets || 0)}</strong></td>${!isFirstYear ? `<td class="num"><strong>${this.formatCurrency(templateData.comparatives?.calculations?.balanceSheet?.netAssets || 0)}</strong></td>` : ''}</tr>
<tr><th><strong>Capital and reserves</strong></th><td class="num"><strong>${this.formatCurrency(calculations.balanceSheet?.totalEquity || 0)}</strong></td>${!isFirstYear ? `<td class="num"><strong>${this.formatCurrency(templateData.comparatives?.calculations?.balanceSheet?.totalEquity || 0)}</strong></td>` : ''}</tr>
<tr><th>Called up share capital</th><td class="num">${this.formatCurrency(balanceSheet.equity?.shareCapital || 0)}</td>${!isFirstYear ? `<td class="num">${this.formatCurrency(balanceSheet.comparatives?.prior?.equity?.shareCapital || 0)}</td>` : ''}</tr>
<tr><th>Profit and loss account</th><td class="num">${this.formatCurrency(balanceSheet.equity?.retainedEarnings || 0)}</td>${!isFirstYear ? `<td class="num">${this.formatCurrency(balanceSheet.comparatives?.prior?.equity?.retainedEarnings || 0)}</td>` : ''}</tr>
<tr><th><strong>Shareholders' funds</strong></th><td class="num"><strong>${this.formatCurrency(calculations.balanceSheet?.totalEquity || 0)}</strong></td>${!isFirstYear ? `<td class="num"><strong>${this.formatCurrency(templateData.comparatives?.calculations?.balanceSheet?.totalEquity || 0)}</strong></td>` : ''}</tr>
</table>

<div class="note">For the ${isFirstYear ? 'period' : 'year'} ended <strong>${periodEndDate}</strong> the company was entitled to exemption from audit under section 477 of the Companies Act 2006 relating to small companies. The members have not required the company to obtain an audit in accordance with section 476 of the Companies Act 2006. The director(s) acknowledge their responsibilities for complying with the requirements of the Act with respect to accounting records and the preparation of accounts. These accounts have been prepared in accordance with the provisions applicable to companies subject to the small companies regime.</div>

${templateData.directorsApproval?.approved ? `
<table>
<tr><th>On behalf of the board</th><td><strong>${templateData.directorsApproval.directorName}</strong><br>Director</td></tr>
<tr><th>Date</th><td>${this.formatDate(templateData.directorsApproval.approvalDate)}</td></tr>
</table>
` : `
<table>
<tr><th>On behalf of the board</th><td><strong>[Director Name]</strong><br>Director</td></tr>
<tr><th>Date</th><td>[Date]</td></tr>
</table>
`}
</div>

<!-- NOTES -->
<div class="panel pagebreak">
<!-- Page Header for Notes -->
<header class="page-header print-header">
<div class="reportHeaderInner">
<div class="reportBrand">
<div class="reportLogo">MDJ</div>
<div class="reportBrandText">
<div class="firm">MDJ Practice Manager</div>
<div class="tagline">Directors' Report & Financial Statements</div>
</div>
</div>
<div class="reportTitle">
<div class="doc">Notes to the Financial Statements</div>
<div class="meta">Company: <strong>${companyName}</strong> • Year ended: <strong>${periodEndDate}</strong></div>
</div>
</div>
<div class="hrPurple"></div>
</header>
<h2>Notes to the Financial Statements</h2>
<p class="small">For the ${isFirstYear ? 'period' : 'year'} ended <strong>${periodEndDate}</strong></p>

<h3>1. General information</h3>
<p>${companyName} is a private company, limited by shares, incorporated in England & Wales, registered number ${companyNumber}. The registered office is ${registeredOfficeAddress}.</p>

<h3>2. Accounting policies</h3>
<table>
<tr><th>Basis of preparation</th><td>${templateData.accountingPolicies?.basisOfPreparation || 'The financial statements have been prepared under the historical cost convention and in accordance with FRS 102 Section 1A Small Entities and the Companies Act 2006.'}</td></tr>
<tr><th>Turnover</th><td>${templateData.accountingPolicies?.turnoverPolicyText || 'Turnover is measured at the fair value of the consideration received or receivable, net of discounts and value added tax. Revenue is recognised when the right to consideration has been established.'}</td></tr>
<tr><th>Tangible fixed assets & depreciation</th><td>Tangible fixed assets are stated at cost less accumulated depreciation and impairment. Depreciation is provided to write off the cost of the assets over their estimated useful lives on an appropriate basis.</td></tr>
</table>

${notes.employees?.include ? `
<h3>3. Average number of employees</h3>
<table>
<tr><th>Average employees (incl. directors)</th><td>${notes.employees.averageEmployees || 0} (Prior year: 0)</td></tr>
</table>
` : ''}

<h3>4. Share capital</h3>
<table>
<tr><th>Called up share capital</th><td>${notes.shareCapital?.numberOfShares || 1} ${notes.shareCapital?.shareClass || 'ordinary'} shares of ${this.formatCurrency(notes.shareCapital?.nominalValue || 1)} each: ${this.formatCurrency(balanceSheet.equity?.shareCapital || 1)}</td></tr>
</table>

${notes.additionalNotes ? `
<h3>5. Additional Notes</h3>
<p>${notes.additionalNotes}</p>
` : ''}
</div>

<!-- FOOTER -->
<div class="footer">
<strong>MDJ Practice Manager</strong><br>
Professional Accounting Services<br>
Generated: ${this.formatDate(new Date().toISOString())}
</div>

</div>
</body>
</html>`;
  }

  private formatDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  private formatCurrency(amount: number): string {
    if (typeof amount !== 'number') return '£0';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  }

  private async generatePDF(htmlContent: string, outputPath: string): Promise<void> {
    let browser = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '22mm',
          left: '15mm',
        },
        displayHeaderFooter: true,
        headerTemplate: `<div style="font-size:8px;color:#9aa3b2;width:100%;text-align:center;"></div>`,
        footerTemplate: `
          <div style="width:100%;font-size:8px;color:#64748b;padding:0 16mm;display:flex;justify-content:space-between;align-items:center;">
            <span>Generated by MDJ Practice Manager</span>
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>
        `,
      });

      this.logger.log(`PDF generated successfully: ${outputPath}`);
    } catch (error) {
      this.logger.error('PDF generation error:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private getPriorYearEndDate(currentEndDate: string): string {
    const currentDate = new Date(currentEndDate);
    const priorDate = new Date(currentDate);
    priorDate.setFullYear(currentDate.getFullYear() - 1);
    return priorDate.toISOString().split('T')[0];
  }

  private sanitizeFilenamePart(value: string): string {
    return value
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'Client';
  }

  async getOutputFile(accountsSetId: string, type: 'html' | 'pdf', filename: string): Promise<Buffer> {
    const filePath = path.join(this.outputsPath, type, filename);
    
    if (!existsSync(filePath)) {
      throw new Error(`Output file not found: ${filename}`);
    }

    return fs.readFile(filePath);
  }
}

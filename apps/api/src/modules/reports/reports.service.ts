import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { TaxCalculationsService } from '../tax-calculations/tax-calculations.service';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { resolveStorageRoot } from '../../common/utils/storage-path.util';
import {
  GeneratedReport,
  Client,
  TaxCalculationResult,
  OperationResult
} from '../database/interfaces/database.interface';

export interface ReportTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  placeholders: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
}

export interface ReportConfig {
  clientId: string;
  calculationIds?: string[];
  templateId?: string;
  title: string;
  format: 'PDF' | 'HTML';
  includeBranding?: boolean;
  includeCharts?: boolean;
  includeCoverPage?: boolean;
  includeContentsPage?: boolean;
}

export interface PDFOptions {
  includeCharts?: boolean;
  includeBranding?: boolean;
  template?: string;
  outputPath?: string;
  format?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}

export interface PDFResult {
  success: boolean;
  filePath: string;
  fileSize: number;
  error?: string;
}

interface ReportBranding {
  practiceName: string;
  logoDataUrl: string | null;
  reportPrimaryColor: string;
  reportSecondaryColor: string;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly storagePath: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly taxCalculationsService: TaxCalculationsService,
  ) {
    this.storagePath = resolveStorageRoot(this.configService);
    this.ensureReportsDirectory();
  }

  private async ensureReportsDirectory(): Promise<void> {
    try {
      const clientsPath = path.join(this.storagePath, 'clients');
      if (!existsSync(clientsPath)) {
        await fs.mkdir(clientsPath, { recursive: true });
      }
    } catch (error) {
      this.logger.error('Failed to create reports directory:', error);
    }
  }

  private sanitizeStorageSegment(value?: string): string {
    return String(value || 'unknown')
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'unknown';
  }

  private async ensureClientReportsDirectory(clientId?: string): Promise<string> {
    const storageId = this.sanitizeStorageSegment(clientId);
    const reportsPath = path.join(this.storagePath, 'clients', storageId, 'reports');
    if (!existsSync(reportsPath)) {
      await fs.mkdir(reportsPath, { recursive: true });
    }
    return reportsPath;
  }

  /**
   * Generate a client pack report with tax calculations and company information
   */
  async generateClientPack(config: ReportConfig): Promise<GeneratedReport> {
    try {
      const reportId = uuidv4();
      const client = await this.databaseService.getClientByNumber(config.clientId);
      
      if (!client) {
        throw new NotFoundException(`Client ${config.clientId} not found`);
      }

      // Get tax calculations if specified
      let calculations: TaxCalculationResult[] = [];
      if (config.calculationIds && config.calculationIds.length > 0) {
        calculations = await Promise.all(
          config.calculationIds.map(id => this.databaseService.getCalculationById(id))
        );
        calculations = calculations.filter(calc => calc !== null);
      } else {
        // Get latest calculations for the client
        calculations = await this.databaseService.getClientCalculations(config.clientId, 5);
      }

      // Generate report content
      const reportData = {
        client,
        calculations,
        title: config.title,
        createdAt: new Date().toISOString(),
        includeBranding: config.includeBranding !== false,
        includeCharts: config.includeCharts !== false,
        includeCoverPage: config.includeCoverPage !== false,
        includeContentsPage: config.includeContentsPage !== false,
      };

      let filePath: string;
      let content: any;
      const clientReportsPath = await this.ensureClientReportsDirectory(config.clientId);

      if (config.format === 'PDF') {
        const pdfResult = await this.generateClientPackPDF(reportData, {
          includeBranding: config.includeBranding,
          includeCharts: config.includeCharts,
          outputPath: clientReportsPath,
        });
        
        if (!pdfResult.success) {
          throw new Error(pdfResult.error || 'PDF generation failed');
        }
        
        filePath = pdfResult.filePath;
        content = { pdfGenerated: true, fileSize: pdfResult.fileSize };
      } else {
        const html = await this.generateClientPackHTML(reportData);
        const htmlFileName = `client-pack-${client.companyNumber}-${Date.now()}.html`;
        filePath = path.join(clientReportsPath, htmlFileName);
        await fs.writeFile(filePath, html, 'utf8');
        content = { html };
      }

      // Create report record
      const report: GeneratedReport = {
        id: reportId,
        clientId: config.clientId,
        calculationId: config.calculationIds?.[0],
        templateId: config.templateId || 'default-client-pack',
        title: config.title,
        content,
        format: config.format,
        filePath,
        generatedAt: new Date(),
        generatedBy: 'system', // TODO: Get from auth context
      };

      // Store report metadata in database
      await this.databaseService.storeReport(report);

      this.logger.log(`Generated ${config.format} client pack for ${config.clientId}: ${filePath}`);
      return report;
    } catch (error) {
      this.logger.error(`Failed to generate client pack: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Generate a tax strategy report for specific calculations
   */
  async generateTaxStrategyReport(config: ReportConfig): Promise<GeneratedReport> {
    try {
      const reportId = uuidv4();
      const client = await this.databaseService.getClientByNumber(config.clientId);
      
      if (!client) {
        throw new NotFoundException(`Client ${config.clientId} not found`);
      }

      if (!config.calculationIds || config.calculationIds.length === 0) {
        throw new Error('Tax calculation IDs are required for tax strategy reports');
      }

      // Get specified tax calculations
      const calculations = await Promise.all(
        config.calculationIds.map(id => this.databaseService.getCalculationById(id))
      );
      const validCalculations = calculations.filter(calc => calc !== null);

      if (validCalculations.length === 0) {
        throw new Error('No valid tax calculations found');
      }

      // Generate report content
      const reportData = {
        client,
        calculations: validCalculations,
        title: config.title,
        createdAt: new Date().toISOString(),
        includeBranding: config.includeBranding !== false,
        includeCharts: config.includeCharts !== false,
        includeCoverPage: config.includeCoverPage !== false,
        includeContentsPage: config.includeContentsPage !== false,
      };

      let filePath: string;
      let content: any;
      const clientReportsPath = await this.ensureClientReportsDirectory(config.clientId);

      if (config.format === 'PDF') {
        const pdfResult = await this.generateTaxStrategyPDF(reportData, {
          includeBranding: config.includeBranding,
          includeCharts: config.includeCharts,
          outputPath: clientReportsPath,
        });
        
        if (!pdfResult.success) {
          throw new Error(pdfResult.error || 'PDF generation failed');
        }
        
        filePath = pdfResult.filePath;
        content = { pdfGenerated: true, fileSize: pdfResult.fileSize };
      } else {
        const html = await this.generateTaxStrategyHTML(reportData);
        const htmlFileName = `tax-strategy-${client.companyNumber}-${Date.now()}.html`;
        filePath = path.join(clientReportsPath, htmlFileName);
        await fs.writeFile(filePath, html, 'utf8');
        content = { html };
      }

      // Create report record
      const report: GeneratedReport = {
        id: reportId,
        clientId: config.clientId,
        calculationId: config.calculationIds[0],
        templateId: config.templateId || 'default-tax-strategy',
        title: config.title,
        content,
        format: config.format,
        filePath,
        generatedAt: new Date(),
        generatedBy: 'system', // TODO: Get from auth context
      };

      // Store report metadata in database
      await this.databaseService.storeReport(report);

      this.logger.log(`Generated ${config.format} tax strategy report for ${config.clientId}: ${filePath}`);
      return report;
    } catch (error) {
      this.logger.error(`Failed to generate tax strategy report: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Generate company profile report with Companies House data
   */
  async generateCompanyProfileReport(config: ReportConfig): Promise<GeneratedReport> {
    try {
      const reportId = uuidv4();
      const client = await this.databaseService.getClientByNumber(config.clientId);
      
      if (!client) {
        throw new NotFoundException(`Client ${config.clientId} not found`);
      }

      // Generate report content
      const reportData = {
        client,
        title: config.title,
        createdAt: new Date().toISOString(),
        includeBranding: config.includeBranding !== false,
        includeCoverPage: config.includeCoverPage !== false,
        includeContentsPage: config.includeContentsPage !== false,
      };

      let filePath: string;
      let content: any;
      const clientReportsPath = await this.ensureClientReportsDirectory(config.clientId);

      if (config.format === 'PDF') {
        const pdfResult = await this.generateCompanyProfilePDF(reportData, {
          includeBranding: config.includeBranding,
          outputPath: clientReportsPath,
        });
        
        if (!pdfResult.success) {
          throw new Error(pdfResult.error || 'PDF generation failed');
        }
        
        filePath = pdfResult.filePath;
        content = { pdfGenerated: true, fileSize: pdfResult.fileSize };
      } else {
        const html = await this.generateCompanyProfileHTML(reportData);
        const htmlFileName = `company-profile-${client.companyNumber}-${Date.now()}.html`;
        filePath = path.join(clientReportsPath, htmlFileName);
        await fs.writeFile(filePath, html, 'utf8');
        content = { html };
      }

      // Create report record
      const report: GeneratedReport = {
        id: reportId,
        clientId: config.clientId,
        templateId: config.templateId || 'default-company-profile',
        title: config.title,
        content,
        format: config.format,
        filePath,
        generatedAt: new Date(),
        generatedBy: 'system', // TODO: Get from auth context
      };

      // Store report metadata in database
      await this.databaseService.storeReport(report);

      this.logger.log(`Generated ${config.format} company profile report for ${config.clientId}: ${filePath}`);
      return report;
    } catch (error) {
      this.logger.error(`Failed to generate company profile report: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get all reports for a client
   */
  async getClientReports(clientId: string, limit?: number): Promise<GeneratedReport[]> {
    return this.databaseService.getClientReports(clientId, limit);
  }

  /**
   * Get report by ID
   */
  async getReport(id: string): Promise<GeneratedReport> {
    const report = await this.databaseService.getReportById(id);
    if (!report) {
      throw new NotFoundException(`Report ${id} not found`);
    }
    return report;
  }

  /**
   * Delete a report
   */
  async deleteReport(id: string): Promise<OperationResult> {
    try {
      const report = await this.databaseService.getReportById(id);
      if (!report) {
        return { success: false, message: 'Report not found' };
      }

      // Delete file if it exists
      if (report.filePath && existsSync(report.filePath)) {
        await fs.unlink(report.filePath);
      }

      // Delete from database would need to be implemented in DatabaseService
      // For now, we'll just mark it as deleted
      this.logger.log(`Deleted report ${id} and associated file`);
      return { success: true, message: 'Report deleted successfully' };
    } catch (error) {
      this.logger.error(`Failed to delete report ${id}: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Generate PDF for client pack
   */
  private async generateClientPackPDF(data: any, options: PDFOptions = {}): Promise<PDFResult> {
    let browser = null;
    
    try {
      const html = await this.generateClientPackHTML(data);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `client-pack-${data.client.companyNumber}-${timestamp}.pdf`;
      const outputDir = options.outputPath || path.join(this.storagePath, 'clients', 'unknown', 'reports');
      if (!existsSync(outputDir)) {
        await fs.mkdir(outputDir, { recursive: true });
      }
      const outputPath = path.join(outputDir, fileName);

      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      await page.pdf({
        path: outputPath,
        format: options.format || 'A4',
        printBackground: true,
        margin: { 
          top: '20mm', 
          right: '15mm', 
          bottom: '20mm', 
          left: '15mm' 
        },
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; color: #6b7280; padding: 10px 0;">
            <span>${data.title}</span>
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; color: #6b7280; padding: 10px 0;">
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>
        `
      });

      const stats = await fs.stat(outputPath);
      const fileSize = stats.size;

      this.logger.log('Client pack PDF generated successfully:', { outputPath, fileSize });

      return {
        success: true,
        filePath: outputPath,
        fileSize,
      };
    } catch (error) {
      this.logger.error('Client pack PDF generation error:', error);
      return {
        success: false,
        filePath: '',
        fileSize: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Generate PDF for tax strategy report
   */
  private async generateTaxStrategyPDF(data: any, options: PDFOptions = {}): Promise<PDFResult> {
    let browser = null;
    
    try {
      const html = await this.generateTaxStrategyHTML(data);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `tax-strategy-${data.client.companyNumber}-${timestamp}.pdf`;
      const outputDir = options.outputPath || path.join(this.storagePath, 'clients', 'unknown', 'reports');
      if (!existsSync(outputDir)) {
        await fs.mkdir(outputDir, { recursive: true });
      }
      const outputPath = path.join(outputDir, fileName);

      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      await page.pdf({
        path: outputPath,
        format: options.format || 'A4',
        printBackground: true,
        margin: { 
          top: '20mm', 
          right: '15mm', 
          bottom: '20mm', 
          left: '15mm' 
        }
      });

      const stats = await fs.stat(outputPath);
      const fileSize = stats.size;

      this.logger.log('Tax strategy PDF generated successfully:', { outputPath, fileSize });

      return {
        success: true,
        filePath: outputPath,
        fileSize,
      };
    } catch (error) {
      this.logger.error('Tax strategy PDF generation error:', error);
      return {
        success: false,
        filePath: '',
        fileSize: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Generate PDF for company profile report
   */
  private async generateCompanyProfilePDF(data: any, options: PDFOptions = {}): Promise<PDFResult> {
    let browser = null;
    
    try {
      const html = await this.generateCompanyProfileHTML(data);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `company-profile-${data.client.companyNumber}-${timestamp}.pdf`;
      const outputDir = options.outputPath || path.join(this.storagePath, 'clients', 'unknown', 'reports');
      if (!existsSync(outputDir)) {
        await fs.mkdir(outputDir, { recursive: true });
      }
      const outputPath = path.join(outputDir, fileName);

      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      await page.pdf({
        path: outputPath,
        format: options.format || 'A4',
        printBackground: true,
        margin: { 
          top: '20mm', 
          right: '15mm', 
          bottom: '20mm', 
          left: '15mm' 
        }
      });

      const stats = await fs.stat(outputPath);
      const fileSize = stats.size;

      this.logger.log('Company profile PDF generated successfully:', { outputPath, fileSize });

      return {
        success: true,
        filePath: outputPath,
        fileSize,
      };
    } catch (error) {
      this.logger.error('Company profile PDF generation error:', error);
      return {
        success: false,
        filePath: '',
        fileSize: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Generate HTML content for client pack
   */
  private async generateClientPackHTML(data: any): Promise<string> {
    const { client, calculations, title, createdAt } = data;
    const formatCurrency = (value: number) => `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatDate = (date: string | Date) => new Date(date).toLocaleDateString('en-GB');
    const branding = await this.getPracticeBranding();
    const period = `Generated ${formatDate(createdAt)}`;
    const sections: Array<{ title: string; html: string }> = [];

    sections.push({
      title: 'Client Information',
      html: `
      <section class="section">
        ${this.renderPageHeader(client.companyName || 'Client Report', period, branding)}
        <h2 class="section-title">Client Information</h2>
        <div class="info-grid">
          ${this.renderInfoItem('Company Name', client.companyName)}
          ${this.renderInfoItem('Company Number', client.companyNumber)}
          ${this.renderInfoItem('Status', client.status)}
          ${this.renderInfoItem('Client Manager', client.clientManager || 'Not assigned')}
          ${client.corporationTaxUtr ? this.renderInfoItem('Corporation Tax UTR', client.corporationTaxUtr) : ''}
          ${client.vatNumber ? this.renderInfoItem('VAT Number', client.vatNumber) : ''}
          ${client.telephone ? this.renderInfoItem('Telephone', client.telephone) : ''}
          ${client.email ? this.renderInfoItem('Email', client.email) : ''}
        </div>
      </section>
      `,
    });

    if (calculations.length > 0) {
      sections.push({
        title: 'Recent Tax Calculations',
        html: `
        <section class="section">
          ${this.renderPageHeader(client.companyName || 'Client Report', period, branding)}
          <h2 class="section-title">Recent Tax Calculations</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Tax Year</th>
                <th class="number">Optimized Salary</th>
                <th class="number">Take Home</th>
                <th class="number">Tax Liability</th>
                <th class="number">Estimated Savings</th>
              </tr>
            </thead>
            <tbody>
              ${calculations.map((calc: TaxCalculationResult) => `
                <tr>
                  <td>${formatDate(calc.calculatedAt || new Date())}</td>
                  <td>${this.escapeHtml((calc.calculationType || '').replace('_', ' '))}</td>
                  <td>${this.escapeHtml(calc.taxYear || 'N/A')}</td>
                  <td class="number">${calc.optimizedSalary ? formatCurrency(calc.optimizedSalary) : '-'}</td>
                  <td class="number">${calc.totalTakeHome ? formatCurrency(calc.totalTakeHome) : '-'}</td>
                  <td class="number">${calc.totalTaxLiability ? formatCurrency(calc.totalTaxLiability) : '-'}</td>
                  <td class="number">${calc.estimatedSavings ? formatCurrency(calc.estimatedSavings) : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>
        `,
      });
    }

    if (client.registeredAddress) {
      sections.push({
        title: 'Registered Address',
        html: `
        <section class="section">
          ${this.renderPageHeader(client.companyName || 'Client Report', period, branding)}
          <h2 class="section-title">Registered Address</h2>
          <p>${this.escapeHtml(client.registeredAddress)}</p>
        </section>
        `,
      });
    }

    if (client.notes) {
      sections.push({
        title: 'Notes',
        html: `
        <section class="section">
          ${this.renderPageHeader(client.companyName || 'Client Report', period, branding)}
          <h2 class="section-title">Notes</h2>
          <p>${this.escapeHtml(client.notes)}</p>
        </section>
        `,
      });
    }

    return this.renderReportDocument({
      title,
      subtitle: 'Professional Client Pack',
      companyName: client.companyName || 'Client Report',
      periodLabel: period,
      sections,
      branding,
      includeCoverPage: data.includeCoverPage !== false,
      includeContentsPage: data.includeContentsPage !== false,
      footerNote: `Generated by ${branding.practiceName}`,
    });
  }

  /**
   * Generate HTML content for tax strategy report
   */
  private async generateTaxStrategyHTML(data: any): Promise<string> {
    const { client, calculations, title, createdAt } = data;
    const formatCurrency = (value: number) => `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatPercent = (value: number) => `${value.toFixed(2)}%`;
    const formatDate = (date: string | Date) => new Date(date).toLocaleDateString('en-GB');
    const branding = await this.getPracticeBranding();
    const period = `Generated ${formatDate(createdAt)}`;
    const sections: Array<{ title: string; html: string }> = [];

    sections.push({
      title: 'Client Information',
      html: `
      <section class="section">
        ${this.renderPageHeader(client.companyName || 'Tax Strategy Report', period, branding)}
        <h2 class="section-title">Client Information</h2>
        <div class="info-grid">
          ${this.renderInfoItem('Company Name', client.companyName)}
          ${this.renderInfoItem('Company Number', client.companyNumber)}
          ${this.renderInfoItem('Report Date', formatDate(createdAt))}
          ${this.renderInfoItem('Client Manager', client.clientManager || 'Not assigned')}
        </div>
      </section>
      `,
    });

    calculations.forEach((calc: TaxCalculationResult, index: number) => {
      sections.push({
        title: `Tax Calculation ${index + 1}`,
        html: `
        <section class="section">
          ${this.renderPageHeader(client.companyName || 'Tax Strategy Report', period, branding)}
          <h2 class="section-title">Tax Calculation ${index + 1}: ${this.escapeHtml(calc.taxYear || '')}</h2>
          <div class="calculation-summary">
            <div class="info-grid">
              ${this.renderInfoItem('Calculation Type', (calc.calculationType || '').replace('_', ' '))}
              ${this.renderInfoItem('Tax Year', calc.taxYear)}
              ${this.renderInfoItem('Calculated Date', formatDate(calc.calculatedAt || new Date()))}
              ${this.renderInfoItem('Calculated By', calc.calculatedBy || 'System')}
            </div>
          </div>
          ${calc.optimizedSalary ? `
          <div class="recommendation">
            <h3>Recommended Strategy</h3>
            <div class="info-grid">
              ${this.renderInfoItem('Optimized Salary', formatCurrency(calc.optimizedSalary))}
              ${this.renderInfoItem('Optimized Dividend', calc.optimizedDividend ? formatCurrency(calc.optimizedDividend) : 'N/A')}
              ${this.renderInfoItem('Total Take Home', calc.totalTakeHome ? formatCurrency(calc.totalTakeHome) : 'N/A')}
              ${this.renderInfoItem('Estimated Savings', calc.estimatedSavings ? formatCurrency(calc.estimatedSavings) : 'N/A')}
            </div>
          </div>
          ` : ''}
          ${calc.scenarios && calc.scenarios.length > 0 ? `
          <h3>Scenario Analysis</h3>
          <table>
            <thead>
              <tr>
                <th>Scenario</th>
                <th class="number">Salary</th>
                <th class="number">Dividend</th>
                <th class="number">Income Tax</th>
                <th class="number">Employee NI</th>
                <th class="number">Employer NI</th>
                <th class="number">Corporation Tax</th>
                <th class="number">Total Tax</th>
                <th class="number">Take Home</th>
                <th class="number">Effective Rate</th>
              </tr>
            </thead>
            <tbody>
              ${calc.scenarios.map((scenario: any, scenarioIndex: number) => `
                <tr ${scenarioIndex === 0 ? 'class="highlight"' : ''}>
                  <td>${this.escapeHtml(scenario.name || `Scenario ${scenarioIndex + 1}`)}</td>
                  <td class="number">${formatCurrency(scenario.salary || 0)}</td>
                  <td class="number">${formatCurrency(scenario.dividend || 0)}</td>
                  <td class="number">${formatCurrency(scenario.incomeTax || 0)}</td>
                  <td class="number">${formatCurrency(scenario.employeeNI || 0)}</td>
                  <td class="number">${formatCurrency(scenario.employerNI || 0)}</td>
                  <td class="number">${formatCurrency(scenario.corporationTax || 0)}</td>
                  <td class="number">${formatCurrency(scenario.totalTax || 0)}</td>
                  <td class="number"><strong>${formatCurrency(scenario.takeHome || 0)}</strong></td>
                  <td class="number">${formatPercent(scenario.effectiveRate || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : ''}
          ${calc.recommendations && calc.recommendations.length > 0 ? `
          <h3>Recommendations</h3>
          <ul>
            ${calc.recommendations.map((rec: any) => `
              <li>${this.escapeHtml(typeof rec === 'string' ? rec : rec.description || rec.text || JSON.stringify(rec))}</li>
            `).join('')}
          </ul>
          ` : ''}
          ${calc.notes ? `
          <h3>Notes</h3>
          <p>${this.escapeHtml(calc.notes)}</p>
          ` : ''}
        </section>
        `,
      });
    });

    return this.renderReportDocument({
      title,
      subtitle: 'Tax Strategy Report',
      companyName: client.companyName || 'Tax Strategy Report',
      periodLabel: period,
      sections,
      branding,
      includeCoverPage: data.includeCoverPage !== false,
      includeContentsPage: data.includeContentsPage !== false,
      footerNote: `Generated by ${branding.practiceName}`,
    });
  }

  /**
   * Generate HTML content for company profile report
   */
  private async generateCompanyProfileHTML(data: any): Promise<string> {
    const { client, title, createdAt } = data;
    const formatDate = (date: string | Date) => date ? new Date(date).toLocaleDateString('en-GB') : 'N/A';
    const branding = await this.getPracticeBranding();
    const period = `Generated ${formatDate(createdAt)}`;
    const sections: Array<{ title: string; html: string }> = [];

    sections.push({
      title: 'Company Information',
      html: `
      <section class="section">
        ${this.renderPageHeader(client.companyName || 'Company Profile', period, branding)}
        <h2 class="section-title">Company Information</h2>
        <div class="info-grid">
          ${this.renderInfoItem('Company Name', client.companyName)}
          ${this.renderInfoItem('Company Number', client.companyNumber)}
          ${this.renderInfoItem('Status', client.status)}
          ${this.renderInfoItem('Company Type', client.companyType || 'N/A')}
          ${this.renderInfoItem('Incorporation Date', formatDate(client.incorporationDate))}
          ${this.renderInfoItem('Jurisdiction', client.jurisdiction || 'N/A')}
        </div>
      </section>
      `,
    });

    if (client.registeredAddress) {
      sections.push({
        title: 'Registered Address',
        html: `
        <section class="section">
          ${this.renderPageHeader(client.companyName || 'Company Profile', period, branding)}
          <h2 class="section-title">Registered Address</h2>
          <p>${this.escapeHtml(client.registeredAddress)}</p>
        </section>
        `,
      });
    }

    if (client.sicCodes || client.sicDescriptions) {
      sections.push({
        title: 'SIC',
        html: `
        <section class="section">
          ${this.renderPageHeader(client.companyName || 'Company Profile', period, branding)}
          <h2 class="section-title">Standard Industrial Classification (SIC)</h2>
          ${client.sicCodes ? `<p><strong>SIC Codes:</strong> ${this.escapeHtml(client.sicCodes)}</p>` : ''}
          ${client.sicDescriptions ? `<p><strong>Descriptions:</strong> ${this.escapeHtml(client.sicDescriptions)}</p>` : ''}
        </section>
        `,
      });
    }

    sections.push({
      title: 'Filing Information',
      html: `
      <section class="section">
        ${this.renderPageHeader(client.companyName || 'Company Profile', period, branding)}
        <h2 class="section-title">Filing Information</h2>
        <div class="info-grid">
          ${this.renderInfoItem('Next Accounts Due', formatDate(client.nextAccountsDueBy))}
          ${this.renderInfoItem('Last Accounts Made Up To', formatDate(client.lastAccountsMadeUpTo))}
          ${this.renderInfoItem('Confirmation Statement Due', formatDate(client.confirmationStatementDueBy))}
          ${this.renderInfoItem('Accounts Overdue', client.accountsOverdue ? 'Yes' : 'No')}
        </div>
      </section>
      `,
    });

    if (client.directorCount || client.pscCount) {
      sections.push({
        title: 'Officers & Control',
        html: `
        <section class="section">
          ${this.renderPageHeader(client.companyName || 'Company Profile', period, branding)}
          <h2 class="section-title">Officers & Control</h2>
          <div class="info-grid">
            ${client.directorCount ? this.renderInfoItem('Number of Directors', String(client.directorCount)) : ''}
            ${client.pscCount ? this.renderInfoItem('Persons with Significant Control', String(client.pscCount)) : ''}
          </div>
        </section>
        `,
      });
    }

    sections.push({
      title: 'Practice Information',
      html: `
      <section class="section">
        ${this.renderPageHeader(client.companyName || 'Company Profile', period, branding)}
        <h2 class="section-title">Practice Information</h2>
        <div class="info-grid">
          ${this.renderInfoItem('Client Manager', client.clientManager || 'Not assigned')}
          ${this.renderInfoItem('Engagement Type', client.engagementType || 'N/A')}
          ${this.renderInfoItem('Corporation Tax UTR', client.corporationTaxUtr || 'N/A')}
          ${this.renderInfoItem('VAT Number', client.vatNumber || 'N/A')}
          ${this.renderInfoItem('PAYE Reference', client.payeReference || 'N/A')}
          ${this.renderInfoItem('Contact', client.telephone || client.email || 'N/A')}
        </div>
      </section>
      `,
    });

    if (client.notes) {
      sections.push({
        title: 'Notes',
        html: `
        <section class="section">
          ${this.renderPageHeader(client.companyName || 'Company Profile', period, branding)}
          <h2 class="section-title">Notes</h2>
          <p>${this.escapeHtml(client.notes)}</p>
        </section>
        `,
      });
    }

    sections.push({
      title: 'Report Information',
      html: `
      <section class="section">
        ${this.renderPageHeader(client.companyName || 'Company Profile', period, branding)}
        <h2 class="section-title">Report Information</h2>
        <div class="info-grid">
          ${this.renderInfoItem('Generated Date', formatDate(createdAt))}
          ${this.renderInfoItem('Last CH Refresh', formatDate(client.lastChRefresh))}
        </div>
      </section>
      `,
    });

    return this.renderReportDocument({
      title,
      subtitle: 'Company Profile Report',
      companyName: client.companyName || 'Company Profile',
      periodLabel: period,
      sections,
      branding,
      includeCoverPage: data.includeCoverPage !== false,
      includeContentsPage: data.includeContentsPage !== false,
      footerNote: `Generated by ${branding.practiceName}`,
    });
  }

  private async renderReportDocument(input: {
    title: string;
    subtitle: string;
    companyName: string;
    periodLabel: string;
    sections: Array<{ title: string; html: string }>;
    branding: ReportBranding;
    includeCoverPage: boolean;
    includeContentsPage: boolean;
    footerNote: string;
  }): Promise<string> {
    const pages: string[] = [];
    const contentStartPage = 1 + (input.includeCoverPage ? 1 : 0) + (input.includeContentsPage ? 1 : 0);

    if (input.includeCoverPage) {
      pages.push(this.renderCoverPage(input.title, input.subtitle, input.companyName, input.periodLabel, input.branding));
    }

    if (input.includeContentsPage) {
      pages.push(this.renderContentsPage(input.sections.map((s, idx) => ({ label: s.title, page: idx + contentStartPage })), input.branding));
    }

    pages.push(
      ...input.sections.map((section, idx) => `
      <div class="report-page page-break">
        ${section.html}
        ${this.renderPageFooter(`Page ${idx + contentStartPage}`, input.footerNote, input.branding)}
      </div>
      `),
    );

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(input.title)}</title>
  <style>${this.getPremiumReportStyles(input.branding)}</style>
</head>
<body>
${pages.join('\n')}
</body>
</html>
    `;
  }

  private async getPracticeBranding(): Promise<ReportBranding> {
    const defaultBranding: ReportBranding = {
      practiceName: 'M Practice Manager',
      logoDataUrl: null,
      reportPrimaryColor: '#6D28D9',
      reportSecondaryColor: '#A78BFA',
    };

    try {
      const storagePath = resolveStorageRoot(this.configService);
      const configDir = path.join(storagePath, 'config');
      const settingsPath = path.join(configDir, 'practice-settings.json');
      const logoPath = path.join(configDir, 'branding-logo.json');

      let practiceName = defaultBranding.practiceName;
      let reportPrimaryColor = defaultBranding.reportPrimaryColor;
      let reportSecondaryColor = defaultBranding.reportSecondaryColor;
      let logoDataUrl: string | null = null;

      if (existsSync(settingsPath)) {
        const rawSettings = await fs.readFile(settingsPath, 'utf8');
        const settings = JSON.parse(rawSettings);
        practiceName = settings?.practiceName || practiceName;
        reportPrimaryColor = this.normalizeHexColor(settings?.reportPrimaryColor) || reportPrimaryColor;
        reportSecondaryColor = this.normalizeHexColor(settings?.reportSecondaryColor) || reportSecondaryColor;
      }

      if (existsSync(logoPath)) {
        const rawLogo = await fs.readFile(logoPath, 'utf8');
        const logo = JSON.parse(rawLogo);
        if (typeof logo?.dataUrl === 'string' && logo.dataUrl.startsWith('data:image')) {
          logoDataUrl = logo.dataUrl;
        }
      }

      return {
        practiceName,
        logoDataUrl,
        reportPrimaryColor,
        reportSecondaryColor,
      };
    } catch (error) {
      this.logger.warn(`Unable to resolve practice branding, using defaults: ${error instanceof Error ? error.message : 'unknown error'}`);
      return defaultBranding;
    }
  }

  private renderCoverPage(title: string, subtitle: string, companyName: string, periodLabel: string, branding: ReportBranding): string {
    return `
    <div class="report-page cover-page">
      <div class="cover-logo">${this.renderLogo(branding, 'cover-logo-image')}</div>
      <h1>${this.escapeHtml(title)}</h1>
      <p class="cover-subtitle">${this.escapeHtml(subtitle)}</p>
      <div class="cover-rule"></div>
      <p class="cover-company">${this.escapeHtml(companyName)}</p>
      <p class="cover-period">${this.escapeHtml(periodLabel)}</p>
    </div>
    `;
  }

  private renderContentsPage(items: Array<{ label: string; page: number }>, branding: ReportBranding): string {
    return `
    <div class="report-page page-break">
      <div class="contents-header">Contents</div>
      <table class="contents-table">
        <thead>
          <tr><th>Section</th><th class="number">Page</th></tr>
        </thead>
        <tbody>
          ${items.map((item) => `<tr><td>${this.escapeHtml(item.label)}</td><td class="number">${item.page}</td></tr>`).join('')}
        </tbody>
      </table>
      ${this.renderPageFooter('Contents', `Prepared by ${branding.practiceName}`, branding)}
    </div>
    `;
  }

  private renderPageHeader(companyName: string, periodLabel: string, branding: ReportBranding): string {
    return `
    <div class="page-header">
      <div class="page-header-left">${this.renderLogo(branding, 'header-logo-image')}</div>
      <div class="page-header-right">
        <div class="header-company">${this.escapeHtml(companyName)}</div>
        <div class="header-period">${this.escapeHtml(periodLabel)}</div>
      </div>
    </div>
    `;
  }

  private renderPageFooter(pageLabel: string, note: string, branding: ReportBranding): string {
    return `
    <div class="page-footer">
      <div>${this.escapeHtml(pageLabel)}</div>
      <div class="page-footer-center">
        ${this.renderLogo(branding, 'footer-logo-image')}
        <span>${this.escapeHtml(note)}</span>
      </div>
      <div>${this.escapeHtml(branding.practiceName)}</div>
    </div>
    `;
  }

  private renderLogo(branding: ReportBranding, className: string): string {
    if (branding.logoDataUrl) {
      return `<img class="${className}" src="${branding.logoDataUrl}" alt="${this.escapeHtml(branding.practiceName)} logo" />`;
    }
    return `<div class="${className} logo-fallback">M</div>`;
  }

  private renderInfoItem(label: string, value: string): string {
    return `
    <div class="info-item">
      <div class="info-label">${this.escapeHtml(label)}</div>
      <div class="info-value">${this.escapeHtml(value || 'N/A')}</div>
    </div>
    `;
  }

  private normalizeHexColor(input?: string): string | null {
    if (!input || typeof input !== 'string') return null;
    const value = input.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
    return null;
  }

  private escapeHtml(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private getPremiumReportStyles(branding: ReportBranding): string {
    return `
      :root {
        --brand-primary: ${branding.reportPrimaryColor};
        --brand-secondary: ${branding.reportSecondaryColor};
        --brand-light: #f5f3ff;
        --text-dark: #1e293b;
        --text-muted: #64748b;
        --border-color: #e2e8f0;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #f8fafc;
        color: var(--text-dark);
        font-family: "Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      }
      .report-page {
        width: 210mm;
        min-height: 297mm;
        margin: 10mm auto;
        padding: 18mm 16mm;
        background: #fff;
        border-radius: 10px;
        box-shadow: 0 10px 18px rgba(30, 41, 59, 0.08);
        position: relative;
      }
      .cover-page {
        background: linear-gradient(135deg, var(--brand-primary) 0%, #4c1d95 100%);
        color: #fff;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }
      .cover-logo-image, .header-logo-image, .footer-logo-image {
        max-width: 130px;
        max-height: 72px;
        width: auto;
        height: auto;
        object-fit: contain;
      }
      .footer-logo-image {
        max-width: 28px;
        max-height: 20px;
      }
      .cover-logo .logo-fallback, .page-header-left .logo-fallback {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        color: var(--brand-primary);
        font-weight: 800;
      }
      .cover-page h1 { margin: 0; font-size: 34px; letter-spacing: 0.05em; }
      .cover-subtitle { margin: 0; font-size: 18px; opacity: 0.95; }
      .cover-rule { width: 80px; height: 3px; background: rgba(255,255,255,.4); border-radius: 999px; margin: 8px 0; }
      .cover-company { font-size: 20px; margin: 0; font-weight: 600; }
      .cover-period { font-size: 14px; margin: 0; opacity: 0.9; }
      .contents-header {
        font-size: 22px;
        font-weight: 700;
        color: var(--brand-primary);
        border-bottom: 2px solid var(--brand-primary);
        margin-bottom: 16px;
        padding-bottom: 6px;
        text-transform: uppercase;
      }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 10px;
        margin-bottom: 18px;
      }
      .header-company { font-weight: 700; font-size: 14px; }
      .header-period { font-size: 12px; color: var(--text-muted); }
      .section-title {
        font-size: 16px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .04em;
        color: var(--brand-primary);
        border-bottom: 2px solid var(--brand-primary);
        padding-bottom: 8px;
        margin-bottom: 12px;
      }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .info-item { background: #f8fafc; border: 1px solid var(--border-color); padding: 10px; border-radius: 8px; }
      .info-label { font-size: 11px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px; font-weight: 700; }
      .info-value { font-size: 14px; font-weight: 600; word-break: break-word; }
      .calculation-summary, .recommendation { margin-bottom: 14px; }
      .recommendation { border-left: 3px solid var(--brand-primary); background: var(--brand-light); padding: 12px; border-radius: 6px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; }
      th, td { padding: 8px; border-bottom: 1px solid var(--border-color); font-size: 12px; text-align: left; vertical-align: top; }
      th { color: var(--text-muted); font-weight: 700; text-transform: uppercase; font-size: 11px; }
      .number { text-align: right; font-variant-numeric: tabular-nums; }
      .highlight { background: #f5f3ff; }
      .page-footer {
        position: absolute;
        bottom: 10mm;
        left: 16mm;
        right: 16mm;
        border-top: 1px solid var(--border-color);
        padding-top: 6px;
        display: flex;
        justify-content: space-between;
        color: var(--text-muted);
        font-size: 11px;
      }
      .page-footer-center {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      ul { margin: 8px 0 12px 20px; padding: 0; }
      li { margin-bottom: 4px; }
      h3 { font-size: 13px; margin: 8px 0; color: var(--text-dark); }
      p { margin: 0 0 8px; font-size: 13px; line-height: 1.55; }
      .page-break { page-break-before: always; }
      @media print {
        body { background: #fff !important; }
        .report-page { margin: 0; width: 100%; min-height: 297mm; box-shadow: none; border-radius: 0; page-break-after: always; }
      }
    `;
  }
}

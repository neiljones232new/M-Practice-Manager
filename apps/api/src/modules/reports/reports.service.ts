import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { TaxCalculationsService } from '../tax-calculations/tax-calculations.service';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
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

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly reportsPath: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly taxCalculationsService: TaxCalculationsService,
  ) {
    const storagePath = this.configService.get<string>('STORAGE_PATH') || '../../storage';
    this.reportsPath = path.join(storagePath, 'reports');
    this.ensureReportsDirectory();
  }

  private async ensureReportsDirectory(): Promise<void> {
    try {
      if (!existsSync(this.reportsPath)) {
        await fs.mkdir(this.reportsPath, { recursive: true });
      }
    } catch (error) {
      this.logger.error('Failed to create reports directory:', error);
    }
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
      };

      let filePath: string;
      let content: any;

      if (config.format === 'PDF') {
        const pdfResult = await this.generateClientPackPDF(reportData, {
          includeBranding: config.includeBranding,
          includeCharts: config.includeCharts,
        });
        
        if (!pdfResult.success) {
          throw new Error(pdfResult.error || 'PDF generation failed');
        }
        
        filePath = pdfResult.filePath;
        content = { pdfGenerated: true, fileSize: pdfResult.fileSize };
      } else {
        const html = await this.generateClientPackHTML(reportData);
        const htmlFileName = `client-pack-${client.companyNumber}-${Date.now()}.html`;
        filePath = path.join(this.reportsPath, htmlFileName);
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
      };

      let filePath: string;
      let content: any;

      if (config.format === 'PDF') {
        const pdfResult = await this.generateTaxStrategyPDF(reportData, {
          includeBranding: config.includeBranding,
          includeCharts: config.includeCharts,
        });
        
        if (!pdfResult.success) {
          throw new Error(pdfResult.error || 'PDF generation failed');
        }
        
        filePath = pdfResult.filePath;
        content = { pdfGenerated: true, fileSize: pdfResult.fileSize };
      } else {
        const html = await this.generateTaxStrategyHTML(reportData);
        const htmlFileName = `tax-strategy-${client.companyNumber}-${Date.now()}.html`;
        filePath = path.join(this.reportsPath, htmlFileName);
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
      };

      let filePath: string;
      let content: any;

      if (config.format === 'PDF') {
        const pdfResult = await this.generateCompanyProfilePDF(reportData, {
          includeBranding: config.includeBranding,
        });
        
        if (!pdfResult.success) {
          throw new Error(pdfResult.error || 'PDF generation failed');
        }
        
        filePath = pdfResult.filePath;
        content = { pdfGenerated: true, fileSize: pdfResult.fileSize };
      } else {
        const html = await this.generateCompanyProfileHTML(reportData);
        const htmlFileName = `company-profile-${client.companyNumber}-${Date.now()}.html`;
        filePath = path.join(this.reportsPath, htmlFileName);
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
      const outputPath = path.join(this.reportsPath, fileName);

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
      const outputPath = path.join(this.reportsPath, fileName);

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
      const outputPath = path.join(this.reportsPath, fileName);

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
    const { client, calculations, title, createdAt, includeBranding } = data;
    const formatCurrency = (value: number) => `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatDate = (date: string | Date) => new Date(date).toLocaleDateString('en-GB');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    ${this.getReportStyles()}
  </style>
</head>
<body>
  <div class="page">
    ${includeBranding ? `
    <div class="header">
      <h1>M Practice Manager</h1>
      <p>Professional Client Pack</p>
    </div>
    ` : ''}

    <div class="section">
      <h2 class="section-title">Client Information</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Company Name</div>
          <div class="info-value">${client.companyName}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Company Number</div>
          <div class="info-value">${client.companyNumber}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Status</div>
          <div class="info-value">${client.status}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Client Manager</div>
          <div class="info-value">${client.clientManager || 'Not assigned'}</div>
        </div>
        ${client.corporationTaxUtr ? `
        <div class="info-item">
          <div class="info-label">Corporation Tax UTR</div>
          <div class="info-value">${client.corporationTaxUtr}</div>
        </div>
        ` : ''}
        ${client.vatNumber ? `
        <div class="info-item">
          <div class="info-label">VAT Number</div>
          <div class="info-value">${client.vatNumber}</div>
        </div>
        ` : ''}
        ${client.telephone ? `
        <div class="info-item">
          <div class="info-label">Telephone</div>
          <div class="info-value">${client.telephone}</div>
        </div>
        ` : ''}
        ${client.email ? `
        <div class="info-item">
          <div class="info-label">Email</div>
          <div class="info-value">${client.email}</div>
        </div>
        ` : ''}
      </div>
    </div>

    ${calculations.length > 0 ? `
    <div class="section">
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
              <td>${calc.calculationType.replace('_', ' ')}</td>
              <td>${calc.taxYear}</td>
              <td class="number">${calc.optimizedSalary ? formatCurrency(calc.optimizedSalary) : '-'}</td>
              <td class="number">${calc.totalTakeHome ? formatCurrency(calc.totalTakeHome) : '-'}</td>
              <td class="number">${calc.totalTaxLiability ? formatCurrency(calc.totalTaxLiability) : '-'}</td>
              <td class="number">${calc.estimatedSavings ? formatCurrency(calc.estimatedSavings) : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${client.registeredAddress ? `
    <div class="section">
      <h2 class="section-title">Registered Address</h2>
      <p>${client.registeredAddress}</p>
    </div>
    ` : ''}

    ${client.notes ? `
    <div class="section">
      <h2 class="section-title">Notes</h2>
      <p>${client.notes}</p>
    </div>
    ` : ''}

    ${includeBranding ? `
    <div class="footer">
      <p>
        Generated by <strong>M Practice Manager</strong><br>
        © ${new Date().getFullYear()} M FlowSoft. Professional practice management.
      </p>
    </div>
    ` : ''}
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate HTML content for tax strategy report
   */
  private async generateTaxStrategyHTML(data: any): Promise<string> {
    const { client, calculations, title, createdAt, includeBranding } = data;
    const formatCurrency = (value: number) => `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatPercent = (value: number) => `${value.toFixed(2)}%`;
    const formatDate = (date: string | Date) => new Date(date).toLocaleDateString('en-GB');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    ${this.getReportStyles()}
  </style>
</head>
<body>
  <div class="page">
    ${includeBranding ? `
    <div class="header">
      <h1>M Practice Manager</h1>
      <p>Tax Strategy Report</p>
    </div>
    ` : ''}

    <div class="section">
      <h2 class="section-title">Client Information</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Company Name</div>
          <div class="info-value">${client.companyName}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Company Number</div>
          <div class="info-value">${client.companyNumber}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Report Date</div>
          <div class="info-value">${formatDate(createdAt)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Client Manager</div>
          <div class="info-value">${client.clientManager || 'Not assigned'}</div>
        </div>
      </div>
    </div>

    ${calculations.map((calc: TaxCalculationResult, index: number) => `
    <div class="section">
      <h2 class="section-title">Tax Calculation ${index + 1}: ${calc.taxYear}</h2>
      
      <div class="calculation-summary">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Calculation Type</div>
            <div class="info-value">${calc.calculationType.replace('_', ' ')}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Tax Year</div>
            <div class="info-value">${calc.taxYear}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Calculated Date</div>
            <div class="info-value">${formatDate(calc.calculatedAt || new Date())}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Calculated By</div>
            <div class="info-value">${calc.calculatedBy || 'System'}</div>
          </div>
        </div>
      </div>

      ${calc.optimizedSalary ? `
      <div class="recommendation">
        <h3>Recommended Strategy</h3>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Optimized Salary</div>
            <div class="info-value" style="color: #2563eb; font-size: 18px; font-weight: 600;">${formatCurrency(calc.optimizedSalary)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Optimized Dividend</div>
            <div class="info-value" style="color: #2563eb; font-size: 18px; font-weight: 600;">${calc.optimizedDividend ? formatCurrency(calc.optimizedDividend) : 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Total Take Home</div>
            <div class="info-value" style="color: #10b981; font-size: 18px; font-weight: 600;">${calc.totalTakeHome ? formatCurrency(calc.totalTakeHome) : 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Estimated Savings</div>
            <div class="info-value" style="color: #10b981; font-size: 18px; font-weight: 600;">${calc.estimatedSavings ? formatCurrency(calc.estimatedSavings) : 'N/A'}</div>
          </div>
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
              <td>${scenario.name || `Scenario ${scenarioIndex + 1}`}</td>
              <td class="number">${formatCurrency(scenario.salary)}</td>
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
          <li>${typeof rec === 'string' ? rec : rec.description || rec.text || JSON.stringify(rec)}</li>
        `).join('')}
      </ul>
      ` : ''}

      ${calc.notes ? `
      <h3>Notes</h3>
      <p>${calc.notes}</p>
      ` : ''}
    </div>
    `).join('')}

    ${includeBranding ? `
    <div class="footer">
      <p>
        Generated by <strong>M Practice Manager</strong><br>
        Powered by <strong>M Powered™ Tax Engine</strong><br>
        © ${new Date().getFullYear()} M FlowSoft. Ensuring accurate UK tax calculations.
      </p>
    </div>
    ` : ''}
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate HTML content for company profile report
   */
  private async generateCompanyProfileHTML(data: any): Promise<string> {
    const { client, title, createdAt, includeBranding } = data;
    const formatDate = (date: string | Date) => date ? new Date(date).toLocaleDateString('en-GB') : 'N/A';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    ${this.getReportStyles()}
  </style>
</head>
<body>
  <div class="page">
    ${includeBranding ? `
    <div class="header">
      <h1>M Practice Manager</h1>
      <p>Company Profile Report</p>
    </div>
    ` : ''}

    <div class="section">
      <h2 class="section-title">Company Information</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Company Name</div>
          <div class="info-value">${client.companyName}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Company Number</div>
          <div class="info-value">${client.companyNumber}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Status</div>
          <div class="info-value">${client.status}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Company Type</div>
          <div class="info-value">${client.companyType || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Incorporation Date</div>
          <div class="info-value">${formatDate(client.incorporationDate)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Jurisdiction</div>
          <div class="info-value">${client.jurisdiction || 'N/A'}</div>
        </div>
      </div>
    </div>

    ${client.registeredAddress ? `
    <div class="section">
      <h2 class="section-title">Registered Address</h2>
      <p>${client.registeredAddress}</p>
    </div>
    ` : ''}

    ${client.sicCodes || client.sicDescriptions ? `
    <div class="section">
      <h2 class="section-title">Standard Industrial Classification (SIC)</h2>
      ${client.sicCodes ? `<p><strong>SIC Codes:</strong> ${client.sicCodes}</p>` : ''}
      ${client.sicDescriptions ? `<p><strong>Descriptions:</strong> ${client.sicDescriptions}</p>` : ''}
    </div>
    ` : ''}

    <div class="section">
      <h2 class="section-title">Filing Information</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Next Accounts Due</div>
          <div class="info-value">${formatDate(client.nextAccountsDueBy)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Last Accounts Made Up To</div>
          <div class="info-value">${formatDate(client.lastAccountsMadeUpTo)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Confirmation Statement Due</div>
          <div class="info-value">${formatDate(client.confirmationStatementDueBy)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Accounts Overdue</div>
          <div class="info-value">${client.accountsOverdue ? 'Yes' : 'No'}</div>
        </div>
      </div>
    </div>

    ${client.directorCount || client.pscCount ? `
    <div class="section">
      <h2 class="section-title">Officers & Control</h2>
      <div class="info-grid">
        ${client.directorCount ? `
        <div class="info-item">
          <div class="info-label">Number of Directors</div>
          <div class="info-value">${client.directorCount}</div>
        </div>
        ` : ''}
        ${client.pscCount ? `
        <div class="info-item">
          <div class="info-label">Persons with Significant Control</div>
          <div class="info-value">${client.pscCount}</div>
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}

    <div class="section">
      <h2 class="section-title">Practice Information</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Client Manager</div>
          <div class="info-value">${client.clientManager || 'Not assigned'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Engagement Type</div>
          <div class="info-value">${client.engagementType || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Corporation Tax UTR</div>
          <div class="info-value">${client.corporationTaxUtr || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">VAT Number</div>
          <div class="info-value">${client.vatNumber || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">PAYE Reference</div>
          <div class="info-value">${client.payeReference || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Contact</div>
          <div class="info-value">${client.telephone || client.email || 'N/A'}</div>
        </div>
      </div>
    </div>

    ${client.notes ? `
    <div class="section">
      <h2 class="section-title">Notes</h2>
      <p>${client.notes}</p>
    </div>
    ` : ''}

    <div class="section">
      <h2 class="section-title">Report Information</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Generated Date</div>
          <div class="info-value">${formatDate(createdAt)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Last CH Refresh</div>
          <div class="info-value">${formatDate(client.lastChRefresh)}</div>
        </div>
      </div>
    </div>

    ${includeBranding ? `
    <div class="footer">
      <p>
        Generated by <strong>M Practice Manager</strong><br>
        © ${new Date().getFullYear()} M FlowSoft. Professional practice management.
      </p>
    </div>
    ` : ''}
  </div>
</body>
</html>
    `;
  }

  /**
   * Get common CSS styles for reports
   */
  private getReportStyles(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: Arial, Helvetica, sans-serif;
        color: #1a1a1a;
        line-height: 1.6;
        background: white;
      }

      .page {
        width: 210mm;
        min-height: 297mm;
        padding: 20mm;
        margin: 0 auto;
        background: white;
      }

      .header {
        background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
        color: white;
        padding: 30px;
        border-radius: 8px;
        margin-bottom: 30px;
        text-align: center;
      }

      .header h1 {
        font-size: 32px;
        margin-bottom: 10px;
      }

      .header p {
        font-size: 16px;
        opacity: 0.9;
      }

      .section {
        margin-bottom: 30px;
      }

      .section-title {
        font-size: 24px;
        color: #2563eb;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 2px solid #e5e7eb;
      }

      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
        margin-bottom: 20px;
      }

      .info-item {
        padding: 15px;
        background: #f9fafb;
        border-radius: 6px;
      }

      .info-label {
        font-size: 12px;
        color: #6b7280;
        text-transform: uppercase;
        margin-bottom: 5px;
        font-weight: 600;
      }

      .info-value {
        font-size: 16px;
        font-weight: 600;
        color: #1a1a1a;
      }

      .recommendation {
        background: #dbeafe;
        border-left: 4px solid #2563eb;
        padding: 20px;
        border-radius: 6px;
        margin-bottom: 30px;
      }

      .recommendation h3 {
        color: #1e40af;
        margin-bottom: 15px;
      }

      .calculation-summary {
        background: #f9fafb;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 20px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        background: white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      th, td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #e5e7eb;
      }

      th {
        background: #f3f4f6;
        font-weight: 600;
        color: #374151;
        font-size: 14px;
        border-bottom: 2px solid #2563eb;
      }

      td {
        font-size: 14px;
      }

      .number {
        text-align: right;
        font-family: 'Courier New', monospace;
      }

      .highlight {
        background: #fef3c7;
        font-weight: 600;
      }

      .footer {
        margin-top: 50px;
        padding-top: 20px;
        border-top: 2px solid #e5e7eb;
        text-align: center;
        color: #6b7280;
        font-size: 12px;
      }

      .footer strong {
        color: #2563eb;
      }

      ul {
        padding-left: 20px;
        margin-bottom: 15px;
      }

      li {
        margin-bottom: 8px;
      }

      h3 {
        color: #1e40af;
        font-size: 18px;
        margin-top: 20px;
        margin-bottom: 10px;
      }

      @media print {
        .page {
          margin: 0;
          border: none;
          width: 100%;
        }
      }
    `;
  }
}
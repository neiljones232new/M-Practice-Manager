import { Injectable, Logger } from '@nestjs/common';
import { FileStorageService } from '../file-storage/file-storage.service';
import { ClientsService } from '../clients/clients.service';
import { ServicesService } from '../services/services.service';
import { CompaniesHouseService } from '../companies-house/companies-house.service';
import { TaxCalculationsService } from '../tax-calculations/tax-calculations.service';
import * as PdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import * as Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';

// Initialize pdfmake with fonts
(PdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs || pdfFonts;

export interface ReportOptions {
  clientId: string;
  includeCompaniesHouseData?: boolean;
  includeServices?: boolean;
  includeParties?: boolean;
  includeDocuments?: boolean;
  includeTaxCalculations?: boolean;
  includeComplianceAlerts?: boolean;
  customSections?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface ClientReportData {
  client: any;
  parties: any[];
  services: any[];
  documents: any[];
  companiesHouseData?: any;
  filingHistory?: any[];
  officers?: any[];
  taxCalculations?: any[];
  complianceAlerts?: any[];
}

// Template data interfaces for Handlebars rendering
export interface ServiceData {
  name: string;
  frequency: string;
  fee: string;
  nextDue: string;
  status: string;
}

export interface TaskData {
  title: string;
  status: string;
  due: string;
}

export interface FilingData {
  date: string;
  type: string;
  description: string;
}

export interface DocumentData {
  filename: string;
  category: string;
  uploadedAt: string;
}

export interface TemplateData {
  // Header data
  companyName: string;
  clientRef: string;
  generatedDate: string;
  
  // Company overview
  companyNumber: string;
  companyType: string;
  portfolio: string;
  status: string;
  utr: string;
  incorporationDate: string;
  lastAccountsDate: string;
  nextAccountsDate: string;
  lastCSDate: string;
  nextCSDate: string;
  email: string;
  phone: string;
  address: string;
  
  // Contacts
  mainContact: string;
  responsibleManager: string;
  parties: string;
  
  // Collections
  services: ServiceData[];
  tasks: TaskData[];
  filings: FilingData[];
  documents: DocumentData[];
  
  // Companies House
  directors: string;
  psc: string;
  
  // Compliance
  amlReviewDate: string;
  engagementStatus: string;
  renewalDate: string;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor(
    private fileStorageService: FileStorageService,
    private clientsService: ClientsService,
    private servicesService: ServicesService,
    private companiesHouseService: CompaniesHouseService,
    private taxCalculationsService: TaxCalculationsService
  ) {
    this.registerHandlebarsHelpers();
  }

  /**
   * Register custom Handlebars helpers for template rendering.
   * Helpers include formatCurrency, formatDate, and defaultValue for consistent data formatting.
   * @private
   */
  private registerHandlebarsHelpers(): void {
    // Format currency values with £ symbol
    Handlebars.registerHelper('formatCurrency', (value: number | string) => {
      if (value === null || value === undefined || value === '') return '£0';
      const normalized = typeof value === 'string' ? value.replace(/,/g, '').trim() : value;
      const num = typeof normalized === 'number' ? normalized : Number(normalized);
      if (!Number.isFinite(num)) return '£0';
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.abs(num));
    });

    // Short currency helper
    Handlebars.registerHelper('currency', (value: number) => {
      if (value === null || value === undefined) return 'N/A';
      return `£${value.toLocaleString()}`;
    });

    // Format dates to DD/MM/YYYY format
    Handlebars.registerHelper('formatDate', (date: string | Date, format?: string) => {
      if (!date) return 'N/A';
      try {
        const d = new Date(date);
        if (format === 'DD MMMM YYYY') {
          return d.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
          });
        }
        if (format === 'DD/MM/YY') {
          return d.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: '2-digit', 
            year: '2-digit' 
          });
        }
        if (format === 'YYYY') {
          return d.getFullYear().toString();
        }
        return d.toLocaleDateString('en-GB');
      } catch (error) {
        return 'N/A';
      }
    });

    // Today's date
    Handlebars.registerHelper('today', () => {
      return new Date();
    });

    // Add days/months/years to a date
    Handlebars.registerHelper('add', (date: Date, amount: number, unit: string) => {
      const d = new Date(date);
      if (unit === 'year' || unit === 'years') {
        d.setFullYear(d.getFullYear() + amount);
      } else if (unit === 'month' || unit === 'months') {
        d.setMonth(d.getMonth() + amount);
      } else if (unit === 'day' || unit === 'days') {
        d.setDate(d.getDate() + amount);
      }
      return d;
    });

    // Calculate annual total from services
    Handlebars.registerHelper('calculateAnnualTotal', (services: any[]) => {
      if (!Array.isArray(services)) return 0;
      return services.reduce((total, service) => total + (service.fee || 0), 0);
    });

    // Get first item from array
    Handlebars.registerHelper('first', (array: any[]) => {
      return Array.isArray(array) && array.length > 0 ? array[0] : null;
    });

    // Get length of array
    Handlebars.registerHelper('length', (array: any[]) => {
      return Array.isArray(array) ? array.length : 0;
    });

    // Join array with separator
    Handlebars.registerHelper('join', (array: any[], separator: string = ', ') => {
      return Array.isArray(array) ? array.join(separator) : '';
    });

    // Lowercase helper
    Handlebars.registerHelper('lowercase', (str: string) => {
      return typeof str === 'string' ? str.toLowerCase() : str;
    });

    // Conditional helpers
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    Handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    Handlebars.registerHelper('lt', (a: any, b: any) => a < b);
    Handlebars.registerHelper('gt', (a: any, b: any) => a > b);

    // Provide default value for null/undefined
    Handlebars.registerHelper('defaultValue', (value: any, defaultVal: string) => {
      return value || defaultVal;
    });
  }

  /**
   * Load and compile a Handlebars template with caching.
   * Templates are loaded from the templates directory and cached for performance.
   * @param templateName - Name of the template file (without .hbs extension)
   * @returns Compiled Handlebars template delegate
   * @throws {Error} If template file cannot be found or loaded
   * @private
   * @example
   * const template = await this.loadTemplate('client-report');
   */
  private async loadTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
    // Check cache first
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName);
    }

    try {
      // Try dist path first, then fall back to src path for development
      let templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
      this.logger.debug(`Loading template from: ${templatePath}`);
      
      let templateContent: string;
      try {
        templateContent = await fs.readFile(templatePath, 'utf-8');
      } catch (distError) {
        // Fall back to source path in development
        // __dirname in dist is: /path/to/apps/api/dist/src/modules/documents
        // process.cwd() is: /path/to (project root)
        // We need: /path/to/apps/api/src/modules/documents/templates
        const srcPath = path.join(process.cwd(), 'src', 'modules', 'documents', 'templates', `${templateName}.hbs`);
        this.logger.debug(`Template not found in dist, trying source: ${srcPath}`);
        templateContent = await fs.readFile(srcPath, 'utf-8');
      }
      
      const compiled = Handlebars.compile(templateContent);
      
      // Cache the compiled template
      this.templateCache.set(templateName, compiled);
      this.logger.debug(`Template ${templateName} loaded and cached successfully`);
      
      return compiled;
    } catch (error) {
      this.logger.error(`Failed to load template ${templateName}:`, error);
      throw new Error(`Template not found: ${templateName}`);
    }
  }

  /**
   * Generate a client report as HTML using Handlebars templates.
   * This method gathers client data, transforms it for template rendering,
   * and returns a fully styled HTML document ready for browser display or PDF conversion.
   * 
   * @param options - Report generation options including clientId and feature flags
   * @param options.clientId - The ID of the client to generate the report for
   * @param options.includeCompaniesHouseData - Include Companies House data (default: false)
   * @param options.includeServices - Include services section (default: false)
   * @param options.includeParties - Include parties section (default: false)
   * @param options.includeDocuments - Include documents section (default: false)
   * @returns HTML string containing the complete report
   * @throws {Error} If client data cannot be retrieved or template rendering fails
   * @public
   * @example
   * const html = await reportsService.generateClientReportHTML({
   *   clientId: 'client-123',
   *   includeCompaniesHouseData: true,
   *   includeServices: true
   * });
   */
  async generateClientReportHTML(options: ReportOptions): Promise<string> {
    try {
      this.logger.log(`Generating HTML report for client: ${options.clientId}`);
      
      // Gather all data for the report
      const reportData = await this.gatherReportData(options);
      
      // Transform data to template format
      const templateData = this.transformDataForTemplate(reportData);
      
      // Load and render template
      const template = await this.loadTemplate('client-report');
      const html = template(templateData);
      
      this.logger.log(`HTML report generated successfully for client: ${options.clientId}`);
      return html;
    } catch (error) {
      this.logger.error('Failed to generate HTML client report:', error);
      throw error;
    }
  }

  /**
   * Generate a client report as PDF by converting HTML template to PDF using Puppeteer.
   * This method first generates HTML using generateClientReportHTML(), then uses
   * headless Chrome to render and convert it to a high-quality PDF document.
   * 
   * @param options - Report generation options (same as generateClientReportHTML)
   * @param options.clientId - The ID of the client to generate the report for
   * @param options.includeCompaniesHouseData - Include Companies House data (default: false)
   * @param options.includeServices - Include services section (default: false)
   * @param options.includeParties - Include parties section (default: false)
   * @param options.includeDocuments - Include documents section (default: false)
   * @returns PDF buffer ready for download or storage
   * @throws {Error} If HTML generation fails or PDF conversion fails
   * @public
   * @example
   * const pdfBuffer = await reportsService.generateClientReportPDF({
   *   clientId: 'client-123',
   *   includeCompaniesHouseData: true,
   *   includeServices: true
   * });
   * // Save to file or send as response
   * fs.writeFileSync('report.pdf', pdfBuffer);
   */
  async generateClientReportPDF(options: ReportOptions): Promise<Buffer> {
    let browser = null;
    try {
      this.logger.log(`Generating PDF report for client: ${options.clientId}`);
      
      // Generate HTML first
      const html = await this.generateClientReportHTML(options);
      
      if (!html || html.length === 0) {
        throw new Error('Generated HTML is empty');
      }
      
      this.logger.debug(`HTML generated, length: ${html.length} characters`);
      
      // Lazy load puppeteer
      const puppeteer = await import('puppeteer');
      
      // Launch browser with appropriate settings
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set viewport for consistent rendering
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 1
      });
      
      // Load HTML content
      this.logger.debug('Loading HTML content into page...');
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      // Generate PDF with configured options
      this.logger.debug('Generating PDF from page...');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: false,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });
      
      // Ensure we have a valid buffer
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('Generated PDF buffer is empty');
      }
      
      this.logger.log(`PDF report generated successfully for client: ${options.clientId}, size: ${pdfBuffer.length} bytes`);
      
      // Return as Buffer (pdfBuffer is already a Uint8Array/Buffer)
      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error('Failed to generate PDF from HTML:', error);
      this.logger.error('Error stack:', error.stack);
      throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
      // Always close browser
      if (browser) {
        try {
          await browser.close();
          this.logger.debug('Browser closed successfully');
        } catch (closeError) {
          this.logger.warn('Error closing browser:', closeError);
        }
      }
    }
  }

  async generateClientReport(options: ReportOptions): Promise<Buffer> {
    try {
      // Gather all data for the report
      const reportData = await this.gatherReportData(options);
      
      // Create PDF document definition
      const docDefinition = this.createClientReportDefinition(reportData, options);
      
      // Generate PDF
      const pdfDoc = PdfMake.createPdf(docDefinition);
      
      return new Promise((resolve, reject) => {
        pdfDoc.getBuffer((buffer) => {
          if (buffer) {
            resolve(buffer);
          } else {
            reject(new Error('Failed to generate PDF buffer'));
          }
        });
      });
    } catch (error) {
      this.logger.error('Failed to generate client report:', error);
      throw error;
    }
  }

  private async gatherReportData(options: ReportOptions): Promise<ClientReportData> {
    const reportData: ClientReportData = {
      client: null,
      parties: [],
      services: [],
      documents: [],
      taxCalculations: [],
      complianceAlerts: []
    };

    try {
      // Get client data
      reportData.client = await this.clientsService.getClientWithParties(options.clientId);
      
      if (options.includeParties && reportData.client) {
        reportData.parties = reportData.client.parties || [];
      }

      // Get services
      if (options.includeServices) {
        reportData.services = await this.servicesService.getServicesByClient(options.clientId);
      }

      // Get documents
      if (options.includeDocuments) {
        const documentsResponse = await this.fileStorageService.searchFiles<any>(
          'documents/metadata',
          (doc) => doc.clientId === options.clientId
        );
        reportData.documents = documentsResponse;
      }

      // Get tax calculations
      if (options.includeTaxCalculations) {
        try {
          reportData.taxCalculations = await this.taxCalculationsService.getClientCalculations(options.clientId, 5);
        } catch (error) {
          this.logger.warn(`Failed to fetch tax calculations for client ${options.clientId}:`, error);
          reportData.taxCalculations = [];
        }
      }

      // Get Companies House data and compliance alerts
      if (options.includeCompaniesHouseData && reportData.client?.registeredNumber) {
        try {
          reportData.companiesHouseData = await this.companiesHouseService.getCompanyDetails(
            reportData.client.registeredNumber
          );
          
          reportData.officers = await this.companiesHouseService.getCompanyOfficers(
            reportData.client.registeredNumber
          );
          
          const filingHistory = await this.companiesHouseService.getFilingHistory(
            reportData.client.registeredNumber
          );
          reportData.filingHistory = filingHistory?.items || [];

          // Generate compliance alerts if requested
          if (options.includeComplianceAlerts) {
            reportData.complianceAlerts = await this.generateComplianceAlerts(
              reportData.client,
              reportData.companiesHouseData
            );
          }
        } catch (error) {
          this.logger.warn(`Failed to fetch Companies House data for ${reportData.client.registeredNumber}:`, error);
        }
      }

      return reportData;
    } catch (error) {
      this.logger.error('Failed to gather report data:', error);
      throw error;
    }
  }

  private createClientReportDefinition(data: ClientReportData, options: ReportOptions): TDocumentDefinitions {
    const content: Content[] = [];

    // Header
    content.push(this.createReportHeader(data.client));
    
    // Client Information Section
    content.push(this.createClientInfoSection(data.client));

    // Parties Section
    if (options.includeParties && data.parties.length > 0) {
      content.push(this.createPartiesSection(data.parties));
    }

    // Services Section
    if (options.includeServices && data.services.length > 0) {
      content.push(this.createServicesSection(data.services));
    }

    // Companies House Section
    if (options.includeCompaniesHouseData && data.companiesHouseData) {
      content.push(this.createCompaniesHouseSection(data.companiesHouseData, data.officers, data.filingHistory));
    }

    // Documents Section
    if (options.includeDocuments && data.documents.length > 0) {
      content.push(this.createDocumentsSection(data.documents));
    }

    // Footer
    content.push(this.createReportFooter());

    return {
      content,
      styles: this.getReportStyles(),
      defaultStyle: {
        fontSize: 10,
        font: 'Helvetica'
      },
      pageMargins: [40, 60, 40, 60],
      header: (currentPage, pageCount) => {
        return {
          text: `MDJ Practice Manager - Client Report | Page ${currentPage} of ${pageCount}`,
          alignment: 'center',
          fontSize: 8,
          color: '#666666',
          margin: [0, 20, 0, 0]
        };
      },
      footer: (currentPage, pageCount) => {
        return {
          text: `Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`,
          alignment: 'center',
          fontSize: 8,
          color: '#666666',
          margin: [0, 0, 0, 20]
        };
      }
    };
  }

  private createReportHeader(client: any): Content {
    return {
      columns: [
        {
          width: '*',
          stack: [
            {
              text: 'MDJ PRACTICE MANAGER',
              style: 'companyHeader',
              color: '#f0c84b'
            },
            {
              text: 'Client Report',
              style: 'reportTitle'
            },
            {
              text: client?.name || 'Unknown Client',
              style: 'clientName'
            }
          ]
        },
        {
          width: 'auto',
          stack: [
            {
              text: `Reference: ${client?.ref || 'N/A'}`,
              style: 'headerInfo'
            },
            {
              text: `Type: ${client?.type || 'N/A'}`,
              style: 'headerInfo'
            },
            {
              text: `Status: ${client?.status || 'N/A'}`,
              style: 'headerInfo'
            }
          ]
        }
      ],
      margin: [0, 0, 0, 20]
    };
  }

  private createClientInfoSection(client: any): Content {
    const clientInfo: TableCell[][] = [
      [
        { text: 'Client Reference', style: 'tableHeader' },
        { text: client?.ref || 'N/A', style: 'tableCell' }
      ],
      [
        { text: 'Company Name', style: 'tableHeader' },
        { text: client?.name || 'N/A', style: 'tableCell' }
      ],
      [
        { text: 'Type', style: 'tableHeader' },
        { text: client?.type || 'N/A', style: 'tableCell' }
      ],
      [
        { text: 'Status', style: 'tableHeader' },
        { text: client?.status || 'N/A', style: 'tableCell' }
      ],
      [
        { text: 'Portfolio', style: 'tableHeader' },
        { text: client?.portfolioCode ? `Portfolio ${client.portfolioCode}` : 'N/A', style: 'tableCell' }
      ]
    ];

    if (client?.registeredNumber) {
      clientInfo.push([
        { text: 'Companies House Number', style: 'tableHeader' },
        { text: client.registeredNumber, style: 'tableCell' }
      ]);
    }

    if (client?.mainEmail) {
      clientInfo.push([
        { text: 'Email', style: 'tableHeader' },
        { text: client.mainEmail, style: 'tableCell' }
      ]);
    }

    if (client?.mainPhone) {
      clientInfo.push([
        { text: 'Phone', style: 'tableHeader' },
        { text: client.mainPhone, style: 'tableCell' }
      ]);
    }

    if (client?.address) {
      const addressText = [
        client.address.line1,
        client.address.line2,
        client.address.city,
        client.address.county,
        client.address.postcode,
        client.address.country
      ].filter(Boolean).join(', ');

      clientInfo.push([
        { text: 'Address', style: 'tableHeader' },
        { text: addressText || 'N/A', style: 'tableCell' }
      ]);
    }

    return {
      stack: [
        { text: 'Client Information', style: 'sectionHeader' },
        {
          table: {
            widths: ['30%', '70%'],
            body: clientInfo
          },
          layout: 'lightHorizontalLines'
        }
      ],
      margin: [0, 0, 0, 15]
    };
  }

  private createPartiesSection(parties: any[]): Content {
    const partiesTable: TableCell[][] = [
      [
        { text: 'Name', style: 'tableHeader' },
        { text: 'Role', style: 'tableHeader' },
        { text: 'Ownership %', style: 'tableHeader' },
        { text: 'Appointed', style: 'tableHeader' },
        { text: 'Status', style: 'tableHeader' }
      ]
    ];

    parties.forEach(party => {
      partiesTable.push([
        { text: party.person?.name || 'N/A', style: 'tableCell' },
        { text: party.role || 'N/A', style: 'tableCell' },
        { text: party.ownershipPercent ? `${party.ownershipPercent}%` : 'N/A', style: 'tableCell' },
        { text: party.appointedAt ? new Date(party.appointedAt).toLocaleDateString('en-GB') : 'N/A', style: 'tableCell' },
        { text: party.resignedAt ? 'Resigned' : 'Active', style: 'tableCell' }
      ]);
    });

    return {
      stack: [
        { text: 'Associated Parties', style: 'sectionHeader' },
        {
          table: {
            widths: ['25%', '20%', '15%', '20%', '20%'],
            body: partiesTable
          },
          layout: 'lightHorizontalLines'
        }
      ],
      margin: [0, 0, 0, 15]
    };
  }

  private createServicesSection(services: any[]): Content {
    const servicesTable: TableCell[][] = [
      [
        { text: 'Service', style: 'tableHeader' },
        { text: 'Frequency', style: 'tableHeader' },
        { text: 'Fee', style: 'tableHeader' },
        { text: 'Annual Value', style: 'tableHeader' },
        { text: 'Status', style: 'tableHeader' },
        { text: 'Next Due', style: 'tableHeader' }
      ]
    ];

    let totalAnnualValue = 0;

    services.forEach(service => {
      const annualValue = service.annualized || 0;
      totalAnnualValue += annualValue;

      servicesTable.push([
        { text: service.kind || 'N/A', style: 'tableCell' },
        { text: service.frequency || 'N/A', style: 'tableCell' },
        { text: service.fee ? `£${service.fee.toFixed(2)}` : 'N/A', style: 'tableCell' },
        { text: `£${annualValue.toFixed(2)}`, style: 'tableCell' },
        { text: service.status || 'N/A', style: 'tableCell' },
        { text: service.nextDue ? new Date(service.nextDue).toLocaleDateString('en-GB') : 'N/A', style: 'tableCell' }
      ]);
    });

    // Add total row
    servicesTable.push([
      { text: 'TOTAL', style: 'tableTotalHeader', colSpan: 3 },
      {},
      {},
      { text: `£${totalAnnualValue.toFixed(2)}`, style: 'tableTotalCell' },
      { text: '', style: 'tableCell' },
      { text: '', style: 'tableCell' }
    ]);

    return {
      stack: [
        { text: 'Services', style: 'sectionHeader' },
        {
          table: {
            widths: ['20%', '15%', '15%', '15%', '15%', '20%'],
            body: servicesTable
          },
          layout: 'lightHorizontalLines'
        }
      ],
      margin: [0, 0, 0, 15]
    };
  }

  private createCompaniesHouseSection(companyData: any, officers: any[], filingHistory: any[]): Content {
    const content: Content[] = [
      { text: 'Companies House Information', style: 'sectionHeader' }
    ];

    // Company details
    const companyInfo: TableCell[][] = [
      [
        { text: 'Company Number', style: 'tableHeader' },
        { text: companyData.company_number || 'N/A', style: 'tableCell' }
      ],
      [
        { text: 'Company Status', style: 'tableHeader' },
        { text: companyData.company_status || 'N/A', style: 'tableCell' }
      ],
      [
        { text: 'Incorporation Date', style: 'tableHeader' },
        { text: companyData.date_of_creation ? new Date(companyData.date_of_creation).toLocaleDateString('en-GB') : 'N/A', style: 'tableCell' }
      ],
      [
        { text: 'SIC Codes', style: 'tableHeader' },
        { text: companyData.sic_codes ? companyData.sic_codes.join(', ') : 'N/A', style: 'tableCell' }
      ]
    ];

    content.push({
      table: {
        widths: ['30%', '70%'],
        body: companyInfo
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 10]
    });

    // Officers
    if (officers && officers.length > 0) {
      content.push({ text: 'Current Officers', style: 'subsectionHeader' });
      
      const officersTable: TableCell[][] = [
        [
          { text: 'Name', style: 'tableHeader' },
          { text: 'Role', style: 'tableHeader' },
          { text: 'Appointed', style: 'tableHeader' },
          { text: 'Nationality', style: 'tableHeader' }
        ]
      ];

      officers.slice(0, 10).forEach(officer => { // Limit to 10 officers
        officersTable.push([
          { text: officer.name || 'N/A', style: 'tableCell' },
          { text: officer.officer_role || 'N/A', style: 'tableCell' },
          { text: officer.appointed_on ? new Date(officer.appointed_on).toLocaleDateString('en-GB') : 'N/A', style: 'tableCell' },
          { text: officer.nationality || 'N/A', style: 'tableCell' }
        ]);
      });

      content.push({
        table: {
          widths: ['30%', '25%', '20%', '25%'],
          body: officersTable
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 10]
      });
    }

    // Recent filings
    if (filingHistory && filingHistory.length > 0) {
      content.push({ text: 'Recent Filings', style: 'subsectionHeader' });
      
      const filingsTable: TableCell[][] = [
        [
          { text: 'Description', style: 'tableHeader' },
          { text: 'Date', style: 'tableHeader' },
          { text: 'Category', style: 'tableHeader' }
        ]
      ];

      filingHistory.slice(0, 5).forEach(filing => { // Limit to 5 recent filings
        filingsTable.push([
          { text: filing.description || 'N/A', style: 'tableCell' },
          { text: filing.date ? new Date(filing.date).toLocaleDateString('en-GB') : 'N/A', style: 'tableCell' },
          { text: filing.category || 'N/A', style: 'tableCell' }
        ]);
      });

      content.push({
        table: {
          widths: ['50%', '25%', '25%'],
          body: filingsTable
        },
        layout: 'lightHorizontalLines'
      });
    }

    return {
      stack: content,
      margin: [0, 0, 0, 15]
    };
  }

  private createDocumentsSection(documents: any[]): Content {
    const documentsTable: TableCell[][] = [
      [
        { text: 'Document Name', style: 'tableHeader' },
        { text: 'Category', style: 'tableHeader' },
        { text: 'Size', style: 'tableHeader' },
        { text: 'Uploaded', style: 'tableHeader' },
        { text: 'Tags', style: 'tableHeader' }
      ]
    ];

    documents.slice(0, 20).forEach(doc => { // Limit to 20 documents
      documentsTable.push([
        { text: doc.originalName || 'N/A', style: 'tableCell' },
        { text: doc.category || 'N/A', style: 'tableCell' },
        { text: this.formatFileSize(doc.size || 0), style: 'tableCell' },
        { text: doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-GB') : 'N/A', style: 'tableCell' },
        { text: doc.tags ? doc.tags.slice(0, 3).join(', ') : 'N/A', style: 'tableCell' }
      ]);
    });

    return {
      stack: [
        { text: 'Documents', style: 'sectionHeader' },
        {
          table: {
            widths: ['30%', '15%', '15%', '20%', '20%'],
            body: documentsTable
          },
          layout: 'lightHorizontalLines'
        }
      ],
      margin: [0, 0, 0, 15]
    };
  }

  private createReportFooter(): Content {
    return {
      stack: [
        { text: '', margin: [0, 20, 0, 0] },
        {
          columns: [
            {
              width: '*',
              text: 'This report was generated by MDJ Practice Manager',
              style: 'footerText'
            },
            {
              width: 'auto',
              text: `Generated: ${new Date().toLocaleDateString('en-GB')}`,
              style: 'footerText'
            }
          ]
        }
      ]
    };
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private getReportStyles() {
    return {
      companyHeader: {
        fontSize: 18,
        bold: true,
        alignment: 'left' as const
      },
      reportTitle: {
        fontSize: 16,
        bold: true,
        color: '#333333',
        margin: [0, 5, 0, 0] as [number, number, number, number]
      },
      clientName: {
        fontSize: 14,
        bold: true,
        color: '#666666',
        margin: [0, 2, 0, 0] as [number, number, number, number]
      },
      headerInfo: {
        fontSize: 10,
        color: '#666666',
        alignment: 'right' as const
      },
      sectionHeader: {
        fontSize: 14,
        bold: true,
        color: '#333333',
        margin: [0, 10, 0, 5] as [number, number, number, number]
      },
      subsectionHeader: {
        fontSize: 12,
        bold: true,
        color: '#666666',
        margin: [0, 8, 0, 3] as [number, number, number, number]
      },
      tableHeader: {
        fontSize: 9,
        bold: true,
        fillColor: '#f5f5f5',
        color: '#333333',
        margin: [3, 3, 3, 3] as [number, number, number, number]
      },
      tableCell: {
        fontSize: 9,
        margin: [3, 3, 3, 3] as [number, number, number, number]
      },
      tableTotalHeader: {
        fontSize: 9,
        bold: true,
        fillColor: '#f0c84b',
        color: '#000000',
        margin: [3, 3, 3, 3] as [number, number, number, number]
      },
      tableTotalCell: {
        fontSize: 9,
        bold: true,
        fillColor: '#f0c84b',
        color: '#000000',
        margin: [3, 3, 3, 3] as [number, number, number, number]
      },
      footerText: {
        fontSize: 8,
        color: '#666666',
        italics: true
      }
    };
  }

  /**
   * Format date to DD/MM/YYYY format (UK date format).
   * Returns 'N/A' for null, undefined, or invalid dates.
   * 
   * @param date - Date to format (Date object, ISO string, or null/undefined)
   * @returns Formatted date string in DD/MM/YYYY format or 'N/A'
   * @private
   * @example
   * formatDate(new Date('2025-01-15')) // Returns '15/01/2025'
   * formatDate(null) // Returns 'N/A'
   */
  private formatDate(date: Date | string | null | undefined): string {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('en-GB');
    } catch (error) {
      return 'N/A';
    }
  }

  /**
   * Transform ClientReportData to flat TemplateData structure for Handlebars rendering.
   * This method flattens nested data structures, formats dates and currency values,
   * and provides sensible defaults for missing data.
   * 
   * @param reportData - Raw report data gathered from database and external APIs
   * @returns Flattened template data ready for Handlebars rendering
   * @throws {Error} If data transformation fails
   * @private
   * @example
   * const templateData = this.transformDataForTemplate(reportData);
   * // templateData contains all fields needed by the Handlebars template
   */
  private transformDataForTemplate(reportData: ClientReportData): TemplateData {
    try {
      const client = reportData.client || {};
      
      // Format address
      const address = client.address ? [
        client.address.line1,
        client.address.line2,
        client.address.city,
        client.address.county,
        client.address.postcode,
        client.address.country
      ].filter(Boolean).join(', ') : 'N/A';

      // Transform services
      const services: ServiceData[] = (reportData.services || []).map(service => ({
        name: service.kind || 'N/A',
        frequency: service.frequency || 'N/A',
        fee: service.fee ? `£${service.fee.toFixed(2)}` : 'N/A',
        nextDue: this.formatDate(service.nextDue),
        status: service.status || 'N/A'
      }));

      // Transform tasks (if available in report data)
      const tasks: TaskData[] = [];

      // Extract directors from officers
      const directors = (reportData.officers || [])
        .filter(officer => officer.officer_role?.toLowerCase().includes('director'))
        .map(officer => officer.name)
        .join(', ') || 'N/A';

      // Extract PSC from Companies House data
      const psc = reportData.companiesHouseData?.persons_with_significant_control 
        ? 'Available' 
        : 'N/A';

      // Transform filing history
      const filings: FilingData[] = (reportData.filingHistory || []).slice(0, 5).map(filing => ({
        date: this.formatDate(filing.date),
        type: filing.category || 'N/A',
        description: filing.description || 'N/A'
      }));

      // Transform documents
      const documents: DocumentData[] = (reportData.documents || []).map((doc: any) => ({
        filename: doc.originalName || doc.filename || 'N/A',
        category: doc.category || 'N/A',
        uploadedAt: this.formatDate(doc.uploadedAt),
      }));

      // Extract parties
      const parties = (reportData.parties || [])
        .map(party => party.person?.name || 'Unknown')
        .join(', ') || 'N/A';

      // Find main contact and responsible manager from parties
      const mainContactParty = (reportData.parties || []).find(p => p.role === 'Primary Contact');
      const managerParty = (reportData.parties || []).find(p => p.role === 'Responsible Manager');

      return {
        // Header data
        companyName: client.name || 'Unknown Company',
        clientRef: client.ref || 'N/A',
        generatedDate: this.formatDate(new Date()),
        
        // Company overview
        companyNumber: client.registeredNumber || 'N/A',
        companyType: client.type || 'N/A',
        portfolio: client.portfolioCode ? `Portfolio ${client.portfolioCode}` : 'N/A',
        status: client.status || 'N/A',
        utr: client.utrNumber || 'N/A',
        incorporationDate: this.formatDate(client.incorporationDate || reportData.companiesHouseData?.date_of_creation),
        lastAccountsDate: this.formatDate(client.accountsLastMadeUpTo),
        nextAccountsDate: this.formatDate(client.accountsNextDue),
        lastCSDate: this.formatDate(client.confirmationLastMadeUpTo),
        nextCSDate: this.formatDate(client.confirmationNextDue),
        email: client.mainEmail || 'N/A',
        phone: client.mainPhone || 'N/A',
        address,
        
        // Contacts
        mainContact: mainContactParty?.person?.name || 'N/A',
        responsibleManager: managerParty?.person?.name || 'N/A',
        parties,
        
        // Collections
        services,
        tasks,
        filings,
        documents,
        
        // Companies House
        directors,
        psc,
        
        // Compliance
        amlReviewDate: this.formatDate(client.amlReviewDate),
        engagementStatus: client.engagementLetterStatus || 'N/A',
        renewalDate: this.formatDate(client.engagementRenewalDate)
      };
    } catch (error) {
      this.logger.error('Failed to transform data for template:', error);
      throw new Error('Data transformation failed');
    }
  }

  /**
   * Generate compliance alerts based on client and Companies House data
   */
  private async generateComplianceAlerts(client: any, companiesHouseData: any): Promise<any[]> {
    const alerts: any[] = [];
    const now = new Date();

    try {
      // Check accounts filing status
      if (companiesHouseData?.accounts?.next_due) {
        const dueDate = new Date(companiesHouseData.accounts.next_due);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDue < 0) {
          alerts.push({
            id: `${client.id}-accounts-overdue`,
            title: 'Accounts Filing Overdue',
            description: `Accounts were due on ${dueDate.toLocaleDateString('en-GB')}`,
            dueDate: companiesHouseData.accounts.next_due,
            daysUntilDue,
            isOverdue: true,
            priority: 'HIGH',
            type: 'ACCOUNTS_OVERDUE'
          });
        } else if (daysUntilDue <= 30) {
          alerts.push({
            id: `${client.id}-accounts-due-soon`,
            title: 'Accounts Filing Due Soon',
            description: `Accounts due on ${dueDate.toLocaleDateString('en-GB')} (${daysUntilDue} days)`,
            dueDate: companiesHouseData.accounts.next_due,
            daysUntilDue,
            isOverdue: false,
            priority: daysUntilDue <= 7 ? 'HIGH' : 'MEDIUM',
            type: 'ACCOUNTS_DUE_SOON'
          });
        }
      }

      // Check confirmation statement status
      if (companiesHouseData?.confirmation_statement?.next_due) {
        const dueDate = new Date(companiesHouseData.confirmation_statement.next_due);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDue < 0) {
          alerts.push({
            id: `${client.id}-confirmation-overdue`,
            title: 'Confirmation Statement Overdue',
            description: `Confirmation statement was due on ${dueDate.toLocaleDateString('en-GB')}`,
            dueDate: companiesHouseData.confirmation_statement.next_due,
            daysUntilDue,
            isOverdue: true,
            priority: 'HIGH',
            type: 'CONFIRMATION_OVERDUE'
          });
        } else if (daysUntilDue <= 30) {
          alerts.push({
            id: `${client.id}-confirmation-due-soon`,
            title: 'Confirmation Statement Due Soon',
            description: `Confirmation statement due on ${dueDate.toLocaleDateString('en-GB')} (${daysUntilDue} days)`,
            dueDate: companiesHouseData.confirmation_statement.next_due,
            daysUntilDue,
            isOverdue: false,
            priority: daysUntilDue <= 7 ? 'HIGH' : 'MEDIUM',
            type: 'CONFIRMATION_DUE_SOON'
          });
        }
      }

      // Check company status
      if (companiesHouseData?.company_status && companiesHouseData.company_status !== 'active') {
        alerts.push({
          id: `${client.id}-company-status`,
          title: 'Company Status Alert',
          description: `Company status is "${companiesHouseData.company_status}" - this may require attention`,
          priority: 'MEDIUM',
          type: 'COMPANY_STATUS',
          isOverdue: false
        });
      }

      return alerts;
    } catch (error) {
      this.logger.error('Failed to generate compliance alerts:', error);
      return [];
    }
  }

  /**
   * Generate a comprehensive client report with all available data
   */
  async generateComprehensiveClientReport(clientId: string): Promise<string> {
    return this.generateClientReportHTML({
      clientId,
      includeCompaniesHouseData: true,
      includeServices: true,
      includeParties: true,
      includeDocuments: true,
      includeTaxCalculations: true,
      includeComplianceAlerts: true
    });
  }

  /**
   * Generate a comprehensive client report as PDF
   */
  async generateComprehensiveClientReportPDF(clientId: string): Promise<Buffer> {
    return this.generateClientReportPDF({
      clientId,
      includeCompaniesHouseData: true,
      includeServices: true,
      includeParties: true,
      includeDocuments: true,
      includeTaxCalculations: true,
      includeComplianceAlerts: true
    });
  }
}

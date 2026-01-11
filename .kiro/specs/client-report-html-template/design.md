# Design Document: HTML Template-Based Client Report System

## Overview

This design transforms the client report generation system from a PDF-first approach using pdfmake to an HTML-first approach using Handlebars templates. The new system will generate beautifully styled HTML reports that can be viewed directly in browsers and optionally converted to PDF using Puppeteer for high-fidelity rendering.

The design maintains backward compatibility with existing API endpoints while introducing new HTML preview capabilities and improved visual presentation.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Documents Controller                      │
│  - GET /reports/client/:id/preview (HTML)                   │
│  - GET /reports/client/:id/html (new)                       │
│  - POST /reports/client/:id (PDF download)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     Reports Service                          │
│  - generateClientReportHTML()                               │
│  - generateClientReportPDF()                                │
│  - gatherReportData()                                       │
│  - renderTemplate()                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────┐ ┌─────────────┐
│  Template    │ │ Puppeteer│ │  Data       │
│  Engine      │ │ (PDF)    │ │  Services   │
│ (Handlebars) │ │          │ │             │
└──────────────┘ └──────────┘ └─────────────┘
```

### Component Interaction Flow

1. **Request Phase**: Controller receives report request with options
2. **Data Gathering Phase**: Reports Service collects data from multiple sources
3. **Template Rendering Phase**: Handlebars populates HTML template with data
4. **Output Phase**: 
   - For HTML: Return rendered HTML directly
   - For PDF: Pass HTML to Puppeteer for conversion

## Components and Interfaces

### 1. HTML Template File

**Location**: `apps/api/src/modules/documents/templates/client-report.hbs`

**Structure**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MDJ Company Report</title>
  <style>
    /* Embedded CSS for self-contained template */
    /* Includes all styling from requirements */
  </style>
</head>
<body>
  <header>
    <!-- Fixed header with logo and practice info -->
  </header>
  
  <main>
    <!-- Dynamic sections populated by Handlebars -->
  </main>
  
  <footer>
    <!-- Fixed footer with signature -->
  </footer>
</body>
</html>
```

**Template Variables**:
- `{{companyName}}` - Client company name
- `{{clientRef}}` - Client reference code
- `{{generatedDate}}` - Report generation date
- `{{companyNumber}}` - Companies House number
- `{{companyType}}` - Company type
- `{{portfolio}}` - Portfolio code
- `{{status}}` - Client status
- `{{utr}}` - Unique Taxpayer Reference
- `{{incorporationDate}}` - Date of incorporation
- `{{lastAccountsDate}}` - Last accounts filing date
- `{{nextAccountsDate}}` - Next accounts due date
- `{{lastCSDate}}` - Last confirmation statement date
- `{{nextCSDate}}` - Next confirmation statement date
- `{{email}}` - Client email
- `{{phone}}` - Client phone
- `{{address}}` - Formatted address string
- `{{mainContact}}` - Primary contact name
- `{{responsibleManager}}` - Assigned manager name
- `{{parties}}` - Comma-separated list of other parties
- `{{#each services}}` - Iteration over services array
- `{{#each tasks}}` - Iteration over tasks array
- `{{directors}}` - Comma-separated directors list
- `{{psc}}` - Persons with significant control
- `{{#each filings}}` - Iteration over filing history
- `{{amlReviewDate}}` - AML review date
- `{{engagementStatus}}` - Engagement letter status
- `{{renewalDate}}` - Engagement renewal date

### 2. Updated Reports Service

**File**: `apps/api/src/modules/documents/reports.service.ts`

**New Methods**:

```typescript
interface TemplateData {
  companyName: string;
  clientRef: string;
  generatedDate: string;
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
  mainContact: string;
  responsibleManager: string;
  parties: string;
  services: ServiceData[];
  tasks: TaskData[];
  directors: string;
  psc: string;
  filings: FilingData[];
  amlReviewDate: string;
  engagementStatus: string;
  renewalDate: string;
}

interface ServiceData {
  name: string;
  frequency: string;
  fee: string;
  nextDue: string;
  status: string;
}

interface TaskData {
  title: string;
  status: string;
  due: string;
}

interface FilingData {
  date: string;
  type: string;
  description: string;
}

// New method for HTML generation
async generateClientReportHTML(options: ReportOptions): Promise<string>

// New method for PDF generation from HTML
async generateClientReportPDF(options: ReportOptions): Promise<Buffer>

// Helper method to transform data to template format
private transformDataForTemplate(reportData: ClientReportData): TemplateData

// Helper method to load and compile template
private loadTemplate(templateName: string): HandlebarsTemplateDelegate

// Helper method to format dates
private formatDate(date: Date | string | null): string
```

**Implementation Details**:

1. **Template Loading**:
   - Load template file from filesystem
   - Compile with Handlebars
   - Cache compiled template for performance
   - Handle missing template gracefully

2. **Data Transformation**:
   - Convert database models to flat template structure
   - Format dates to DD/MM/YYYY
   - Handle null/undefined values with "N/A"
   - Format currency values with £ symbol
   - Join array values into comma-separated strings where needed

3. **HTML Generation**:
   - Gather report data using existing `gatherReportData()`
   - Transform data to template format
   - Render template with Handlebars
   - Return HTML string

4. **PDF Generation**:
   - Generate HTML first
   - Launch Puppeteer browser instance
   - Load HTML content
   - Configure PDF options (A4, margins, print background)
   - Generate PDF buffer
   - Close browser
   - Return buffer

### 3. Updated Documents Controller

**File**: `apps/api/src/modules/documents/documents.controller.ts`

**New Endpoints**:

```typescript
@Get('reports/client/:clientId/html')
async getClientReportHTML(
  @Param('clientId') clientId: string,
  @Query() options: Partial<ReportOptions>,
  @Res() res: Response
): Promise<void>

// Update existing preview endpoint to return HTML
@Get('reports/client/:clientId/preview')
async previewClientReport(
  @Param('clientId') clientId: string,
  @Query() options: Partial<ReportOptions>,
  @Res() res: Response
): Promise<void>
```

**Updated Endpoints**:

```typescript
// Update to use new PDF generation method
@Post('reports/client/:clientId')
async generateClientReport(
  @Param('clientId') clientId: string,
  @Body() options: Partial<ReportOptions>,
  @Res() res: Response
): Promise<void>
```

### 4. Template Engine Integration

**Dependencies**:
- `handlebars` - Template engine
- `puppeteer` - HTML to PDF conversion
- `fs/promises` - Template file loading

**Handlebars Helpers**:

```typescript
// Register custom helpers
Handlebars.registerHelper('formatCurrency', (value: number) => {
  return `£${value.toFixed(2)}`;
});

Handlebars.registerHelper('formatDate', (date: string | Date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-GB');
});

Handlebars.registerHelper('defaultValue', (value: any, defaultVal: string) => {
  return value || defaultVal;
});
```

## Data Models

### ClientReportData (Existing)

No changes to existing interface. This remains the internal data structure.

### TemplateData (New)

Flat structure optimized for template rendering:

```typescript
interface TemplateData {
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
  
  // Companies House
  directors: string;
  psc: string;
  
  // Compliance
  amlReviewDate: string;
  engagementStatus: string;
  renewalDate: string;
}
```

## Error Handling

### Template Loading Errors

```typescript
try {
  const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
  const templateContent = await fs.readFile(templatePath, 'utf-8');
  return Handlebars.compile(templateContent);
} catch (error) {
  this.logger.error(`Failed to load template ${templateName}:`, error);
  throw new Error(`Template not found: ${templateName}`);
}
```

### PDF Generation Errors

```typescript
try {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
  });
  await browser.close();
  return pdfBuffer;
} catch (error) {
  this.logger.error('Failed to generate PDF:', error);
  throw new Error('PDF generation failed');
}
```

### Data Transformation Errors

```typescript
private transformDataForTemplate(reportData: ClientReportData): TemplateData {
  try {
    return {
      companyName: reportData.client?.name || 'Unknown Company',
      clientRef: reportData.client?.ref || 'N/A',
      generatedDate: this.formatDate(new Date()),
      // ... rest of transformation with safe fallbacks
    };
  } catch (error) {
    this.logger.error('Failed to transform data:', error);
    throw new Error('Data transformation failed');
  }
}
```

## Testing Strategy

### Unit Tests

**Template Rendering Tests**:
```typescript
describe('ReportsService - Template Rendering', () => {
  it('should load and compile template successfully', async () => {
    const template = await service['loadTemplate']('client-report');
    expect(template).toBeDefined();
  });

  it('should render template with valid data', async () => {
    const html = await service.generateClientReportHTML(mockOptions);
    expect(html).toContain('MDJ Consultants Ltd');
    expect(html).toContain(mockData.companyName);
  });

  it('should handle missing template gracefully', async () => {
    await expect(service['loadTemplate']('non-existent'))
      .rejects.toThrow('Template not found');
  });
});
```

**Data Transformation Tests**:
```typescript
describe('ReportsService - Data Transformation', () => {
  it('should transform client data correctly', () => {
    const templateData = service['transformDataForTemplate'](mockReportData);
    expect(templateData.companyName).toBe(mockReportData.client.name);
    expect(templateData.clientRef).toBe(mockReportData.client.ref);
  });

  it('should handle null values with defaults', () => {
    const templateData = service['transformDataForTemplate'](emptyReportData);
    expect(templateData.companyName).toBe('Unknown Company');
    expect(templateData.email).toBe('N/A');
  });

  it('should format dates correctly', () => {
    const formatted = service['formatDate'](new Date('2025-01-15'));
    expect(formatted).toBe('15/01/2025');
  });
});
```

**PDF Generation Tests**:
```typescript
describe('ReportsService - PDF Generation', () => {
  it('should generate PDF from HTML', async () => {
    const pdfBuffer = await service.generateClientReportPDF(mockOptions);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
  });

  it('should maintain styling in PDF output', async () => {
    const pdfBuffer = await service.generateClientReportPDF(mockOptions);
    // Verify PDF contains expected content
    expect(pdfBuffer.toString()).toContain('%PDF');
  });
});
```

### Integration Tests

**End-to-End Report Generation**:
```typescript
describe('Documents Controller - Client Reports (E2E)', () => {
  it('should generate HTML report via API', async () => {
    const response = await request(app.getHttpServer())
      .get('/documents/reports/client/test-client-1/html')
      .expect(200);
    
    expect(response.text).toContain('MDJ Consultants Ltd');
    expect(response.headers['content-type']).toContain('text/html');
  });

  it('should generate PDF report via API', async () => {
    const response = await request(app.getHttpServer())
      .post('/documents/reports/client/test-client-1')
      .send({ includeCompaniesHouseData: true })
      .expect(200);
    
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('should preview report in browser', async () => {
    const response = await request(app.getHttpServer())
      .get('/documents/reports/client/test-client-1/preview')
      .expect(200);
    
    expect(response.headers['content-disposition']).toContain('inline');
  });
});
```

### Visual Regression Tests

Use Puppeteer to capture screenshots and compare:

```typescript
describe('Report Visual Regression', () => {
  it('should match expected layout', async () => {
    const html = await service.generateClientReportHTML(mockOptions);
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);
    const screenshot = await page.screenshot();
    await browser.close();
    
    // Compare with baseline screenshot
    expect(screenshot).toMatchImageSnapshot();
  });
});
```

## Performance Considerations

### Template Caching

```typescript
private templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();

private async loadTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
  if (this.templateCache.has(templateName)) {
    return this.templateCache.get(templateName);
  }
  
  const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
  const templateContent = await fs.readFile(templatePath, 'utf-8');
  const compiled = Handlebars.compile(templateContent);
  
  this.templateCache.set(templateName, compiled);
  return compiled;
}
```

### Puppeteer Browser Pooling

For high-volume PDF generation, consider browser instance pooling:

```typescript
private browserPool: Browser[] = [];
private readonly MAX_POOL_SIZE = 3;

private async getBrowser(): Promise<Browser> {
  if (this.browserPool.length > 0) {
    return this.browserPool.pop();
  }
  return await puppeteer.launch({ headless: true });
}

private async releaseBrowser(browser: Browser): Promise<void> {
  if (this.browserPool.length < this.MAX_POOL_SIZE) {
    this.browserPool.push(browser);
  } else {
    await browser.close();
  }
}
```

### Lazy Loading

Only load Puppeteer when PDF generation is requested:

```typescript
async generateClientReportPDF(options: ReportOptions): Promise<Buffer> {
  const html = await this.generateClientReportHTML(options);
  
  // Lazy load puppeteer
  const puppeteer = await import('puppeteer');
  
  // Generate PDF
  // ...
}
```

## Migration Strategy

### Phase 1: Add HTML Generation (Non-Breaking)

1. Install dependencies (`handlebars`, `puppeteer`)
2. Create HTML template file
3. Add new methods to ReportsService
4. Add new HTML endpoint to controller
5. Test HTML generation independently

### Phase 2: Update PDF Generation

1. Modify existing PDF generation to use HTML template
2. Update tests to verify PDF output
3. Ensure backward compatibility with existing API

### Phase 3: Deprecation (Optional)

1. Mark old pdfmake-based methods as deprecated
2. Update documentation
3. Provide migration guide for any direct service consumers

## Security Considerations

### Template Injection Prevention

- Use Handlebars' built-in escaping for all variables
- Never use triple-brace syntax `{{{variable}}}` unless explicitly safe
- Sanitize any user-provided data before template rendering

### PDF Generation Security

- Run Puppeteer in sandbox mode
- Set resource limits (memory, CPU)
- Implement timeouts for PDF generation
- Validate HTML content before PDF conversion

### File System Access

- Restrict template directory access
- Validate template names to prevent path traversal
- Use absolute paths for template loading

## Deployment Considerations

### Dependencies

Add to `package.json`:
```json
{
  "dependencies": {
    "handlebars": "^4.7.8",
    "puppeteer": "^21.6.0"
  }
}
```

### Environment Variables

```env
# Optional: Custom template directory
REPORT_TEMPLATE_DIR=/path/to/templates

# Optional: Puppeteer configuration
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
PUPPETEER_SKIP_DOWNLOAD=true
```

### Docker Considerations

Update Dockerfile to include Chromium dependencies:

```dockerfile
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libnss3 \
    libxss1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*
```

## Future Enhancements

1. **Multiple Template Support**: Allow different templates for different report types
2. **Custom Branding**: Support client-specific logos and colors
3. **Interactive HTML Reports**: Add JavaScript for collapsible sections, charts
4. **Email Integration**: Send HTML reports directly via email
5. **Template Editor**: Admin UI for editing templates without code changes
6. **Localization**: Support multiple languages in templates
7. **Export Formats**: Add Word, Excel export options

# Client Reports API Documentation

## Overview

The Client Reports API provides endpoints for generating comprehensive client reports in both HTML and PDF formats. Reports include client information, services, parties, Companies House data, and compliance information.

The new report system uses HTML templates with Handlebars for flexible, maintainable report generation. HTML reports can be viewed directly in browsers or converted to PDF for download and archival.

## Architecture

### Report Generation Flow

```
Client Request
    ↓
Controller Endpoint
    ↓
Reports Service
    ↓
Data Gathering (Client, Services, Companies House, etc.)
    ↓
Data Transformation (Flatten & Format)
    ↓
Template Rendering (Handlebars)
    ↓
HTML Output → (Optional) PDF Conversion (Puppeteer)
    ↓
Response to Client
```

### Key Components

- **Handlebars Templates**: Reusable HTML templates with embedded CSS
- **Reports Service**: Business logic for data gathering and transformation
- **Puppeteer**: HTML to PDF conversion with high-fidelity rendering
- **Template Caching**: Compiled templates are cached for performance

## Endpoints

### 1. Get Client Report as HTML

Generate and return a client report as a styled HTML document.

**Endpoint:** `GET /documents/reports/client/:clientId/html`

**Authentication:** Required (JWT)

**Parameters:**

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| clientId | string | path | Yes | The ID of the client |
| includeCompaniesHouseData | boolean | query | No | Include Companies House data (default: false) |
| includeServices | boolean | query | No | Include services section (default: false) |
| includeParties | boolean | query | No | Include parties section (default: false) |
| includeDocuments | boolean | query | No | Include documents section (default: false) |
| customSections | string | query | No | Comma-separated list of custom sections |

**Response:**

- **Content-Type:** `text/html`
- **Status Code:** 200 OK
- **Body:** HTML document

**Example Request:**

```bash
curl -X GET \
  'http://localhost:3001/documents/reports/client/client-123/html?includeServices=true&includeCompaniesHouseData=true' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**Example Response:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>MDJ Company Report</title>
  <style>/* Embedded CSS */</style>
</head>
<body>
  <header><!-- Fixed header with logo --></header>
  <main><!-- Report sections --></main>
  <footer><!-- Fixed footer --></footer>
</body>
</html>
```

**Use Cases:**

- Display report in web application
- Email report as HTML
- Embed report in iframe
- Custom styling and branding

---

### 2. Preview Client Report

Preview a client report as HTML in the browser with inline content disposition.

**Endpoint:** `GET /documents/reports/client/:clientId/preview`

**Authentication:** Required (JWT)

**Parameters:**

Same as "Get Client Report as HTML" endpoint.

**Response:**

- **Content-Type:** `text/html`
- **Content-Disposition:** `inline; filename="client-report-preview-{clientId}.html"`
- **Status Code:** 200 OK
- **Body:** HTML document

**Example Request:**

```bash
curl -X GET \
  'http://localhost:3001/documents/reports/client/client-123/preview?includeServices=true' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**Difference from HTML Endpoint:**

The preview endpoint sets `Content-Disposition: inline` to ensure the browser displays the report directly rather than prompting for download.

**Use Cases:**

- Quick report preview in browser
- Print preview functionality
- Report review before PDF generation

---

### 3. Generate Client Report PDF

Generate and download a client report as a PDF file.

**Endpoint:** `POST /documents/reports/client/:clientId`

**Authentication:** Required (JWT)

**Parameters:**

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| clientId | string | path | Yes | The ID of the client |
| includeCompaniesHouseData | boolean | body | No | Include Companies House data (default: true) |
| includeServices | boolean | body | No | Include services section (default: true) |
| includeParties | boolean | body | No | Include parties section (default: true) |
| includeDocuments | boolean | body | No | Include documents section (default: true) |
| customSections | string[] | body | No | Array of custom section names |
| dateRange | object | body | No | Date range filter with `from` and `to` dates |

**Request Body Example:**

```json
{
  "includeCompaniesHouseData": true,
  "includeServices": true,
  "includeParties": true,
  "includeDocuments": false,
  "customSections": ["compliance", "tasks"],
  "dateRange": {
    "from": "2025-01-01T00:00:00Z",
    "to": "2025-12-31T23:59:59Z"
  }
}
```

**Response:**

- **Content-Type:** `application/pdf`
- **Content-Disposition:** `attachment; filename="client-report-{clientId}-{date}.pdf"`
- **Content-Length:** Size of PDF in bytes
- **Status Code:** 200 OK
- **Body:** PDF binary data

**Example Request:**

```bash
curl -X POST \
  'http://localhost:3001/documents/reports/client/client-123' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "includeCompaniesHouseData": true,
    "includeServices": true,
    "includeParties": true
  }' \
  --output client-report.pdf
```

**Use Cases:**

- Download report for offline viewing
- Archive report as PDF
- Email report as attachment
- Print physical copies

---

## Report Sections

### Header Section

- MDJ Consultants Ltd logo
- Practice contact information
- Report title with client name and reference
- Generation date

### Company Overview

- Client reference
- Company number
- Company type
- Portfolio
- Status
- UTR (Unique Taxpayer Reference)
- Incorporation date
- Accounts dates (last and next)
- Confirmation statement dates
- Contact information (email, phone)
- Registered address

### Key Contacts & Parties

- Primary contact
- Responsible manager
- Other associated parties with roles

### Active Services

Table showing:
- Service name
- Frequency
- Fee
- Next due date
- Status

### Upcoming Tasks

Table showing:
- Task title
- Status
- Due date

### Companies House Data

- Company details
- Directors list
- Persons with Significant Control (PSC)
- Recent filing history

### Compliance Summary

- AML review date
- Engagement letter status
- Renewal date

### Footer Section

- Practice branding
- Electronic signature
- Confidentiality notice

---

## Data Models

### ReportOptions

```typescript
interface ReportOptions {
  clientId: string;
  includeCompaniesHouseData?: boolean;
  includeServices?: boolean;
  includeParties?: boolean;
  includeDocuments?: boolean;
  customSections?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
}
```

### TemplateData

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

---

## Error Handling

### Common Error Responses

**400 Bad Request**

```json
{
  "statusCode": 400,
  "message": "Failed to generate HTML report: Template not found",
  "error": "Bad Request"
}
```

**401 Unauthorized**

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**404 Not Found**

```json
{
  "statusCode": 404,
  "message": "Client not found"
}
```

**500 Internal Server Error**

```json
{
  "statusCode": 500,
  "message": "PDF generation failed: Browser launch failed",
  "error": "Internal Server Error"
}
```

### Error Scenarios

| Scenario | Status Code | Message |
|----------|-------------|---------|
| Client not found | 404 | Client not found |
| Template missing | 400 | Template not found: client-report |
| PDF generation fails | 400 | PDF generation failed: {error details} |
| Invalid client ID | 400 | Invalid client ID format |
| Missing authentication | 401 | Unauthorized |
| Insufficient permissions | 403 | Forbidden |

---

## Performance Considerations

### Template Caching

Templates are compiled once and cached in memory for subsequent requests. This significantly improves performance for repeated report generation.

### PDF Generation

PDF generation using Puppeteer is resource-intensive. Consider:

- **Rate Limiting**: Limit concurrent PDF generation requests
- **Timeouts**: Set appropriate timeouts (default: 30 seconds)
- **Resource Limits**: Monitor memory and CPU usage
- **Async Processing**: For bulk reports, use background jobs

### Optimization Tips

1. **Use HTML endpoint when possible**: HTML generation is faster than PDF
2. **Cache report data**: Cache client data if generating multiple reports
3. **Selective sections**: Only include necessary sections to reduce data gathering time
4. **Browser pooling**: For high-volume PDF generation, implement browser instance pooling

---

## Security

### Authentication

All report endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Authorization

Users can only generate reports for clients they have access to based on their role:

- **Admin**: All clients
- **Manager**: Clients in their portfolio
- **Staff**: Assigned clients only
- **ReadOnly**: View-only access

### Data Privacy

- Reports contain sensitive client information
- Use HTTPS in production
- Implement audit logging for report generation
- Consider watermarking for confidential reports

---

## Best Practices

### Report Generation

1. **Preview before PDF**: Use the preview endpoint to verify report content before generating PDF
2. **Selective data**: Only include necessary sections to improve performance
3. **Error handling**: Implement proper error handling and user feedback
4. **Caching**: Cache generated reports if they don't change frequently

### Integration

1. **Async generation**: For bulk reports, use background jobs
2. **Progress tracking**: Implement progress indicators for long-running PDF generation
3. **Retry logic**: Implement retry logic for transient failures
4. **Monitoring**: Monitor report generation metrics and errors

### Frontend Integration

```typescript
// Example: Generate and download PDF report
async function downloadClientReport(clientId: string) {
  try {
    const response = await fetch(
      `/documents/reports/client/${clientId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          includeCompaniesHouseData: true,
          includeServices: true,
          includeParties: true
        })
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to generate report');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client-report-${clientId}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Report generation failed:', error);
  }
}

// Example: Preview report in new window
function previewClientReport(clientId: string) {
  const url = `/documents/reports/client/${clientId}/preview?includeServices=true&includeCompaniesHouseData=true`;
  window.open(url, '_blank');
}
```

---

## Migration from Old System

### Changes from PDFMake-based Reports

The new HTML-based report system replaces the previous PDFMake implementation with several improvements:

**Benefits:**

- ✅ Better visual design with modern CSS
- ✅ Easier template maintenance (HTML vs. code)
- ✅ Browser preview capability
- ✅ Higher quality PDF output
- ✅ Responsive design support
- ✅ Easier customization and branding

**Breaking Changes:**

- None - The API endpoint remains the same (`POST /documents/reports/client/:clientId`)
- Response format is identical (PDF binary data)
- All existing integrations continue to work

**Deprecated:**

- Old PDFMake-based internal methods have been removed
- No action required for API consumers

---

## Troubleshooting

### Common Issues

**Issue: "Template not found" error**

- **Cause**: Template file is missing or path is incorrect
- **Solution**: Verify template file exists at `apps/api/src/modules/documents/templates/client-report.hbs`

**Issue: PDF generation timeout**

- **Cause**: Puppeteer taking too long to render
- **Solution**: Increase timeout, reduce report complexity, or check system resources

**Issue: Empty PDF generated**

- **Cause**: HTML content is empty or invalid
- **Solution**: Test HTML endpoint first to verify content generation

**Issue: Styling missing in PDF**

- **Cause**: External CSS not loaded or print styles not applied
- **Solution**: Use embedded CSS in template, ensure `printBackground: true` in Puppeteer config

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
// In reports.service.ts
this.logger.debug(`Loading template from: ${templatePath}`);
this.logger.debug(`HTML generated, length: ${html.length} characters`);
```

---

## Support

For issues or questions:

1. Check the logs for detailed error messages
2. Verify authentication and permissions
3. Test with the HTML endpoint first
4. Review the template file for syntax errors
5. Check Puppeteer installation and dependencies

## Related Documentation

- [API Integration Guide](./API_INTEGRATION_GUIDE.md)
- [User Guide](./USER_GUIDE.md)
- [Deployment Guide](./DEPLOYMENT.md)

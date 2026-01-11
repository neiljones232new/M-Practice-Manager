# Design Document: Client Letter Template System

## Overview

The Client Letter Template System extends the existing Documents module to provide template management, letter generation, and correspondence tracking capabilities. The system will parse template files containing placeholders, populate them with client and service data, generate professional documents in multiple formats, and maintain a complete history of all client correspondence.

The system integrates with existing modules including Clients, Services, and Documents to provide a seamless experience for generating personalized client letters.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
├─────────────────────────────────────────────────────────────┤
│  Templates Page  │  Letter Generator  │  Letter History     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (NestJS)                       │
├─────────────────────────────────────────────────────────────┤
│  Templates Controller  │  Letter Generation Controller       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
├──────────────────────┬──────────────────┬───────────────────┤
│  Templates Service   │  Letter Service  │  Placeholder Svc  │
└──────────────────────┴──────────────────┴───────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Integration Layer                         │
├──────────────────────┬──────────────────┬───────────────────┤
│  Clients Service     │  Services Svc    │  Documents Svc    │
└──────────────────────┴──────────────────┴───────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Storage Layer                             │
├──────────────────────┬──────────────────────────────────────┤
│  Template Files      │  Generated Documents                  │
│  (mdj-data/templates)│  (mdj-data/documents)                │
└──────────────────────┴──────────────────────────────────────┘
```

### Module Structure

```
apps/api/src/modules/
├── templates/
│   ├── templates.module.ts
│   ├── templates.controller.ts
│   ├── templates.service.ts
│   ├── letter-generation.service.ts
│   ├── placeholder.service.ts
│   ├── template-parser.service.ts
│   ├── document-generator.service.ts
│   └── interfaces/
│       └── template.interface.ts
│
apps/web/src/app/
├── templates/
│   ├── page.tsx                    # Template library
│   ├── [id]/
│   │   └── page.tsx               # Template details
│   └── generate/
│       └── page.tsx               # Letter generation wizard
│
└── clients/[id]/
    └── letters/
        └── page.tsx               # Client letter history
```

## Components and Interfaces

### Data Models

#### Template Interface

```typescript
export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  fileName: string;
  filePath: string;
  fileFormat: 'DOCX' | 'MD';
  placeholders: TemplatePlaceholder[];
  version: number;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: TemplateMetadata;
}

export enum TemplateCategory {
  TAX = 'TAX',
  HMRC = 'HMRC',
  VAT = 'VAT',
  COMPLIANCE = 'COMPLIANCE',
  GENERAL = 'GENERAL',
  ENGAGEMENT = 'ENGAGEMENT'
}

export interface TemplatePlaceholder {
  key: string;                    // e.g., "clientName"
  label: string;                  // e.g., "Client Name"
  type: PlaceholderType;
  required: boolean;
  defaultValue?: string;
  format?: string;                // For dates, currency, etc.
  source?: PlaceholderSource;     // Where to get the data
  sourcePath?: string;            // Path to data (e.g., "client.name")
  validation?: PlaceholderValidation;
}

export enum PlaceholderType {
  TEXT = 'TEXT',
  DATE = 'DATE',
  CURRENCY = 'CURRENCY',
  NUMBER = 'NUMBER',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  ADDRESS = 'ADDRESS',
  LIST = 'LIST',
  CONDITIONAL = 'CONDITIONAL'
}

export enum PlaceholderSource {
  CLIENT = 'CLIENT',
  SERVICE = 'SERVICE',
  USER = 'USER',
  MANUAL = 'MANUAL',
  SYSTEM = 'SYSTEM'
}

export interface PlaceholderValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
}

export interface TemplateMetadata {
  author?: string;
  tags?: string[];
  usageCount?: number;
  lastUsed?: Date;
  notes?: string;
}
```

#### Generated Letter Interface

```typescript
export interface GeneratedLetter {
  id: string;
  templateId: string;
  templateName: string;
  templateVersion: number;
  clientId: string;
  clientName: string;
  serviceId?: string;
  serviceName?: string;
  documentId: string;            // Link to Documents module
  placeholderValues: Record<string, any>;
  generatedBy: string;
  generatedAt: Date;
  status: LetterStatus;
  downloadCount: number;
  lastDownloadedAt?: Date;
}

export enum LetterStatus {
  DRAFT = 'DRAFT',
  GENERATED = 'GENERATED',
  DOWNLOADED = 'DOWNLOADED',
  SENT = 'SENT',
  ARCHIVED = 'ARCHIVED'
}

export interface GenerateLetterDto {
  templateId: string;
  clientId: string;
  serviceId?: string;
  placeholderValues?: Record<string, any>;
  outputFormats?: ('PDF' | 'DOCX')[];
  autoSave?: boolean;
}

export interface BulkGenerateLetterDto {
  templateId: string;
  clientIds: string[];
  serviceId?: string;
  placeholderValues?: Record<string, any>;
  outputFormats?: ('PDF' | 'DOCX')[];
}
```

### Service Components

#### 1. TemplatesService

Manages template CRUD operations and template library.

**Key Methods:**
- `getTemplates(filters?: TemplateFilters): Promise<Template[]>`
- `getTemplate(id: string): Promise<Template>`
- `createTemplate(dto: CreateTemplateDto): Promise<Template>`
- `updateTemplate(id: string, dto: UpdateTemplateDto): Promise<Template>`
- `deleteTemplate(id: string): Promise<void>`
- `getTemplatesByCategory(category: TemplateCategory): Promise<Template[]>`
- `searchTemplates(query: string): Promise<Template[]>`

#### 2. TemplateParserService

Parses template files to extract placeholders and structure.

**Key Methods:**
- `parseTemplate(filePath: string, format: 'DOCX' | 'MD'): Promise<ParsedTemplate>`
- `extractPlaceholders(content: string): TemplatePlaceholder[]`
- `validateTemplate(template: Template): ValidationResult`
- `getTemplateContent(templateId: string): Promise<string>`

**Placeholder Syntax:**
- Simple: `{{clientName}}`
- Formatted: `{{date:incorporationDate:DD/MM/YYYY}}`
- Conditional: `{{if:hasUTR}}UTR: {{utrNumber}}{{endif}}`
- List: `{{list:directors}}{{name}} - {{role}}{{endlist}}`

#### 3. PlaceholderService

Resolves placeholder values from various data sources.

**Key Methods:**
- `resolvePlaceholders(placeholders: TemplatePlaceholder[], context: PlaceholderContext): Promise<Record<string, any>>`
- `getClientData(clientId: string): Promise<ClientPlaceholderData>`
- `getServiceData(serviceId: string): Promise<ServicePlaceholderData>`
- `formatValue(value: any, type: PlaceholderType, format?: string): string`
- `validatePlaceholderValue(value: any, placeholder: TemplatePlaceholder): ValidationResult`

**Placeholder Context:**
```typescript
export interface PlaceholderContext {
  clientId: string;
  serviceId?: string;
  userId: string;
  manualValues?: Record<string, any>;
}
```

#### 4. LetterGenerationService

Orchestrates the letter generation process.

**Key Methods:**
- `generateLetter(dto: GenerateLetterDto): Promise<GeneratedLetter>`
- `bulkGenerateLetter(dto: BulkGenerateLetterDto): Promise<BulkGenerationResult>`
- `previewLetter(dto: GenerateLetterDto): Promise<string>`
- `getGeneratedLetters(filters: LetterFilters): Promise<GeneratedLetter[]>`
- `getLettersByClient(clientId: string): Promise<GeneratedLetter[]>`
- `getLettersByService(serviceId: string): Promise<GeneratedLetter[]>`
- `downloadLetter(letterId: string, format: 'PDF' | 'DOCX'): Promise<Buffer>`

**Generation Flow:**
1. Retrieve template and parse content
2. Resolve placeholders from data sources
3. Merge manual values with auto-resolved values
4. Validate all required placeholders are populated
5. Generate document in requested formats
6. Save to Documents module
7. Create GeneratedLetter record
8. Return result with download links

#### 5. DocumentGeneratorService

Generates final documents in various formats.

**Key Methods:**
- `generatePDF(content: string, template: Template): Promise<Buffer>`
- `generateDOCX(content: string, template: Template): Promise<Buffer>`
- `populateTemplate(templateContent: string, values: Record<string, any>): string`
- `applyFormatting(content: string, format: string): string`

**Libraries:**
- PDF generation: `pdfkit` or `puppeteer`
- DOCX generation: `docxtemplater` or `officegen`
- Markdown processing: `marked`

## Data Flow

### Letter Generation Flow

```
User selects template + client
         │
         ▼
Retrieve template metadata
         │
         ▼
Extract placeholders
         │
         ▼
Resolve auto-populated values
  ├─ Client data
  ├─ Service data
  └─ System data
         │
         ▼
Display form with values
         │
         ▼
User reviews/edits values
         │
         ▼
Validate all required fields
         │
         ▼
Generate preview
         │
         ▼
User confirms
         │
         ▼
Generate final documents
  ├─ PDF
  └─ DOCX
         │
         ▼
Save to Documents module
         │
         ▼
Create GeneratedLetter record
         │
         ▼
Return download links
```

### Bulk Generation Flow

```
User selects template + multiple clients
         │
         ▼
For each client:
  ├─ Resolve placeholders
  ├─ Validate required fields
  ├─ Generate if valid
  └─ Log error if invalid
         │
         ▼
Generate summary report
         │
         ▼
Create ZIP with all documents
         │
         ▼
Return download link + report
```

## Error Handling

### Template Errors
- **Template Not Found**: Return 404 with clear message
- **Invalid Template Format**: Return 400 with validation errors
- **Parse Error**: Log error, return 500 with user-friendly message

### Generation Errors
- **Missing Required Data**: Return 400 with list of missing fields
- **Client Not Found**: Return 404 with client ID
- **Service Not Found**: Return 404 with service ID
- **Generation Failure**: Log full error, return 500 with retry option

### Validation Errors
- **Invalid Placeholder Value**: Return 400 with field name and validation rule
- **Format Error**: Return 400 with expected format
- **Type Mismatch**: Return 400 with expected type

## Testing Strategy

### Unit Tests

1. **TemplateParserService**
   - Test placeholder extraction from various formats
   - Test validation of template syntax
   - Test handling of malformed templates

2. **PlaceholderService**
   - Test data resolution from different sources
   - Test value formatting for different types
   - Test validation logic

3. **LetterGenerationService**
   - Test single letter generation
   - Test bulk generation
   - Test error handling for missing data

4. **DocumentGeneratorService**
   - Test PDF generation
   - Test DOCX generation
   - Test template population

### Integration Tests

1. **End-to-End Letter Generation**
   - Create template → Generate letter → Verify document
   - Test with real client data
   - Test with missing optional fields

2. **Bulk Generation**
   - Generate letters for multiple clients
   - Verify all documents created
   - Verify error handling for invalid clients

3. **Template Management**
   - Upload template → Parse → Generate letter
   - Update template → Verify version increment
   - Delete template → Verify cleanup

### E2E Tests

1. **User Journey: Generate Single Letter**
   - Navigate to templates
   - Select template
   - Select client
   - Fill form
   - Generate and download

2. **User Journey: Bulk Generation**
   - Select template
   - Select multiple clients
   - Review summary
   - Download ZIP

3. **User Journey: View Letter History**
   - Navigate to client
   - View letters tab
   - Filter by template
   - Download previous letter

## Security Considerations

1. **Access Control**
   - Only authenticated users can generate letters
   - Users can only access letters for clients in their portfolio
   - Admin role required for template management

2. **Data Validation**
   - Sanitize all user inputs
   - Validate placeholder values against schema
   - Prevent template injection attacks

3. **File Security**
   - Store templates in secure directory
   - Validate file types on upload
   - Scan uploaded files for malware

4. **Audit Trail**
   - Log all letter generations
   - Track who generated what for which client
   - Record all template modifications

## Performance Considerations

1. **Caching**
   - Cache parsed templates in memory
   - Cache client data during generation
   - Invalidate cache on template updates

2. **Bulk Operations**
   - Process bulk generations asynchronously
   - Implement progress tracking
   - Limit concurrent generations

3. **File Storage**
   - Store generated documents efficiently
   - Implement cleanup for old documents
   - Consider cloud storage for scalability

## Future Enhancements

1. **Email Integration**
   - Send generated letters directly via email
   - Track email delivery status
   - Support email templates

2. **E-Signature Integration**
   - Add signature fields to templates
   - Integrate with DocuSign or similar
   - Track signature status

3. **Advanced Templates**
   - Support for complex conditional logic
   - Dynamic tables and charts
   - Multi-page templates with headers/footers

4. **Template Marketplace**
   - Share templates across portfolios
   - Import templates from library
   - Rate and review templates

5. **AI-Powered Generation**
   - Suggest template based on context
   - Auto-fill complex fields using AI
   - Generate custom content sections

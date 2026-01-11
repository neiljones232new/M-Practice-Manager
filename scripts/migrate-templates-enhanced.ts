#!/usr/bin/env ts-node

/**
 * Enhanced Template Migration Script
 * 
 * This script migrates existing templates from MDJ_Template_Pack_Branded to the new
 * template system structure with placeholder insertion. It:
 * 1. Parses existing template files (DOCX and MD)
 * 2. Inserts placeholders into template content using pattern recognition
 * 3. Extracts placeholders from each template
 * 4. Creates template metadata records
 * 5. Stores templates in the new storage structure
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';

interface TemplateDefinition {
  fileName: string;
  name: string;
  description: string;
  category: string;
  fileFormat: 'DOCX' | 'MD';
  tags: string[];
  placeholders: PlaceholderDefinition[];
}

interface PlaceholderDefinition {
  key: string;
  label: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  format?: string;
  source?: string;
  sourcePath?: string;
}

interface PlaceholderReplacement {
  pattern: RegExp | string;
  placeholder: string;
  description: string;
}

// Define placeholder replacement patterns
const PLACEHOLDER_REPLACEMENTS: PlaceholderReplacement[] = [
  // Company/Client information
  { pattern: /\*\*Company:\*\*\s*/g, placeholder: '**Company:** {{companyName}}', description: 'Company name' },
  { pattern: /\*\*Client:\*\*\s*/g, placeholder: '**Client:** {{clientName}}', description: 'Client name' },
  
  // Dates
  { pattern: /\*\*Period End:\*\*\s*/g, placeholder: '**Period End:** {{periodEnd}}', description: 'Period end date' },
  { pattern: /\*\*Date:\*\*\s*/g, placeholder: '**Date:** {{currentDate}}', description: 'Current date' },
  { pattern: /\*\*Previous Submission Date:\*\*\s*/g, placeholder: '**Previous Submission Date:** {{previousSubmissionDate}}', description: 'Previous submission date' },
  { pattern: /\*\*Original Complaint Date:\*\*\s*/g, placeholder: '**Original Complaint Date:** {{originalComplaintDate}}', description: 'Original complaint date' },
  
  // References
  { pattern: /\*\*HMRC Reference:\*\*\s*/g, placeholder: '**HMRC Reference:** {{hmrcReference}}', description: 'HMRC reference' },
  { pattern: /\*\*Complaint Reference:\*\*\s*/g, placeholder: '**Complaint Reference:** {{complaintReference}}', description: 'Complaint reference' },
  { pattern: /\*\*VAT Number:\*\*\s*/g, placeholder: '**VAT Number:** {{vatNumber}}', description: 'VAT number' },
  { pattern: /\*\*Company Number:\*\*\s*/g, placeholder: '**Company Number:** {{companyNumber}}', description: 'Company number' },
  
  // Financial figures
  { pattern: /\| Profit Before Tax \| £\s*\|/g, placeholder: '| Profit Before Tax | {{profitBeforeTax}} |', description: 'Profit before tax' },
  { pattern: /\| Tax Due \/ Refund\s*\| £\s*\|/g, placeholder: '| Tax Due / Refund | {{taxDue}} |', description: 'Tax due or refund' },
  { pattern: /\| Loss Carried Forward \| £\s*\|/g, placeholder: '| Loss Carried Forward | {{lossCarriedForward}} |', description: 'Loss carried forward' },
  { pattern: /\| VAT Due \| £\s*\|/g, placeholder: '| VAT Due | {{vatDue}} |', description: 'VAT due' },
  { pattern: /\| VAT Reclaimed \| £\s*\|/g, placeholder: '| VAT Reclaimed | {{vatReclaimed}} |', description: 'VAT reclaimed' },
  { pattern: /\| Net VAT \| £\s*\|/g, placeholder: '| Net VAT | {{netVat}} |', description: 'Net VAT' },
  
  // Confirmations and descriptions
  { pattern: /- Companies House Confirmation:\s*/g, placeholder: '- Companies House Confirmation: {{companiesHouseConfirmation}}', description: 'Companies House confirmation' },
  { pattern: /\*\*Matter Description:\*\*\s*/g, placeholder: '**Matter Description:** {{matterDescription}}', description: 'Matter description' },
  { pattern: /\*\*Complaint Summary:\*\*\s*/g, placeholder: '**Complaint Summary:** {{complaintSummary}}', description: 'Complaint summary' },
  { pattern: /\*\*Escalation Reason:\*\*\s*/g, placeholder: '**Escalation Reason:** {{escalationReason}}', description: 'Escalation reason' },
  
  // R&D specific
  { pattern: /\*\*Accounting Period:\*\*\s*/g, placeholder: '**Accounting Period:** {{accountingPeriod}}', description: 'Accounting period' },
  { pattern: /\*\*R&D Expenditure:\*\*\s*/g, placeholder: '**R&D Expenditure:** {{rdExpenditure}}', description: 'R&D expenditure' },
  { pattern: /\*\*Tax Credit Claimed:\*\*\s*/g, placeholder: '**Tax Credit Claimed:** {{taxCreditClaimed}}', description: 'Tax credit claimed' },
  { pattern: /\*\*Project Description:\*\*\s*/g, placeholder: '**Project Description:** {{projectDescription}}', description: 'Project description' },
  
  // Service/Task specific
  { pattern: /\*\*Service Name:\*\*\s*/g, placeholder: '**Service Name:** {{serviceName}}', description: 'Service name' },
  { pattern: /\*\*Due Date:\*\*\s*/g, placeholder: '**Due Date:** {{dueDate}}', description: 'Due date' },
  
  // VAT periods
  { pattern: /\*\*Period Start:\*\*\s*/g, placeholder: '**Period Start:** {{periodStart}}', description: 'Period start' },
  { pattern: /\*\*Period End:\*\*\s*/g, placeholder: '**Period End:** {{periodEnd}}', description: 'Period end' },
];

/**
 * Insert placeholders into template content
 */
function insertPlaceholders(content: string, fileName: string): string {
  let modifiedContent = content;
  
  // Apply all replacement patterns
  for (const replacement of PLACEHOLDER_REPLACEMENTS) {
    modifiedContent = modifiedContent.replace(replacement.pattern, replacement.placeholder);
  }
  
  return modifiedContent;
}

/**
 * Extract placeholders from content
 */
function extractPlaceholdersFromContent(content: string): string[] {
  const placeholderRegex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  const placeholders = new Set<string>();
  let match;
  
  while ((match = placeholderRegex.exec(content)) !== null) {
    placeholders.add(match[1]);
  }
  
  return Array.from(placeholders);
}

// Template definitions with enhanced placeholder information
const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    fileName: 'CT600_Cover_Letter.md',
    name: 'CT600 Cover Letter',
    description: 'Cover letter for CT600 Corporation Tax Return submissions to HMRC',
    category: 'TAX',
    fileFormat: 'MD',
    tags: ['tax', 'ct600', 'hmrc', 'corporation-tax'],
    placeholders: [
      { key: 'clientName', label: 'Client Name', type: 'TEXT', required: true, source: 'CLIENT', sourcePath: 'client.name' },
      { key: 'companyName', label: 'Company Name', type: 'TEXT', required: true, source: 'CLIENT', sourcePath: 'client.companyName' },
      { key: 'companyNumber', label: 'Company Number', type: 'TEXT', required: true, source: 'CLIENT', sourcePath: 'client.companyNumber' },
      { key: 'periodEnd', label: 'Period End', type: 'DATE', required: true, format: 'DD/MM/YYYY', source: 'CLIENT', sourcePath: 'client.accountingPeriodEnd' },
      { key: 'profitBeforeTax', label: 'Profit Before Tax', type: 'CURRENCY', required: true, format: '£0,0.00', source: 'MANUAL' },
      { key: 'taxDue', label: 'Tax Due / Refund', type: 'CURRENCY', required: true, format: '£0,0.00', source: 'MANUAL' },
      { key: 'lossCarriedForward', label: 'Loss Carried Forward', type: 'CURRENCY', required: false, format: '£0,0.00', source: 'MANUAL' },
      { key: 'companiesHouseConfirmation', label: 'Companies House Confirmation', type: 'TEXT', required: false, source: 'MANUAL' },
      { key: 'hmrcReference', label: 'HMRC Reference', type: 'TEXT', required: false, source: 'CLIENT', sourcePath: 'client.utrNumber' },
      { key: 'currentDate', label: 'Current Date', type: 'DATE', required: true, format: 'DD/MM/YYYY', source: 'SYSTEM', sourcePath: 'system.currentDate' },
    ],
  },
  {
    fileName: 'HMRC_Chaser_Letter.md',
    name: 'HMRC Chaser Letter',
    description: 'Follow-up letter to chase HMRC for responses or outstanding matters',
    category: 'HMRC',
    fileFormat: 'MD',
    tags: ['hmrc', 'chaser', 'follow-up'],
    placeholders: [
      { key: 'clientName', label: 'Client Name', type: 'TEXT', required: true, source: 'CLIENT', sourcePath: 'client.name' },
      { key: 'companyName', label: 'Company Name', type: 'TEXT', required: true, source: 'CLIENT', sourcePath: 'client.companyName' },
      { key: 'previousSubmissionDate', label: 'Previous Submission Date', type: 'DATE', required: true, format: 'DD/MM/YYYY', source: 'MANUAL' },
      { key: 'hmrcReference', label: 'HMRC Reference', type: 'TEXT', required: true, source: 'CLIENT', sourcePath: 'client.utrNumber' },
      { key: 'matterDescription', label: 'Matter Description', type: 'TEXT', required: true, source: 'MANUAL' },
      { key: 'currentDate', label: 'Current Date', type: 'DATE', required: true, format: 'DD/MM/YYYY', source: 'SYSTEM', sourcePath: 'system.currentDate' },
    ],
  },
  {
    fileName: 'VAT_Return_Summary.md',
    name: 'VAT Return Summary',
    description: 'Summary letter for VAT return submissions',
    category: 'VAT',
    fileFormat: 'MD',
    tags: ['vat', 'return', 'summary'],
    placeholders: [
      { key: 'clientName', label: 'Client Name', type: 'TEXT', required: true, source: 'CLIENT', sourcePath: 'client.name' },
      { key: 'companyName', label: 'Company Name', type: 'TEXT', required: true, source: 'CLIENT', sourcePath: 'client.companyName' },
      { key: 'vatNumber', label: 'VAT Number', type: 'TEXT', required: true, source: 'CLIENT', sourcePath: 'client.vatNumber' },
      { key: 'periodStart', label: 'Period Start', type: 'DATE', required: true, format: 'DD/MM/YYYY', source: 'SERVICE', sourcePath: 'service.startDate' },
      { key: 'periodEnd', label: 'Period End', type: 'DATE', required: true, format: 'DD/MM/YYYY', source: 'SERVICE', sourcePath: 'service.endDate' },
      { key: 'vatDue', label: 'VAT Due', type: 'CURRENCY', required: true, format: '£0,0.00', source: 'MANUAL' },
      { key: 'vatReclaimed', label: 'VAT Reclaimed', type: 'CURRENCY', required: true, format: '£0,0.00', source: 'MANUAL' },
      { key: 'netVat', label: 'Net VAT', type: 'CURRENCY', required: true, format: '£0,0.00', source: 'MANUAL' },
      { key: 'currentDate', label: 'Current Date', type: 'DATE', required: true, format: 'DD/MM/YYYY', source: 'SYSTEM', sourcePath: 'system.currentDate' },
    ],
  },
  {
    fileName: 'Complaint_Escalation_Letter.md',
    name: 'Complaint Escalation Letter',
    description: 'Letter for escalating complaints to HMRC or other authorities',
    category: 'GENERAL',
    fileFormat: 'MD',
    tags: ['complaint', 'escalation', 'hmrc'],
    placeholders: [
      { key: 'clientName', label: 'Client Name', type: 'TEXT', required: true, source: 'CLIENT', sourcePath: 'client.name' },
      { key: 'companyName', label: 'Company Name', type: 'TEXT', required: true, source: 'CLIENT', sourcePath: 'client.companyName' },
      { key: 'complaintReference', label: 'Complaint Reference', type: 'TEXT', required: true, source: 'MANUAL' },
      { key: 'originalComplaintDate', label: 'Original Complaint Date', type: 'DATE', required: true, format: 'DD/MM/YYYY', source: 'MANUAL' },
      { key: 'complaintSummary', label: 'Complaint Summary', type: 'TEXT', required: true, source: 'MANUAL' },
      { key: 'escalationReason', label: 'Escalation Reason', type: 'TEXT', required: true, source: 'MANUAL' },
      { key: 'currentDate', label: 'Current Date', type: 'DATE', required: true, format: 'DD/MM/YYYY', source: 'SYSTEM', sourcePath: 'system.currentDate' },
    ],
  },
  {
    fileName: 'R&D_Amendment_Report.md',
    name: 'R&D Amendment Report',
    description: 'Report for R&D tax credit amendments and submissions',
    category: 'TAX',
    fileFormat: 'MD',
    tags: ['r&d', 'tax-credit', 'amendment'],
    placeholders: [
      { key: 'clientName', label: 'Client Name', type: 'TEXT', required: true, source: 'CLIENT', sourcePath: 'client.name' },
      { key: 'companyName', label: 'Company Name', type: 'TEXT', required: true, source: 'CLIENT', sourcePath: 'client.companyName' },
      { key: 'companyNumber', label: 'Company Number', type: 'TEXT', required: true, source: 'CLIENT', sourcePath: 'client.companyNumber' },
      { key: 'accountingPeriod', label: 'Accounting Period', type: 'TEXT', required: true, source: 'MANUAL' },
      { key: 'rdExpenditure', label: 'R&D Expenditure', type: 'CURRENCY', required: true, format: '£0,0.00', source: 'MANUAL' },
      { key: 'taxCreditClaimed', label: 'Tax Credit Claimed', type: 'CURRENCY', required: true, format: '£0,0.00', source: 'MANUAL' },
      { key: 'projectDescription', label: 'Project Description', type: 'TEXT', required: true, source: 'MANUAL' },
      { key: 'currentDate', label: 'Current Date', type: 'DATE', required: true, format: 'DD/MM/YYYY', source: 'SYSTEM', sourcePath: 'system.currentDate' },
    ],
  },
  {
    fileName: 'Task_Tracker.md',
    name: 'Task Tracker',
    description: 'Document for tracking client tasks and deliverables',
    category: 'GENERAL',
    fileFormat: 'MD',
    tags: ['task', 'tracker', 'deliverables'],
    placeholders: [
      { key: 'clientName', label: 'Client Name', type: 'TEXT', required: true, source: 'CLIENT', sourcePath: 'client.name' },
      { key: 'companyName', label: 'Company Name', type: 'TEXT', required: true, source: 'CLIENT', sourcePath: 'client.companyName' },
      { key: 'serviceName', label: 'Service Name', type: 'TEXT', required: false, source: 'SERVICE', sourcePath: 'service.serviceName' },
      { key: 'taskList', label: 'Task List', type: 'LIST', required: true, source: 'MANUAL' },
      { key: 'dueDate', label: 'Due Date', type: 'DATE', required: false, format: 'DD/MM/YYYY', source: 'SERVICE', sourcePath: 'service.dueDate' },
      { key: 'currentDate', label: 'Current Date', type: 'DATE', required: true, format: 'DD/MM/YYYY', source: 'SYSTEM', sourcePath: 'system.currentDate' },
    ],
  },
];

async function main() {
  console.log('Starting enhanced template migration with placeholder insertion...\n');

  const sourceDir = path.join(process.cwd(), 'MDJ_Template_Pack_Branded');
  const targetDir = path.join(process.cwd(), 'storage/templates');
  const filesDir = path.join(targetDir, 'files');
  const metadataDir = path.join(targetDir, 'metadata');

  // Ensure target directories exist
  await fs.mkdir(filesDir, { recursive: true });
  await fs.mkdir(metadataDir, { recursive: true });

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const templateDef of TEMPLATE_DEFINITIONS) {
    try {
      console.log(`Processing: ${templateDef.name}...`);

      const sourcePath = path.join(sourceDir, templateDef.fileName);

      // Check if source file exists
      if (!existsSync(sourcePath)) {
        console.warn(`  ⚠️  Source file not found: ${templateDef.fileName}`);
        errorCount++;
        errors.push(`Source file not found: ${templateDef.fileName}`);
        continue;
      }

      // Read original content
      let content = await fs.readFile(sourcePath, 'utf8');
      console.log(`  ✓ Read original template`);

      // Insert placeholders into content
      const modifiedContent = insertPlaceholders(content, templateDef.fileName);
      console.log(`  ✓ Inserted placeholders`);

      // Extract placeholders from modified content
      const extractedPlaceholders = extractPlaceholdersFromContent(modifiedContent);
      console.log(`  ✓ Extracted ${extractedPlaceholders.length} placeholders: ${extractedPlaceholders.join(', ')}`);

      // Save modified content to storage
      const targetPath = path.join(filesDir, templateDef.fileName);
      await fs.writeFile(targetPath, modifiedContent, 'utf8');
      console.log(`  ✓ Saved modified template to storage`);

      // Generate unique template ID
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 10);
      const templateId = `template_${timestamp}_${randomStr}`;

      // Create metadata record
      const metadata = {
        id: templateId,
        name: templateDef.name,
        description: templateDef.description,
        category: templateDef.category,
        fileName: templateDef.fileName,
        filePath: `templates/files/${templateDef.fileName}`,
        fileFormat: templateDef.fileFormat,
        placeholders: templateDef.placeholders,
        version: 1,
        isActive: true,
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          tags: templateDef.tags,
          author: 'MDJ Consultants',
          usageCount: 0,
          source: 'MDJ_Template_Pack_Branded',
        },
      };

      // Save metadata to JSON file
      const metadataPath = path.join(metadataDir, `${templateId}.json`);
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      console.log(`  ✓ Created metadata record: ${templateId}`);

      successCount++;
      console.log(`  ✅ Successfully migrated: ${templateDef.name}\n`);
    } catch (error) {
      console.error(`  ❌ Error migrating ${templateDef.fileName}:`, error);
      errorCount++;
      errors.push(`${templateDef.fileName}: ${error.message}`);
    }
  }

  // Update the templates index
  try {
    console.log('Updating templates index...');
    const indexPath = path.join(process.cwd(), 'storage/indexes/templates.json');
    
    // Read existing index or create new one
    let index = { templates: [], lastUpdated: new Date().toISOString() };
    if (existsSync(indexPath)) {
      const indexContent = await fs.readFile(indexPath, 'utf8');
      index = JSON.parse(indexContent);
    }

    // Read all metadata files
    const metadataFiles = await fs.readdir(metadataDir);
    const templates = [];
    
    for (const file of metadataFiles) {
      if (file.endsWith('.json')) {
        const metadataPath = path.join(metadataDir, file);
        const metadataContent = await fs.readFile(metadataPath, 'utf8');
        const metadata = JSON.parse(metadataContent);
        templates.push({
          id: metadata.id,
          name: metadata.name,
          category: metadata.category,
          fileName: metadata.fileName,
          fileFormat: metadata.fileFormat,
          isActive: metadata.isActive,
          createdAt: metadata.createdAt,
          updatedAt: metadata.updatedAt,
        });
      }
    }

    // Update index
    index.templates = templates;
    index.lastUpdated = new Date().toISOString();
    
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    console.log('✓ Updated templates index\n');
  } catch (error) {
    console.error('❌ Error updating templates index:', error);
    errorCount++;
  }

  // Print summary
  console.log('='.repeat(60));
  console.log('Migration Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(error => console.log(`  - ${error}`));
  }
  
  console.log('\nMigration complete!');
  console.log('\nNext steps:');
  console.log('1. Review the migrated templates in storage/templates/files/');
  console.log('2. Check the metadata in storage/templates/metadata/');
  console.log('3. Verify placeholders are correctly inserted');
  console.log('4. Test template generation with the new templates');
}

// Run the migration
main().catch(error => {
  console.error('Fatal error during migration:', error);
  process.exit(1);
});

#!/usr/bin/env ts-node

/**
 * Template Migration Script
 * 
 * This script migrates existing templates from MDJ_Template_Pack_Branded to the new
 * template system structure. It:
 * 1. Parses existing template files (DOCX and MD)
 * 2. Extracts placeholders from each template
 * 3. Creates template metadata records
 * 4. Stores templates in the new storage structure
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';

// Placeholder extraction regex patterns
const SIMPLE_PLACEHOLDER_REGEX = /\{\{([a-zA-Z0-9_]+)\}\}/g;
const FORMATTED_PLACEHOLDER_REGEX = /\{\{([a-zA-Z0-9_]+):([a-zA-Z0-9_]+):([^}]+)\}\}/g;
const CONDITIONAL_START_REGEX = /\{\{if:([a-zA-Z0-9_]+)\}\}/g;
const LIST_START_REGEX = /\{\{list:([a-zA-Z0-9_]+)\}\}/g;
const ALL_PLACEHOLDERS_REGEX = /\{\{[^}]+\}\}/g;

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
    fileName: 'CT600_Cover_Letter.docx',
    name: 'CT600 Cover Letter (DOCX)',
    description: 'Cover letter for CT600 Corporation Tax Return submissions to HMRC (Word format)',
    category: 'TAX',
    fileFormat: 'DOCX',
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
    fileName: 'HMRC_Chaser_Letter.docx',
    name: 'HMRC Chaser Letter (DOCX)',
    description: 'Follow-up letter to chase HMRC for responses or outstanding matters (Word format)',
    category: 'HMRC',
    fileFormat: 'DOCX',
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
    fileName: 'VAT_Return_Summary.docx',
    name: 'VAT Return Summary (DOCX)',
    description: 'Summary letter for VAT return submissions (Word format)',
    category: 'VAT',
    fileFormat: 'DOCX',
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
    fileName: 'Complaint_Escalation_Letter.docx',
    name: 'Complaint Escalation Letter (DOCX)',
    description: 'Letter for escalating complaints to HMRC or other authorities (Word format)',
    category: 'GENERAL',
    fileFormat: 'DOCX',
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
    fileName: 'R&D_Amendment_Report.docx',
    name: 'R&D Amendment Report (DOCX)',
    description: 'Report for R&D tax credit amendments and submissions (Word format)',
    category: 'TAX',
    fileFormat: 'DOCX',
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
  {
    fileName: 'Task_Tracker.docx',
    name: 'Task Tracker (DOCX)',
    description: 'Document for tracking client tasks and deliverables (Word format)',
    category: 'GENERAL',
    fileFormat: 'DOCX',
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

/**
 * Extract placeholders from template content
 */
function extractPlaceholdersFromContent(content: string): PlaceholderDefinition[] {
  const placeholderMap = new Map<string, PlaceholderDefinition>();
  const matches = content.match(ALL_PLACEHOLDERS_REGEX) || [];

  for (const match of matches) {
    const inner = match.slice(2, -2).trim();

    // Skip end tags
    if (inner === 'endif' || inner === 'endlist') {
      continue;
    }

    let key: string;
    let type = 'TEXT';
    let format: string | undefined;
    let isConditional = false;
    let isList = false;

    // Check for conditional: {{if:condition}}
    if (inner.startsWith('if:')) {
      key = inner.substring(3);
      type = 'CONDITIONAL';
      isConditional = true;
    }
    // Check for list: {{list:key}}
    else if (inner.startsWith('list:')) {
      key = inner.substring(5);
      type = 'LIST';
      isList = true;
    }
    // Check for formatted: {{type:key:format}}
    else if (inner.includes(':')) {
      const parts = inner.split(':');
      if (parts.length === 3) {
        type = parts[0].toUpperCase();
        key = parts[1];
        format = parts[2];
      } else {
        key = inner;
      }
    }
    // Simple placeholder: {{key}}
    else {
      key = inner;
      // Infer type from key name
      type = inferTypeFromKey(key);
    }

    // Only add if not already in map
    if (!placeholderMap.has(key)) {
      const label = generateLabelFromKey(key);
      const source = inferSourceFromKey(key);
      const sourcePath = generateSourcePath(key, source);

      placeholderMap.set(key, {
        key,
        label,
        type,
        required: false, // Default to false, can be updated manually
        format,
        source,
        sourcePath,
      });
    }
  }

  return Array.from(placeholderMap.values());
}

/**
 * Generate a human-readable label from a camelCase or snake_case key
 */
function generateLabelFromKey(key: string): string {
  let label = key.replace(/([A-Z])/g, ' $1').trim();
  label = label.replace(/_/g, ' ');
  label = label.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  return label;
}

/**
 * Infer placeholder type from key name
 */
function inferTypeFromKey(key: string): string {
  const lowerKey = key.toLowerCase();

  if (lowerKey.includes('date') || lowerKey.includes('time') || 
      lowerKey.endsWith('at') || lowerKey.endsWith('on')) {
    return 'DATE';
  }
  if (lowerKey.includes('fee') || lowerKey.includes('price') || 
      lowerKey.includes('cost') || lowerKey.includes('amount') ||
      lowerKey.includes('payment') || lowerKey.includes('tax') ||
      lowerKey.includes('vat') || lowerKey.includes('expenditure')) {
    return 'CURRENCY';
  }
  if (lowerKey.includes('number') || lowerKey.includes('count') || 
      lowerKey.includes('quantity')) {
    return 'NUMBER';
  }
  if (lowerKey.includes('email')) {
    return 'EMAIL';
  }
  if (lowerKey.includes('phone') || lowerKey.includes('mobile') || 
      lowerKey.includes('tel')) {
    return 'PHONE';
  }
  if (lowerKey.includes('address') || lowerKey === 'postcode') {
    return 'ADDRESS';
  }
  if (lowerKey.endsWith('s') && !lowerKey.endsWith('ss')) {
    return 'LIST';
  }

  return 'TEXT';
}

/**
 * Infer data source from key name
 */
function inferSourceFromKey(key: string): string {
  const lowerKey = key.toLowerCase();

  if (lowerKey.startsWith('client') || lowerKey.startsWith('company') || 
      lowerKey.includes('utr') || lowerKey.includes('vat') ||
      lowerKey.includes('incorporation')) {
    return 'CLIENT';
  }
  if (lowerKey.startsWith('service') || lowerKey.includes('engagement') ||
      lowerKey.includes('fee') || lowerKey.includes('due')) {
    return 'SERVICE';
  }
  if (lowerKey.startsWith('user') || lowerKey.includes('preparedby') ||
      lowerKey.includes('accountant')) {
    return 'USER';
  }
  if (lowerKey.startsWith('current') || lowerKey.startsWith('today') ||
      lowerKey.startsWith('practice')) {
    return 'SYSTEM';
  }

  return 'MANUAL';
}

/**
 * Generate source path for data retrieval
 */
function generateSourcePath(key: string, source: string): string | undefined {
  if (source === 'MANUAL') {
    return undefined;
  }

  const lowerKey = key.toLowerCase();
  let cleanKey = key;

  if (lowerKey.startsWith('client')) {
    cleanKey = key.substring(6);
  } else if (lowerKey.startsWith('service')) {
    cleanKey = key.substring(7);
  } else if (lowerKey.startsWith('user')) {
    cleanKey = key.substring(4);
  } else if (lowerKey.startsWith('company')) {
    cleanKey = key.substring(7);
  }

  if (cleanKey.length > 0) {
    cleanKey = cleanKey.charAt(0).toLowerCase() + cleanKey.slice(1);
  }

  switch (source) {
    case 'CLIENT':
      return `client.${cleanKey || key}`;
    case 'SERVICE':
      return `service.${cleanKey || key}`;
    case 'USER':
      return `user.${cleanKey || key}`;
    case 'SYSTEM':
      return `system.${cleanKey || key}`;
    default:
      return undefined;
  }
}

async function main() {
  console.log('Starting template migration...\n');

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

      // Copy file to storage
      const targetPath = path.join(filesDir, templateDef.fileName);
      await fs.copyFile(sourcePath, targetPath);
      console.log(`  ✓ Copied file to storage`);

      // Extract placeholders from template content (for MD files)
      let extractedPlaceholders: PlaceholderDefinition[] = [];
      if (templateDef.fileFormat === 'MD') {
        try {
          const content = await fs.readFile(sourcePath, 'utf8');
          extractedPlaceholders = extractPlaceholdersFromContent(content);
          console.log(`  ✓ Extracted ${extractedPlaceholders.length} placeholders from template`);
        } catch (error: any) {
          console.warn(`  ⚠️  Could not extract placeholders: ${error.message}`);
        }
      }

      // Use predefined placeholders if available, otherwise use extracted ones
      const placeholders = templateDef.placeholders.length > 0 
        ? templateDef.placeholders 
        : extractedPlaceholders;

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
        placeholders: placeholders,
        version: 1,
        isActive: true,
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          tags: templateDef.tags,
          author: 'MDJ Consultants',
          usageCount: 0,
        },
      };

      // Save metadata to JSON file
      const metadataPath = path.join(metadataDir, `${templateId}.json`);
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      console.log(`  ✓ Created metadata record: ${templateId}`);

      successCount++;
      console.log(`  ✅ Successfully migrated: ${templateDef.name}\n`);
    } catch (error: any) {
      console.error(`  ❌ Error migrating ${templateDef.fileName}:`, error);
      errorCount++;
      errors.push(`${templateDef.fileName}: ${error.message}`);
    }
  }

  // Update the templates index
  try {
    console.log('Updating templates index...');
    const indexPath = path.join(process.cwd(), 'storage/indexes/templates.json');
    
    // Read all metadata files
    const metadataFiles = await fs.readdir(metadataDir);
    const templates: any[] = [];
    
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
    const index = {
      templates: templates,
      lastUpdated: new Date().toISOString(),
    };
    
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
}

// Run the migration
main().catch(error => {
  console.error('Fatal error during migration:', error);
  process.exit(1);
});

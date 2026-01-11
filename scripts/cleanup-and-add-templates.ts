#!/usr/bin/env ts-node

/**
 * Script to clean up duplicate templates and add missing ones
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

const STORAGE_PATH = 'storage/templates/metadata';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  fileName: string;
  filePath: string;
  fileFormat: string;
  placeholders: any[];
  version: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  metadata?: any;
}

async function cleanupDuplicates() {
  console.log('🧹 Cleaning up duplicate templates...\n');

  const files = await fs.readdir(STORAGE_PATH);
  const templates: Template[] = [];

  // Read all templates
  for (const file of files) {
    if (file.endsWith('.json')) {
      const content = await fs.readFile(path.join(STORAGE_PATH, file), 'utf8');
      templates.push(JSON.parse(content));
    }
  }

  console.log(`Found ${templates.length} total templates\n`);

  // Group by name
  const grouped = new Map<string, Template[]>();
  templates.forEach(t => {
    const existing = grouped.get(t.name) || [];
    existing.push(t);
    grouped.set(t.name, existing);
  });

  // Keep only the newest version of each template
  const toKeep = new Set<string>();
  const toDelete: string[] = [];

  grouped.forEach((temps, name) => {
    if (temps.length > 1) {
      console.log(`📋 ${name}: ${temps.length} copies found`);
      
      // Sort by creation date (newest first)
      temps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Keep the newest one
      toKeep.add(temps[0].id);
      console.log(`   ✅ Keeping: ${temps[0].id} (${temps[0].createdAt})`);
      
      // Mark others for deletion
      for (let i = 1; i < temps.length; i++) {
        toDelete.push(temps[i].id);
        console.log(`   ❌ Deleting: ${temps[i].id} (${temps[i].createdAt})`);
      }
      console.log('');
    } else {
      toKeep.add(temps[0].id);
    }
  });

  // Delete duplicates
  console.log(`\n🗑️  Deleting ${toDelete.length} duplicate templates...\n`);
  for (const id of toDelete) {
    const filePath = path.join(STORAGE_PATH, `${id}.json`);
    await fs.unlink(filePath);
    console.log(`   Deleted: ${id}`);
  }

  console.log(`\n✅ Cleanup complete! Kept ${toKeep.size} unique templates\n`);
  return toKeep.size;
}

async function addMissingTemplates() {
  console.log('➕ Adding missing templates...\n');

  const newTemplates = [
    {
      name: 'Letter of Engagement',
      description: 'Professional engagement letter for new client onboarding and service agreements',
      category: 'ENGAGEMENT',
      fileName: 'Letter_of_Engagement.docx',
      content: `# Letter of Engagement

**Date:** {{date}}

**Client Name:** {{client_name}}
**Client Address:** {{client_address}}

Dear {{client_name}},

## Engagement for Professional Services

We are pleased to confirm our engagement to provide professional accounting and tax services to you. This letter sets out the terms of our engagement and the nature and scope of the services we will provide.

### Services to be Provided

We will provide the following services:

{{services_list}}

### Our Responsibilities

- Maintain professional standards and comply with applicable regulations
- Provide timely and accurate services
- Maintain confidentiality of your information
- Communicate clearly about our work and any issues that arise

### Your Responsibilities

- Provide complete and accurate information
- Respond promptly to our requests
- Review and approve our work in a timely manner
- Pay fees as agreed

### Fees and Payment Terms

Our fees for these services will be {{fee_structure}}.

Payment terms: {{payment_terms}}

### Term and Termination

This engagement will continue until terminated by either party with {{notice_period}} written notice.

### Acceptance

Please sign and return a copy of this letter to indicate your acceptance of these terms.

Yours sincerely,

**{{firm_name}}**

---

**Client Acceptance:**

Signed: _________________  
Name: {{client_name}}  
Date: _________________`,
      placeholders: [
        { key: 'date', label: 'Date', type: 'date', required: true },
        { key: 'client_name', label: 'Client Name', type: 'text', required: true, source: 'client', sourcePath: 'name' },
        { key: 'client_address', label: 'Client Address', type: 'text', required: true, source: 'client', sourcePath: 'address' },
        { key: 'services_list', label: 'Services List', type: 'textarea', required: true },
        { key: 'fee_structure', label: 'Fee Structure', type: 'text', required: true },
        { key: 'payment_terms', label: 'Payment Terms', type: 'text', required: true, defaultValue: 'Payment due within 30 days of invoice' },
        { key: 'notice_period', label: 'Notice Period', type: 'text', required: true, defaultValue: '30 days' },
        { key: 'firm_name', label: 'Firm Name', type: 'text', required: true, defaultValue: 'MDJ Consultants' },
      ],
      tags: ['engagement', 'onboarding', 'contract', 'terms'],
    },
    {
      name: 'Welcome Letter',
      description: 'Welcome letter for new clients to introduce your firm and services',
      category: 'ENGAGEMENT',
      fileName: 'Welcome_Letter.docx',
      content: `# Welcome to {{firm_name}}

**Date:** {{date}}

**{{client_name}}**  
{{client_address}}

Dear {{client_name}},

## Welcome to Our Practice

We are delighted to welcome you as a new client of {{firm_name}}. We look forward to working with you and helping you achieve your financial and business goals.

### About Our Firm

{{firm_description}}

### Your Dedicated Team

Your primary contact will be:

**{{contact_name}}**  
{{contact_title}}  
Email: {{contact_email}}  
Phone: {{contact_phone}}

### Getting Started

To help us serve you better, we will need:

1. {{required_item_1}}
2. {{required_item_2}}
3. {{required_item_3}}

### Our Commitment to You

- **Responsive Service:** We aim to respond to all queries within 24 hours
- **Proactive Advice:** We'll keep you informed of relevant changes and opportunities
- **Clear Communication:** We explain complex matters in plain language
- **Confidentiality:** Your information is always kept secure and confidential

### Next Steps

{{next_steps}}

### Contact Us

If you have any questions or need assistance, please don't hesitate to contact us:

**{{firm_name}}**  
Email: {{firm_email}}  
Phone: {{firm_phone}}  
Website: {{firm_website}}

We look forward to a long and successful relationship with you.

Yours sincerely,

**{{signatory_name}}**  
{{signatory_title}}  
{{firm_name}}`,
      placeholders: [
        { key: 'date', label: 'Date', type: 'date', required: true },
        { key: 'client_name', label: 'Client Name', type: 'text', required: true, source: 'client', sourcePath: 'name' },
        { key: 'client_address', label: 'Client Address', type: 'text', required: true, source: 'client', sourcePath: 'address' },
        { key: 'firm_name', label: 'Firm Name', type: 'text', required: true, defaultValue: 'MDJ Consultants' },
        { key: 'firm_description', label: 'Firm Description', type: 'textarea', required: true, defaultValue: 'We are a professional accounting firm specializing in tax, compliance, and business advisory services.' },
        { key: 'contact_name', label: 'Contact Name', type: 'text', required: true },
        { key: 'contact_title', label: 'Contact Title', type: 'text', required: true },
        { key: 'contact_email', label: 'Contact Email', type: 'email', required: true },
        { key: 'contact_phone', label: 'Contact Phone', type: 'text', required: true },
        { key: 'required_item_1', label: 'Required Item 1', type: 'text', required: false, defaultValue: 'Recent financial statements' },
        { key: 'required_item_2', label: 'Required Item 2', type: 'text', required: false, defaultValue: 'Previous tax returns' },
        { key: 'required_item_3', label: 'Required Item 3', type: 'text', required: false, defaultValue: 'Company registration documents' },
        { key: 'next_steps', label: 'Next Steps', type: 'textarea', required: true },
        { key: 'firm_email', label: 'Firm Email', type: 'email', required: true },
        { key: 'firm_phone', label: 'Firm Phone', type: 'text', required: true },
        { key: 'firm_website', label: 'Firm Website', type: 'text', required: false },
        { key: 'signatory_name', label: 'Signatory Name', type: 'text', required: true },
        { key: 'signatory_title', label: 'Signatory Title', type: 'text', required: true },
      ],
      tags: ['welcome', 'onboarding', 'introduction', 'engagement'],
    },
  ];

  let added = 0;
  for (const template of newTemplates) {
    const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const templateData = {
      id,
      name: template.name,
      description: template.description,
      category: template.category,
      fileName: template.fileName,
      filePath: `templates/files/${template.fileName}`,
      fileFormat: 'DOCX',
      placeholders: template.placeholders,
      version: 1,
      isActive: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        tags: template.tags,
        author: 'MDJ Consultants',
        usageCount: 0,
      },
    };

    // Save metadata
    const metadataPath = path.join(STORAGE_PATH, `${id}.json`);
    await fs.writeFile(metadataPath, JSON.stringify(templateData, null, 2));

    // Save content file
    const filesDir = 'storage/templates/files';
    const contentPath = path.join(filesDir, template.fileName.replace('.docx', '.md'));
    await fs.writeFile(contentPath, template.content);

    console.log(`✅ Added: ${template.name}`);
    console.log(`   ID: ${id}`);
    console.log(`   Category: ${template.category}`);
    console.log(`   Placeholders: ${template.placeholders.length}`);
    console.log('');
    
    added++;
  }

  console.log(`✅ Added ${added} new templates\n`);
  return added;
}

async function main() {
  console.log('🚀 Template Cleanup and Addition Script\n');
  console.log('============================================================\n');

  try {
    // Step 1: Clean up duplicates
    const uniqueCount = await cleanupDuplicates();

    // Step 2: Add missing templates
    const addedCount = await addMissingTemplates();

    console.log('============================================================');
    console.log('✅ COMPLETE\n');
    console.log(`Final template count: ${uniqueCount + addedCount}`);
    console.log(`  - Unique existing: ${uniqueCount}`);
    console.log(`  - Newly added: ${addedCount}`);
    console.log('============================================================\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

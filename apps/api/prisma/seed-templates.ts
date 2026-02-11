import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

const templates = [
  {
    name: 'Client Engagement Letter',
    description: 'Professional engagement letter for new client onboarding with service scope, fees, and terms',
    category: 'ENGAGEMENT',
    type: 'DOCUMENT',
    content: `Dear {{clientName}},

# Engagement Letter

We are pleased to confirm our appointment as your professional advisors. This letter sets out the terms of our engagement.

## Services to be Provided

We will provide the following services:
{{#each services}}
- {{this.name}}: {{this.description}}
{{/each}}

## Fees and Payment Terms

Our fees for these services are:
- Annual fee: £{{annualFee}}
- Payment frequency: {{paymentFrequency}}
- Payment terms: {{paymentTerms}}

## Terms and Conditions

1. **Scope of Work**: Our services are limited to those described above
2. **Professional Standards**: We will perform our work in accordance with professional standards
3. **Confidentiality**: All information will be treated as confidential
4. **Data Protection**: We comply with GDPR and data protection regulations

## Acceptance

Please sign and return a copy of this letter to confirm your acceptance of these terms.

Yours sincerely,

{{practiceManagerName}}
{{practiceName}}

---
Client Acceptance:

Signed: _________________ Date: _________________

Name: {{clientName}}`,
    placeholders: [
      { key: 'clientName', label: 'Client Name', type: 'text', required: true },
      { key: 'services', label: 'Services', type: 'array', required: true },
      { key: 'annualFee', label: 'Annual Fee', type: 'number', required: true },
      { key: 'paymentFrequency', label: 'Payment Frequency', type: 'text', required: true },
      { key: 'paymentTerms', label: 'Payment Terms', type: 'text', required: true },
      { key: 'practiceManagerName', label: 'Practice Manager Name', type: 'text', required: true },
      { key: 'practiceName', label: 'Practice Name', type: 'text', required: true },
    ],
    metadata: {
      tags: ['engagement', 'onboarding', 'contract'],
      version: '1.0',
      author: 'System',
    },
  },
  {
    name: 'Client Onboarding Pack',
    description: 'Welcome pack for new clients with process timeline, document checklist, and contact information',
    category: 'CLIENT',
    type: 'DOCUMENT',
    content: `# Welcome to {{practiceName}}

Dear {{clientName}},

Welcome! We're delighted to have you as a client. This pack contains everything you need to get started.

## Getting Started Timeline

**Step 1: Initial Setup (Week 1)**
- Complete client information form
- Provide required documentation
- Set up secure portal access

**Step 2: Service Configuration (Week 2)**
- Review service requirements
- Configure accounting systems
- Schedule regular meetings

**Step 3: Go Live (Week 3)**
- Finalize all setup
- Begin regular service delivery
- Establish communication channels

## Required Documents Checklist

Please provide the following documents:
- [ ] Certificate of Incorporation
- [ ] Memorandum and Articles of Association
- [ ] Latest filed accounts (if applicable)
- [ ] Bank statements (last 3 months)
- [ ] VAT registration certificate (if applicable)
- [ ] PAYE registration (if applicable)

## Your Contact Team

**Your Account Manager**: {{accountManagerName}}
- Email: {{accountManagerEmail}}
- Phone: {{accountManagerPhone}}

**Practice Contact**:
- Email: {{practiceEmail}}
- Phone: {{practicePhone}}
- Address: {{practiceAddress}}

## Next Steps

1. Review and sign the engagement letter
2. Complete the client information form
3. Upload required documents to the secure portal
4. Schedule your initial consultation

We look forward to working with you!

Best regards,
{{practiceName}} Team`,
    placeholders: [
      { key: 'practiceName', label: 'Practice Name', type: 'text', required: true },
      { key: 'clientName', label: 'Client Name', type: 'text', required: true },
      { key: 'accountManagerName', label: 'Account Manager Name', type: 'text', required: true },
      { key: 'accountManagerEmail', label: 'Account Manager Email', type: 'email', required: true },
      { key: 'accountManagerPhone', label: 'Account Manager Phone', type: 'text', required: true },
      { key: 'practiceEmail', label: 'Practice Email', type: 'email', required: true },
      { key: 'practicePhone', label: 'Practice Phone', type: 'text', required: true },
      { key: 'practiceAddress', label: 'Practice Address', type: 'text', required: true },
    ],
    metadata: {
      tags: ['onboarding', 'welcome', 'checklist'],
      version: '1.0',
      author: 'System',
    },
  },
  {
    name: 'Tax Advisory Letter',
    description: 'Professional tax advisory letter with calculations, recommendations, and action items',
    category: 'TAX',
    type: 'DOCUMENT',
    content: `# Tax Advisory Letter

Date: {{currentDate}}

Dear {{clientName}},

## Tax Year {{taxYear}} - Advisory Summary

Following our review of your tax position for the year ending {{yearEnd}}, we are pleased to provide our recommendations.

## Tax Calculation Summary

**Income Tax**:
- Total Income: £{{totalIncome}}
- Taxable Income: £{{taxableIncome}}
- Tax Liability: £{{taxLiability}}

**National Insurance**:
- Class 1/2 NI: £{{class1NI}}
- Class 4 NI: £{{class4NI}}

**Total Tax Due**: £{{totalTaxDue}}

## Key Recommendations

{{#each recommendations}}
### {{this.title}}
{{this.description}}

**Potential Saving**: £{{this.saving}}
**Action Required**: {{this.action}}
{{/each}}

## Action Items

Please complete the following by {{deadline}}:
{{#each actionItems}}
- [ ] {{this.description}} (Due: {{this.dueDate}})
{{/each}}

## Important Deadlines

- Self Assessment filing deadline: 31 January {{nextYear}}
- Payment on account due: 31 January {{nextYear}}
- Second payment on account: 31 July {{nextYear}}

## Disclaimer

This advice is based on current tax legislation and your circumstances as understood. Tax laws are subject to change. Please contact us if your circumstances change.

If you have any questions, please don't hesitate to contact us.

Yours sincerely,

{{advisorName}}
{{practiceName}}`,
    placeholders: [
      { key: 'currentDate', label: 'Current Date', type: 'date', required: true },
      { key: 'clientName', label: 'Client Name', type: 'text', required: true },
      { key: 'taxYear', label: 'Tax Year', type: 'text', required: true },
      { key: 'yearEnd', label: 'Year End Date', type: 'date', required: true },
      { key: 'totalIncome', label: 'Total Income', type: 'number', required: true },
      { key: 'taxableIncome', label: 'Taxable Income', type: 'number', required: true },
      { key: 'taxLiability', label: 'Tax Liability', type: 'number', required: true },
      { key: 'class1NI', label: 'Class 1/2 NI', type: 'number', required: true },
      { key: 'class4NI', label: 'Class 4 NI', type: 'number', required: true },
      { key: 'totalTaxDue', label: 'Total Tax Due', type: 'number', required: true },
      { key: 'recommendations', label: 'Recommendations', type: 'array', required: false },
      { key: 'actionItems', label: 'Action Items', type: 'array', required: false },
      { key: 'deadline', label: 'Deadline', type: 'date', required: true },
      { key: 'nextYear', label: 'Next Year', type: 'text', required: true },
      { key: 'advisorName', label: 'Advisor Name', type: 'text', required: true },
      { key: 'practiceName', label: 'Practice Name', type: 'text', required: true },
    ],
    metadata: {
      tags: ['tax', 'advisory', 'calculations'],
      version: '1.0',
      author: 'System',
    },
  },
  {
    name: 'Compliance Reminder Letter',
    description: 'Reminder letter for upcoming compliance deadlines with required documents and actions',
    category: 'COMPLIANCE',
    type: 'DOCUMENT',
    content: `# Compliance Reminder

Date: {{currentDate}}

Dear {{clientName}},

## Upcoming Compliance Deadline: {{deadlineDate}}

This is a reminder that the following compliance requirement is due soon:

**{{complianceType}}** - Due: {{deadlineDate}}

## Required Actions

To meet this deadline, please complete the following:

{{#each requiredActions}}
- [ ] {{this.description}}
  {{#if this.notes}}Notes: {{this.notes}}{{/if}}
{{/each}}

## Required Documents

Please provide the following documents:

{{#each requiredDocuments}}
- [ ] {{this.name}}
  {{#if this.description}}({{this.description}}){{/if}}
{{/each}}

## Timeline

- **Today**: {{currentDate}}
- **Information needed by**: {{informationDeadline}}
- **Filing deadline**: {{deadlineDate}}

{{#if isOverdue}}
⚠️ **URGENT**: This deadline is overdue. Please contact us immediately.
{{else if isUrgent}}
⚠️ **URGENT**: This deadline is approaching soon. Please prioritize this matter.
{{/if}}

## Consequences of Missing Deadline

- Late filing penalties: £{{latePenalty}}
- Daily penalties may apply after {{penaltyStartDate}}
- Potential interest charges on late payments

## Next Steps

1. Review the required actions and documents above
2. Gather all necessary information
3. Upload documents to the secure portal or email to {{practiceEmail}}
4. Contact us if you have any questions

Please don't hesitate to contact us if you need any assistance.

Yours sincerely,

{{contactName}}
{{practiceName}}
Phone: {{practicePhone}}
Email: {{practiceEmail}}`,
    placeholders: [
      { key: 'currentDate', label: 'Current Date', type: 'date', required: true },
      { key: 'clientName', label: 'Client Name', type: 'text', required: true },
      { key: 'deadlineDate', label: 'Deadline Date', type: 'date', required: true },
      { key: 'complianceType', label: 'Compliance Type', type: 'text', required: true },
      { key: 'requiredActions', label: 'Required Actions', type: 'array', required: true },
      { key: 'requiredDocuments', label: 'Required Documents', type: 'array', required: true },
      { key: 'informationDeadline', label: 'Information Deadline', type: 'date', required: true },
      { key: 'isOverdue', label: 'Is Overdue', type: 'boolean', required: false },
      { key: 'isUrgent', label: 'Is Urgent', type: 'boolean', required: false },
      { key: 'latePenalty', label: 'Late Penalty Amount', type: 'number', required: true },
      { key: 'penaltyStartDate', label: 'Penalty Start Date', type: 'date', required: true },
      { key: 'contactName', label: 'Contact Name', type: 'text', required: true },
      { key: 'practiceName', label: 'Practice Name', type: 'text', required: true },
      { key: 'practicePhone', label: 'Practice Phone', type: 'text', required: true },
      { key: 'practiceEmail', label: 'Practice Email', type: 'email', required: true },
    ],
    metadata: {
      tags: ['compliance', 'reminder', 'deadline'],
      version: '1.0',
      author: 'System',
    },
  },
  {
    name: 'Annual Review Report',
    description: 'Comprehensive annual review report with financial highlights, analysis, and recommendations',
    category: 'REPORTS',
    type: 'DOCUMENT',
    content: `# Annual Review Report
## {{clientName}} - Year Ending {{yearEnd}}

Date: {{reportDate}}

---

## Executive Summary

This report summarizes the financial performance and key developments for {{clientName}} for the year ending {{yearEnd}}.

**Key Highlights**:
- Revenue: £{{revenue}} ({{revenueChange}}% vs prior year)
- Gross Profit: £{{grossProfit}} ({{grossProfitMargin}}% margin)
- Net Profit: £{{netProfit}} ({{netProfitMargin}}% margin)
- Total Assets: £{{totalAssets}}

## Financial Performance

### Revenue Analysis
Total revenue for the year was £{{revenue}}, representing a {{revenueChange}}% {{#if revenueIncrease}}increase{{else}}decrease{{/if}} compared to the prior year.

{{#if revenueCommentary}}
**Commentary**: {{revenueCommentary}}
{{/if}}

### Profitability
The business achieved a net profit of £{{netProfit}}, with a net profit margin of {{netProfitMargin}}%.

### Balance Sheet Strength
- Current Assets: £{{currentAssets}}
- Current Liabilities: £{{currentLiabilities}}
- Current Ratio: {{currentRatio}}
- Net Assets: £{{netAssets}}

## Year-over-Year Comparison

| Metric | {{currentYear}} | {{priorYear}} | Change |
|--------|-----------------|---------------|--------|
| Revenue | £{{revenue}} | £{{priorRevenue}} | {{revenueChange}}% |
| Gross Profit | £{{grossProfit}} | £{{priorGrossProfit}} | {{grossProfitChange}}% |
| Net Profit | £{{netProfit}} | £{{priorNetProfit}} | {{netProfitChange}}% |
| Total Assets | £{{totalAssets}} | £{{priorTotalAssets}} | {{assetsChange}}% |

## Key Recommendations

{{#each recommendations}}
### {{@index}}. {{this.title}}
{{this.description}}

**Priority**: {{this.priority}}
**Expected Impact**: {{this.impact}}
{{/each}}

## Tax Position

- Corporation Tax: £{{corporationTax}}
- VAT Position: {{vatPosition}}
- PAYE/NI: £{{payeNI}}

## Next Steps

{{#each nextSteps}}
- {{this.description}} (Target: {{this.targetDate}})
{{/each}}

## Conclusion

{{conclusion}}

---

**Prepared by**: {{preparedBy}}
**Reviewed by**: {{reviewedBy}}
**Date**: {{reportDate}}

{{practiceName}}
{{practiceAddress}}
Phone: {{practicePhone}}
Email: {{practiceEmail}}`,
    placeholders: [
      { key: 'clientName', label: 'Client Name', type: 'text', required: true },
      { key: 'yearEnd', label: 'Year End Date', type: 'date', required: true },
      { key: 'reportDate', label: 'Report Date', type: 'date', required: true },
      { key: 'revenue', label: 'Revenue', type: 'number', required: true },
      { key: 'revenueChange', label: 'Revenue Change %', type: 'number', required: true },
      { key: 'grossProfit', label: 'Gross Profit', type: 'number', required: true },
      { key: 'grossProfitMargin', label: 'Gross Profit Margin %', type: 'number', required: true },
      { key: 'netProfit', label: 'Net Profit', type: 'number', required: true },
      { key: 'netProfitMargin', label: 'Net Profit Margin %', type: 'number', required: true },
      { key: 'totalAssets', label: 'Total Assets', type: 'number', required: true },
      { key: 'currentAssets', label: 'Current Assets', type: 'number', required: true },
      { key: 'currentLiabilities', label: 'Current Liabilities', type: 'number', required: true },
      { key: 'currentRatio', label: 'Current Ratio', type: 'number', required: true },
      { key: 'netAssets', label: 'Net Assets', type: 'number', required: true },
      { key: 'currentYear', label: 'Current Year', type: 'text', required: true },
      { key: 'priorYear', label: 'Prior Year', type: 'text', required: true },
      { key: 'recommendations', label: 'Recommendations', type: 'array', required: false },
      { key: 'corporationTax', label: 'Corporation Tax', type: 'number', required: true },
      { key: 'vatPosition', label: 'VAT Position', type: 'text', required: true },
      { key: 'payeNI', label: 'PAYE/NI', type: 'number', required: true },
      { key: 'nextSteps', label: 'Next Steps', type: 'array', required: false },
      { key: 'conclusion', label: 'Conclusion', type: 'text', required: true },
      { key: 'preparedBy', label: 'Prepared By', type: 'text', required: true },
      { key: 'reviewedBy', label: 'Reviewed By', type: 'text', required: true },
      { key: 'practiceName', label: 'Practice Name', type: 'text', required: true },
      { key: 'practiceAddress', label: 'Practice Address', type: 'text', required: true },
      { key: 'practicePhone', label: 'Practice Phone', type: 'text', required: true },
      { key: 'practiceEmail', label: 'Practice Email', type: 'email', required: true },
    ],
    metadata: {
      tags: ['annual', 'review', 'report', 'financial'],
      version: '1.0',
      author: 'System',
    },
  },
  {
    name: 'HMRC Correspondence Letter',
    description: 'Professional letter template for HMRC correspondence and queries',
    category: 'HMRC',
    type: 'DOCUMENT',
    content: `{{practiceLetterhead}}

Date: {{currentDate}}

HM Revenue & Customs
{{hmrcOfficeAddress}}

Dear Sir/Madam,

**Re: {{clientName}} - {{clientReference}}**
**HMRC Reference: {{hmrcReference}}**

{{#if subject}}
**Subject: {{subject}}**
{{/if}}

{{letterBody}}

{{#if attachments}}
## Enclosed Documents

Please find enclosed the following documents:
{{#each attachments}}
- {{this.name}}{{#if this.description}} - {{this.description}}{{/if}}
{{/each}}
{{/if}}

{{#if requestedAction}}
## Action Required

{{requestedAction}}
{{/if}}

If you require any further information or clarification, please do not hesitate to contact me.

Yours faithfully,

{{senderName}}
{{senderTitle}}
{{practiceName}}

Phone: {{practicePhone}}
Email: {{practiceEmail}}
Reference: {{ourReference}}`,
    placeholders: [
      { key: 'practiceLetterhead', label: 'Practice Letterhead', type: 'text', required: false },
      { key: 'currentDate', label: 'Current Date', type: 'date', required: true },
      { key: 'hmrcOfficeAddress', label: 'HMRC Office Address', type: 'text', required: true },
      { key: 'clientName', label: 'Client Name', type: 'text', required: true },
      { key: 'clientReference', label: 'Client Reference', type: 'text', required: true },
      { key: 'hmrcReference', label: 'HMRC Reference', type: 'text', required: true },
      { key: 'subject', label: 'Subject', type: 'text', required: false },
      { key: 'letterBody', label: 'Letter Body', type: 'text', required: true },
      { key: 'attachments', label: 'Attachments', type: 'array', required: false },
      { key: 'requestedAction', label: 'Requested Action', type: 'text', required: false },
      { key: 'senderName', label: 'Sender Name', type: 'text', required: true },
      { key: 'senderTitle', label: 'Sender Title', type: 'text', required: true },
      { key: 'practiceName', label: 'Practice Name', type: 'text', required: true },
      { key: 'practicePhone', label: 'Practice Phone', type: 'text', required: true },
      { key: 'practiceEmail', label: 'Practice Email', type: 'email', required: true },
      { key: 'ourReference', label: 'Our Reference', type: 'text', required: true },
    ],
    metadata: {
      tags: ['hmrc', 'correspondence', 'official'],
      version: '1.0',
      author: 'System',
    },
  },
  {
    name: 'VAT Return Cover Letter',
    description: 'Cover letter for VAT return submissions with summary and supporting information',
    category: 'VAT',
    type: 'DOCUMENT',
    content: `# VAT Return Submission
## {{clientName}} - Period Ending {{periodEnd}}

Date: {{submissionDate}}

HM Revenue & Customs
VAT Central Unit

Dear Sir/Madam,

**VAT Registration Number**: {{vatNumber}}
**Period**: {{periodStart}} to {{periodEnd}}

## VAT Return Summary

We are pleased to submit the VAT return for the above period.

| Box | Description | Amount |
|-----|-------------|--------|
| 1 | VAT due on sales | £{{box1}} |
| 2 | VAT due on acquisitions | £{{box2}} |
| 3 | Total VAT due | £{{box3}} |
| 4 | VAT reclaimed on purchases | £{{box4}} |
| 5 | Net VAT to pay/(reclaim) | £{{box5}} |
| 6 | Total sales (excl VAT) | £{{box6}} |
| 7 | Total purchases (excl VAT) | £{{box7}} |
| 8 | Total EC supplies | £{{box8}} |
| 9 | Total EC acquisitions | £{{box9}} |

{{#if box5Positive}}
**Amount Due**: £{{box5}}
**Payment Due Date**: {{paymentDueDate}}
{{else}}
**Amount to be Reclaimed**: £{{box5Abs}}
{{/if}}

## Supporting Information

{{#if notes}}
{{notes}}
{{/if}}

{{#if adjustments}}
### Adjustments Made
{{#each adjustments}}
- {{this.description}}: £{{this.amount}}
{{/each}}
{{/if}}

## Payment Details

{{#if box5Positive}}
Payment will be made via {{paymentMethod}} by {{paymentDueDate}}.
{{/if}}

If you have any queries regarding this return, please contact us.

Yours faithfully,

{{submitterName}}
{{practiceName}}
Phone: {{practicePhone}}
Email: {{practiceEmail}}`,
    placeholders: [
      { key: 'clientName', label: 'Client Name', type: 'text', required: true },
      { key: 'periodEnd', label: 'Period End Date', type: 'date', required: true },
      { key: 'submissionDate', label: 'Submission Date', type: 'date', required: true },
      { key: 'vatNumber', label: 'VAT Number', type: 'text', required: true },
      { key: 'periodStart', label: 'Period Start Date', type: 'date', required: true },
      { key: 'box1', label: 'Box 1 - VAT on Sales', type: 'number', required: true },
      { key: 'box2', label: 'Box 2 - VAT on Acquisitions', type: 'number', required: true },
      { key: 'box3', label: 'Box 3 - Total VAT Due', type: 'number', required: true },
      { key: 'box4', label: 'Box 4 - VAT Reclaimed', type: 'number', required: true },
      { key: 'box5', label: 'Box 5 - Net VAT', type: 'number', required: true },
      { key: 'box6', label: 'Box 6 - Total Sales', type: 'number', required: true },
      { key: 'box7', label: 'Box 7 - Total Purchases', type: 'number', required: true },
      { key: 'box8', label: 'Box 8 - EC Supplies', type: 'number', required: true },
      { key: 'box9', label: 'Box 9 - EC Acquisitions', type: 'number', required: true },
      { key: 'paymentDueDate', label: 'Payment Due Date', type: 'date', required: false },
      { key: 'paymentMethod', label: 'Payment Method', type: 'text', required: false },
      { key: 'notes', label: 'Additional Notes', type: 'text', required: false },
      { key: 'adjustments', label: 'Adjustments', type: 'array', required: false },
      { key: 'submitterName', label: 'Submitter Name', type: 'text', required: true },
      { key: 'practiceName', label: 'Practice Name', type: 'text', required: true },
      { key: 'practicePhone', label: 'Practice Phone', type: 'text', required: true },
      { key: 'practiceEmail', label: 'Practice Email', type: 'email', required: true },
    ],
    metadata: {
      tags: ['vat', 'return', 'submission'],
      version: '1.0',
      author: 'System',
    },
  },
];

async function main() {
  console.log('🌱 Seeding templates...');

  for (const template of templates) {
    const created = await prisma.template.create({
      data: {
        name: template.name,
        description: template.description,
        category: template.category as any,
        type: template.type as any,
        content: template.content,
        placeholders: template.placeholders as any,
        metadata: template.metadata as any,
      },
    });
    console.log(`✅ Created template: ${created.name} (${created.id})`);
  }

  console.log(`\n✨ Successfully seeded ${templates.length} templates!`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding templates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

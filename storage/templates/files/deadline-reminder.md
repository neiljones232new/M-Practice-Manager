# Important Deadline Reminder

**Date:** {{today}}  
**Client Reference:** {{client.ref}}  
**Deadline Type:** {{deadline.type}}

---

Dear {{client.contactName}},

## Upcoming Deadline Alert

This is a reminder that you have an important compliance deadline approaching:

### {{deadline.type}}

- **Due Date:** {{formatDate deadline.dueDate 'DD MMMM YYYY'}}
- **Days Remaining:** {{daysUntilDue deadline.dueDate}}
- **Status:** {{deadline.status}}

{{#if deadline.description}}
**Details:** {{deadline.description}}
{{/if}}

## What You Need to Do

{{#if deadline.type == 'ANNUAL_ACCOUNTS'}}
1. Provide final year-end figures
2. Review draft accounts
3. Approve for filing
4. Sign accounts and tax return

**Documents Required:**
- Bank statements (year-end)
- Invoices and receipts
- Payroll records
- Asset register updates
{{/if}}

{{#if deadline.type == 'VAT_RETURN'}}
1. Provide sales and purchase records
2. Review VAT calculation
3. Approve for submission

**Documents Required:**
- Sales invoices
- Purchase invoices
- Bank statements
- Import/export documentation
{{/if}}

{{#if deadline.type == 'CORPORATION_TAX'}}
1. Review CT600 computation
2. Approve tax return
3. Arrange payment if required

**Payment Due:** {{formatDate deadline.paymentDue 'DD/MM/YYYY'}}
{{/if}}

{{#if deadline.type == 'CONFIRMATION_STATEMENT'}}
1. Confirm company details are current
2. Review officer and shareholder information
3. Approve for filing

**Filing Fee:** £{{deadline.filingFee}}
{{/if}}

## Action Required By

{{#if daysUntilDue deadline.dueDate < 7}}
⚠️ **URGENT** - Please respond within {{daysUntilDue deadline.dueDate}} days
{{else if daysUntilDue deadline.dueDate < 14}}
⚡ **PRIORITY** - Please respond within 2 weeks
{{else}}
📅 **SCHEDULED** - Please respond at your earliest convenience
{{/if}}

## How to Respond

Please send the required information to:

- **Email:** {{practice.email}}
- **Upload Portal:** {{practice.portalUrl}}
- **Phone:** {{practice.phone}} (for queries)

{{#if relatedTasks}}
## Related Tasks

{{#each relatedTasks}}
- {{this.title}} - {{this.status}}
{{/each}}
{{/if}}

## Penalties for Late Filing

{{#if deadline.penalties}}
Please note that late filing may result in:
- Automatic penalties from £{{deadline.penalties.initial}}
- Daily penalties after {{deadline.penalties.dailyAfterDays}} days
- Potential investigation by HMRC
{{/if}}

## Need Help?

If you need assistance or have questions, please contact us immediately. We're here to help ensure you meet all your obligations on time.

Best regards,

**{{practice.name}}**  
{{practice.address}}  
{{practice.email}} | {{practice.phone}}

---

*Automated reminder from MDJ Practice Manager*

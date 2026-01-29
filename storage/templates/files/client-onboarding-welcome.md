# Welcome to MDJ Practice Manager

**Date:** {{today}}  
**Client Reference:** {{client.ref}}

---

Dear {{client.contactName}},

## Welcome to Our Practice

Thank you for choosing **{{practice.name}}** as your professional advisors. We are delighted to welcome you as a client and look forward to supporting your {{#if client.isCompany}}business{{else}}personal{{/if}} needs.

## Your Account Details

- **Client Reference:** {{client.ref}}
- **Account Manager:** {{practice.defaultContact}}
- **Portfolio:** {{client.portfolioName}}
{{#if client.isCompany}}
- **Company Number:** {{client.registeredNumber}}
- **Incorporation Date:** {{formatDate client.incorporationDate 'DD/MM/YYYY'}}
{{/if}}

## Services We're Providing

{{#each services}}
- **{{this.kind}}** - {{this.frequency}} (£{{this.fee}})
{{/each}}

**Total Annual Fee:** £{{calculateAnnualTotal services}}

## What Happens Next

1. **Document Collection** - We'll request any outstanding documents needed
2. **System Setup** - Your records will be set up in our secure system
3. **Initial Review** - We'll conduct a comprehensive review of your position
4. **Regular Updates** - You'll receive updates as per your service schedule

## Important Deadlines

{{#if upcomingDeadlines}}
{{#each upcomingDeadlines}}
- **{{this.type}}** - Due: {{formatDate this.dueDate 'DD/MM/YYYY'}}
{{/each}}
{{else}}
No immediate deadlines - we'll keep you informed as they approach.
{{/if}}

## Contact Information

If you have any questions, please don't hesitate to contact us:

- **Email:** {{practice.email}}
- **Phone:** {{practice.phone}}
- **Portal:** {{practice.website}}

We look forward to working with you.

Yours sincerely,

**{{practice.name}}**  
{{practice.address}}

---

*This letter was generated automatically by MDJ Practice Manager*

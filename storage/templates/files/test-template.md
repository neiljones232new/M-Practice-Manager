# Client Letter Template

Dear {{clientName}},

We are writing to you regarding your company {{companyName}} (Company Number: {{companyNumber}}).

## Service Details

Your {{serviceType}} service is scheduled for {{date:dueDate:DD/MM/YYYY}}.

The fee for this service is {{currency:serviceFee:£0.00}}.

{{if:hasUTR}}
Your UTR number is: {{utrNumber}}
{{endif}}

## Directors

{{list:directors}}
- {{name}} ({{role}})
{{endlist}}

## Contact Information

Email: {{email}}
Phone: {{phone}}
Address: {{address}}

Thank you for your business.

Yours sincerely,
{{userName}}
{{practiceEmail}}

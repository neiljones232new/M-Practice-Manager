# Handlebars Template Helpers

MDJ Practice Manager supports Handlebars templates with custom helper functions for enhanced letter generation.

## Template Syntax

### Basic Variables
```handlebars
{{clientName}}
{{client.ref}}
{{practice.email}}
```

### Conditionals
```handlebars
{{#if client.isCompany}}
  Company-specific content
{{else}}
  Individual content
{{/if}}

{{#unless client.isActive}}
  Inactive client notice
{{/unless}}
```

### Loops
```handlebars
{{#each services}}
  - {{this.kind}} - {{this.frequency}} (£{{this.fee}})
{{/each}}
```

## Custom Helpers

### Date Formatting
```handlebars
{{formatDate deadline.dueDate 'DD/MM/YYYY'}}
{{formatDate client.incorporationDate 'DD MMMM YYYY'}}
{{formatDate someDate 'DD MMM YYYY'}}
{{formatDate someDate 'YYYY-MM-DD'}}
```

### Today's Date
```handlebars
{{today}}  <!-- Outputs: DD/MM/YYYY -->
```

### Currency Formatting
```handlebars
{{currency 1234.56}}  <!-- Outputs: £1234.56 -->
```

### Calculate Annual Total
```handlebars
{{calculateAnnualTotal services}}  <!-- Sums annualized fees -->
```

### Days Until Due
```handlebars
{{daysUntilDue deadline.dueDate}}  <!-- Returns number of days -->
```

### Comparison Helpers
```handlebars
{{#if (eq status 'ACTIVE')}}Active{{/if}}
{{#if (ne status 'ARCHIVED')}}Not archived{{/if}}
{{#if (lt daysRemaining 7)}}Urgent{{/if}}
{{#if (lte daysRemaining 7)}}Due soon{{/if}}
{{#if (gt amount 1000)}}High value{{/if}}
{{#if (gte amount 1000)}}Minimum met{{/if}}
```

### Logical Helpers
```handlebars
{{#if (and client.isActive client.isCompany)}}
  Active company
{{/if}}

{{#if (or client.isVIP client.isPremium)}}
  Special client
{{/if}}

{{#if (not client.isArchived)}}
  Current client
{{/if}}
```

### String Helpers
```handlebars
{{uppercase clientName}}
{{lowercase email}}
{{capitalize status}}
{{default client.phone 'Not provided'}}
```

### Math Helpers
```handlebars
{{add fee1 fee2}}
{{subtract total discount}}
{{multiply quantity price}}
{{divide total count}}
```

### Array Helpers
```handlebars
{{length services}}  <!-- Number of items -->
{{join tags ', '}}   <!-- Join array with separator -->
```

## Complex Examples

### Conditional with Comparison
```handlebars
{{#if (lt (daysUntilDue deadline.dueDate) 7)}}
⚠️ **URGENT** - Please respond within {{daysUntilDue deadline.dueDate}} days
{{else if (lt (daysUntilDue deadline.dueDate) 14)}}
⚡ **PRIORITY** - Please respond within 2 weeks
{{else}}
📅 **SCHEDULED** - Please respond at your earliest convenience
{{/if}}
```

### Loop with Conditionals
```handlebars
{{#each services}}
### {{this.kind}}
- **Frequency:** {{this.frequency}}
- **Fee:** £{{this.fee}}
{{#if this.firstYearDiscount}}
- **Special Offer:** {{this.firstYearDiscount}}% discount in first year
{{/if}}
{{/each}}
```

### Nested Data Access
```handlebars
{{#if client.isCompany}}
Based on your company profile:
- **Company Type:** {{client.type}}
- **Turnover:** {{client.estimatedTurnover}}
- **Employees:** {{client.employeeCount}}
{{/if}}
```

## Backward Compatibility

The system also supports legacy template syntax:
- `{{if:condition}}...{{endif}}` for conditionals
- `{{list:key}}...{{endlist}}` for loops
- Simple `{{placeholder}}` replacement

Templates are automatically detected and processed with the appropriate engine.

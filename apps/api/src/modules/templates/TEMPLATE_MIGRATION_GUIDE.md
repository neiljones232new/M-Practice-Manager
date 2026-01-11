# Template Migration Guide

## Upgrading from Legacy to Handlebars Syntax

MDJ Practice Manager now supports Handlebars templates with enhanced features. This guide helps you migrate existing templates or create new ones.

## Syntax Comparison

### Simple Placeholders
**Legacy:** `{{clientName}}`  
**Handlebars:** `{{clientName}}` ✅ (Same)

### Conditionals
**Legacy:**
```
{{if:isCompany}}
Company content
{{endif}}
```

**Handlebars:**
```handlebars
{{#if isCompany}}
Company content
{{/if}}
```

**With else:**
```handlebars
{{#if isCompany}}
Company content
{{else}}
Individual content
{{/if}}
```

### Lists/Loops
**Legacy:**
```
{{list:services}}
- {{kind}} - {{fee}}
{{endlist}}
```

**Handlebars:**
```handlebars
{{#each services}}
- {{this.kind}} - {{this.fee}}
{{/each}}
```

## Available Data Structure

When templates are rendered, they receive a flat object with all resolved placeholders:

```javascript
{
  // Client data
  clientName: "ABC Ltd",
  clientRef: "CL001",
  clientContactName: "John Smith",
  clientIsCompany: true,
  clientType: "Limited Company",
  clientRegisteredNumber: "12345678",
  clientIncorporationDate: "2020-01-15",
  
  // Service data (if applicable)
  serviceName: "Annual Accounts",
  serviceFee: "1200",
  serviceFrequency: "Annually",
  
  // System data
  practiceEmail: "info@mdjconsultants.com",
  practiceName: "MDJ Consultants",
  practicePhone: "020 1234 5678",
  
  // Arrays (for loops)
  services: [
    { kind: "Annual Accounts", fee: "1200", frequency: "Annually", annualized: 1200 },
    { kind: "VAT Returns", fee: "100", frequency: "Quarterly", annualized: 400 }
  ],
  
  upcomingDeadlines: [
    { type: "VAT Return", dueDate: "2025-12-31", description: "Q4 VAT" }
  ]
}
```

## Enhanced Features with Handlebars

### 1. Nested Conditionals
```handlebars
{{#if clientIsCompany}}
  {{#if (gt clientEmployeeCount 10)}}
    Large company services available
  {{else}}
    Small company services
  {{/if}}
{{/if}}
```

### 2. Complex Comparisons
```handlebars
{{#if (lt (daysUntilDue deadlineDueDate) 7)}}
  ⚠️ URGENT - Due in {{daysUntilDue deadlineDueDate}} days
{{else if (lt (daysUntilDue deadlineDueDate) 30)}}
  📅 Due soon
{{else}}
  ✓ On track
{{/if}}
```

### 3. Date Formatting
```handlebars
Date: {{formatDate deadlineDueDate 'DD MMMM YYYY'}}
<!-- Output: Date: 25 November 2025 -->
```

### 4. Currency Formatting
```handlebars
Total: {{currency totalFees}}
<!-- Output: Total: £1,234.56 -->
```

### 5. Calculations
```handlebars
Total Annual Investment: £{{calculateAnnualTotal services}}

Subtotal: {{add fee1 fee2}}
After discount: {{subtract total discount}}
```

### 6. Array Operations
```handlebars
You have {{length services}} active services.

Tags: {{join tags ', '}}
```

## Migration Steps

### Step 1: Identify Template Type
Check if your template uses:
- `{{if:condition}}` → Needs migration
- `{{list:key}}` → Needs migration
- Only `{{placeholder}}` → Works with both

### Step 2: Update Conditionals
Replace:
```
{{if:isCompany}}content{{endif}}
```

With:
```handlebars
{{#if isCompany}}content{{/if}}
```

### Step 3: Update Lists
Replace:
```
{{list:services}}
{{kind}}
{{endlist}}
```

With:
```handlebars
{{#each services}}
{{this.kind}}
{{/each}}
```

### Step 4: Add Enhanced Features
Take advantage of new helpers:
```handlebars
{{formatDate date 'DD/MM/YYYY'}}
{{currency amount}}
{{#if (eq status 'ACTIVE')}}...{{/if}}
```

### Step 5: Test
Use the preview feature to test your template before saving.

## Best Practices

1. **Use descriptive variable names** in loops:
   ```handlebars
   {{#each services as |service|}}
     {{service.kind}}
   {{/each}}
   ```

2. **Provide fallback values**:
   ```handlebars
   {{default clientPhone 'Not provided'}}
   ```

3. **Format dates consistently**:
   ```handlebars
   {{formatDate date 'DD/MM/YYYY'}}
   ```

4. **Use helpers for calculations**:
   ```handlebars
   {{calculateAnnualTotal services}}
   ```
   Instead of manual calculation

5. **Keep templates readable**:
   - Use proper indentation
   - Add comments with `{{!-- Comment --}}`
   - Break complex logic into smaller sections

## Backward Compatibility

The system automatically detects template syntax:
- Handlebars syntax (`{{#if}}`, `{{#each}}`) → Uses Handlebars engine
- Legacy syntax (`{{if:}}`, `{{list:}}`) → Uses legacy engine
- Simple placeholders → Works with both

You can gradually migrate templates without breaking existing ones.

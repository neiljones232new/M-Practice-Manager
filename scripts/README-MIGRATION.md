# Compliance Service Links Migration

This document describes the migration script for backfilling `serviceId` links on existing compliance items.

## Overview

The `migrate-compliance-service-links.ts` script matches existing compliance items to their corresponding services based on:
- Client ID matching
- Compliance type to service kind mapping
- Due date proximity (when available)
- Service status (prefers active services)

## Usage

### Dry Run (Preview Changes)

To preview what changes would be made without actually updating any data:

```bash
npm run migrate:compliance-links:dry-run
```

or

```bash
DRY_RUN=1 npm run migrate:compliance-links
```

### Apply Changes

To actually update the compliance items:

```bash
npm run migrate:compliance-links
```

or

```bash
DRY_RUN=0 npm run migrate:compliance-links
```

## Compliance Type to Service Kind Mapping

The script uses the following mappings:

| Compliance Type | Service Kind(s) |
|----------------|-----------------|
| ANNUAL_ACCOUNTS | Annual Accounts |
| CONFIRMATION_STATEMENT | Confirmation Statement |
| VAT_RETURN | VAT Returns |
| CT600 | Corporation Tax |
| SA100 | Self Assessment |
| RTI_SUBMISSION | Payroll |

## Matching Logic

The script follows this logic to find the best matching service:

1. **Filter by Client**: Only consider services for the same client as the compliance item
2. **Filter by Type**: Only consider services whose kind matches the compliance type mapping
3. **Prefer Active Services**: If multiple matches exist, prefer services with status 'ACTIVE'
4. **Match by Due Date**: If the compliance item has a due date, prefer services with the closest due date (within 90 days)
5. **Most Recent**: If no due date match, use the most recently created service

## Output

The script provides detailed output including:

- **Progress**: Shows each compliance item being processed
- **Match Details**: For successful matches, shows the compliance item, matched service, and client
- **Failed Matches**: Lists compliance items that couldn't be matched with reasons
- **Summary Statistics**: Total items, already linked, successful matches, failed matches
- **Type Breakdown**: Match rates by compliance type
- **Failed Match Details**: Detailed list of items that couldn't be matched

### Example Output

```
🔄 Starting compliance item migration...
📁 Storage path: /path/to/storage
🧪 Dry run mode: YES

📥 Loading compliance items...
   Found 28 compliance items
📥 Loading services...
   Found 15 services

🔍 Processing compliance items...

✅ Match found:
   Compliance: C1762903748762c4um0bv7g (ANNUAL_ACCOUNTS)
   Service: service_1762903748780_t6ifgohni (Annual Accounts)
   Client: client_1762903748631_0nfr7lauq
   ⚠️  Would update (dry run mode)

═══════════════════════════════════════════════════════════
📊 Migration Summary
═══════════════════════════════════════════════════════════
Total compliance items: 28
Already linked: 11
Successful matches: 5
Failed matches: 12
Would update: 5 (dry run mode)
═══════════════════════════════════════════════════════════
```

## Failed Matches

Failed matches typically indicate:

1. **Missing Services**: Compliance items exist but no corresponding service has been created for that client
2. **Unmapped Types**: Compliance types that don't have a mapping to service kinds
3. **Inactive Clients**: Compliance items for clients that no longer have active services

### Handling Failed Matches

For failed matches, you can:

1. **Create Missing Services**: Add the appropriate services for clients that have compliance items but no matching services
2. **Update Mappings**: If new compliance types are added, update the mapping in the script
3. **Manual Linking**: Manually set the `serviceId` for compliance items that require special handling

## Safety Features

- **Dry Run Mode**: Default mode that previews changes without applying them
- **Already Linked Check**: Skips compliance items that already have a `serviceId`
- **Detailed Logging**: Comprehensive logging of all operations
- **Statistics**: Clear summary of what was processed and matched

## Requirements

This migration script addresses requirements:
- **9.3**: Validate that serviceId references exist when compliance items reference services
- **9.5**: Maintain referential integrity with related tasks and compliance items

## Technical Details

- **Language**: TypeScript
- **Dependencies**: FileStorageService, SearchService
- **Storage**: File-based JSON storage
- **Execution**: Node.js with ts-node

## Troubleshooting

### Script Fails to Load Compliance Items

Ensure the storage path is correct and the compliance directory exists:
```bash
ls -la storage/compliance/
```

### No Matches Found

Check that:
1. Services exist for the clients with compliance items
2. Service kinds match the expected values in the mapping
3. Services are not all inactive

### TypeScript Errors

Ensure dependencies are installed:
```bash
npm install
```

## Future Enhancements

Potential improvements to the migration script:

1. **Fuzzy Matching**: Use fuzzy string matching for service kinds
2. **Interactive Mode**: Allow manual selection for ambiguous matches
3. **Rollback Support**: Add ability to undo migration
4. **Batch Processing**: Process in batches for large datasets
5. **Custom Mappings**: Allow custom mapping configuration via JSON file

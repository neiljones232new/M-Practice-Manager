import { FileStorageService } from '../apps/api/src/modules/file-storage/file-storage.service';
import { SearchService } from '../apps/api/src/modules/file-storage/search.service';
import { ConfigService } from '@nestjs/config';
import path from 'path';

/**
 * Migration script to backfill serviceId for existing compliance items
 * 
 * This script:
 * 1. Loads all existing compliance items
 * 2. Loads all existing services
 * 3. Matches compliance items to services based on clientId and type mapping
 * 4. Updates compliance items with the matched serviceId
 * 5. Logs successful and failed matches
 * 
 * Requirements: 9.3, 9.5
 */

const STORAGE_PATH = path.resolve(__dirname, '../storage');
const DRY_RUN = process.env.DRY_RUN === '1';

interface ComplianceItem {
  id: string;
  clientId: string;
  serviceId?: string;
  type: string;
  description: string;
  dueDate?: Date;
  status: 'PENDING' | 'FILED' | 'OVERDUE' | 'EXEMPT';
  source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL';
  reference?: string;
  period?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Service {
  id: string;
  clientId: string;
  kind: string;
  frequency: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
  fee: number;
  annualized: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  nextDue?: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

class SimpleConfigService implements Partial<ConfigService> {
  private readonly values: Record<string, string>;

  constructor(values: Record<string, string>) {
    this.values = values;
  }

  get<T = any>(key: string, defaultValue?: T): T {
    return (this.values[key] as T) ?? (defaultValue as T);
  }
}

/**
 * Maps compliance types to service kinds
 */
function getServiceKindForComplianceType(complianceType: string): string[] {
  const mappings: Record<string, string[]> = {
    'ANNUAL_ACCOUNTS': ['Annual Accounts'],
    'CONFIRMATION_STATEMENT': ['Confirmation Statement'],
    'VAT_RETURN': ['VAT Returns'],
    'CT600': ['Corporation Tax'],
    'SA100': ['Self Assessment'],
    'RTI_SUBMISSION': ['Payroll'],
  };

  return mappings[complianceType] || [];
}

/**
 * Finds the best matching service for a compliance item
 */
function findMatchingService(
  complianceItem: ComplianceItem,
  services: Service[]
): Service | null {
  // Filter services by client ID
  const clientServices = services.filter(s => s.clientId === complianceItem.clientId);
  
  if (clientServices.length === 0) {
    return null;
  }

  // Get possible service kinds for this compliance type
  const possibleServiceKinds = getServiceKindForComplianceType(complianceItem.type);
  
  if (possibleServiceKinds.length === 0) {
    return null;
  }

  // Find services that match the compliance type
  const matchingServices = clientServices.filter(s => 
    possibleServiceKinds.includes(s.kind)
  );

  if (matchingServices.length === 0) {
    return null;
  }

  // If multiple matches, prefer:
  // 1. Active services over inactive
  // 2. Services with closer due dates
  // 3. Most recently created
  const activeServices = matchingServices.filter(s => s.status === 'ACTIVE');
  const servicesToConsider = activeServices.length > 0 ? activeServices : matchingServices;

  // If compliance item has a due date, try to match by proximity
  if (complianceItem.dueDate) {
    const complianceDueTime = new Date(complianceItem.dueDate).getTime();
    
    const servicesWithDueDates = servicesToConsider.filter(s => s.nextDue);
    
    if (servicesWithDueDates.length > 0) {
      // Find service with closest due date
      let closestService = servicesWithDueDates[0];
      let closestDiff = Math.abs(
        new Date(servicesWithDueDates[0].nextDue!).getTime() - complianceDueTime
      );

      for (const service of servicesWithDueDates.slice(1)) {
        const diff = Math.abs(new Date(service.nextDue!).getTime() - complianceDueTime);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestService = service;
        }
      }

      // Only use date matching if within 90 days
      if (closestDiff <= 90 * 24 * 60 * 60 * 1000) {
        return closestService;
      }
    }
  }

  // Default to most recently created service
  return servicesToConsider.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
}

async function main() {
  console.log('🔄 Starting compliance item migration...');
  console.log(`📁 Storage path: ${STORAGE_PATH}`);
  console.log(`🧪 Dry run mode: ${DRY_RUN ? 'YES' : 'NO'}`);
  console.log('');

  // Initialize file storage
  const configService = new SimpleConfigService({ STORAGE_PATH });
  const fileStorage = new FileStorageService(configService as unknown as ConfigService);
  // Initialize search service to keep indexes in sync
  new SearchService(fileStorage);

  // Load all compliance items
  console.log('📥 Loading compliance items...');
  const complianceItems = await fileStorage.searchFiles<ComplianceItem>(
    'compliance',
    () => true
  );
  console.log(`   Found ${complianceItems.length} compliance items`);

  // Load all services
  console.log('📥 Loading services...');
  const services = await fileStorage.searchFiles<Service>(
    'services',
    () => true
  );
  console.log(`   Found ${services.length} services`);
  console.log('');

  // Statistics
  let alreadyLinked = 0;
  let successfulMatches = 0;
  let failedMatches = 0;
  let updated = 0;

  const matchDetails: Array<{
    complianceId: string;
    complianceType: string;
    clientId: string;
    serviceId?: string;
    serviceKind?: string;
    status: 'already_linked' | 'matched' | 'no_match';
  }> = [];

  // Process each compliance item
  console.log('🔍 Processing compliance items...');
  console.log('');

  for (const item of complianceItems) {
    // Skip if already has serviceId
    if (item.serviceId) {
      alreadyLinked++;
      matchDetails.push({
        complianceId: item.id,
        complianceType: item.type,
        clientId: item.clientId,
        serviceId: item.serviceId,
        status: 'already_linked',
      });
      continue;
    }

    // Try to find matching service
    const matchingService = findMatchingService(item, services);

    if (matchingService) {
      successfulMatches++;
      matchDetails.push({
        complianceId: item.id,
        complianceType: item.type,
        clientId: item.clientId,
        serviceId: matchingService.id,
        serviceKind: matchingService.kind,
        status: 'matched',
      });

      console.log(`✅ Match found:`);
      console.log(`   Compliance: ${item.id} (${item.type})`);
      console.log(`   Service: ${matchingService.id} (${matchingService.kind})`);
      console.log(`   Client: ${item.clientId}`);

      // Update compliance item with serviceId
      if (!DRY_RUN) {
        const updatedItem = {
          ...item,
          serviceId: matchingService.id,
          updatedAt: new Date(),
        };

        await fileStorage.writeJson('compliance', item.id, updatedItem);
        updated++;
        console.log(`   ✓ Updated compliance item ${item.id}`);
      } else {
        console.log(`   ⚠️  Would update (dry run mode)`);
      }
      console.log('');
    } else {
      failedMatches++;
      matchDetails.push({
        complianceId: item.id,
        complianceType: item.type,
        clientId: item.clientId,
        status: 'no_match',
      });

      console.log(`❌ No match found:`);
      console.log(`   Compliance: ${item.id} (${item.type})`);
      console.log(`   Client: ${item.clientId}`);
      console.log(`   Reason: No matching service found for type ${item.type}`);
      console.log('');
    }
  }

  // Print summary
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 Migration Summary');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total compliance items: ${complianceItems.length}`);
  console.log(`Already linked: ${alreadyLinked}`);
  console.log(`Successful matches: ${successfulMatches}`);
  console.log(`Failed matches: ${failedMatches}`);
  
  if (!DRY_RUN) {
    console.log(`Updated: ${updated}`);
  } else {
    console.log(`Would update: ${successfulMatches} (dry run mode)`);
  }
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Print breakdown by compliance type
  console.log('📈 Breakdown by Compliance Type:');
  const typeBreakdown = new Map<string, { total: number; matched: number; failed: number }>();
  
  for (const detail of matchDetails) {
    if (detail.status === 'already_linked') continue;
    
    if (!typeBreakdown.has(detail.complianceType)) {
      typeBreakdown.set(detail.complianceType, { total: 0, matched: 0, failed: 0 });
    }
    
    const stats = typeBreakdown.get(detail.complianceType)!;
    stats.total++;
    
    if (detail.status === 'matched') {
      stats.matched++;
    } else {
      stats.failed++;
    }
  }

  for (const [type, stats] of typeBreakdown.entries()) {
    const matchRate = stats.total > 0 ? ((stats.matched / stats.total) * 100).toFixed(1) : '0.0';
    console.log(`   ${type}:`);
    console.log(`      Total: ${stats.total}, Matched: ${stats.matched}, Failed: ${stats.failed} (${matchRate}% match rate)`);
  }
  console.log('');

  // Print failed matches details if any
  if (failedMatches > 0) {
    console.log('⚠️  Failed Matches Details:');
    const failedDetails = matchDetails.filter(d => d.status === 'no_match');
    
    for (const detail of failedDetails) {
      console.log(`   • ${detail.complianceId} (${detail.complianceType}) - Client: ${detail.clientId}`);
    }
    console.log('');
    console.log('💡 Tip: Failed matches may indicate:');
    console.log('   - Compliance items without corresponding services');
    console.log('   - Services that need to be created for these clients');
    console.log('   - Compliance types that need additional mapping rules');
    console.log('');
  }

  if (DRY_RUN) {
    console.log('');
    console.log('ℹ️  This was a dry run. No changes were made.');
    console.log('   To apply changes, run: DRY_RUN=0 npm run migrate:compliance-links');
  } else {
    console.log('');
    console.log('✅ Migration completed successfully!');
  }
}

main().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});

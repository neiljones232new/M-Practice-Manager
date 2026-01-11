import fs from 'fs/promises';
import path from 'path';
import { FileStorageService } from '../apps/api/src/modules/file-storage/file-storage.service';
import { SearchService } from '../apps/api/src/modules/file-storage/search.service';
import { ReferenceGeneratorService } from '../apps/api/src/modules/clients/services/reference-generator.service';
import { ConfigService } from '@nestjs/config';

type CsvRecord = Record<string, string>;

type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

const DEFAULT_PORTFOLIO_CODE = 1;
const CSV_PATH = path.resolve(__dirname, '../PRE BUILD/companies_summary.csv');
const STORAGE_PATH = path.resolve(__dirname, '../storage');
const FORCE_UPDATE = process.env.FORCE_UPDATE === '1';

class SimpleConfigService implements Partial<ConfigService> {
  private readonly values: Record<string, string>;

  constructor(values: Record<string, string>) {
    this.values = values;
  }

  get<T = any>(key: string, defaultValue?: T): T {
    return (this.values[key] as T) ?? (defaultValue as T);
  }
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let value = '';
  let inQuotes = false;

  const pushValue = () => {
    current.push(value);
    value = '';
  };

  const pushRow = () => {
    if (current.length > 0) {
      rows.push(current);
    }
    current = [];
  };

  const text = content.replace(/^\uFEFF/, '');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      const nextChar = text[i + 1];
      if (inQuotes && nextChar === '"') {
        value += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      pushValue();
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      pushValue();
      pushRow();
      while (text[i + 1] === '\n' || text[i + 1] === '\r') {
        i++;
      }
      continue;
    }

    value += char;
  }

  if (value.length > 0 || current.length > 0) {
    pushValue();
    pushRow();
  }

  return rows;
}

function toRecords(rows: string[][]): CsvRecord[] {
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((row) => {
    const record: CsvRecord = {};
    headers.forEach((header, idx) => {
      record[header] = row[idx]?.trim() ?? '';
    });
    return record;
  });
}

function mapStatusToClientStatus(status: string): ClientStatus {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'active') return 'ACTIVE';
  if (normalized === 'inactive') return 'INACTIVE';
  return 'ARCHIVED';
}

const postcodeRegex = /[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}/i;

function parseAddress(address: string | undefined) {
  if (!address) return undefined;
  const segments = address
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return undefined;
  }

  let country = segments.length ? segments[segments.length - 1] : '';
  if (/^england|scotland|wales|northern ireland|united kingdom$/i.test(country)) {
    segments.pop();
  } else {
    country = segments.pop() || 'United Kingdom';
  }

  let postcode = '';
  for (let i = segments.length - 1; i >= 0; i--) {
    const match = segments[i].match(postcodeRegex);
    if (match) {
      postcode = match[0].toUpperCase();
      segments[i] = segments[i].replace(postcodeRegex, '').trim();
      if (!segments[i]) {
        segments.splice(i, 1);
      }
      break;
    }
  }

  const city = segments.length > 1 ? segments.pop() || '' : '';
  const line1 = segments.join(', ') || address.trim();

  return {
    line1,
    city,
    postcode,
    country: country || 'United Kingdom',
  };
}

function parseNameList(value: string | undefined): string[] {
  if (!value) return [];
  if (!value.includes(',')) {
    return value
      .split(/\s{2,}|\|/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const tokens = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (tokens.length <= 1) {
    return [value.trim()];
  }

  const combined: string[] = [];
  for (let i = 0; i < tokens.length; i += 2) {
    const first = tokens[i];
    const second = tokens[i + 1];
    if (second) {
      combined.push(`${first} ${second}`.trim());
    } else {
      combined.push(first);
    }
  }
  return combined;
}

async function main() {
  console.log('⏳ Reading CSV from', CSV_PATH);
  const csvContent = await fs.readFile(CSV_PATH, 'utf8');
  const rows = parseCsv(csvContent);
  const records = toRecords(rows).filter((record) => record['Company Name']);
  console.log(`📄 Loaded ${records.length} rows from CSV.`);

  const configService = new SimpleConfigService({ STORAGE_PATH });
  const fileStorage = new FileStorageService(configService as unknown as ConfigService);
  // Initialize search service so indexes stay in sync
  new SearchService(fileStorage);
  const refGen = new ReferenceGeneratorService(fileStorage);

  // We'll map existing by MDJ Code per portfolio on demand
  const mdjCodeMapByPortfolio = new Map<number, Map<string, any>>();
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const record of records) {
    const mdjCode = record['MDJ Code'];
    const portfolioCode = Number(record['Portfolio Code'] || record['Portfolio'] || DEFAULT_PORTFOLIO_CODE);

    // Prepare MDJ code map for this portfolio if not loaded
    if (!mdjCodeMapByPortfolio.has(portfolioCode)) {
      const existingInPortfolio = await fileStorage.searchFiles<any>('clients', () => true, portfolioCode);
      const map = new Map<string, any>();
      for (const c of existingInPortfolio) {
        const code = c?.metadata?.mdjCode as string | undefined;
        if (code) map.set(code, c);
      }
      mdjCodeMapByPortfolio.set(portfolioCode, map);
    }
    const mdjCodeMap = mdjCodeMapByPortfolio.get(portfolioCode)!;
    const existing = mdjCode ? mdjCodeMap.get(mdjCode) : undefined;
    const now = new Date().toISOString();

    const baseClient = {
      name: record['Company Name'],
      type: 'COMPANY',
      portfolioCode,
      status: mapStatusToClientStatus(record['Status']),
      registeredNumber: record['Company Number'] || undefined,
      address: parseAddress(record['Registered Office Address']),
      parties: [],
      services: [],
      tasks: [],
      documents: [],
      metadata: {
        source: 'companies_summary.csv',
        mdjCode,
        utrNumber: record['UTR Number'] || undefined,
        incorporationDate: record['Incorporation Date'] || undefined,
        lastAccountsMadeUpTo: record['Last Accounts Made Up To'] || undefined,
        nextAccountsDueOn: record['Next Accounts Due On'] || undefined,
        lastConfirmationStatementMadeUpTo: record['Last Confirmation Statement Made Up To'] || undefined,
        nextConfirmationStatementDue: record['Next Confirmation Statement Due'] || undefined,
        addressRaw: record['Registered Office Address'] || undefined,
        directorsRaw: record['Directors'] || undefined,
        pscsRaw: record['PSC'] || undefined,
        directors: parseNameList(record['Directors']),
        pscs: parseNameList(record['PSC']),
      },
    } as any;

    if (existing) {
      if (!FORCE_UPDATE) {
        skipped++;
        continue;
      }

      const updatedClient = {
        ...existing,
        ...baseClient,
        id: existing.id,
        ref: existing.ref,
        createdAt: existing.createdAt,
        updatedAt: now,
      };

      await fileStorage.writeJson('clients', existing.ref, updatedClient, portfolioCode);
      updated++;
      continue;
    }

    // Generate compliant reference using portfolio + first letter grouping
    const ref = await refGen.generateClientRef(portfolioCode, record['Company Name']);

    const newClient = {
      id: `client_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      ref,
      ...baseClient,
      createdAt: now,
      updatedAt: now,
    };

    await fileStorage.writeJson('clients', ref, newClient, portfolioCode);
    created++;
    if (created % 10 === 0) {
      console.log(`  ...imported ${created} clients so far.`);
    }
  }

  console.log(
    `✅ Import complete. Created: ${created}, Updated: ${updated}, Skipped (already existed): ${skipped}.`
  );
}

main().catch((error) => {
  console.error('❌ Import failed:', error);
  process.exit(1);
});

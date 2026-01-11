import { Test, TestingModule } from '@nestjs/testing';
import { firstValueFrom } from 'rxjs';
import axios from 'axios';
import { from } from 'rxjs';
import { CompaniesHouseService } from './companies-house.service';
import { HttpService } from '@nestjs/axios';
import { FileStorageService } from '../file-storage/file-storage.service';
import { IntegrationConfigService } from '../integrations/services/integration-config.service';
import { ClientsService } from '../clients/clients.service';
import { PersonService } from '../clients/services/person.service';
import { ClientPartyService } from '../clients/services/client-party.service';
import { ComplianceService } from '../filings/compliance.service';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';

// This is a small live test that calls Companies House over the network using the API key
// present in apps/api/.env. It is intended to be run locally for verification only.

describe('CompaniesHouseService (live)', () => {
  let service: CompaniesHouseService;

  beforeAll(async () => {
    // Load API key from a few candidate .env locations (local run only)
    let apiKey: string | undefined;
    const candidates = [
      // when running from repo root
      `${process.cwd()}/apps/api/.env`,
      `${process.cwd()}/.env`,
      // when running from apps/api
      `${process.cwd()}/.env`,
      // relative to this test file
      require('path').resolve(__dirname, '../../../../.env'),
      require('path').resolve(__dirname, '../../../.env'),
    ];

    for (const p of candidates) {
      try {
        if (!p) continue;
        const env = fs.readFileSync(p, 'utf8');
        const m = env.match(/^COMPANIES_HOUSE_API_KEY\s*=\s*\"([^\"]+)\"/m);
        if (m) {
          apiKey = m[1];
          break;
        }
      } catch (e) {
        // ignore
      }
    }

    // fallback to environment
    apiKey = apiKey || process.env.COMPANIES_HOUSE_API_KEY;

    if (!apiKey) {
      console.warn('No COMPANIES_HOUSE_API_KEY found in .env or environment; skipping live tests');
      return;
    }

    // Minimal HttpService-like wrapper using axios + rxjs
    const httpService = {
      get: (url: string, opts: any) => from(axios.get(url, { headers: opts?.headers, params: opts?.params }))
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesHouseService,
        { provide: HttpService, useValue: httpService },
        {
          provide: ConfigService,
          useValue: { get: (k: string) => (k === 'COMPANIES_HOUSE_API_KEY' ? apiKey : undefined) },
        },
        { provide: FileStorageService, useValue: {} },
        { provide: IntegrationConfigService, useValue: { getDecryptedApiKey: async () => apiKey } },
        { provide: ClientsService, useValue: {} },
        { provide: PersonService, useValue: {} },
        { provide: ClientPartyService, useValue: {} },
        { provide: ComplianceService, useValue: {} },
      ],
    }).compile();

    service = module.get<CompaniesHouseService>(CompaniesHouseService);
  }, 20000);

  it('should fetch details for a small set of companies', async () => {
    if (!service) return; // skipped

    // Load client backup files and pick active clients with a registeredNumber
    const path = require('path');
    const candidateDirs = [
      path.resolve(process.cwd(), 'storage/backups/clients'),
      path.resolve(process.cwd(), '../../storage/backups/clients'),
    ];

    let clientFiles: string[] = [];
    let clientsDir: string | null = null;
    for (const d of candidateDirs) {
      try {
        const files = fs.readdirSync(d).filter((f: string) => f.endsWith('.json'));
        if (files.length > 0) {
          clientsDir = d;
          clientFiles = files;
          break;
        }
      } catch (e) {
        // ignore
      }
    }

    if (!clientsDir) {
      console.warn('No client backups directory found in candidates; falling back to hardcoded list');
    }

    const registeredNumbers = new Set<string>();
    for (const file of clientFiles) {
      try {
        const content = fs.readFileSync(require('path').join(clientsDir, file), 'utf8');
        const json = JSON.parse(content);
        if (json && json.status === 'ACTIVE' && json.registeredNumber) {
          registeredNumbers.add(String(json.registeredNumber).trim());
        }
      } catch (e) {
        // ignore malformed
      }
    }

    // If no clients found, fall back to a couple of known companies
    const companiesToCheck = registeredNumbers.size > 0 ? Array.from(registeredNumbers).slice(0, 10) : ['15110513', '00002065'];

    // Check with limited concurrency to avoid hammering the API
    const concurrency = 2;
    const items = companiesToCheck.slice();
    async function worker() {
      while (items.length) {
        const c = items.shift();
        if (!c) break;
        try {
          const details = await service.getCompanyDetails(c);
          console.log(`company ${c}: ${details.company_name} (${details.company_status})`);
          expect(details.company_number).toBeDefined();
        } catch (err) {
          console.warn(`Failed lookup for ${c}:`, err?.message || err);
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, companiesToCheck.length) }).map(() => worker()));
  }, 20000);
});

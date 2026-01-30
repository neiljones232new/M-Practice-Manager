import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import * as path from 'path';

const storagePath = process.env.STORAGE_PATH
  ? path.resolve(process.env.STORAGE_PATH)
  : path.resolve(__dirname, '..', 'storage');

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

type Report = {
  clientsVisited: number;
  clientsUpdatedIdToRef: number;
  peopleRenamed: number;
  peopleMoved: number;
  clientPartyUpdated: number;
  servicesUpdated: number;
  complianceUpdated: number;
  missingPeopleReferencedByParty: number;
  notes: string[];
};

async function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    if (!DRY_RUN) {
      await fs.mkdir(dir, { recursive: true });
    }
  }
}

async function readJson(filePath: string): Promise<any> {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function writeJson(filePath: string, data: any) {
  const json = JSON.stringify(data, null, 2);
  if (!DRY_RUN) {
    await fs.writeFile(filePath, json, 'utf8');
  }
}

async function moveFile(from: string, to: string) {
  if (!DRY_RUN) {
    await fs.rename(from, to);
  }
}

function toSuffixLetter(value?: string | null): string | null {
  if (!value) return null;
  const v = String(value).trim().toUpperCase();
  if (!/^[A-Z]+$/.test(v)) return null;
  return v;
}

async function migrateClient(clientRef: string, report: Report) {
  const clientDir = path.join(storagePath, 'clients', clientRef);
  const clientJsonPath = path.join(clientDir, 'client.json');
  if (!existsSync(clientJsonPath)) return;

  report.clientsVisited += 1;

  const client = await readJson(clientJsonPath);
  if (client && client.ref && client.id !== client.ref) {
    client.id = client.ref;
    await writeJson(clientJsonPath, client);
    report.clientsUpdatedIdToRef += 1;
  }

  // Build mapping oldPersonId -> newPersonRef based on client-parties suffixLetter.
  const partiesDir = path.join(clientDir, 'client-parties');
  const parties = existsSync(partiesDir)
    ? (await fs.readdir(partiesDir)).filter((f) => f.endsWith('.json'))
    : [];

  const personIdToNewRef = new Map<string, string>();

  for (const file of parties) {
    const partyPath = path.join(partiesDir, file);
    const party = await readJson(partyPath);

    const oldPersonId = String(party?.personId || '');
    const suffix = toSuffixLetter(party?.suffixLetter);
    if (!oldPersonId || !suffix) continue;

    const newRef = `${clientRef}${suffix}`;
    personIdToNewRef.set(oldPersonId, newRef);
  }

  // Move and rewrite people: storage/people/P001.json etc -> clients/<ref>/people/<refA>.json
  const globalPeopleDir = path.join(storagePath, 'people');
  const clientPeopleDir = path.join(clientDir, 'people');
  await ensureDir(clientPeopleDir);

  for (const [oldPersonId, newPersonRef] of personIdToNewRef.entries()) {
    // Find global person file by matching internal id, or by ref if it is already that.
    let globalPersonFilePath: string | null = null;
    if (existsSync(globalPeopleDir)) {
      const globalFiles = (await fs.readdir(globalPeopleDir)).filter((f) => f.endsWith('.json'));
      for (const gf of globalFiles) {
        const candidatePath = path.join(globalPeopleDir, gf);
        try {
          const p = await readJson(candidatePath);
          if (String(p?.id) === oldPersonId || String(p?.ref) === oldPersonId) {
            globalPersonFilePath = candidatePath;
            break;
          }
          // Also allow matching old person ref values (P001)
          if (String(p?.id) === oldPersonId) {
            globalPersonFilePath = candidatePath;
            break;
          }
        } catch {
          // ignore
        }
      }
    }

    if (!globalPersonFilePath) {
      report.missingPeopleReferencedByParty += 1;
      report.notes.push(`Missing global person record for ${oldPersonId} (client ${clientRef})`);
      continue;
    }

    const person = await readJson(globalPersonFilePath);
    person.id = newPersonRef;
    person.ref = newPersonRef;

    const targetPath = path.join(clientPeopleDir, `${newPersonRef}.json`);

    await writeJson(targetPath, person);
    report.peopleRenamed += 1;

    if (!DRY_RUN) {
      await fs.unlink(globalPersonFilePath).catch(() => null);
    }
    report.peopleMoved += 1;
  }

  // Rewrite client-parties: clientId -> clientRef and personId -> {clientRef}{suffix}
  for (const file of parties) {
    const partyPath = path.join(partiesDir, file);
    const party = await readJson(partyPath);

    let changed = false;

    if (party?.clientId && String(party.clientId) !== clientRef) {
      party.clientId = clientRef;
      changed = true;
    }

    const oldPersonId = String(party?.personId || '');
    const mapped = personIdToNewRef.get(oldPersonId);
    if (mapped && String(party.personId) !== mapped) {
      party.personId = mapped;
      changed = true;
    }

    if (changed) {
      await writeJson(partyPath, party);
      report.clientPartyUpdated += 1;
    }
  }

  // Rewrite services: clientId -> clientRef
  const servicesDir = path.join(clientDir, 'services');
  if (existsSync(servicesDir)) {
    const serviceFiles = (await fs.readdir(servicesDir)).filter((f) => f.endsWith('.json'));
    for (const file of serviceFiles) {
      const servicePath = path.join(servicesDir, file);
      const service = await readJson(servicePath);
      if (service?.clientId && String(service.clientId) !== clientRef) {
        service.clientId = clientRef;
        await writeJson(servicePath, service);
        report.servicesUpdated += 1;
      }
    }
  }

  // Rewrite compliance: clientId -> clientRef
  const complianceDir = path.join(clientDir, 'compliance');
  if (existsSync(complianceDir)) {
    const complianceFiles = (await fs.readdir(complianceDir)).filter((f) => f.endsWith('.json'));
    for (const file of complianceFiles) {
      const compliancePath = path.join(complianceDir, file);
      const item = await readJson(compliancePath);
      if (item?.clientId && String(item.clientId) !== clientRef) {
        item.clientId = clientRef;
        await writeJson(compliancePath, item);
        report.complianceUpdated += 1;
      }
    }
  }
}

async function main() {
  const report: Report = {
    clientsVisited: 0,
    clientsUpdatedIdToRef: 0,
    peopleRenamed: 0,
    peopleMoved: 0,
    clientPartyUpdated: 0,
    servicesUpdated: 0,
    complianceUpdated: 0,
    missingPeopleReferencedByParty: 0,
    notes: [],
  };

  const clientsRoot = path.join(storagePath, 'clients');
  if (!existsSync(clientsRoot)) {
    throw new Error(`Missing storage clients directory: ${clientsRoot}`);
  }

  const clientDirs = (await fs.readdir(clientsRoot, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => !name.startsWith('portfolio-'));

  for (const clientRef of clientDirs) {
    await migrateClient(clientRef, report);
  }

  const banner = DRY_RUN ? 'DRY RUN' : 'APPLIED';
  console.log(`Standard B migration (${banner}) complete.`);
  console.log(JSON.stringify(report, null, 2));

  if (report.notes.length) {
    console.log('\nNotes:');
    report.notes.forEach((n) => console.log(`- ${n}`));
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import * as path from 'path';

const storagePath = process.env.STORAGE_PATH
  ? path.resolve(process.env.STORAGE_PATH)
  : path.resolve(__dirname, '..', 'storage');

const clientRefPattern = /^[A-Z0-9]+$/i;

interface ClientMeta {
  ref: string;
  id: string;
}

const relatedCategories = [
  { source: 'services', target: 'services', matchField: 'clientId' },
  { source: 'client-parties', target: 'parties', matchField: 'clientId' },
  { source: 'compliance', target: 'compliance', matchField: 'clientId' },
];

async function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function migrateClientFile(fileName: string): Promise<ClientMeta | null> {
  if (!fileName.endsWith('.json')) {
    return null;
  }

  const reference = fileName.replace(/\.json$/i, '');
  if (!clientRefPattern.test(reference)) {
    return null;
  }

  const originalPath = path.join(storagePath, fileName);
  const dataJson = await fs.readFile(originalPath, 'utf8');
  const data = JSON.parse(dataJson) as any;
  const clientRef = String(data.ref || reference);
  const clientId = String(data.id || '');
  if (!clientId) {
    console.warn(`Skipping ${fileName}: missing id`);
    return null;
  }

  const clientDir = path.join(storagePath, 'clients', clientRef);
  await ensureDir(clientDir);
  const targetClientPath = path.join(clientDir, 'client.json');

  if (!existsSync(targetClientPath)) {
    await fs.rename(originalPath, targetClientPath);
    console.log(`Moved client ${clientRef} -> ${path.relative(storagePath, targetClientPath)}`);
  } else {
    await fs.unlink(originalPath).catch(() => null);
    console.log(`Client ${clientRef} already migrated, removed ${fileName}`);
  }

  return { ref: clientRef, id: clientId };
}

async function moveRelatedFiles(clientMeta: ClientMeta, category: { source: string; target: string; matchField: string }) {
  const sourceDir = path.join(storagePath, category.source);
  if (!existsSync(sourceDir)) {
    return;
  }

  const destDir = path.join(storagePath, 'clients', clientMeta.ref, category.target);
  await ensureDir(destDir);

  const files = await fs.readdir(sourceDir);
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const filePath = path.join(sourceDir, file);
    try {
      const payloadJson = await fs.readFile(filePath, 'utf8');
      const payload = JSON.parse(payloadJson) as any;
      if (String(payload[category.matchField]) !== clientMeta.id) {
        continue;
      }

      const destination = path.join(destDir, file);
      if (existsSync(destination)) {
        await fs.unlink(filePath).catch(() => null);
        continue;
      }
      await fs.rename(filePath, destination);
      console.log(`  • Moved ${category.source}/${file} -> clients/${clientMeta.ref}/${category.target}/${file}`);
    } catch (error) {
      console.warn(`Failed to process ${category.source}/${file}:`, error);
    }
  }
}

async function updateClientIndex(clients: ClientMeta[]) {
  const indexPath = path.join(storagePath, 'indexes', 'clients.json');
  if (!existsSync(indexPath)) {
    return;
  }

  const index = JSON.parse(await fs.readFile(indexPath, 'utf8')) as Record<string, any>;
  let touched = false;

  for (const client of clients) {
    const entry = index[client.id];
    if (entry) {
      entry.path = path.posix.join('clients', client.ref, 'client.json');
      touched = true;
    }
  }

  if (touched) {
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf8');
    console.log('Updated storage/indexes/clients.json with new path hints');
  }
}

async function migrate() {
  console.log('Starting storage migration under', storagePath);
  await ensureDir(storagePath);
  await ensureDir(path.join(storagePath, 'clients'));

  const entries = await fs.readdir(storagePath);
  const migratedClients: ClientMeta[] = [];

  for (const entry of entries) {
    const entryPath = path.join(storagePath, entry);
    const stat = await fs.stat(entryPath);
    if (!stat.isFile() || !entry.endsWith('.json')) {
      continue;
    }

    if (entry === 'config.json' || entry === 'indexes.json' || entry === 'practice-manager.db') {
      continue;
    }

    const clientMeta = await migrateClientFile(entry);
    if (clientMeta) {
      migratedClients.push(clientMeta);
    }
  }

  for (const client of migratedClients) {
    console.log(`Migrating related entities for ${client.ref} (${client.id})`);
    for (const category of relatedCategories) {
      await moveRelatedFiles(client, category);
    }
  }

  await updateClientIndex(migratedClients);
  console.log('Storage migration completed successfully.');
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});

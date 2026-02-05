// Load .env at repo root
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({ path: require('path').join(process.cwd(), '.env') });

// Use the generated client in apps/api (custom output path).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('../apps/api/generated/prisma');
import * as fs from 'fs';
import * as path from 'path';

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const ROOT = process.cwd();

type PracticeSettings = Record<string, any>;

type BrandingLogo = {
  dataUrl?: string | null;
};

const readJsonIfExists = <T = any>(filePath: string): T | null => {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

async function main() {
  const prisma = new PrismaClient();

  const practiceSettingsPath = path.join(ROOT, 'storage', 'config', 'practice-settings.json');
  const brandingLogoPath = path.join(ROOT, 'storage', 'config', 'branding-logo.json');

  const practiceSettings = readJsonIfExists<PracticeSettings>(practiceSettingsPath);
  const brandingLogo = readJsonIfExists<BrandingLogo>(brandingLogoPath);

  if (!practiceSettings && !brandingLogo) {
    console.log('No practice-settings.json or branding-logo.json found. Nothing to backfill.');
    await prisma.$disconnect();
    return;
  }

  const existing = await (prisma as any).practiceConfig.findFirst();

  const data: Record<string, any> = {};
  if (practiceSettings) {
    data.settings = practiceSettings;
  }
  if (brandingLogo && Object.prototype.hasOwnProperty.call(brandingLogo, 'dataUrl')) {
    data.brandingLogoDataUrl = brandingLogo.dataUrl ?? null;
  }

  if (DRY_RUN) {
    console.log('DRY_RUN: would upsert practice config with:', JSON.stringify(data, null, 2));
    await prisma.$disconnect();
    return;
  }

  if (existing) {
    await (prisma as any).practiceConfig.update({
      where: { id: existing.id },
      data,
    });
    console.log(`Updated practice config ${existing.id} from file storage.`);
  } else {
    await (prisma as any).practiceConfig.create({ data });
    console.log('Created practice config from file storage.');
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Backfill failed:', err);
  const prisma = new PrismaClient();
  await prisma.$disconnect();
  process.exit(1);
});

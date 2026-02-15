#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

const buildTargets = [
  '.turbo',
  'apps/api/dist',
  'apps/api/.turbo',
  'apps/api/tsconfig.build.tsbuildinfo',
  'apps/web/.next',
  'apps/web/.turbo',
  'apps/web/tsconfig.tsbuildinfo',
];

const dataTargets = [
  'storage',
  'apps/api/storage',
  'apps/api/mdj-data',
];

async function removeTarget(target) {
  const absolutePath = path.join(repoRoot, target);
  await fs.rm(absolutePath, { recursive: true, force: true });
  return absolutePath;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const cleanBuild = args.size === 0 || args.has('--build') || args.has('--all');
  const cleanData = args.size === 0 || args.has('--data') || args.has('--all');

  if (!cleanBuild && !cleanData) {
    console.log('Usage: node scripts/clean-workspace.js [--build|--data|--all]');
    process.exit(0);
  }

  const removed = [];
  if (cleanBuild) {
    for (const target of buildTargets) {
      removed.push(await removeTarget(target));
    }
  }

  if (cleanData) {
    for (const target of dataTargets) {
      removed.push(await removeTarget(target));
    }
  }

  // Recreate the chosen runtime storage root so startup has a predictable base.
  if (cleanData) {
    await fs.mkdir(path.join(repoRoot, 'apps/api/storage'), { recursive: true });
  }

  console.log('Workspace clean complete.');
  for (const item of removed) {
    console.log(`- removed: ${item}`);
  }
}

main().catch((error) => {
  console.error('Workspace clean failed:', error);
  process.exit(1);
});

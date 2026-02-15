import { existsSync } from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';

const DEFAULT_STORAGE_PATH = path.join('apps', 'api', 'storage');

function isPracticeManagerRoot(candidate: string): boolean {
  return (
    existsSync(path.join(candidate, 'apps', 'api')) &&
    existsSync(path.join(candidate, 'package.json'))
  );
}

function findRootFrom(startDir: string): string | null {
  let cursor = path.resolve(startDir);
  const root = path.parse(cursor).root;

  while (true) {
    if (isPracticeManagerRoot(cursor)) {
      return cursor;
    }
    if (cursor === root) break;
    cursor = path.dirname(cursor);
  }

  return null;
}

function normalize(value?: string | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isWithinRoot(rootDir: string, candidatePath: string): boolean {
  const root = path.resolve(rootDir);
  const target = path.resolve(candidatePath);
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function findPracticeManagerRoot(startDir: string = process.cwd()): string {
  const resolved = findRootFrom(startDir) || findRootFrom(__dirname);
  if (resolved) {
    return resolved;
  }
  throw new Error(`Unable to resolve M-Practice-Manager root from: ${startDir}`);
}

export function resolvePathWithinPracticeManager(pathValue: string, rootDir?: string): string {
  const root = rootDir || findPracticeManagerRoot();
  const resolvedPath = path.isAbsolute(pathValue)
    ? path.normalize(pathValue)
    : path.resolve(root, pathValue);

  if (!isWithinRoot(root, resolvedPath)) {
    throw new Error(`Path escapes M-Practice-Manager root: ${resolvedPath}`);
  }

  return resolvedPath;
}

export function resolveStorageRoot(configService: ConfigService): string {
  const root = findPracticeManagerRoot();
  const fallbackStorage = resolvePathWithinPracticeManager(DEFAULT_STORAGE_PATH, root);
  const configuredStorage = normalize(configService.get<string>('STORAGE_PATH'));
  if (configuredStorage) {
    try {
      return resolvePathWithinPracticeManager(configuredStorage, root);
    } catch {
      return fallbackStorage;
    }
  }

  const configuredDataDir = normalize(configService.get<string>('DATA_DIR'));
  if (configuredDataDir) {
    try {
      return resolvePathWithinPracticeManager(configuredDataDir, root);
    } catch {
      return fallbackStorage;
    }
  }

  return fallbackStorage;
}

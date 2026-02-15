#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');
const contractsDir = path.join(rootDir, 'contracts', 'schemas');

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function extractBlock(text, startIndex) {
  const openIndex = text.indexOf('{', startIndex);
  if (openIndex === -1) {
    throw new Error('Expected opening brace for block');
  }

  let depth = 1;
  let cursor = openIndex + 1;
  for (; cursor < text.length; cursor += 1) {
    const char = text[cursor];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) break;
  }

  if (depth !== 0) {
    throw new Error('Unterminated block');
  }

  return text.slice(openIndex + 1, cursor);
}

function parseModelNames(prismaText) {
  const names = new Set();
  const modelRegex = /^\s*model\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/gm;
  for (const match of prismaText.matchAll(modelRegex)) {
    names.add(match[1]);
  }
  return names;
}

function parsePrismaModelFields(relativePath, modelName) {
  const text = readText(relativePath);
  const modelNames = parseModelNames(text);
  const modelRegex = new RegExp(`\\bmodel\\s+${modelName}\\s*\\{`);
  const match = modelRegex.exec(text);
  if (!match) {
    throw new Error(`Model "${modelName}" not found in ${relativePath}`);
  }

  const block = extractBlock(text, match.index);
  const fields = new Set();

  for (const line of block.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) {
      continue;
    }

    const fieldMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z0-9_?[\]]+)/);
    if (!fieldMatch) {
      continue;
    }

    const fieldName = fieldMatch[1];
    const typeToken = fieldMatch[2];
    const baseType = typeToken.replace(/[?\[\]]/g, '');

    if (trimmed.includes('@relation')) {
      continue;
    }
    if (typeToken.includes('[]') && modelNames.has(baseType)) {
      continue;
    }
    if (!typeToken.includes('[]') && modelNames.has(baseType)) {
      continue;
    }

    fields.add(fieldName);
  }

  return fields;
}

function parseTsInterfaceFields(relativePath, interfaceName) {
  const text = readText(relativePath);
  const interfaceRegex = new RegExp(`\\bexport\\s+interface\\s+${interfaceName}\\b`);
  const match = interfaceRegex.exec(text);
  if (!match) {
    throw new Error(`Interface "${interfaceName}" not found in ${relativePath}`);
  }

  const block = extractBlock(text, match.index);
  const fields = new Set();
  let nestedObjectDepth = 0;

  for (const line of block.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('//') && nestedObjectDepth === 0) {
      const propMatch = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\??\s*:/);
      if (propMatch) {
        fields.add(propMatch[1]);
      }
    }

    const openCount = (line.match(/\{/g) || []).length;
    const closeCount = (line.match(/\}/g) || []).length;
    nestedObjectDepth += openCount - closeCount;
    if (nestedObjectDepth < 0) nestedObjectDepth = 0;
  }

  return fields;
}

function normalizePath(pathValue) {
  const parts = pathValue.split('/').filter(Boolean);
  return `/${parts.join('/')}`;
}

function parseControllerRoutes(relativePath, basePath) {
  const text = readText(relativePath);
  const routes = new Set();
  const routeRegex = /@(Get|Post|Put|Delete)\(([^)]*)\)/g;

  for (const match of text.matchAll(routeRegex)) {
    const method = match[1].toUpperCase();
    const rawArgs = (match[2] || '').trim();
    let suffix = '';
    if (rawArgs) {
      const pathMatch = rawArgs.match(/^['"`]([^'"`]+)['"`]/);
      if (pathMatch) {
        suffix = pathMatch[1];
      }
    }

    const fullPath = suffix ? normalizePath(`${basePath}/${suffix}`) : normalizePath(basePath);
    routes.add(`${method} ${fullPath}`);
  }

  return routes;
}

function toSet(values) {
  return new Set(Array.isArray(values) ? values : []);
}

function missingValues(expected, actual) {
  const missing = [];
  for (const value of expected) {
    if (!actual.has(value)) {
      missing.push(value);
    }
  }
  return missing;
}

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function loadContracts() {
  const files = fs
    .readdirSync(contractsDir)
    .filter((name) => name.endsWith('.schema.json'))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    throw new Error(`No schema contracts found in ${contractsDir}`);
  }

  return files.map((fileName) => {
    const filePath = path.join(contractsDir, fileName);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return { fileName, ...data };
  });
}

const contracts = loadContracts();
const failures = [];

for (const contract of contracts) {
  const entityLabel = contract.entity || contract.fileName;
  const dbFields = parsePrismaModelFields(contract.prismaModel.file, contract.prismaModel.name);
  const apiFields = parseTsInterfaceFields(contract.apiInterface.file, contract.apiInterface.name);
  const webFields = parseTsInterfaceFields(contract.webInterface.file, contract.webInterface.name);
  const routes = parseControllerRoutes(contract.controller.file, contract.controller.basePath);

  const apiDerivedFields = toSet(contract.apiDerivedFields);
  const webDerivedFields = toSet(contract.webDerivedFields);
  const requiredRoutes = toSet(contract.requiredRoutes);
  const requiredWebFields = toSet(contract.requiredWebFields);

  for (const field of apiDerivedFields) {
    if (!apiFields.has(field)) {
      failures.push(`[${entityLabel}] apiDerivedFields contains unknown API field "${field}"`);
    }
  }

  for (const field of webDerivedFields) {
    if (!webFields.has(field)) {
      failures.push(`[${entityLabel}] webDerivedFields contains unknown web field "${field}"`);
    }
  }

  for (const field of apiFields) {
    if (!dbFields.has(field) && !apiDerivedFields.has(field)) {
      failures.push(
        `[${entityLabel}] API field "${field}" is not backed by Prisma model "${contract.prismaModel.name}" and is not declared in apiDerivedFields`,
      );
    }
  }

  for (const field of webFields) {
    if (!apiFields.has(field) && !webDerivedFields.has(field)) {
      failures.push(
        `[${entityLabel}] web field "${field}" is not in API interface "${contract.apiInterface.name}" and is not declared in webDerivedFields`,
      );
    }
  }

  const missingRoutes = missingValues(requiredRoutes, routes);
  for (const route of missingRoutes) {
    failures.push(`[${entityLabel}] missing required route "${route}"`);
  }

  const missingWebFields = missingValues(requiredWebFields, webFields);
  for (const field of missingWebFields) {
    failures.push(`[${entityLabel}] missing required web field "${field}"`);
  }

  console.log(
    `[contracts] ${entityLabel}: db=${dbFields.size}, api=${apiFields.size}, web=${webFields.size}, routes=${routes.size}`,
  );
}

if (failures.length > 0) {
  console.error('\nContract validation failed:\n');
  for (const failure of sorted(failures)) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('\nAll entity contracts passed.');

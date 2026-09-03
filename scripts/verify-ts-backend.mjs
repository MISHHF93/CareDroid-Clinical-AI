#!/usr/bin/env node
/**
 * Verifies the repository has no application Python/FastAPI backend and that
 * the NestJS TypeScript backend is the sole API surface.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'coverage',
  'test-results',
  '.rag-local',
  'terminals',
]);

const STALE_PATTERNS = [
  { id: 'port-8001', regex: /localhost:8001|nlu:8001|:8001\b/i },
  { id: 'python-unbuffered', regex: /PYTHONUNBUFFERED/i },
  { id: 'distilbert-sidecar', regex: /distilbert-base-uncased/i },
  { id: 'fastapi-runtime', regex: /\buvicorn\b|\bfastapi\b/i },
  { id: 'python-requirements', regex: /requirements\.txt/i },
];

const REQUIRED_TS_BACKEND = [
  'backend/src/main.ts',
  'backend/src/app.module.ts',
  'backend/ml-services/nlu/nlu.module.ts',
  'backend/ml-services/nlu/nlu.service.ts',
  'backend/ml-services/unified-ai-node/unified-ai-node.module.ts',
  'backend/ml-services/shared/paths.ts',
  'backend/ml-services/models/manifest.json',
  'lib/ai/config.ts',
];

const checks = [];
const record = (label, ok, detail) => checks.push({ label, ok, detail });

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function isApplicationPython(file) {
  return file.endsWith('.py');
}

function isPythonManifest(file) {
  const base = file.split(/[/\\]/).pop() ?? '';
  return (
    base === 'requirements.txt' ||
    base === 'Pipfile' ||
    base === 'pyproject.toml' ||
    base === 'poetry.lock' ||
    base === 'setup.py'
  );
}

try {
  const allFiles = walk(rootDir);
  const appPython = allFiles.filter(
    (f) => (isApplicationPython(f) || isPythonManifest(f)) && !f.includes('node_modules'),
  );
  record(
    'Zero application Python files',
    appPython.length === 0,
    appPython.length
      ? appPython.map((f) => relative(rootDir, f)).join(', ')
      : 'no .py or Python manifests outside node_modules',
  );

  for (const rel of REQUIRED_TS_BACKEND) {
    const exists = existsSync(join(rootDir, rel));
    record(`TypeScript backend artifact: ${rel}`, exists, exists ? 'present' : 'missing');
  }

  const scanRoots = [
    'backend/src',
    'backend/ml-services',
    'lib',
    'scripts',
    'src',
    'docs',
    'docker-compose.yml',
    'docker-compose.app.yml',
    'docker-compose.ml.yml',
    '.env.example',
    'backend/.env.example',
    'README.md',
    'package.json',
    '.github/workflows',
  ];

  const staleHits = [];
  for (const relRoot of scanRoots) {
    const abs = join(rootDir, relRoot);
    if (!existsSync(abs)) continue;
    const stat = statSync(abs);
    const targets = stat.isDirectory() ? walk(abs) : [abs];
    for (const file of targets) {
      if (!/\.(ts|tsx|js|mjs|json|yml|yaml|md|env|example)$/i.test(file)) continue;
      if (/scripts[\\/]verify-.*\.mjs$/i.test(file)) continue;
      if (/docs[\\/]BACKEND_MIGRATION_REPORT\.md$/i.test(file)) continue;
      const content = readFileSync(file, 'utf8');
      for (const pattern of STALE_PATTERNS) {
        if (pattern.regex.test(content)) {
          staleHits.push(`${relative(rootDir, file)} (${pattern.id})`);
        }
      }
    }
  }

  const allowedRequirements = staleHits.filter((hit) => hit.includes('verify-ts-backend.mjs'));
  const blockingStale = staleHits.filter((hit) => !hit.includes('verify-ts-backend.mjs'));
  record(
    'Source tree free of Python sidecar references',
    blockingStale.length === 0,
    blockingStale.length ? blockingStale.slice(0, 12).join('; ') : 'clean',
  );

  const inventory = readFileSync(join(rootDir, 'src/data/frontendApiCallsInventory.ts'), 'utf8');
  const badFrontendHosts = /localhost:8001|nlu:8001/.test(inventory);
  record(
    'Frontend API inventory avoids Python NLU host',
    !badFrontendHosts,
    badFrontendHosts ? 'found localhost:8001 in inventory' : 'all calls target Nest /api',
  );

  const nluConfig = readFileSync(join(rootDir, 'backend/src/config/nlu.config.ts'), 'utf8');
  record(
    'NLU config defaults to in-process TypeScript',
    /in-process/i.test(nluConfig),
    'backend/src/config/nlu.config.ts',
  );
} catch (error) {
  record(
    'TypeScript backend verification',
    false,
    error instanceof Error ? error.message : String(error),
  );
}

let failed = 0;
console.log('CareDroid TypeScript backend migration verification\n');
for (const check of checks) {
  const status = check.ok ? 'OK' : 'FAIL';
  if (!check.ok) failed += 1;
  console.log(`[${status}] ${check.label} — ${check.detail}`);
}

if (failed > 0) process.exit(1);
console.log('\nRepository is TypeScript-backend only (NestJS + in-process NLU).');

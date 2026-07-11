#!/usr/bin/env node
/**
 * Validate data/model-registry entries against required fields and index.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const regDir = join(root, 'data', 'model-registry');
const entriesDir = join(regDir, 'entries');
const indexPath = join(regDir, 'index.json');

const REQUIRED = [
  'id',
  'displayName',
  'kind',
  'status',
  'purpose',
  'prohibitedUses',
  'owner',
  'reviewers',
  'regulatoryClass',
  'jurisdictions',
  'limitations',
  'deployment',
  'expiresAt',
  'retirementPlan',
];

const errors = [];
const warnings = [];

if (!existsSync(indexPath) || !existsSync(entriesDir)) {
  console.error('Model registry missing under data/model-registry/');
  process.exit(1);
}

const index = JSON.parse(readFileSync(indexPath, 'utf8'));
const files = readdirSync(entriesDir).filter((n) => n.endsWith('.json'));
const entries = files.map((f) => ({
  file: f,
  data: JSON.parse(readFileSync(join(entriesDir, f), 'utf8')),
}));

const ids = new Set();
for (const { file, data } of entries) {
  for (const field of REQUIRED) {
    if (data[field] === undefined) errors.push(`${file}: missing ${field}`);
  }
  if (data.id && !/^mdl-[a-z0-9-]+-v[0-9]+$/.test(data.id)) {
    errors.push(`${file}: id must match mdl-*-vN`);
  }
  if (ids.has(data.id)) errors.push(`${file}: duplicate id ${data.id}`);
  ids.add(data.id);
  if (!Array.isArray(data.prohibitedUses) || data.prohibitedUses.length < 1) {
    errors.push(`${file}: prohibitedUses required`);
  }
  if (!data.deployment?.rollback) errors.push(`${file}: deployment.rollback required`);
  if (!data.deployment?.featureFlag) errors.push(`${file}: deployment.featureFlag required`);
  const exp = new Date(data.expiresAt);
  if (Number.isNaN(exp.getTime())) errors.push(`${file}: invalid expiresAt`);
  else if (exp.getTime() < Date.now()) warnings.push(`${file}: entry expired ${data.expiresAt}`);
}

for (const id of index.entryIds || []) {
  if (!ids.has(id)) errors.push(`index lists ${id} but entry file missing`);
}
for (const id of ids) {
  if (!(index.entryIds || []).includes(id)) {
    warnings.push(`entry ${id} on disk but not in index.entryIds`);
  }
}

console.log('CareDroid model registry validation\n');
console.log(`Entries: ${entries.length}`);
for (const w of warnings) console.log(`[WARN] ${w}`);
for (const e of errors) console.log(`[FAIL] ${e}`);
if (errors.length) {
  console.log(`\nFAILED (${errors.length} errors)`);
  process.exit(1);
}
console.log(`\nOK (${warnings.length} warnings)`);
process.exit(0);

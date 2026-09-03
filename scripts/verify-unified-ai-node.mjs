#!/usr/bin/env node
/**
 * Offline verification of the CareDroid Unified AI Node (1-node local ML backbone).
 * Does not require Nest to be running. Fails if dual/legacy weight trees appear or
 * either head is missing / quarantined.
 *
 * Usage: npm run verify:ai-node
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MODELS = join(ROOT, 'backend', 'ml-services', 'models');
const MANIFEST = join(MODELS, 'manifest.json');
const NLU_CLS = join(MODELS, 'nlu', 'classifier.json');
const NLU_MET = join(MODELS, 'nlu', 'metrics.json');
const ART_CLS = join(MODELS, 'artifact-router', 'classifier.json');
const ART_MET = join(MODELS, 'artifact-router', 'metrics.json');
const LEGACY_NLU = join(
  ROOT,
  'backend',
  'ml-services',
  'nlu',
  'models',
  'best_model',
  'classifier.json',
);
const LEGACY_ART = join(
  ROOT,
  'backend',
  'ml-services',
  'artifact-router',
  'models',
  'best_model',
  'classifier.json',
);
const REGISTRY = join(ROOT, 'data', 'model-registry', 'entries', 'mdl-unified-ai-node-v1.json');

const checks = [];
const record = (label, ok, detail = '') => {
  checks.push({ label, ok, detail });
  const mark = ok ? 'OK  ' : 'FAIL';
  console.log(`[${mark}] ${label}${detail ? ` — ${detail}` : ''}`);
};

function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

function findExtraClassifiers(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.git') continue;
      findExtraClassifiers(full, acc);
    } else if (name === 'classifier.json') {
      acc.push(full);
    }
  }
  return acc;
}

console.log('CareDroid Unified AI Node verification (offline)\n');

record('Manifest exists', existsSync(MANIFEST), MANIFEST);
record('NLU classifier exists', existsSync(NLU_CLS), NLU_CLS);
record('NLU metrics exist', existsSync(NLU_MET), NLU_MET);
record('Artifact-router classifier exists', existsSync(ART_CLS), ART_CLS);
record('Artifact-router metrics exist', existsSync(ART_MET), ART_MET);
record('Registry entry exists', existsSync(REGISTRY), 'mdl-unified-ai-node-v1');

let manifest = null;
if (existsSync(MANIFEST)) {
  manifest = readJson(MANIFEST);
  record(
    'Manifest name is caredroid-unified-ai-node',
    manifest.name === 'caredroid-unified-ai-node',
    String(manifest.name),
  );
  record('Manifest has nlu head', Boolean(manifest.heads?.nlu));
  record('Manifest has artifact-router head', Boolean(manifest.heads?.['artifact-router']));
  record(
    'Not synced from legacy',
    manifest.heads?.nlu?.syncedFromLegacy !== true &&
      manifest.heads?.['artifact-router']?.syncedFromLegacy !== true,
  );
}

if (existsSync(NLU_MET) && existsSync(ART_MET)) {
  const nlu = readJson(NLU_MET);
  const art = readJson(ART_MET);
  const nluAcc = Number(nlu.accuracy);
  const artAcc = Number(art.accuracy);
  record('NLU accuracy is finite', Number.isFinite(nluAcc), `accuracy=${nluAcc}`);
  record('Artifact-router accuracy is finite', Number.isFinite(artAcc), `accuracy=${artAcc}`);
  record('NLU accuracy >= 0.9', nluAcc >= 0.9, `accuracy=${nluAcc}`);
  record('Artifact-router accuracy >= 0.9', artAcc >= 0.9, `accuracy=${artAcc}`);
  const composite = (nluAcc + artAcc) / 2;
  console.log(
    `\nScores: NLU=${(nluAcc * 100).toFixed(2)}%  artifact-router=${(artAcc * 100).toFixed(2)}%  composite=${(composite * 100).toFixed(2)}%`,
  );
}

record('No active legacy NLU classifier', !existsSync(LEGACY_NLU), LEGACY_NLU);
record('No active legacy artifact classifier', !existsSync(LEGACY_ART), LEGACY_ART);

const allClassifiers = findExtraClassifiers(join(ROOT, 'backend', 'ml-services'));
const allowed = new Set([NLU_CLS, ART_CLS].map((p) => resolve(p)));
const extras = allClassifiers.filter((p) => !allowed.has(resolve(p)));
record(
  'Exactly one pair of classifiers under ml-services',
  extras.length === 0,
  extras.length ? `extra: ${extras.join('; ')}` : 'only unified models/*',
);

if (existsSync(REGISTRY)) {
  const entry = readJson(REGISTRY);
  record('Registry status approved', entry.status === 'approved', String(entry.status));
  record(
    'Registry modelIdentifier matches node',
    entry.modelIdentifier === 'caredroid-unified-ai-node',
    String(entry.modelIdentifier),
  );
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length) {
  console.error('Unified AI Node verification FAILED');
  process.exitCode = 1;
} else {
  console.log('Unified AI Node verification PASSED — single node, no quarantine, weights present.');
}

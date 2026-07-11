#!/usr/bin/env node
/**
 * Pre-ingest gate: a content file may enter RAG only if a registry artifact
 * exists with matching content_hash, rag_ingest_allowed, and accepted status.
 *
 * Usage:
 *   node scripts/knowledge-registry-gate.mjs --file data/medical-knowledge/acls-cardiac-arrest.md
 *   node scripts/knowledge-registry-gate.mjs --directory data/medical-knowledge
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactsDir = join(rootDir, 'data', 'knowledge-registry', 'artifacts');
const policyPath = join(rootDir, 'data', 'knowledge-registry', 'policy.json');

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const fileArg = getArg('--file');
const dirArg = getArg('--directory');

if (!fileArg && !dirArg) {
  console.error('Usage: --file <path> | --directory <path>');
  process.exit(2);
}

const sha256File = (abs) => createHash('sha256').update(readFileSync(abs)).digest('hex');

const loadArtifacts = () => {
  if (!existsSync(artifactsDir)) return [];
  return readdirSync(artifactsDir)
    .filter((n) => n.endsWith('.json'))
    .map((n) => JSON.parse(readFileSync(join(artifactsDir, n), 'utf8')));
};

const toPosix = (p) => p.split('\\').join('/');

const collectFiles = () => {
  if (fileArg) {
    const abs = resolve(rootDir, fileArg);
    return [abs];
  }
  const absDir = resolve(rootDir, dirArg);
  return readdirSync(absDir)
    .filter((n) => /\.(md|txt|markdown)$/i.test(n))
    .map((n) => join(absDir, n));
};

const policy = existsSync(policyPath)
  ? JSON.parse(readFileSync(policyPath, 'utf8'))
  : { ragIngestRequires: {} };

const allowedStatuses = new Set(
  policy.ragIngestRequires?.review_status || ['accepted', 'accepted_with_limitations'],
);

const artifacts = loadArtifacts();
const byHash = new Map(artifacts.map((a) => [a.content_hash, a]));
const byPath = new Map(
  artifacts.filter((a) => a.content_path).map((a) => [toPosix(a.content_path), a]),
);

let failed = 0;
const files = collectFiles();

console.log('Knowledge registry ingest gate\n');

for (const abs of files) {
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    console.log(`[FAIL] missing file: ${abs}`);
    failed += 1;
    continue;
  }

  const rel = toPosix(relative(rootDir, abs));
  const hash = sha256File(abs);
  const art = byHash.get(hash) || byPath.get(rel);

  if (!art) {
    console.log(`[FAIL] ${rel}: no registry artifact (register before ingest)`);
    failed += 1;
    continue;
  }

  if (art.content_hash !== hash) {
    console.log(`[FAIL] ${rel}: hash mismatch vs artifact ${art.id}`);
    failed += 1;
    continue;
  }

  if (art.rag_ingest_allowed !== true) {
    console.log(`[FAIL] ${rel}: artifact ${art.id} has rag_ingest_allowed=false`);
    failed += 1;
    continue;
  }

  if (!allowedStatuses.has(art.review_status)) {
    console.log(
      `[FAIL] ${rel}: artifact ${art.id} review_status=${art.review_status} (need ${[...allowedStatuses].join('|')})`,
    );
    failed += 1;
    continue;
  }

  if (art.expires_at) {
    const exp = new Date(art.expires_at);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
      console.log(`[FAIL] ${rel}: artifact ${art.id} expired ${art.expires_at}`);
      failed += 1;
      continue;
    }
  }

  console.log(`[OK] ${rel} → ${art.id} (${art.review_status}, grade=${art.evidence_grade})`);
}

if (failed) {
  console.log(`\nGATE FAILED — ${failed} file(s) blocked.`);
  process.exit(1);
}

console.log(`\nGATE PASSED — ${files.length} file(s) eligible for RAG ingest.`);
process.exit(0);

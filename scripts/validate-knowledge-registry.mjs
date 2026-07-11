#!/usr/bin/env node
/**
 * Validates CareDroid knowledge registry:
 * - required fields
 * - license allowlist
 * - content_hash matches content_path
 * - no duplicate content hashes among accepted artifacts
 * - expiry for ingest-eligible items
 * - URL domain denylist
 *
 * Usage: node scripts/validate-knowledge-registry.mjs
 * Exit 0 on pass; 1 on failure.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const registryDir = join(rootDir, 'data', 'knowledge-registry');
const artifactsDir = join(registryDir, 'artifacts');
const rejectedDir = join(registryDir, 'rejected');
const policyPath = join(registryDir, 'policy.json');
const indexPath = join(registryDir, 'index.json');
const schemaPath = join(registryDir, 'schema', 'knowledge-artifact.schema.json');

const errors = [];
const warnings = [];

const loadJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const sha256File = (absPath) => {
  const buf = readFileSync(absPath);
  return createHash('sha256').update(buf).digest('hex');
};

const listJsonFiles = (dir) => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => join(dir, name));
};

const requiredFields = [
  'id',
  'title',
  'publisher',
  'retrieved_at',
  'jurisdiction',
  'version',
  'license',
  'permitted_use',
  'content_hash',
  'content_path',
  'topic',
  'specialty',
  'evidence_grade',
  'review_status',
  'provenance_chain',
];

function validateArtifact(artifact, { isRejectedStub = false } = {}) {
  const label = artifact.id || '(missing-id)';

  for (const field of requiredFields) {
    if (artifact[field] === undefined) {
      errors.push(`${label}: missing required field "${field}"`);
    }
  }

  if (artifact.id && !/^kn-[a-z0-9-]+-v[0-9]+$/.test(artifact.id)) {
    errors.push(`${label}: id must match kn-<slug>-vN`);
  }

  if (artifact.content_hash && !/^[a-f0-9]{64}$/.test(artifact.content_hash)) {
    errors.push(`${label}: content_hash must be 64-char lowercase hex sha256`);
  }

  if (!Array.isArray(artifact.provenance_chain) || artifact.provenance_chain.length < 1) {
    errors.push(`${label}: provenance_chain must be a non-empty array`);
  }

  if (isRejectedStub || artifact.review_status === 'rejected') {
    if (!artifact.reject_reason) {
      errors.push(`${label}: rejected artifacts require reject_reason`);
    }
    if (artifact.rag_ingest_allowed === true) {
      errors.push(`${label}: rejected artifacts must not set rag_ingest_allowed=true`);
    }
    return;
  }

  // Accepted / draft bodies must exist and hash-match
  if (artifact.content_path) {
    const abs = join(rootDir, artifact.content_path);
    if (!existsSync(abs) || !statSync(abs).isFile()) {
      errors.push(`${label}: content_path not found: ${artifact.content_path}`);
    } else {
      const actual = sha256File(abs);
      if (actual !== artifact.content_hash) {
        errors.push(
          `${label}: content_hash mismatch for ${artifact.content_path}\n  expected ${artifact.content_hash}\n  actual   ${actual}`,
        );
      }
    }
  } else {
    errors.push(`${label}: content_path required for non-rejected artifacts`);
  }
}

function main() {
  if (!existsSync(policyPath) || !existsSync(indexPath) || !existsSync(schemaPath)) {
    console.error('Registry foundation files missing under data/knowledge-registry/');
    process.exit(1);
  }

  const policy = loadJson(policyPath);
  const index = loadJson(indexPath);
  // schema presence is required even if we do lightweight validation here
  loadJson(schemaPath);

  const allowedLicenses = new Set(policy.allowedLicenses || []);
  const denylist = (policy.urlDomainDenylist || []).map((d) => d.toLowerCase());
  const promoHints = (policy.promotionalDomainHints || []).map((h) => h.toLowerCase());

  const artifactFiles = listJsonFiles(artifactsDir);
  const rejectedFiles = listJsonFiles(rejectedDir);
  const artifacts = artifactFiles.map((f) => ({ path: f, data: loadJson(f) }));
  const rejected = rejectedFiles.map((f) => ({ path: f, data: loadJson(f) }));

  if (artifactFiles.length === 0) {
    errors.push('No artifacts found in data/knowledge-registry/artifacts/');
  }

  // Index consistency
  const idsOnDisk = new Set(artifacts.map((a) => a.data.id));
  for (const id of index.artifactIds || []) {
    if (!idsOnDisk.has(id)) {
      errors.push(`index.json lists ${id} but file is missing in artifacts/`);
    }
  }
  for (const id of idsOnDisk) {
    if (!(index.artifactIds || []).includes(id)) {
      warnings.push(`artifact ${id} exists on disk but is not listed in index.json artifactIds`);
    }
  }

  const hashToIds = new Map();

  for (const { data } of artifacts) {
    validateArtifact(data, { isRejectedStub: false });

    if (!allowedLicenses.has(data.license)) {
      errors.push(`${data.id}: license "${data.license}" not in policy allowlist`);
    }

    if (data.url_or_canonical_id && /^https?:\/\//i.test(data.url_or_canonical_id)) {
      const url = data.url_or_canonical_id.toLowerCase();
      for (const domain of denylist) {
        if (url.includes(domain)) {
          errors.push(`${data.id}: url hits domain denylist (${domain})`);
        }
      }
      for (const hint of promoHints) {
        if (url.includes(hint)) {
          warnings.push(`${data.id}: url contains promotional hint "${hint}"`);
        }
      }
    }

    const ingestEligible =
      data.rag_ingest_allowed === true &&
      ['accepted', 'accepted_with_limitations'].includes(data.review_status);

    if (ingestEligible && data.expires_at) {
      const exp = new Date(data.expires_at);
      if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
        errors.push(`${data.id}: expired (${data.expires_at}) but still ingest-eligible`);
      }
    }

    if (data.content_hash) {
      const list = hashToIds.get(data.content_hash) || [];
      list.push(data.id);
      hashToIds.set(data.content_hash, list);
    }
  }

  for (const [hash, ids] of hashToIds) {
    if (ids.length > 1) {
      errors.push(`duplicate content_hash ${hash}: ${ids.join(', ')}`);
    }
  }

  for (const { data } of rejected) {
    validateArtifact(data, { isRejectedStub: true });
  }

  // Seed corpus: every medical-knowledge md should be registered
  const medicalDir = join(rootDir, 'data', 'medical-knowledge');
  if (existsSync(medicalDir)) {
    const mdFiles = readdirSync(medicalDir).filter((n) => n.endsWith('.md'));
    const registeredPaths = new Set(artifacts.map((a) => a.data.content_path));
    for (const name of mdFiles) {
      const rel = `data/medical-knowledge/${name}`;
      if (!registeredPaths.has(rel)) {
        warnings.push(`medical-knowledge file not registered: ${rel}`);
      }
    }
  }

  console.log('CareDroid knowledge registry validation\n');
  console.log(`Artifacts: ${artifacts.length} · Rejected stubs: ${rejected.length}`);

  for (const w of warnings) {
    console.log(`[WARN] ${w}`);
  }
  for (const e of errors) {
    console.log(`[FAIL] ${e}`);
  }

  if (errors.length) {
    console.log(`\nFAILED with ${errors.length} error(s), ${warnings.length} warning(s).`);
    process.exit(1);
  }

  console.log(`\nOK — registry valid (${warnings.length} warning(s)).`);
  process.exit(0);
}

main();

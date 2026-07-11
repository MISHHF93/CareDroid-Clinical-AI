/**
 * Model registry loader (PR-10) — reads data/model-registry entries.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface ModelRegistryEntry {
  id: string;
  displayName: string;
  kind: string;
  status: string;
  purpose: string;
  prohibitedUses: string[];
  owner: string;
  reviewers: string[];
  trainingDataLineage?: string;
  benchmarkResults?: Record<string, unknown>;
  regulatoryClass: string;
  jurisdictions: string[];
  limitations: string[];
  deployment: {
    environments: string[];
    featureFlag: string;
    canaryPercentDefault?: number;
    rollback: string;
    history?: Array<{ at: string; event: string; actor: string; note?: string }>;
  };
  expiresAt: string;
  retirementPlan: string;
  provider?: string;
  modelIdentifier?: string;
  relatedServiceIds?: string[];
  relatedPaths?: string[];
}

export interface ModelRegistryIndex {
  schemaVersion: string;
  registryVersion: string;
  updatedAt: string;
  entryIds: string[];
}

function resolveRegistryDir(cwd = process.cwd()): string | null {
  const candidates = [
    join(cwd, 'data', 'model-registry'),
    join(cwd, '..', 'data', 'model-registry'),
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, 'index.json'))) return dir;
  }
  return null;
}

export function loadModelRegistryIndex(cwd = process.cwd()): ModelRegistryIndex | null {
  const dir = resolveRegistryDir(cwd);
  if (!dir) return null;
  return JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')) as ModelRegistryIndex;
}

export function loadModelRegistryEntries(cwd = process.cwd()): ModelRegistryEntry[] {
  const dir = resolveRegistryDir(cwd);
  if (!dir) return [];
  const entriesDir = join(dir, 'entries');
  if (!existsSync(entriesDir)) return [];
  return readdirSync(entriesDir)
    .filter((n) => n.endsWith('.json'))
    .map((n) => JSON.parse(readFileSync(join(entriesDir, n), 'utf8')) as ModelRegistryEntry);
}

export function getModelRegistryEntry(
  idOrModelId: string,
  cwd = process.cwd(),
): ModelRegistryEntry | undefined {
  const key = String(idOrModelId || '').trim();
  return loadModelRegistryEntries(cwd).find(
    (e) => e.id === key || e.modelIdentifier === key || e.displayName === key,
  );
}

export function listApprovedModels(cwd = process.cwd()): ModelRegistryEntry[] {
  return loadModelRegistryEntries(cwd).filter((e) => e.status === 'approved' || e.status === 'canary');
}

export function isModelExpired(entry: ModelRegistryEntry, now = new Date()): boolean {
  const exp = new Date(entry.expiresAt);
  return !Number.isNaN(exp.getTime()) && exp.getTime() < now.getTime();
}

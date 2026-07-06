import { existsSync } from 'fs';
import path from 'path';

export type ClassifierHead = 'nlu' | 'artifact-router';

function resolveMlServicesRoot(): string {
  const fromCwd = path.resolve(process.cwd(), 'ml-services');
  if (existsSync(fromCwd)) return fromCwd;
  return path.resolve(__dirname, '..');
}

const ML_SERVICES_ROOT = resolveMlServicesRoot();

/** Single root for all CareDroid unified AI node classifier weights. */
export const UNIFIED_MODELS_ROOT =
  process.env.UNIFIED_MODELS_DIR ?? path.join(ML_SERVICES_ROOT, 'models');

export function classifierDir(head: ClassifierHead): string {
  return path.join(UNIFIED_MODELS_ROOT, head);
}

export function classifierPath(head: ClassifierHead): string {
  return path.join(classifierDir(head), 'classifier.json');
}

export function metricsPath(head: ClassifierHead): string {
  return path.join(classifierDir(head), 'metrics.json');
}

export const MANIFEST_PATH = path.join(UNIFIED_MODELS_ROOT, 'manifest.json');

/** Prefer unified layout; fall back to legacy per-service best_model dirs during migration. */
export function resolveClassifierPath(head: ClassifierHead): string {
  const unified = classifierPath(head);
  if (existsSync(unified)) return unified;

  const legacyService = head === 'nlu' ? 'nlu' : 'artifact-router';
  const legacy = path.join(ML_SERVICES_ROOT, legacyService, 'models', 'best_model', 'classifier.json');
  if (existsSync(legacy)) return legacy;

  return unified;
}

export function resolveMetricsPath(head: ClassifierHead): string {
  const unified = metricsPath(head);
  if (existsSync(unified)) return unified;

  const legacyService = head === 'nlu' ? 'nlu' : 'artifact-router';
  const legacy = path.join(ML_SERVICES_ROOT, legacyService, 'metrics.json');
  if (existsSync(legacy)) return legacy;

  return unified;
}
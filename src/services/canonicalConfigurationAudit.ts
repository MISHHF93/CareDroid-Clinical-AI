import {
  EMERGENCY_ARCHITECTURE_CLASSIFICATION,
  EMERGENCY_ARCHITECTURE_REGISTRY,
  type EmergencyArchitectureArtifact,
} from '../config/emergencyArchitectureRegistry';
import {
  CANONICAL_CONFIGURATION_REGISTRY,
  CANONICAL_ENV_VAR_REGISTRY,
  type CanonicalConfigurationDomain,
  type CanonicalConfigurationEntry,
  type CanonicalConfigurationLayer,
} from '../config/canonicalConfigurationModel';

export type ConfigurationConflictSeverity = 'error' | 'warning' | 'info';

export type ConfigurationConflict = Readonly<{
  id: string;
  severity: ConfigurationConflictSeverity;
  message: string;
  entries?: readonly string[];
}>;

export type CanonicalConfigurationAuditSnapshot = Readonly<{
  engineId: 'canonical-configuration-audit';
  generatedAt: string;
  registryEntryCount: number;
  envVarCount: number;
  byDomain: Readonly<Record<string, number>>;
  byLayer: Readonly<Record<string, number>>;
  conflicts: readonly ConfigurationConflict[];
  undocumentedEnvVars: readonly string[];
  architectureDuplicates: readonly EmergencyArchitectureArtifact[];
  compatShims: readonly CanonicalConfigurationEntry[];
}>;

const REGISTRY_LAYERS: readonly CanonicalConfigurationLayer[] = Object.freeze([
  'parser',
  'registry',
]);

/** Domains that intentionally host multiple registry modules (route families, matrices, token layers). */
const PARTITIONED_REGISTRY_DOMAINS: ReadonlySet<CanonicalConfigurationDomain> = new Set([
  'routes',
  'navigation',
  'api',
  'permissions',
  'ai',
  'design-tokens',
  'layout',
  'documentation',
  'workflow',
  'platform',
  'feature-flags',
]);

function countBy<T extends string>(items: readonly { domain?: T; layer?: T }[], key: 'domain' | 'layer') {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const value = item[key];
    if (!value) continue;
    counts[value] = (counts[value] || 0) + 1;
  }
  return Object.freeze(counts);
}

function resolveRegistryPath(path: string): string {
  return path.replace(/\\/g, '/');
}

export function detectUndocumentedEnvVars(envExampleSource = ''): readonly string[] {
  const documented = new Set<string>();
  for (const line of envExampleSource.split('\n')) {
    const match = line.match(/^([A-Z][A-Z0-9_]+)=/);
    if (match) documented.add(match[1]);
  }

  const missing: string[] = [];
  for (const entry of CANONICAL_ENV_VAR_REGISTRY) {
    const keys = [entry.key, ...(entry.aliases || [])];
    const isDocumented = keys.some((key) => documented.has(key));
    if (!isDocumented && entry.documentedIn !== 'module-direct') {
      missing.push(entry.key);
    }
  }
  return Object.freeze(missing);
}

export function detectConfigurationConflicts(): readonly ConfigurationConflict[] {
  const conflicts: ConfigurationConflict[] = [];
  const ids = CANONICAL_CONFIGURATION_REGISTRY.map((entry) => entry.id);
  const paths = CANONICAL_CONFIGURATION_REGISTRY.map((entry) => entry.path);

  if (new Set(ids).size !== ids.length) {
    const dupes = ids.filter((id, index) => ids.indexOf(id) !== index);
    conflicts.push({
      id: 'duplicate-registry-ids',
      severity: 'error',
      message: 'Duplicate canonical configuration registry ids detected.',
      entries: Object.freeze([...new Set(dupes)]),
    });
  }

  const pathCounts = new Map<string, string[]>();
  for (const entry of CANONICAL_CONFIGURATION_REGISTRY) {
    const normalized = resolveRegistryPath(entry.path);
    const list = pathCounts.get(normalized) || [];
    list.push(entry.id);
    pathCounts.set(normalized, list);
  }
  for (const [path, entryIds] of pathCounts) {
    if (entryIds.length > 1) {
      conflicts.push({
        id: `duplicate-path-${path}`,
        severity: 'error',
        message: `Multiple registry entries claim the same path: ${path}`,
        entries: Object.freeze(entryIds),
      });
    }
  }

  const registryByDomain = new Map<string, CanonicalConfigurationEntry[]>();
  for (const entry of CANONICAL_CONFIGURATION_REGISTRY) {
    if (!REGISTRY_LAYERS.includes(entry.layer)) continue;
    const list = registryByDomain.get(entry.domain) || [];
    list.push(entry);
    registryByDomain.set(entry.domain, list);
  }

  for (const [domain, entries] of registryByDomain) {
    const withoutSupersedes = entries.filter((entry) => !entry.supersedes?.length);
    if (withoutSupersedes.length > 1 && !PARTITIONED_REGISTRY_DOMAINS.has(domain as CanonicalConfigurationDomain)) {
      conflicts.push({
        id: `multi-registry-${domain}`,
        severity: 'warning',
        message: `Domain "${domain}" has ${withoutSupersedes.length} registry-layer entries without supersedes metadata.`,
        entries: Object.freeze(withoutSupersedes.map((entry) => entry.id)),
      });
    }
  }

  const registryPaths = new Set(paths.map(resolveRegistryPath));
  for (const entry of CANONICAL_CONFIGURATION_REGISTRY) {
    for (const superseded of entry.supersedes || []) {
      const normalized = resolveRegistryPath(superseded);
      if (!registryPaths.has(normalized) && !normalized.includes('(')) {
        conflicts.push({
          id: `missing-supersedes-target-${entry.id}`,
          severity: 'info',
          message: `Entry "${entry.id}" supersedes "${superseded}" which is not a registry path.`,
          entries: Object.freeze([entry.id, superseded]),
        });
      }
    }
  }

  const architectureDuplicates = EMERGENCY_ARCHITECTURE_REGISTRY.filter(
    (artifact) => artifact.classification === EMERGENCY_ARCHITECTURE_CLASSIFICATION.DUPLICATE,
  );
  const compatPaths = new Set(
    CANONICAL_CONFIGURATION_REGISTRY.filter((entry) => entry.layer === 'compat').map((entry) =>
      resolveRegistryPath(entry.path),
    ),
  );

  for (const artifact of architectureDuplicates) {
    const normalized = resolveRegistryPath(artifact.path);
    if (!compatPaths.has(normalized)) {
      conflicts.push({
        id: `untracked-duplicate-${artifact.id}`,
        severity: 'warning',
        message: `Architecture DUPLICATE "${artifact.id}" is not registered as a compat shim.`,
        entries: Object.freeze([artifact.path, artifact.canonical || '']),
      });
    }
  }

  return Object.freeze(conflicts);
}

export function buildCanonicalConfigurationAuditSnapshot(
  envExampleSource = '',
  now: Date = new Date(),
): CanonicalConfigurationAuditSnapshot {
  const conflicts = detectConfigurationConflicts();
  const undocumentedEnvVars = detectUndocumentedEnvVars(envExampleSource);
  const architectureDuplicates = EMERGENCY_ARCHITECTURE_REGISTRY.filter(
    (artifact) => artifact.classification === EMERGENCY_ARCHITECTURE_CLASSIFICATION.DUPLICATE,
  );
  const compatShims = CANONICAL_CONFIGURATION_REGISTRY.filter((entry) => entry.layer === 'compat');

  return Object.freeze({
    engineId: 'canonical-configuration-audit',
    generatedAt: now.toISOString(),
    registryEntryCount: CANONICAL_CONFIGURATION_REGISTRY.length,
    envVarCount: CANONICAL_ENV_VAR_REGISTRY.length,
    byDomain: countBy(CANONICAL_CONFIGURATION_REGISTRY, 'domain'),
    byLayer: countBy(CANONICAL_CONFIGURATION_REGISTRY, 'layer'),
    conflicts,
    undocumentedEnvVars,
    architectureDuplicates,
    compatShims,
  });
}

export default {
  buildCanonicalConfigurationAuditSnapshot,
  detectConfigurationConflicts,
  detectUndocumentedEnvVars,
};
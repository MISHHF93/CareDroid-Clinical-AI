import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AUTH_CONFIG } from './auth.config';
import { CANONICAL_ROUTES } from './routes.config';
import { FEATURE_FLAGS } from './featureFlags.config';
import { ENV_CONFIG } from './env.config';
import {
  CANONICAL_CONFIGURATION_CONTRACT,
  CANONICAL_CONFIGURATION_REGISTRY,
  CANONICAL_ENV_VAR_REGISTRY,
  getCanonicalConfigurationEntry,
} from './canonicalConfigurationModel';
import {
  buildCanonicalConfigurationAuditSnapshot,
  detectConfigurationConflicts,
} from '../services/canonicalConfigurationAudit';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');
const srcRoot = join(__dirname, '..');

function repoPath(rel: string) {
  return join(repoRoot, rel.replace(/\//g, '\\'));
}

function readEnvExample() {
  return readFileSync(repoPath('.env.example'), 'utf8');
}

describe('canonical configuration contract', () => {
  it('registers every canonical source with unique ids and existing paths', () => {
    const ids = CANONICAL_CONFIGURATION_REGISTRY.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(CANONICAL_CONFIGURATION_CONTRACT.registryEntryCount).toBe(ids.length);

    for (const entry of CANONICAL_CONFIGURATION_REGISTRY) {
      if (entry.path === '.env.example') {
        expect(existsSync(repoPath(entry.path)), entry.path).toBe(true);
        continue;
      }
      expect(existsSync(repoPath(entry.path)), entry.path).toBe(true);
    }
  });

  it('projects environment and feature flags through the documented layering', () => {
    expect(getCanonicalConfigurationEntry('app-config')?.layer).toBe('parser');
    expect(getCanonicalConfigurationEntry('env-config')?.layer).toBe('projection');
    expect(getCanonicalConfigurationEntry('feature-flags')?.layer).toBe('registry');

    expect(ENV_CONFIG.demoMode).toBe(FEATURE_FLAGS.enableDemoMode);
    expect(AUTH_CONFIG.canonicalRoute).toBe(CANONICAL_ROUTES.auth);

    const envSource = readFileSync(join(srcRoot, 'config/env.config.ts'), 'utf8');
    expect(envSource).toContain("from './featureFlags.config'");
    const authSource = readFileSync(join(srcRoot, 'config/auth.config.ts'), 'utf8');
    expect(authSource).toContain("from './env.config'");
  });

  it('tracks navigation and permission compat shims without duplicate authority', () => {
    expect(getCanonicalConfigurationEntry('unified-navigation')?.layer).toBe('registry');
    expect(getCanonicalConfigurationEntry('navigation-compat')?.layer).toBe('compat');
    expect(getCanonicalConfigurationEntry('legacy-role-permissions-utils')?.supersedes).toContain(
      'src/config/emergencyPermissionRegistry.ts',
    );
  });

  it('documents environment variables with parser module attribution', () => {
    expect(CANONICAL_ENV_VAR_REGISTRY.length).toBeGreaterThanOrEqual(40);
    const gitCommit = CANONICAL_ENV_VAR_REGISTRY.find((entry) => entry.key === 'VITE_GIT_COMMIT');
    expect(gitCommit?.aliases).toContain('VITE_GIT_COMMIT_SHA');
    expect(gitCommit?.parserModule).toBe('appConfig');
  });

  it('detects no error-level configuration conflicts', () => {
    const conflicts = detectConfigurationConflicts();
    const errors = conflicts.filter((conflict) => conflict.severity === 'error');
    expect(errors).toEqual([]);
  });

  it('allows partitioned registry domains without spurious multi-registry warnings', () => {
    const conflicts = detectConfigurationConflicts();
    const multiRegistry = conflicts.filter((conflict) => conflict.id.startsWith('multi-registry-'));
    expect(multiRegistry).toEqual([]);
  });

  it('documents all canonical env vars in .env.example', () => {
    const snapshot = buildCanonicalConfigurationAuditSnapshot(readEnvExample());
    expect(snapshot.undocumentedEnvVars).toEqual([]);
  });

  it('registers architecture DUPLICATE artifacts as compat shims', () => {
    const snapshot = buildCanonicalConfigurationAuditSnapshot(readEnvExample());
    const untracked = snapshot.conflicts.filter(
      (conflict) => conflict.id.startsWith('untracked-duplicate-') && conflict.severity === 'warning',
    );
    expect(untracked).toEqual([]);
    expect(snapshot.compatShims.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([
        'navigation-compat',
        'primary-navigation-compat',
        'legacy-role-permissions-utils',
      ]),
    );
  });

  it('exposes the canonical configuration barrel for stable imports', () => {
    const barrelSource = readFileSync(join(srcRoot, 'config/canonicalConfiguration.ts'), 'utf8');
    expect(barrelSource).toContain("from './canonicalConfigurationModel'");
    expect(barrelSource).toContain('CANONICAL_ROUTES');
    expect(barrelSource).toContain('FEATURE_FLAGS');
    expect(barrelSource).toContain('EMERGENCY_PLATFORM_CONTRACT');
    expect(barrelSource).toContain('PLATFORM_COHESION_CONTRACT');
    expect(barrelSource).toContain("from './security'");
  });

  it('registers route families, platform cohesion, and contextual help sources', () => {
    expect(getCanonicalConfigurationEntry('admin-console-routes')?.domain).toBe('routes');
    expect(getCanonicalConfigurationEntry('training-console-routes')?.domain).toBe('routes');
    expect(getCanonicalConfigurationEntry('platform-cohesion')?.layer).toBe('registry');
    expect(getCanonicalConfigurationEntry('living-documentation-contextual-help')?.exportKeys).toContain(
      'LIVING_CONTEXTUAL_HELP_ENTRIES',
    );
    expect(getCanonicalConfigurationEntry('unified-oi-metric-registry')?.layer).toBe('projection');
  });
});
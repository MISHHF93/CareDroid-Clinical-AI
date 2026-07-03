#!/usr/bin/env node
/**
 * Validates canonical configuration registry — conflicts and env documentation.
 * Usage: npm run test:canonical-config
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
  let vite;
  try {
    vite = await createServer({
      root,
      configFile: false,
      logLevel: 'silent',
      appType: 'custom',
      server: { middlewareMode: true, hmr: false },
    });

    const { buildCanonicalConfigurationAuditSnapshot } = await vite.ssrLoadModule(
      '/src/services/canonicalConfigurationAudit.ts',
    );

    const envExample = readFileSync(join(root, '.env.example'), 'utf8');
    const snapshot = buildCanonicalConfigurationAuditSnapshot(envExample);

    const errors = snapshot.conflicts.filter((c) => c.severity === 'error');
    const warnings = snapshot.conflicts.filter((c) => c.severity === 'warning');

    if (errors.length > 0 || snapshot.undocumentedEnvVars.length > 0) {
      console.error('Canonical configuration audit failed:\n');
      for (const conflict of errors) {
        console.error(`  [error] ${conflict.id}: ${conflict.message}`);
        if (conflict.entries?.length) {
          console.error(`          entries: ${conflict.entries.join(', ')}`);
        }
      }
      if (snapshot.undocumentedEnvVars.length > 0) {
        console.error(`  [error] undocumented env vars: ${snapshot.undocumentedEnvVars.join(', ')}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          registryEntryCount: snapshot.registryEntryCount,
          envVarCount: snapshot.envVarCount,
          byDomain: snapshot.byDomain,
          byLayer: snapshot.byLayer,
          compatShimCount: snapshot.compatShims.length,
          warningCount: warnings.length,
          warnings: warnings.map((w) => ({ id: w.id, message: w.message })),
        },
        null,
        2,
      ),
    );
  } finally {
    if (vite) await vite.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
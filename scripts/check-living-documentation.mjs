#!/usr/bin/env node
/**
 * Verifies docs/generated matches the current implementation snapshot.
 * Usage: npm run docs:check
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'docs', 'generated');

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

    const { generateLivingDocumentationFiles } = await vite.ssrLoadModule(
      '/src/services/livingDocumentationGenerator.ts',
    );
    const { buildLivingDocumentationSnapshot } = await vite.ssrLoadModule(
      '/src/services/livingDocumentationService.ts',
    );

    const snapshot = buildLivingDocumentationSnapshot();
    const expected = generateLivingDocumentationFiles(snapshot);
    const mismatches = [];

    const normalize = (text) =>
      text.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '<generated-at>');

    for (const [filename, content] of Object.entries(expected)) {
      const diskPath = join(outDir, filename);
      if (!existsSync(diskPath)) {
        mismatches.push(`${filename}: missing on disk`);
        continue;
      }
      const onDisk = readFileSync(diskPath, 'utf8');
      if (normalize(onDisk) !== normalize(content)) {
        mismatches.push(`${filename}: out of sync with implementation`);
      }
    }

    if (mismatches.length > 0) {
      console.error('Living documentation is out of sync:\n');
      for (const line of mismatches) {
        console.error(`  - ${line}`);
      }
      console.error('\nRun: npm run docs:generate');
      process.exitCode = 1;
      return;
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          filesChecked: Object.keys(expected).length,
          generatedAt: snapshot.generatedAt,
          metrics: snapshot.metrics,
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
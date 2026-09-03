#!/usr/bin/env node
/**
 * Writes docs/generated/* from the living documentation service.
 * Usage: npm run docs:generate
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
  const outDir = join(root, 'docs', 'generated');
  mkdirSync(outDir, { recursive: true });

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
    const files = generateLivingDocumentationFiles(snapshot);

    for (const [filename, content] of Object.entries(files)) {
      const outPath = join(outDir, filename);
      writeFileSync(outPath, content, 'utf8');
      console.log(`Wrote ${outPath}`);
    }

    console.log(
      JSON.stringify(
        {
          generatedAt: snapshot.generatedAt,
          metrics: snapshot.metrics,
          files: Object.keys(files).length,
          superseded: snapshot.supersededDocs.length,
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

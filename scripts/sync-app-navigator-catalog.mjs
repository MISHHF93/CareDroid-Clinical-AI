#!/usr/bin/env node
/**
 * Regenerate backend/src/modules/app-navigator/data/catalog.json from
 * src/config/routes.config.ts's CANONICAL_ROUTE_MAP.
 *
 * Replaces navigator/scripts/sync-catalog.ts, retired when the formerly-
 * standalone navigator/ app was consolidated into the main backend
 * (2026-08-06) — same source, same output shape, new destination.
 *
 * Usage: npm run navigator-catalog:sync
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const routeFile = join(rootDir, 'src', 'config', 'routes.config.ts');
const module = await import(pathToFileURL(routeFile).href);
const routes = module.CANONICAL_ROUTE_MAP;

const records = routes.map((route) => ({
  id: route.id,
  label: route.label,
  description: route.description,
  path: route.path,
  component: route.pageComponent || route.componentKey,
  navigationGroup: route.navigationGroup,
  breadcrumbs: route.breadcrumbs || [],
  aliases: route.aliases || [],
  workflowOwner: route.workflowOwner,
  requiredPermissions: route.requiredPermissions || [],
}));

let sourceCommit = 'unknown';
try {
  sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: rootDir,
    encoding: 'utf8',
  }).trim();
} catch {
  // A source archive without .git can still produce a valid catalog.
}

const output = join(rootDir, 'backend', 'src', 'modules', 'app-navigator', 'data', 'catalog.json');
await mkdir(dirname(output), { recursive: true });
await writeFile(
  output,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      source: 'CareDroid CANONICAL_ROUTE_MAP',
      sourceCommit,
      generatedAt: new Date().toISOString(),
      records,
    },
    null,
    2,
  )}\n`,
  'utf8',
);
console.log(`Wrote ${records.length} verified routes to ${output}`);

/**
 * Parse Nest controller decorators and compare to BACKEND_HTTP_ROUTES inventory.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BACKEND_HTTP_ROUTES, normalizeRoutePattern } from './backendHttpRouteInventory';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendSrc = join(__dirname, '../../backend/src');

/** SPA catch-all — not REST API inventory. */
const SKIP_HANDLER_PATHS = new Set(['*']);

/**
 * @param {string} controllerPrefix
 * @param {string} handlerPath
 * @param {string} [httpMethod]
 * @returns {string}
 */
export function buildEffectiveHttpPath(controllerPrefix, handlerPath, httpMethod = 'GET') {
  const isAppHealthProbe =
    !controllerPrefix && handlerPath === 'health' && httpMethod === 'GET';
  if (isAppHealthProbe) {
    return '/health';
  }

  const parts = ['api'];
  if (controllerPrefix) {
    parts.push(...controllerPrefix.split('/').filter(Boolean));
  }
  if (handlerPath && !SKIP_HANDLER_PATHS.has(handlerPath)) {
    parts.push(...handlerPath.split('/').filter(Boolean));
  }
  return `/${parts.join('/')}`;
}

/**
 * @param {string} source
 * @param {string} filePath
 * @returns {{ controller: string, method: string, path: string, file: string }[]}
 */
export function parseControllerRoutesFromSource(source, filePath) {
  const routes = [] as any[];
  const controllerMatches = [...source.matchAll(/@Controller\(([^)]*)\)/g)];
  const controllerBlocks = controllerMatches.length
    ? controllerMatches.map((controllerMatch, index) => {
        const start = controllerMatch.index;
        const end = controllerMatches[index + 1]?.index ?? source.length;
        return {
          source: source.slice(start, end),
          arg: controllerMatch[1],
        };
      })
    : [{ source, arg: '' }];

  for (const block of controllerBlocks) {
    const controllerName = block.source.match(/export class (\w+)/)?.[1] ?? 'UnknownController';
    const quoted = block.arg.trim().match(/['"]([^'"]+)['"]/);
    const controllerPrefix = quoted ? quoted[1] : '';

    const handlerRe = /@(Get|Post|Put|Patch|Delete)\(\s*(?:['"`]([^'"`]*?)['"`])?\s*\)/g;
    let match;
    while ((match = handlerRe.exec(block.source)) !== null) {
      const httpMethod = match[1].toUpperCase();
      const handlerPath = match[2] ?? '';
      if (SKIP_HANDLER_PATHS.has(handlerPath)) continue;
      if (!controllerPrefix && !handlerPath && controllerName === 'AppController') continue;

      routes.push({
        controller: controllerName,
        method: httpMethod,
        path: buildEffectiveHttpPath(controllerPrefix, handlerPath, httpMethod),
        file: filePath,
      });
    }
  }
  return routes;
}

function walkControllerFiles(dir, acc = [] as any[]) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkControllerFiles(full, acc);
      continue;
    }
    if (entry.endsWith('.controller.ts')) {
      acc.push(full);
      continue;
    }
    if (entry.endsWith('.module.ts') && readFileSync(full, 'utf8').includes('@Controller(')) {
      acc.push(full);
    }
  }
  return acc;
}

/**
 * @returns {{ controller: string, method: string, path: string, file: string }[]}
 */
export function scanNestControllerRoutes(rootDir = backendSrc) {
  const files = walkControllerFiles(rootDir);
  const routes = [] as any[];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    routes.push(...parseControllerRoutesFromSource(source, file.replace(/\\/g, '/')));
  }
  return routes.sort((a, b) => `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`));
}

/**
 * @param {{ method: string, path: string }} a
 * @param {{ method: string, path: string }} b
 */
export function routeKeysEqual(a, b) {
  return (
    a.method === b.method &&
    normalizeRoutePattern(a.path) === normalizeRoutePattern(b.path)
  );
}

/**
 * Compare scanned controllers to canonical inventory.
 */
export function compareControllerScanToInventory(
  scanned = scanNestControllerRoutes(),
  inventory = BACKEND_HTTP_ROUTES
) {
  const missingInInventory = scanned.filter(
    (s) => !inventory.some((r) => routeKeysEqual(s, r))
  );
  const missingInControllers = inventory.filter(
    (r) => !scanned.some((s) => routeKeysEqual(s, r))
  );
  return { scanned, missingInInventory, missingInControllers };
}

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildRouteHealthGraph, findOrphanPageFiles, ROUTE_HEALTH_STATES } from './routeHealth';

describe('route health graph', () => {
  const graph = buildRouteHealthGraph();

  it('classifies every registered route into a normalized health state', () => {
    const validStates = new Set(Object.values(ROUTE_HEALTH_STATES));

    expect(graph.routes.length).toBeGreaterThan(0);
    expect(graph.routes.every((route) => route.path && validStates.has(route.status))).toBe(true);
    expect(graph.routes.find((route) => route.path === '/emergency/whiteboard')?.status).toBe(
      ROUTE_HEALTH_STATES.ACTIVE
    );
    expect(graph.routes.find((route) => route.path === '/dashboard')?.status).toBe(
      ROUTE_HEALTH_STATES.ALIAS
    );
    expect(graph.routes.find((route) => route.path === '/home')?.status).toBe(
      ROUTE_HEALTH_STATES.ALIAS
    );
    expect(graph.routes.find((route) => route.path === '/ai')?.status).toBe(
      ROUTE_HEALTH_STATES.ALIAS
    );
    expect(graph.routes.find((route) => route.path === '/tools/*')?.status).toBe(
      ROUTE_HEALTH_STATES.ALIAS
    );
  });

  it('has no blank routes', () => {
    expect(graph.blankRoutes).toEqual([]);
  });

  it('has no unreachable active or hidden routes', () => {
    expect(graph.unreachableRoutes).toEqual([]);
  });

  it('has no duplicate route ownership conflicts', () => {
    expect(graph.duplicateOwnership).toEqual([]);
  });

  it('has no orphan pages', () => {
    expect(graph.orphanPages).toEqual([]);
  });
});

describe('findOrphanPageFiles (2026-08-08 regression)', () => {
  // orphanPageEntries() was a hardcoded `return []` stub -- the "No orphan pages" gate above
  // passed unconditionally regardless of real repo state. The suite above only proves the
  // real repo currently has zero orphans; it cannot distinguish a working detector from a
  // stub that always returns []. This uses a synthetic fixture directory to prove the
  // detector actually finds an orphan when one exists, and correctly clears a page once
  // something starts referencing it.

  let fixtureRoot: string;

  afterEach(() => {
    if (fixtureRoot) rmSync(fixtureRoot, { recursive: true, force: true });
  });

  it('flags a page file that nothing else in the search root references', () => {
    fixtureRoot = mkdtempSync(join(tmpdir(), 'route-health-orphan-'));
    const pagesDir = join(fixtureRoot, 'pages');
    mkdirSync(pagesDir, { recursive: true });
    writeFileSync(join(pagesDir, 'TrulyOrphanedPage.tsx'), 'export default function TrulyOrphanedPage() { return null; }');
    writeFileSync(join(fixtureRoot, 'unrelated.ts'), 'export const x = 1;');

    const orphans = findOrphanPageFiles(pagesDir, fixtureRoot);

    expect(orphans).toHaveLength(1);
    expect(orphans[0].component).toBe('TrulyOrphanedPage');
  });

  it('does not flag a page file that a router (or any other real file) references by name', () => {
    fixtureRoot = mkdtempSync(join(tmpdir(), 'route-health-orphan-'));
    const pagesDir = join(fixtureRoot, 'pages');
    mkdirSync(pagesDir, { recursive: true });
    writeFileSync(join(pagesDir, 'WiredPage.tsx'), 'export default function WiredPage() { return null; }');
    writeFileSync(
      join(fixtureRoot, 'router.tsx'),
      "import WiredPage from './pages/WiredPage';\nconsole.log(WiredPage);",
    );

    const orphans = findOrphanPageFiles(pagesDir, fixtureRoot);

    expect(orphans).toHaveLength(0);
  });

  it('ignores test/spec files under the pages directory', () => {
    fixtureRoot = mkdtempSync(join(tmpdir(), 'route-health-orphan-'));
    const pagesDir = join(fixtureRoot, 'pages');
    mkdirSync(pagesDir, { recursive: true });
    writeFileSync(join(pagesDir, 'SomePage.test.tsx'), 'test content');

    const orphans = findOrphanPageFiles(pagesDir, fixtureRoot);

    expect(orphans).toHaveLength(0);
  });
});

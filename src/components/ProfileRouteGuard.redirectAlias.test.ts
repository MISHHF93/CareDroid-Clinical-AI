import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CANONICAL_APP_ROUTE_TREE, IN_SHELL_ROUTE_REDIRECTS } from '../config/routes.config';
import { PERMISSION_ROUTE_MAP } from '../config/userProfileCatalog';

const __dirname = dirname(fileURLToPath(import.meta.url));
const guardSource = readFileSync(join(__dirname, 'ProfileRouteGuard.tsx'), 'utf8');

/**
 * ProfileRouteGuard wraps every route under RootLayout, including the ones
 * that only render a <Navigate>. A redirect alias whose own path is not
 * permitted is therefore denied before it can forward, and the alias silently
 * stops existing for every role.
 *
 * Live-reproduced 2026-09-02 with a real dev-bypass physician session: bare
 * /emergency returned "does not have access" while /emergency/whiteboard,
 * /reception, /patients and /ems all resolved. /marketplace, /vehicle,
 * /protocols and /lab were the same bug, each fixed individually by adding the
 * alias to PERMISSION_ROUTE_MAP.
 */
describe('ProfileRouteGuard lets redirect aliases forward', () => {
  it('exempts redirect aliases from both route inventories', () => {
    // /emergency lives only in CANONICAL_APP_ROUTE_TREE, so a guard covering
    // just IN_SHELL_ROUTE_REDIRECTS misses the very case this was found through.
    expect(guardSource).toContain('IN_SHELL_ROUTE_REDIRECTS');
    expect(guardSource).toContain('CANONICAL_APP_ROUTE_TREE');
    expect(guardSource).toContain('isRedirectAliasRoute(pathname)');
  });

  it('matches aliases exactly, never by prefix', () => {
    // canAccessRoute matches by prefix (canonicalAccess.ts). Granting bare
    // '/emergency' through a permission bucket, or exempting it as a prefix,
    // would hand every '/emergency/*' route to anyone holding that permission --
    // a registration-clerk would gain the physician whiteboard. A Set keyed on
    // the exact path cannot widen that way.
    expect(guardSource).toMatch(/REDIRECT_ALIAS_PATHS\.has\(pathname\)/);
    expect(guardSource).not.toMatch(/REDIRECT_ALIAS_PATHS[\s\S]{0,200}startsWith/);
  });

  it('does not exempt a path that redirects to itself', () => {
    const selfRedirects = CANONICAL_APP_ROUTE_TREE.filter(
      (route) => route.type === 'redirect' && route.to === route.path,
    );
    // '/admin' -> '/admin' is a data error in the tree, not a real alias.
    // Exempting it would skip its permission check for no benefit.
    expect(selfRedirects.length).toBeGreaterThan(0);
    expect(guardSource).toContain('route.to !== route.path');
  });

  it('every redirect alias is reachable: exempted by the guard, or permitted outright', () => {
    const gated = new Set(Object.values(PERMISSION_ROUTE_MAP).flat());
    const exempt = new Set([
      ...IN_SHELL_ROUTE_REDIRECTS.map((r) => r.path),
      ...CANONICAL_APP_ROUTE_TREE.filter(
        (r) => r.type === 'redirect' && r.to && r.to !== r.path,
      ).map((r) => r.path),
    ]);
    const unreachable = [
      ...IN_SHELL_ROUTE_REDIRECTS.map((r) => ({ path: r.path, to: r.to })),
      ...CANONICAL_APP_ROUTE_TREE.filter(
        (r) => r.type === 'redirect' && r.to && r.to !== r.path,
      ).map((r) => ({ path: r.path, to: r.to as string })),
    ].filter((r) => gated.has(r.to) && !gated.has(r.path) && !exempt.has(r.path));

    expect(unreachable, JSON.stringify(unreachable, null, 2)).toEqual([]);
  });
});

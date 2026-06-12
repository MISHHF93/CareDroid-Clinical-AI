import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');

function routeBlockFor(path) {
  const escapedPath = path.replace(/\//g, '\\/');
  return appSource.match(new RegExp(`path:\\s*'${escapedPath}'[\\s\\S]*?requiresAuth:\\s*true,?`))?.[0];
}

describe('workspace subpage routes', () => {
  it('keeps workspace subpages on the protected Emergency OS redirect owner', () => {
    const routeBlock = routeBlockFor('/workspace/:workspaceId/:subpage');

    expect(routeBlock).toBeTruthy();
    expect(routeBlock).toContain('<WorkspaceRouteRedirect />');
    expect(routeBlock).toContain('requiresAuth: true');
    expect(routeBlock).not.toMatch(/<AppShell\b|<Sidebar\b|app-shell-page-body/);
  });

  it('keeps automation analytics as a future-release redirect into Emergency OS', () => {
    expect(appSource).toContain("['Automation Analytics', '/automation-analytics']");
    expect(appSource).toContain('...FUTURE_RELEASE_ROUTES.map(([, path]) => ({');
    expect(appSource).toContain('<LegacyProtectedRouteRedirect to="/emergency/whiteboard" />');
  });
});

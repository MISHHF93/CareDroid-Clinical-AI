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
  it('keeps workspace subpages on the protected WorkspaceHome route owner', () => {
    const routeBlock = routeBlockFor('/workspace/:workspaceId/:subpage');

    expect(routeBlock).toBeTruthy();
    expect(routeBlock).toContain('<WorkspaceHome />');
    expect(routeBlock).toContain('requiresAuth: true');
    expect(routeBlock).not.toMatch(/<AppShell\b|<Sidebar\b|app-shell-page-body/);
  });

  it('adds protected automation analytics as the top-level automation metrics page', () => {
    const routeBlock = routeBlockFor('/automation-analytics');

    expect(routeBlock).toBeTruthy();
    expect(routeBlock).toContain('<AutomationAnalytics />');
    expect(routeBlock).toContain('requiresAuth: true');
  });
});

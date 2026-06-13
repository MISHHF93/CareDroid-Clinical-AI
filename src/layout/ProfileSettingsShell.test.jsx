import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { EMERGENCY_PAGE_ALL_RENDER_PATHS } from '../data/emergencyPageRenderInventory';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = dirname(__dirname);
const appSource = readFileSync(join(srcRoot, 'App.jsx'), 'utf8');
const appShellCss = readFileSync(join(srcRoot, 'layout/AppShell.css'), 'utf8');
const appShellSource = readFileSync(join(srcRoot, 'layout/AppShell.jsx'), 'utf8');
const indexCss = readFileSync(join(srcRoot, 'index.css'), 'utf8');

const routeNamesByPath = Object.entries(CANONICAL_ROUTES).reduce((map, [name, path]) => {
  const names = map.get(path) || [];
  names.push(name);
  map.set(path, names);
  return map;
}, new Map());

function routeBlockFor(path) {
  const routeNames = routeNamesByPath.get(path) || [];
  const routeNeedles = [
    ...routeNames.map((routeName) => `path={CANONICAL_ROUTES.${routeName}}`),
    `path="${path}"`,
  ];
  const routeNeedle = routeNeedles.find((needle) => appSource.includes(needle));
  if (!routeNeedle) return '';
  const index = appSource.indexOf(routeNeedle);
  if (index < 0) return '';
  const lineStart = appSource.lastIndexOf('\n', index);
  const lineEnd = appSource.indexOf('\n', index);
  return appSource.slice(lineStart, lineEnd > index ? lineEnd : index + 240);
}

describe('canonical protected AppShell source-level route contract', () => {
  it.each(EMERGENCY_PAGE_ALL_RENDER_PATHS)(
    'registers %s as page content for the shared AppShell',
    (path) => {
      const routeBlock = routeBlockFor(path);

      expect(routeBlock).toBeTruthy();
      expect(routeBlock).not.toMatch(/<AppShellPage\b|<AppShell\b|<Sidebar\b|<AuthShell\b|<PublicShell\b/);
      expect(routeBlock).not.toContain('app-shell-page-body');
    }
  );

  it('keeps protected shell wrapping centralized in RootLayout', () => {
    expect(appSource).not.toContain('<TenantRequired>');
    expect(appSource).toContain('function RootLayout()');
    expect(appSource).toContain('<Route element={<RootLayout />}>');
    expect(appSource).toContain('<AppShell>');
    expect(appSource).toContain('<Outlet />');
    expect(appSource.match(/<AppShell>/g)).toHaveLength(1);
  });

  it('keeps non-canonical profile routes off the mounted Emergency OS shell', () => {
    expect(appSource).not.toContain('path="/profile"');
    expect(appSource).not.toContain('path="/profile/*"');
    expect(appSource).not.toContain("path: '/profile/settings'");
    expect(appSource).not.toContain('<Sidebar');
    expect(appSource).not.toContain('element: null');
  });

  it('keeps AppShell as the only shell owner for main content and sidebar', () => {
    expect(appShellSource.match(/className="ed-nav-rail"/g)).toHaveLength(1);
    expect(appShellSource.match(/<header className="ed-os-header"/g)).toHaveLength(1);
    expect(appShellSource.match(/data-layout-role=\{LAYOUT_SCROLL_CONTRACT\.mainContentRole\}/g)).toHaveLength(1);
    expect(appShellSource.match(/<main\b/g)).toHaveLength(1);
    expect(appShellSource.match(/className="ed-copilot-panel"/g)).toHaveLength(1);
    expect(appShellSource).toContain('data-layout-role={LAYOUT_SCROLL_CONTRACT.mainContentRole}');
    expect(appSource).not.toContain('className="app-shell-page-body"');
  });

  it('defines one primary vertical scroll container for normal shell pages', () => {
    expect(indexCss).toMatch(/body\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(indexCss).not.toMatch(/body\s*\{[^}]*overflow:\s*hidden/);
    expect(appShellCss).toMatch(/\.ed-os-shell\s*\{[\s\S]*overflow:\s*hidden/);
    expect(appShellCss).toMatch(/\.ed-os-shell__body\s*\{[\s\S]*overflow:\s*hidden/);
    expect(appShellCss).toMatch(/\.ed-os-main,[\s\S]*\.app-shell-main-content\s*\{[\s\S]*overflow:\s*auto/);
  });
});

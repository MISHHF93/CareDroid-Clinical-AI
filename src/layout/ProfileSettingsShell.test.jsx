import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = dirname(__dirname);
const appSource = readFileSync(join(srcRoot, 'App.jsx'), 'utf8');
const appShellCss = readFileSync(join(srcRoot, 'layout/AppShell.css'), 'utf8');
const appShellSource = readFileSync(join(srcRoot, 'layout/AppShell.jsx'), 'utf8');
const indexCss = readFileSync(join(srcRoot, 'index.css'), 'utf8');

const CANONICAL_APP_SHELL_ROUTES = [
  ['/emergency/whiteboard', '<EmergencyWhiteboard />'],
  ['/emergency/patients', '<EmergencyWhiteboard />'],
  ['/emergency/ems', '<EMSPipeline />'],
  ['/emergency/intake', '<SmartIntake />'],
  ['/emergency/queues', '<EmergencyQueueRoute />'],
  ['/emergency/reassessment', '<EmergencyWhiteboard />'],
  ['/emergency/capacity', '<EmergencyCapacityRoute />'],
  ['/emergency/boarding', '<EmergencyCapacityRoute />'],
  ['/emergency/referrals', '<ReferralPanel />'],
  ['/emergency/copilot', '<EmergencyCopilotRedirect />'],
  ['/emergency/analytics', '<EmergencyAnalytics />'],
  ['/emergency/settings', '<SettingsRoute />'],
];

function routeBlockFor(path) {
  const escapedPath = path.replace(/\//g, '\\/');
  return appSource.match(
    new RegExp(`path:\\s*'${escapedPath}'[\\s\\S]*?requiresAuth:\\s*true,?`)
  )?.[0];
}

describe('canonical protected AppShell source-level route contract', () => {
  it.each(CANONICAL_APP_SHELL_ROUTES)(
    'registers %s as protected page content for the shared AppShell',
    (path, elementText) => {
      const routeBlock = routeBlockFor(path);

      expect(routeBlock).toBeTruthy();
      expect(routeBlock).toContain(elementText);
      expect(routeBlock).toContain('requiresAuth: true');
      expect(routeBlock).not.toMatch(/<AppShellPage\b|<AppShell\b|<Sidebar\b|<AuthShell\b|<PublicShell\b/);
      expect(routeBlock).not.toContain('app-shell-page-body');
    }
  );

  it('keeps protected shell wrapping centralized in resolveElement', () => {
    expect(appSource).toContain('if (requiresAuth || !publicOnly) {');
    expect(appSource).not.toContain('<TenantRequired>');
    expect(appSource).toContain('<AppShellPage>{resolvedElement}</AppShellPage>');
    expect(appSource.match(/<AppShellPage\b/g)).toHaveLength(1);
  });

  it('keeps non-canonical profile routes as future AppShell stubs instead of duplicate shells', () => {
    expect(appSource).toContain("['Profile', '/profile']");
    expect(appSource).toContain("['Profile', '/profile/*']");
    expect(appSource).not.toContain("path: '/profile/settings'");
    expect(appSource).not.toContain('<Sidebar');
    expect(appSource).not.toContain('element: null');
  });

  it('keeps AppShell as the only shell owner for main content and sidebar', () => {
    expect(appShellSource.match(/className="ed-nav-rail"/g)).toHaveLength(1);
    expect(appShellSource.match(/<header className="ed-os-header"/g)).toHaveLength(1);
    expect(appShellSource.match(/data-layout-role="MainContent"/g)).toHaveLength(1);
    expect(appShellSource.match(/<main\b/g)).toHaveLength(1);
    expect(appShellSource.match(/className="ed-copilot-panel"/g)).toHaveLength(1);
    expect(appShellSource).toContain('data-layout-role="MainContent"');
    expect(appSource).not.toContain('className="app-shell-page-body"');
  });

  it('defines one primary vertical scroll container for normal shell pages', () => {
    expect(indexCss).toMatch(/body\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(indexCss).not.toMatch(/body\s*\{[^}]*overflow:\s*hidden/);
    expect(appShellCss).toMatch(/\.ed-os-shell\s*\{[\s\S]*overflow:\s*hidden/);
    expect(appShellCss).toMatch(/\.ed-os-shell__body\s*\{[\s\S]*overflow:\s*hidden/);
    expect(appShellCss).toMatch(/\.ed-os-main\s*\{[\s\S]*overflow:\s*auto/);
  });
});

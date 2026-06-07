import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = dirname(__dirname);
const appSource = readFileSync(join(srcRoot, 'App.jsx'), 'utf8');
const appShellCss = readFileSync(join(srcRoot, 'layout/AppShell.css'), 'utf8');
const appShellSource = readFileSync(join(srcRoot, 'layout/AppShell.jsx'), 'utf8');
const pageContainerSource = readFileSync(join(srcRoot, 'layout/PageContainer.jsx'), 'utf8');
const pageContainerCss = readFileSync(join(srcRoot, 'layout/PageContainer.css'), 'utf8');
const profileSettingsSource = readFileSync(join(srcRoot, 'pages/ProfileSettings.jsx'), 'utf8');
const profileSettingsCss = readFileSync(join(srcRoot, 'pages/ProfileSettings.css'), 'utf8');
const indexCss = readFileSync(join(srcRoot, 'index.css'), 'utf8');

const CANONICAL_APP_SHELL_ROUTES = [
  ['/profile/settings', 'ProfileSettings', 'pages/ProfileSettings.jsx'],
  ['/dashboard', 'CommandDashboard', 'pages/CommandDashboard.jsx'],
  ['/tools', 'ToolsOverview', 'pages/tools/ToolsOverview.jsx'],
  ['/assistant', 'Dashboard', 'pages/Dashboard.jsx'],
  ['/hospital-map', 'HospitalMapDashboard', 'pages/HospitalMapDashboard.jsx'],
  ['/medical-iot', 'MedicalIotDashboard', 'pages/MedicalIotDashboard.jsx'],
  ['/devices', 'DeviceFleetManagement', 'pages/DeviceFleetManagement.jsx'],
  ['/fleet/map', 'FleetLiveMap', 'pages/fleet/FleetLiveMap.jsx'],
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
    (path, component) => {
      const routeBlock = routeBlockFor(path);

      expect(routeBlock).toBeTruthy();
      expect(routeBlock).toContain(`<${component} `);
      expect(routeBlock).toContain('requiresAuth: true');
      expect(routeBlock).not.toMatch(/<AppShellPage\b|<AppShell\b|<Sidebar\b|<AuthShell\b/);
      expect(routeBlock).not.toContain('app-shell-page-body');
    }
  );

  it.each(CANONICAL_APP_SHELL_ROUTES)(
    '%s page source does not create duplicate app chrome or local shell scroll',
    (_path, _component, sourcePath) => {
      const pageSource = readFileSync(join(srcRoot, sourcePath), 'utf8');

      expect(pageSource).not.toMatch(/<AppShell\b|<Sidebar\b|<AuthShell\b/);
      expect(pageSource).not.toMatch(
        /app-shell-main-wrap|app-shell-page-body|data-layout-role="MainContent"/
      );
    }
  );

  it('keeps protected shell wrapping centralized in resolveElement', () => {
    expect(appSource).toContain('if (requiresAuth) {');
    expect(appSource).toContain('<TenantRequired>');
    expect(appSource).toContain('<AppShellPage>{resolvedElement}</AppShellPage>');
    expect(appSource.match(/<AppShellPage\b/g)).toHaveLength(1);
  });

  it('routes /profile/settings through the shared resolver and not through a duplicate shell/sidebar', () => {
    const routeBlock = appSource.match(
      /path:\s*'\/profile\/settings'[\s\S]*?requiresAuth:\s*true,/
    )?.[0];

    expect(routeBlock).toBeTruthy();
    expect(routeBlock).toContain('<ProfileSettings />');
    expect(routeBlock).not.toMatch(/<AppShell\b|<Sidebar\b|element:\s*null/);
    expect(profileSettingsSource).not.toMatch(/<AppShell\b|<Sidebar\b/);
  });

  it('keeps AppShell as the only shell owner for main content and sidebar', () => {
    expect(appShellSource.match(/<Sidebar\b/g)).toHaveLength(1);
    expect(appShellSource.match(/<header className="app-shell-header"/g)).toHaveLength(1);
    expect(appShellSource.match(/data-layout-role="MainContent"/g)).toHaveLength(1);
    expect(appShellSource.match(/<main\b/g)).toHaveLength(1);
    expect(appShellSource.match(/className=\{mainContentClassName\}/g)).toHaveLength(1);
    expect(appShellSource).toContain('data-layout-role="MainContent"');
    expect(appSource).not.toContain('className="app-shell-page-body"');
  });

  it('defines one primary vertical scroll container for normal shell pages', () => {
    expect(indexCss).toMatch(/body\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(indexCss).not.toMatch(/body\s*\{[^}]*overflow:\s*hidden/);
    expect(appShellCss).toMatch(/\.app-shell\s*\{[\s\S]*overflow:\s*hidden/);
    expect(appShellCss).toMatch(/\.app-shell-main-wrap\s*\{[\s\S]*overflow:\s*hidden/);
    expect(appShellCss).toMatch(/\.app-shell-main-content\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(appShellCss).toMatch(/\.app-shell-page-body\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(appShellCss).toMatch(/\.app-shell-page-body\s*\{[\s\S]*scrollbar-gutter:\s*auto/);
    expect(appShellCss).toMatch(
      /\.app-shell-page-body:not\(\.app-shell-page-body--conversation\) > \*[\s\S]*overflow:\s*visible/
    );
  });

  it('uses PageContainer for profile settings without local page scroll wrappers', () => {
    expect(pageContainerSource).toContain('export function PageContainer');
    expect(pageContainerSource).toContain('export function ScrollArea');
    expect(pageContainerCss).toMatch(/\.page-container\s*\{[\s\S]*max-width/);
    expect(pageContainerCss).toMatch(/\.scroll-area\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(profileSettingsSource).toContain('<PageContainer');
    expect(profileSettingsSource).toContain('as="main"');
    expect(profileSettingsSource).toContain('className="profile-settings-page"');
    expect(profileSettingsSource).not.toMatch(
      /app-scroll-container|app-local-scroll-y|<ScrollArea/
    );
    expect(profileSettingsCss).toMatch(/\.profile-settings-grid[\s\S]*minmax\(0,\s*1fr\)/);
    expect(profileSettingsCss).toMatch(/@media \(max-width:\s*640px\)/);
  });
});

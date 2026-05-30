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

describe('/profile/settings source-level route contract', () => {
  it('routes through one AppShellPage and not through a duplicate shell/sidebar', () => {
    const routeBlock = appSource.match(
      /path:\s*'\/profile\/settings'[\s\S]*?requiresAuth:\s*true,/
    )?.[0];

    expect(routeBlock).toBeTruthy();
    expect(routeBlock.match(/<AppShellPage>/g)).toHaveLength(1);
    expect(routeBlock).toContain('<ProfileSettings />');
    expect(routeBlock).not.toMatch(/<AppShell\b|<Sidebar\b|element:\s*null/);
    expect(profileSettingsSource).not.toMatch(/<AppShell\b|<Sidebar\b/);
  });

  it('keeps AppShell as the only shell owner for main content and sidebar', () => {
    expect(appShellSource.match(/<Sidebar\b/g)).toHaveLength(1);
    expect(appShellSource.match(/className="app-shell-main-wrap"/g)).toHaveLength(1);
    expect(appShellSource).toContain('data-layout-role="MainContent"');
    expect(appShellSource).toContain('<main className="app-shell-main-wrap"');
    expect(appSource.match(/<AppShellPage>/g)?.length).toBeGreaterThan(20);
    expect(appSource).not.toMatch(/<AppShellPage>\s*<AppShellPage>/);
  });

  it('defines one primary vertical scroll container for normal shell pages', () => {
    expect(indexCss).toMatch(/body\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(indexCss).not.toMatch(/body\s*\{[^}]*overflow:\s*hidden/);
    expect(appShellCss).toMatch(/\.app-shell\s*\{[\s\S]*overflow:\s*hidden/);
    expect(appShellCss).toMatch(/\.app-shell-main-wrap\s*\{[\s\S]*overflow:\s*hidden/);
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
    expect(profileSettingsSource).toContain('className="profile-settings-page"');
    expect(profileSettingsSource).not.toMatch(/app-scroll-container|app-local-scroll-y|<ScrollArea/);
    expect(profileSettingsCss).toMatch(/\.profile-settings-grid[\s\S]*minmax\(0,\s*1fr\)/);
    expect(profileSettingsCss).toMatch(/@media \(max-width:\s*640px\)/);
  });
});

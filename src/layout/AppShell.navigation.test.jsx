import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EMERGENCY_OS_ROUTE_COMMANDS } from '../config/commandPalette.config';
import { APP_SHELL_NAV_ITEMS } from '../config/navigation.config';
import { NAVIGATION_ITEMS } from '../config/unified-navigation.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appShellSource = readFileSync(join(__dirname, '../components/AppShell.tsx'), 'utf8');
const navigationConfig = readFileSync(join(__dirname, '../config/navigation.config.js'), 'utf8');
const commandPaletteSource = readFileSync(
  join(__dirname, '../config/commandPalette.config.js'),
  'utf8',
);

const CANONICAL_SIDEBAR_PATHS = NAVIGATION_ITEMS.map((item) => item.path);

describe('AppShell navigation surfaces', () => {
  it('renders the canonical Sidebar and no legacy rail or bottom navigation component', () => {
    expect(appShellSource).toContain('<Sidebar navigationItems={visibleNavigationItems} />');
    expect(appShellSource).not.toContain('className="ed-nav-rail"');
    expect(appShellSource).not.toContain('app-shell-bottom-nav');
  });

  it('keeps nav items projected from the canonical unified config', () => {
    expect(navigationConfig).toContain('export const APP_SHELL_NAV_ITEMS');
    expect(navigationConfig).toContain(
      "import { NAVIGATION_ITEMS } from './unified-navigation.config'",
    );
    expect(appShellSource).not.toContain('SIDEBAR_ICON_COMPONENTS');
    expect(APP_SHELL_NAV_ITEMS.map((item) => item.featureGate)).toEqual(
      NAVIGATION_ITEMS.map((item) => item.featureGate),
    );
  });

  it('keeps each rail item wired to a route and active path list', () => {
    for (const item of APP_SHELL_NAV_ITEMS) {
      expect(item.path, item.id).toMatch(/^\//);
      expect(item.route, item.id).toMatch(/^\//);
      expect(item.iconKey, item.id).toMatch(/^[a-z0-9-]+$/);
      expect(item.activePaths.length, item.id).toBeGreaterThan(0);
      expect(
        item.activePaths.every((path) => path.startsWith('/')),
        item.id,
      ).toBe(true);
    }
    expect(APP_SHELL_NAV_ITEMS.map((item) => item.route)).toEqual(CANONICAL_SIDEBAR_PATHS);
  });

  it('keeps canonical sidebar destinations reachable from the command palette where command-backed', () => {
    expect(commandPaletteSource).toContain('export const EMERGENCY_OS_ROUTE_COMMANDS');
    const commandPaths = EMERGENCY_OS_ROUTE_COMMANDS.map((command) => command.build().path);
    for (const path of ['/emergency/ems', '/emergency/referrals', '/emergency/capacity']) {
      expect(commandPaths, path).toContain(path);
    }
  });

  it('renders required header and content regions once', () => {
    expect(appShellSource).toContain('<Header />');
    expect(appShellSource.match(/role="main"/g)).toHaveLength(1);
    expect(appShellSource).toContain('<CopilotPanel />');
    expect(appShellSource).toContain('<PatientDetailPanel />');
    expect(appShellSource).toContain('<CommandPalette');
  });

  it('delegates mobile navigation and overflow to Sidebar.css', () => {
    const sidebarCss = readFileSync(join(__dirname, '../components/Sidebar.css'), 'utf8');
    expect(sidebarCss).toMatch(/@media \(max-width: 768px\)/);
    expect(sidebarCss).toContain('.sidebar-nav-item:nth-of-type(n + 6)');
    expect(sidebarCss).toContain('.sidebar-more-sheet');
    expect(APP_SHELL_NAV_ITEMS).toHaveLength(NAVIGATION_ITEMS.length);
  });

  it('closes active AppShell overlays on Escape', () => {
    expect(appShellSource).toContain("if (e.key === 'Escape')");
    expect(appShellSource).toContain('store.selectPatient(null);');
    expect(appShellSource).toContain('setShowReassessmentDrawer(false);');
    expect(appShellSource).toContain("document.dispatchEvent(new Event('close-all-panels'));");
  });
});

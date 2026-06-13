import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EMERGENCY_OS_ROUTE_COMMANDS } from '../config/commandPalette.config';
import { APP_SHELL_NAV_ITEMS } from '../config/navigation.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appShellJsx = readFileSync(join(__dirname, 'AppShell.jsx'), 'utf8');
const appShellCss = readFileSync(join(__dirname, 'AppShell.css'), 'utf8');
const navigationConfig = readFileSync(join(__dirname, '../config/navigation.config.js'), 'utf8');
const commandPaletteSource = readFileSync(
  join(__dirname, '../config/commandPalette.config.js'),
  'utf8'
);

const CANONICAL_SIDEBAR_PATHS = [
  '/emergency',
  '/emergency/pulse',
  '/emergency/ems',
  '/emergency/referrals',
  '/emergency/capacity',
  '/emergency/tools',
  '/emergency/shift',
  '/settings',
];

describe('AppShell navigation surfaces', () => {
  it('renders the canonical Sidebar and no legacy rail or bottom navigation component', () => {
    expect(appShellJsx).toContain('<Sidebar />');
    expect(appShellJsx).not.toContain('className="ed-nav-rail"');
    expect(appShellJsx).not.toContain('aria-label="Emergency OS navigation"');
    expect(appShellJsx).not.toContain('app-shell-bottom-nav');
    expect(appShellCss).not.toContain('app-shell-bottom-nav');
  });

  it('keeps nav items projected from the canonical unified config', () => {
    expect(navigationConfig).toContain('export const APP_SHELL_NAV_ITEMS');
    expect(navigationConfig).toContain("import { NAVIGATION_ITEMS } from './unified-navigation.config'");
    expect(appShellJsx).not.toContain('SIDEBAR_ICON_COMPONENTS');
    expect(APP_SHELL_NAV_ITEMS.map((item) => item.featureGate)).toEqual([
      null,
      null,
      'ems_pipeline',
      'referral_intel',
      'capacity_intel',
      'clinical_tools',
      null,
      null,
    ]);
  });

  it('keeps each rail item wired to a route and active path list', () => {
    for (const item of APP_SHELL_NAV_ITEMS) {
      expect(item.path, item.id).toMatch(/^\//);
      expect(item.route, item.id).toMatch(/^\//);
      expect(item.iconKey, item.id).toMatch(/^[a-z0-9-]+$/);
      expect(item.activePaths.length, item.id).toBeGreaterThan(0);
      expect(item.activePaths.every((path) => path.startsWith('/')), item.id).toBe(true);
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
    expect(appShellJsx.match(/<header className="ed-os-header"/g)).toHaveLength(1);
    expect(appShellJsx.match(/data-layout-role={LAYOUT_SCROLL_CONTRACT.mainContentRole}/g)).toHaveLength(1);
    expect(appShellJsx.match(/className="ed-copilot-panel"/g)).toHaveLength(1);
    expect(appShellJsx).toContain('aria-label="Go to Emergency Whiteboard"');
    expect(appShellJsx).toContain("onClick={() => navigate('/emergency/whiteboard')}");
    expect(appShellJsx).toContain('aria-label={`Open shift summary. Current time ${formatShiftClock(clock)}`}');
    expect(appShellJsx).toContain("onClick={() => navigate('/emergency/analytics?view=shift')}");
    expect(appShellJsx).toContain('<CapacityBadge');
    expect(appShellJsx).toContain('<StaffAvatar');
  });

  it('delegates mobile bottom tabs to Sidebar.css', () => {
    const sidebarCss = readFileSync(join(__dirname, '../components/Sidebar.css'), 'utf8');
    expect(sidebarCss).toMatch(/@media \(max-width: 768px\)/);
    expect(sidebarCss).toContain('.sidebar-nav-item:nth-of-type(n + 6)');
    expect(APP_SHELL_NAV_ITEMS).toHaveLength(8);
  });

  it('closes only the topmost AppShell panel on Escape', () => {
    expect(appShellJsx).toContain('const closeTopmostPanel = useCallback');
    expect(appShellJsx).toContain("if (event.key === 'Escape')");
    expect(appShellJsx).toContain('closeTopmostPanel();');
    expect(appShellJsx).not.toContain('closeAllPanels();');
  });
});

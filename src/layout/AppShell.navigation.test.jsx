import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { APP_SHELL_NAV_ITEMS } from '../config/navigation.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appShellJsx = readFileSync(join(__dirname, 'AppShell.jsx'), 'utf8');
const appShellCss = readFileSync(join(__dirname, 'AppShell.css'), 'utf8');
const navigationConfig = readFileSync(join(__dirname, '../config/navigation.config.js'), 'utf8');

describe('AppShell navigation surfaces', () => {
  it('renders one AppShell rail and no legacy sidebar or bottom navigation', () => {
    expect(appShellJsx.match(/className="ed-nav-rail"/g)).toHaveLength(1);
    expect(appShellJsx.match(/aria-label="Emergency OS navigation"/g)).toHaveLength(1);
    expect(appShellJsx).not.toContain('<Sidebar');
    expect(appShellJsx).not.toContain('app-shell-bottom-nav');
    expect(appShellCss).not.toContain('app-shell-bottom-nav');
  });

  it('keeps nav items in the canonical AppShell config array', () => {
    expect(navigationConfig).toContain('export const APP_SHELL_NAV_ITEMS');
    expect(appShellJsx).toContain('APP_SHELL_NAV_ITEMS.map');
    expect(APP_SHELL_NAV_ITEMS.map((item) => item.featureId)).toEqual([
      'emergency_whiteboard',
      'ems_pipeline',
      'referral_intelligence',
      'capacity_intelligence',
      'clinical_calculator_hub',
      'shift_summary',
      'emergency_settings',
    ]);
  });

  it('keeps each rail item wired to a route and active path list', () => {
    for (const item of APP_SHELL_NAV_ITEMS) {
      expect(item.path, item.id).toMatch(/^\//);
      expect(item.activePaths.length, item.id).toBeGreaterThan(0);
      expect(item.activePaths.every((path) => path.startsWith('/')), item.id).toBe(true);
    }
    expect(appShellJsx).toContain('<Link');
    expect(appShellJsx).toContain('to={item.path}');
    expect(appShellJsx).toContain("isActive ? 'ed-nav-rail__item--active' : ''");
    expect(appShellJsx).toContain("aria-current={isActive ? 'page' : undefined}");
    expect(appShellJsx).toContain('title={isNew ? `${item.label} - New` : item.label}');
  });

  it('renders required header and content regions once', () => {
    expect(appShellJsx.match(/<header className="ed-os-header"/g)).toHaveLength(1);
    expect(appShellJsx.match(/data-layout-role="MainContent"/g)).toHaveLength(1);
    expect(appShellJsx.match(/className="ed-copilot-panel"/g)).toHaveLength(1);
    expect(appShellJsx).toContain('aria-label="Go to Emergency Whiteboard"');
    expect(appShellJsx).toContain("onClick={() => navigate('/emergency')}");
    expect(appShellJsx).toContain('aria-label={`Open shift summary. Current time ${formatShiftClock(clock)}`}');
    expect(appShellJsx).toContain("onClick={() => navigate('/emergency/shift')}");
    expect(appShellJsx).toContain('<CapacityBadge');
    expect(appShellJsx).toContain('<StaffAvatar');
  });

  it('keeps tablet bottom tabs complete and clickable at 1024px', () => {
    expect(appShellCss).toMatch(
      /@media \(max-width: 1024px\)[\s\S]*\.ed-nav-rail__items\s*\{[\s\S]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(44px,\s*1fr\)\)/
    );
    expect(appShellCss).toMatch(
      /@media \(max-width: 1024px\)[\s\S]*\.ed-nav-rail__item\s*\{[\s\S]*display:\s*flex/
    );
    expect(appShellCss).not.toContain('.ed-nav-rail__item:nth-child(-n + 5)');
    expect(APP_SHELL_NAV_ITEMS).toHaveLength(7);
  });

  it('closes only the topmost AppShell panel on Escape', () => {
    expect(appShellJsx).toContain('const closeTopmostPanel = useCallback');
    expect(appShellJsx).toContain("if (event.key === 'Escape')");
    expect(appShellJsx).toContain('closeTopmostPanel();');
    expect(appShellJsx).not.toContain('closeAllPanels();');
  });
});

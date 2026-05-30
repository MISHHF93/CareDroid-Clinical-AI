/**
 * Sidebar responsive navigation contracts — drawer, scroll, labels, a11y.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sidebarCss = readFileSync(join(__dirname, 'Sidebar.css'), 'utf8');
const sidebarJsx = readFileSync(join(__dirname, 'Sidebar.jsx'), 'utf8');
const themeTokensCss = readFileSync(join(__dirname, '../styles/theme-tokens.css'), 'utf8');
const drawerFocusJs = readFileSync(join(__dirname, '../hooks/useDrawerFocus.js'), 'utf8');
const appShellJsx = readFileSync(join(__dirname, '../layout/AppShell.jsx'), 'utf8');

describe('Sidebar responsive — mobile drawer', () => {
  it('off-canvas drawer does not intercept pointer events when closed', () => {
    expect(sidebarCss).toMatch(
      /@media \(max-width: 900px\)[\s\S]*\.sidebar[\s\S]*pointer-events:\s*none/
    );
    expect(sidebarCss).toMatch(
      /\.sidebar\.sidebar--open[\s\S]*pointer-events:\s*auto/
    );
    expect(sidebarCss).toMatch(/translate3d\(-100%/);
  });

  it('CSS fallback clears main column inset on compact viewports', () => {
    expect(readFileSync(join(__dirname, '../layout/AppShell.css'), 'utf8')).toMatch(
      /@media \(max-width: 900px\)[\s\S]*\.app-shell-main-wrap[\s\S]*margin-left:\s*0/
    );
  });

  it('provides mobile close control with touch target and initial focus hook', () => {
    expect(sidebarJsx).toContain('sidebar-toggle--mobile-close');
    expect(sidebarJsx).toContain('data-drawer-initial-focus');
    expect(sidebarJsx).toMatch(/layoutCompact\s*\?\s*'Close menu'/);
    expect(drawerFocusJs).toContain('[data-drawer-initial-focus]');
  });

  it('marks closed compact drawer inert and hides from assistive tech', () => {
    expect(sidebarJsx).toContain("setAttribute('inert'");
    expect(sidebarJsx).toMatch(/aria-hidden=\{layoutCompact && !mobileNavOpen/);
  });

  it('AppShell wires backdrop, escape, focus trap, and route-close', () => {
    expect(appShellJsx).toContain('app-shell-nav-backdrop');
    expect(appShellJsx).toContain('useDrawerFocus');
    expect(appShellJsx).toMatch(/e\.key === 'Escape'/);
    expect(appShellJsx).toContain('useLocation');
    expect(appShellJsx).toMatch(/location\.pathname/);
  });
});

describe('Sidebar responsive — scroll and labels', () => {
  it('sidebar content scrolls independently with overflow hidden on shell', () => {
    expect(sidebarCss).toMatch(/\.sidebar-content[\s\S]*overflow-y:\s*auto/);
    expect(sidebarCss).toMatch(/\.sidebar-content[\s\S]*min-height:\s*0/);
    expect(sidebarCss).toMatch(/\.sidebar[\s\S]*overflow:\s*hidden/);
  });

  it('tool and nav labels wrap by words without horizontal overflow', () => {
    expect(sidebarCss).toContain('.sidebar-tool-card-title-row');
    expect(sidebarCss).toMatch(/\.nav-label[\s\S]*overflow-wrap:\s*break-word/);
    expect(sidebarCss).toMatch(/\.sidebar-tool-card-name[\s\S]*overflow-wrap:\s*break-word/);
  });
});

describe('Sidebar user avatar', () => {
  it('keeps avatar fill and circle border in the same accent family', () => {
    expect(sidebarCss).toMatch(/\.user-avatar\s*\{[\s\S]*border:\s*2px solid var\(--sidebar-avatar-ring\)/);
    expect(sidebarCss).toMatch(/\.user-avatar\s*\{[\s\S]*box-shadow:\s*0 0 0 1px color-mix\(in srgb, var\(--app-accent\) 12%, transparent\)/);
    expect(themeTokensCss).toMatch(/--sidebar-avatar-gradient:\s*linear-gradient\(135deg,\s*color-mix\(in srgb, var\(--app-accent\) 92%, var\(--app-on-solid\)\), var\(--app-accent\)\)/);
    expect(themeTokensCss).toMatch(/--sidebar-avatar-ring:\s*color-mix\(in srgb, var\(--app-accent\) 8[48]%, var\(--app-on-solid\)\)/);
  });
});

describe('Sidebar responsive — desktop collapse unchanged', () => {
  it('keeps collapsed width fallback aligned with the compact token', () => {
    expect(sidebarCss).toMatch(/\.sidebar-collapsed[\s\S]*--sidebar-width-collapsed,\s*58px/);
    expect(sidebarJsx).toContain('sidebar-collapsed');
    expect(sidebarJsx).toMatch(/effectiveCollapsed = layoutCompact \? false : sidebarCollapsed/);
  });
});

describe('Sidebar responsive — active routes and keyboard', () => {
  it('uses nested path matching and aria-current for nav items', () => {
    expect(sidebarJsx).toContain('primaryNavPathMatches');
    expect(sidebarJsx).toMatch(/aria-current=\{isActive \? 'page'/);
  });

  it('scrolls active item into view when mobile drawer opens', () => {
    expect(sidebarJsx).toContain('scrollIntoView');
    expect(sidebarJsx).toMatch(/\.nav-item\.active/);
  });

  it('advanced section uses a native button and keeps developer links collapsed', () => {
    expect(sidebarJsx).toContain('sidebar-advanced-toggle');
    expect(sidebarJsx).toContain('ADVANCED_SIDEBAR_NAV_ITEMS');
    expect(sidebarJsx).toContain('aria-expanded={showAdvanced}');
  });
});

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const designTokensCss = readFileSync(join(__dirname, 'design-tokens.css'), 'utf8');
const responsiveCss = readFileSync(join(__dirname, 'responsive-ux.css'), 'utf8');
const sidebarCss = readFileSync(join(__dirname, '../components/Sidebar.css'), 'utf8');
const workspaceSwitcherCss = readFileSync(join(__dirname, '../components/WorkspaceSwitcher.css'), 'utf8');
const appShellCss = readFileSync(join(__dirname, '../layout/AppShell.css'), 'utf8');
const appShellJsx = readFileSync(join(__dirname, '../layout/AppShell.jsx'), 'utf8');
const primitivesSource = readFileSync(
  join(__dirname, '../components/ui/CareDroidPrimitives.jsx'),
  'utf8'
);
const primitivesCss = readFileSync(
  join(__dirname, '../components/ui/CareDroidPrimitives.css'),
  'utf8'
);
const drawerCss = readFileSync(join(__dirname, '../components/ui/Drawer.css'), 'utf8');
const modalCss = readFileSync(join(__dirname, '../components/ui/Modal.css'), 'utf8');
const emergencyBannerCss = readFileSync(
  join(__dirname, '../components/alerts/EmergencyBanner.css'),
  'utf8'
);
const notificationToastCss = readFileSync(
  join(__dirname, '../components/notifications/NotificationToast.css'),
  'utf8'
);

describe('CareDroid design language fit contract', () => {
  it('defines shared control, icon, shell, z-index, shadow, and focus tokens', () => {
    [
      '--app-control-height-md',
      '--app-icon-button-size',
      '--app-input-height',
      '--app-shell-header-height',
      '--app-sidebar-header-height',
      '--z-drawer',
      '--app-focus-ring',
      '--app-elevation-card',
    ].forEach((token) => {
      expect(designTokensCss).toContain(token);
    });
  });

  it('applies global fit rules for overflow, forms, media, tables, and focus', () => {
    expect(responsiveCss).toMatch(/\.app-shell \*:[:\w\s,.*-]*\{[\s\S]*box-sizing:\s*border-box/);
    expect(responsiveCss).toMatch(/\.app-shell :is\([\s\S]*table[\s\S]*width:\s*100%/);
    expect(responsiveCss).toMatch(/\.app-shell :is\(input[\s\S]*max-width:\s*100%/);
    expect(responsiveCss).toMatch(/\.app-shell :is\(img, svg, canvas, video, iframe\)[\s\S]*max-width:\s*100%/);
    expect(responsiveCss).toMatch(/\.app-shell :is\(:focus-visible\)[\s\S]*outline:/);
  });

  it('keeps the sidebar toggle fitted in the header and centered when collapsed', () => {
    expect(sidebarCss).toMatch(/\.sidebar-header[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto/);
    expect(sidebarCss).toMatch(/\.sidebar-toggle[\s\S]*width:\s*var\(--app-icon-button-size/);
    expect(sidebarCss).toMatch(/\.sidebar-toggle[\s\S]*height:\s*var\(--app-icon-button-size/);
    expect(sidebarCss).toMatch(/\.sidebar-collapsed \.sidebar-header[\s\S]*justify-items:\s*center/);
    expect(sidebarCss).toMatch(/\.sidebar-collapsed \.sidebar-logo[\s\S]*display:\s*none/);
  });

  it('fits workspace dropdown and compact shell controls inside mobile viewports', () => {
    expect(workspaceSwitcherCss).toMatch(/\.workspace-switcher\s*\{[\s\S]*grid-template-columns:\s*auto minmax\(0,\s*1fr\)/);
    expect(workspaceSwitcherCss).toMatch(/\.workspace-switcher\s*\{[\s\S]*max-width:\s*min\(100%,\s*22\.5rem\)/);
    expect(workspaceSwitcherCss).toMatch(
      /\.workspace-switcher--compact[\s\S]*calc\(100vw - \(\(var\(--app-icon-button-size/
    );
    expect(appShellCss).toMatch(/\.app-shell-menu-btn[\s\S]*width:\s*var\(--app-icon-button-size/);
    expect(appShellCss).toMatch(
      /\.app-shell--compact \.app-shell-workspace-bar[\s\S]*padding-inline:\s*calc\(var\(--app-icon-button-size/
    );
  });

  it('uses one navigation system without a conflicting bottom nav', () => {
    expect(appShellJsx).toContain('<Sidebar');
    expect(appShellJsx).not.toContain('app-shell-bottom-nav');
    expect(appShellJsx).not.toContain('PRIMARY_MOBILE_NAV_ITEMS.map');
  });

  it('formalizes shared compact UI primitives for stitched pages', () => {
    [
      'PageShell',
      'SectionHeader',
      'MetricCard',
      'DashboardCard',
      'ToolCard',
      'StatusBadge',
      'FormField',
      'FilterPanel',
      'DataTable',
      'LoadingState',
      'UnsupportedState',
    ].forEach((symbol) => {
      expect(primitivesSource).toContain(`function ${symbol}`);
    });
    expect(primitivesCss).toContain('.cd-dashboard-card');
    expect(primitivesCss).toContain('.cd-tool-card');
    expect(primitivesCss).toContain('.cd-filter-panel');
    expect(primitivesCss).toContain('.cd-data-table');
    expect(primitivesCss).toContain('.cd-state--unsupported');
  });

  it('uses tokenized overlay layers instead of hardcoded high z-index values', () => {
    expect(drawerCss).toContain('z-index: var(--z-drawer');
    expect(modalCss).toContain('z-index: var(--z-modal');
    expect(emergencyBannerCss).toContain('z-index: var(--z-toast');
    expect(notificationToastCss).toContain('z-index: var(--z-toast');

    [drawerCss, modalCss, emergencyBannerCss, notificationToastCss].forEach((css) => {
      expect(css).not.toMatch(/z-index:\s*(9998|9999|10000|99999|2000)\b/);
    });
  });
});

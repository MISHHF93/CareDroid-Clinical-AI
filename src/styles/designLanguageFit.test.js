import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const designTokensCss = readFileSync(join(__dirname, 'design-tokens.css'), 'utf8');
const responsiveCss = readFileSync(join(__dirname, 'responsive-ux.css'), 'utf8');
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

  it('keeps the AppShell rail and header controls fitted in the viewport', () => {
    expect(appShellCss).toMatch(/\.ed-nav-rail\s*\{[\s\S]*width:\s*var\(--ed-rail-width/);
    expect(appShellCss).toMatch(/\.ed-nav-rail__item\s*\{[\s\S]*height:\s*44px/);
    expect(appShellCss).toMatch(/\.ed-os-header\s*\{[\s\S]*min-width:\s*0/);
    expect(appShellCss).toMatch(/\.ed-os-header__left,[\s\S]*\.ed-os-header__right\s*\{[\s\S]*min-width:\s*0/);
  });

  it('fits workspace dropdown and compact shell controls inside mobile viewports', () => {
    expect(appShellCss).toMatch(/\.ed-nav-rail__item\s*\{[\s\S]*min-width:\s*0/);
    expect(appShellCss).toMatch(/\.ed-icon-button\s*\{[\s\S]*min-width:\s*32px/);
    expect(appShellCss).toMatch(/@media \(max-width: 1024px\)[\s\S]*\.ed-icon-button[\s\S]*min-width:\s*44px/);
  });

  it('uses one navigation system without a conflicting bottom nav', () => {
    expect(appShellJsx).toContain('className="ed-nav-rail"');
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
    expect(notificationToastCss).toContain('z-index: var(--z-toast');

    [drawerCss, notificationToastCss].forEach((css) => {
      expect(css).not.toMatch(/z-index:\s*(9998|9999|10000|99999|2000)\b/);
    });
  });
});

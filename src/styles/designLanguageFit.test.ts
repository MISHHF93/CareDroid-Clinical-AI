import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const designTokensCss = readFileSync(join(__dirname, 'design-tokens.css'), 'utf8');
const responsiveCss = readFileSync(join(__dirname, 'responsive-ux.css'), 'utf8');
const cdlCss = readFileSync(join(__dirname, 'caredroid-design-language.css'), 'utf8');
const designSystemCss = readFileSync(join(__dirname, 'design-system.css'), 'utf8');
const appShellCss = readFileSync(join(__dirname, '../components/app-shell.css'), 'utf8');
const appShellJsx = readFileSync(join(__dirname, '../components/AppShell.tsx'), 'utf8');
const headerCss = readFileSync(join(__dirname, '../components/Header.css'), 'utf8');
const sidebarCss = readFileSync(join(__dirname, '../components/Sidebar.css'), 'utf8');
const primitivesSource = readFileSync(
  join(__dirname, '../components/ui/CareDroidPrimitives.tsx'),
  'utf8',
);
const primitivesCss = readFileSync(
  join(__dirname, '../components/ui/CareDroidPrimitives.css'),
  'utf8',
);
const drawerCss = readFileSync(join(__dirname, '../components/ui/Drawer.css'), 'utf8');
const notificationToastCss = readFileSync(
  join(__dirname, '../components/notifications/NotificationToast.css'),
  'utf8',
);
const clinicalCanvasCss = readFileSync(join(__dirname, 'clinical-page-canvas.css'), 'utf8');
const clinicalTargetsCss = readFileSync(join(__dirname, 'clinical-page-targets.css'), 'utf8');
const clinicalFlowCss = readFileSync(join(__dirname, 'clinical-operational-flow.css'), 'utf8');
const clinicalSweepCss = readFileSync(join(__dirname, 'clinical-page-sweep.css'), 'utf8');

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

  it('loads the CareDroid Design Language after the layout engine', () => {
    const layoutIndex = designSystemCss.indexOf("@import './layout-engine.css'");
    const cdlIndex = designSystemCss.indexOf("@import './caredroid-design-language.css'");
    expect(layoutIndex).toBeGreaterThan(-1);
    expect(cdlIndex).toBeGreaterThan(layoutIndex);
  });

  it('loads the clinical page canvas layer after shell chrome polish', () => {
    const polishIndex = designSystemCss.indexOf("@import './shell-header-polish.css'");
    const canvasIndex = designSystemCss.indexOf("@import './clinical-page-canvas.css'");
    const targetsIndex = designSystemCss.indexOf("@import './clinical-page-targets.css'");
    const flowIndex = designSystemCss.indexOf("@import './clinical-operational-flow.css'");
    const sweepIndex = designSystemCss.indexOf("@import './clinical-page-sweep.css'");
    expect(polishIndex).toBeGreaterThan(-1);
    expect(canvasIndex).toBeGreaterThan(polishIndex);
    expect(targetsIndex).toBeGreaterThan(canvasIndex);
    expect(flowIndex).toBeGreaterThan(targetsIndex);
    expect(sweepIndex).toBeGreaterThan(flowIndex);
  });

  it('applies global fit rules for overflow, forms, media, tables, and focus', () => {
    const shellScope = ':is(.app-shell, .emergency-app-shell)';
    expect(responsiveCss).toContain(shellScope);
    expect(responsiveCss).toMatch(
      /:is\(\.app-shell, \.emergency-app-shell\) \*:[:\w\s,.*-]*\{[\s\S]*box-sizing:\s*border-box/,
    );
    expect(responsiveCss).toMatch(
      /:is\(\.app-shell, \.emergency-app-shell\) :is\([\s\S]*table[\s\S]*width:\s*100%/,
    );
    expect(responsiveCss).toMatch(
      /:is\(\.app-shell, \.emergency-app-shell\) :is\(input[\s\S]*max-width:\s*100%/,
    );
    expect(responsiveCss).toMatch(
      /:is\(\.app-shell, \.emergency-app-shell\) :is\(img, svg, canvas, video, iframe\)[\s\S]*max-width:\s*100%/,
    );
    expect(responsiveCss).toMatch(
      /:is\(\.app-shell, \.emergency-app-shell\) :is\(:focus-visible\)[\s\S]*outline:/,
    );
  });

  it('keeps the AppShell rail and header controls fitted in the viewport', () => {
    expect(sidebarCss).toMatch(/\.sidebar\s*\{[\s\S]*width:\s*232px/);
    expect(sidebarCss).toMatch(/\.sidebar-nav-item\s*\{[\s\S]*min-height:\s*40px/);
    expect(sidebarCss).toMatch(/@media \(max-width: 768px\)[\s\S]*height:\s*calc\(72px/);
    expect(headerCss).toMatch(/\.caredroid-header__topbar\s*\{[\s\S]*min-width:\s*0/);
    expect(headerCss).toMatch(/\.caredroid-header__center\s*\{[\s\S]*min-width:\s*0/);
  });

  it('fits workspace dropdown and compact shell controls inside mobile viewports', () => {
    expect(sidebarCss).toContain('min-width: 44px');
    expect(headerCss).toMatch(/\.caredroid-header__icon-button\s*\{[\s\S]*min-width:\s*32px/);
    expect(headerCss).toMatch(/@media \(max-width: 768px\)[\s\S]*\.caredroid-header button[\s\S]*min-width:\s*44px/);
  });

  it('uses one navigation system without a conflicting bottom nav', () => {
    expect(appShellJsx).toMatch(/<Sidebar[\s/>]/);
    expect(appShellJsx).not.toContain('className="ed-nav-rail"');
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
      'OperationalPageTemplate',
      'OperationalZone',
      'CareDroidPage',
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

  it('harmonizes operational page zones and semantic surfaces in CDL CSS', () => {
    expect(cdlCss).toContain('.cdl-operational-page');
    expect(cdlCss).toContain('.cdl-zone--active-work');
    expect(cdlCss).toContain('--semantic-ai-assistance');
    expect(appShellCss).not.toMatch(/\.app-shell-main-content > \*/);
  });

  it('defines clinical canvas tokens that soften brutal flat bordered surfaces', () => {
    [
      '--cdl-clinical-border',
      '--cdl-clinical-shadow-rest',
      '--cdl-clinical-shadow-hover',
      '--cdl-clinical-radius',
      '--cdl-clinical-section-gap',
    ].forEach((token) => {
      expect(clinicalCanvasCss).toContain(token);
    });
    expect(clinicalCanvasCss).toContain(':is(.app-shell, .emergency-app-shell)');
    expect(clinicalCanvasCss).toMatch(/box-shadow:\s*var\(--cdl-clinical-shadow-rest\)/);
    expect(clinicalCanvasCss).toContain('.reception-command');
    expect(clinicalCanvasCss).toContain('.emergency-route-card');
  });

  it('polishes high-traffic page targets: whiteboard, tools, catalog, patient detail', () => {
    [
      '.emergency-whiteboard-page__filter-chip--active',
      '.tools-overview .tool-card-large',
      '.clinical-tool-catalog .catalog-table-wrap',
      '.patient-detail-panel',
      '.tool-page .tool-header',
    ].forEach((selector) => {
      expect(clinicalTargetsCss).toContain(selector);
    });
    expect(clinicalTargetsCss).toMatch(/\.patient-detail-panel\s*\{[\s\S]*box-shadow:/);
    expect(clinicalTargetsCss).not.toMatch(/rgba\(0,\s*0,\s*0,\s*0\.36\)/);
  });

  it('de-brutalizes EMS pipeline rows and operational metric strips', () => {
    expect(clinicalFlowCss).toContain('.ems-pipeline__row');
    expect(clinicalFlowCss).toContain('.operational-strip--compact');
    expect(clinicalFlowCss).toContain('.pre-arrival-intake');
    expect(clinicalFlowCss).not.toMatch(/rgba\(31,\s*41,\s*55,\s*0\.86\)/);
    expect(clinicalFlowCss).not.toMatch(/inset 3px 0 0/);
  });
});
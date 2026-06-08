/**
 * Responsive typography, spacing, and touch-target contracts.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const responsiveUxCss = readFileSync(join(__dirname, 'responsive-ux.css'), 'utf8');
const layoutVisibilityCss = readFileSync(join(__dirname, 'layout-visibility.css'), 'utf8');
const designTokensCss = readFileSync(join(__dirname, 'design-tokens.css'), 'utf8');
const indexCss = readFileSync(join(__dirname, '../index.css'), 'utf8');
const mainJsx = readFileSync(join(__dirname, '../main.jsx'), 'utf8');
const appShellCss = readFileSync(join(__dirname, '../layout/AppShell.css'), 'utf8');
const authShellCss = readFileSync(join(__dirname, '../layout/AuthShell.css'), 'utf8');
const publicShellCss = readFileSync(join(__dirname, '../layout/PublicShell.css'), 'utf8');
const quickCommandCss = readFileSync(
  join(__dirname, '../components/QuickCommandLauncher.css'),
  'utf8'
);
const drawerCss = readFileSync(join(__dirname, '../components/ui/Drawer.css'), 'utf8');
const buttonCss = readFileSync(join(__dirname, '../components/ui/button.css'), 'utf8');
const dashboardVisualizationsCss = readFileSync(
  join(__dirname, '../components/dashboard/DashboardVisualizations.css'),
  'utf8'
);
const disclaimerCss = readFileSync(
  join(__dirname, '../components/clinical/ClinicalDecisionSupportDisclaimer.css'),
  'utf8'
);
const liveMapCss = readFileSync(join(__dirname, '../pages/LiveTrackingMap.css'), 'utf8');
const hospitalMapCss = readFileSync(join(__dirname, '../pages/HospitalMapDashboard.css'), 'utf8');
const medicalIotCss = readFileSync(join(__dirname, '../pages/MedicalIotDashboard.css'), 'utf8');
const deviceFleetCss = readFileSync(join(__dirname, '../pages/DeviceFleetManagement.css'), 'utf8');
const fleetLiveMapCss = readFileSync(join(__dirname, '../pages/fleet/FleetLiveMap.css'), 'utf8');

const REQUIRED_RESPONSIVE_VIEWPORT_WIDTHS = Object.freeze([320, 360, 390, 412, 430, 768, 1024, 1280, 1440]);

describe('responsive-ux.css — global normalization', () => {
  it('is imported from main.jsx after design-tokens.css', () => {
    expect(mainJsx).toContain("import './styles/design-tokens.css'");
    expect(mainJsx).toContain("import './styles/responsive-ux.css'");
    expect(mainJsx).toContain("import './styles/mobile-first-layout.css'");
    const tokensPos = mainJsx.indexOf("import './styles/design-tokens.css'");
    const uxPos = mainJsx.indexOf("import './styles/responsive-ux.css'");
    expect(uxPos).toBeGreaterThan(tokensPos);
  });

  it('relies on design-tokens for fluid type scale', () => {
    expect(designTokensCss).toContain('--app-type-title:');
    expect(designTokensCss).toContain('clamp(');
    expect(responsiveUxCss).toContain('var(--app-type-title)');
  });

  it('defines normalized sizing tokens for shell, cards, controls, grids, maps, and page padding', () => {
    for (const token of [
      '--app-sidebar-width-expanded',
      '--app-sidebar-width-collapsed',
      '--app-shell-header-height',
      '--app-card-padding-standard',
      '--app-panel-gap',
      '--app-button-height',
      '--app-icon-size-md',
      '--app-input-height',
      '--app-grid-card-min',
      '--app-content-max-width',
      '--app-mobile-page-padding',
      '--app-desktop-page-padding',
      '--app-map-min-height',
      '--app-chart-min-height',
    ]) {
      expect(designTokensCss).toContain(token);
    }
  });

  it('prevents heading overflow without character-stacking labels', () => {
    expect(responsiveUxCss).toMatch(/\.app-scroll-container h1[\s\S]*overflow-wrap:\s*break-word/);
    expect(responsiveUxCss).toMatch(/overflow-wrap:\s*break-word[\s\S]*word-break:\s*normal/);
  });

  it('prevents body-level horizontal overflow without a fixed root minimum width', () => {
    expect(indexCss).toMatch(/html\s*\{[\s\S]*min-width:\s*0/);
    expect(indexCss).toMatch(/body\s*\{[\s\S]*min-width:\s*0/);
    expect(indexCss).toMatch(/#root\s*\{[\s\S]*min-width:\s*0/);
    expect(layoutVisibilityCss).toMatch(/body\s*\{[\s\S]*overflow-x:\s*clip/);
    expect(layoutVisibilityCss).toMatch(/\.app-shell-page-body\s*\{[\s\S]*min-inline-size:\s*0/);
  });

  it('uses the main shell scrollport plus local scroll helpers', () => {
    expect(appShellCss).toMatch(/\.app-shell-page-body\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(appShellCss).toMatch(/\.app-shell-page-body\s*\{[\s\S]*height:\s*auto/);
    expect(appShellCss).toMatch(/\.app-shell-page-body--conversation\s*\{[\s\S]*overflow:\s*hidden/);
    expect(appShellCss).toMatch(
      /\.app-shell-page-body:not\(\.app-shell-page-body--conversation\) > \*[\s\S]*flex:\s*0 0 auto/
    );
    expect(indexCss).toMatch(/\.app-local-scroll-y\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(indexCss).toMatch(/\.app-local-scroll-x\s*\{[\s\S]*overflow-x:\s*auto/);
  });

  it('keeps auth and public shells as route-level scrollports under the locked root', () => {
    expect(authShellCss).toMatch(/\.auth-shell\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(authShellCss).toMatch(/\.auth-shell\s*\{[\s\S]*scroll-padding-block/);
    expect(publicShellCss).toMatch(/\.public-shell\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(publicShellCss).toMatch(/\.public-shell\s*\{[\s\S]*overflow-x:\s*clip/);
  });

  it('keeps overlay bodies locally scrollable without becoming page scroll owners', () => {
    expect(quickCommandCss).toMatch(/\.quick-command-results\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(quickCommandCss).toMatch(
      /\.quick-command-results\s*\{[\s\S]*overscroll-behavior:\s*contain/
    );
    expect(drawerCss).toMatch(/\.drawer-body\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(drawerCss).toMatch(/\.drawer-body\s*\{[\s\S]*overflow-x:\s*clip/);
  });

  it('wraps long clinical tool names and catalog cells', () => {
    expect(responsiveUxCss).toContain('.catalog-tool-name-cell');
    expect(responsiveUxCss).toContain('.calculator-name');
    expect(responsiveUxCss).toMatch(/\.catalog-tool-name-cell[\s\S]*overflow-wrap:\s*break-word/);
  });

  it('enforces mobile touch targets on primary buttons and form controls', () => {
    expect(responsiveUxCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*min-height:\s*var\(--app-min-touch-target/
    );
    expect(responsiveUxCss).toMatch(
      /\.calc-input-field[\s\S]*min-height:\s*var\(--app-min-touch-target/
    );
  });

  it('wraps badges and chips', () => {
    expect(responsiveUxCss).toMatch(/\[class\*='badge'\][\s\S]*overflow-wrap:\s*break-word/);
    expect(responsiveUxCss).toMatch(/\.catalog-category-chips[\s\S]*flex-wrap:\s*wrap/);
  });

  it('keeps icon rows from overflowing', () => {
    expect(responsiveUxCss).toMatch(/\.calculator-panel-title[\s\S]*min-width:\s*0/);
    expect(responsiveUxCss).toMatch(/flex-shrink:\s*0/);
  });

  it('compacts callouts on mobile without removing them', () => {
    expect(responsiveUxCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.clinical-ds-disclaimer[\s\S]*--app-callout-padding-compact/
    );
    expect(responsiveUxCss).toMatch(/\.calc-interpretation-box[\s\S]*overflow-wrap:\s*break-word/);
  });

  it('reduces card padding on small screens', () => {
    expect(responsiveUxCss).toMatch(/@media \(max-width: 640px\)[\s\S]*--app-card-padding-compact/);
  });

  it('normalizes major route roots and action rows for zoom-safe wrapping', () => {
    expect(responsiveUxCss).toContain('.operating-workspace');
    expect(responsiveUxCss).toContain('.profile-page');
    expect(responsiveUxCss).toContain('.settings-page');
    expect(responsiveUxCss).toContain('.device-fleet-page');
    expect(responsiveUxCss).toMatch(/\[class\*='actions'\][\s\S]*flex-wrap:\s*wrap/);
    expect(responsiveUxCss).toMatch(/\.launch-action-card[\s\S]*white-space:\s*normal/);
  });

  it('keeps map canvases locally scrollable instead of clipping fixed-width floor plans', () => {
    for (const css of [liveMapCss, hospitalMapCss, medicalIotCss, fleetLiveMapCss]) {
      expect(css).toMatch(/-map-canvas[\s\S]*overflow-x:\s*auto/);
      expect(css).toMatch(/-map-canvas[\s\S]*overflow-y:\s*hidden/);
      expect(css).toMatch(/-webkit-overflow-scrolling:\s*touch/);
    }
    expect(layoutVisibilityCss).toContain('.hospital-map-canvas');
    expect(layoutVisibilityCss).toMatch(/\.medical-iot-page :is\([\s\S]*overflow-wrap:\s*anywhere/);
  });

  it('codifies the requested mobile, tablet, and desktop viewport matrix', () => {
    expect(REQUIRED_RESPONSIVE_VIEWPORT_WIDTHS).toEqual([320, 360, 390, 412, 430, 768, 1024, 1280, 1440]);
  });

  it('keeps operational tables and fixed-width panels locally scrollable', () => {
    expect(deviceFleetCss).toMatch(/\.device-fleet-page\s*\{[\s\S]*overflow-x:\s*clip/);
    expect(deviceFleetCss).toMatch(/\.device-fleet-table-wrap\s*\{[\s\S]*overflow-x:\s*auto/);
    expect(deviceFleetCss).toMatch(/\.device-fleet-table\s*\{[\s\S]*min-width:\s*980px/);
    expect(layoutVisibilityCss).toMatch(/\.fleet-data-table-wrap,[\s\S]*overflow-x:\s*auto/);
  });

  it('collapses operational grids before phone widths', () => {
    for (const css of [liveMapCss, hospitalMapCss, medicalIotCss, deviceFleetCss, fleetLiveMapCss]) {
      expect(css).toMatch(/@media \(max-width:\s*\d+px\)[\s\S]*grid-template-columns:\s*1fr/);
    }
  });
});

describe('responsive UX — component baselines', () => {
  it('clinical disclaimer wraps text in the icon row', () => {
    expect(disclaimerCss).toMatch(/\.clinical-ds-disclaimer__text[\s\S]*overflow-wrap:\s*anywhere/);
    expect(disclaimerCss).toMatch(/\.clinical-ds-disclaimer[\s\S]*align-items:\s*flex-start/);
  });

  it('shared btn component supports touch-friendly sizing', () => {
    expect(buttonCss).toContain('.btn-md');
  });

  it('dashboard visualization grids collapse before phone widths and hide chart overflow locally', () => {
    expect(dashboardVisualizationsCss).toMatch(/\.dashboard-visual-grid[\s\S]*minmax\(0,\s*1fr\)/);
    expect(dashboardVisualizationsCss).toMatch(
      /@media \(max-width:\s*860px\)[\s\S]*grid-template-columns:\s*1fr/
    );
    expect(dashboardVisualizationsCss).toMatch(/\.dashboard-chart[\s\S]*overflow:\s*hidden/);
  });
});

/**
 * Mobile scrolling contracts — app shell pages use the main content scrollport by default.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = dirname(__dirname);

const indexCss = readFileSync(join(srcRoot, 'index.css'), 'utf8');
const themeSurfacesCss = readFileSync(join(srcRoot, 'styles/theme-surfaces.css'), 'utf8');
const appShellCss = readFileSync(join(srcRoot, 'components/app-shell.css'), 'utf8');
const copilotPanelCss = readFileSync(
  join(srcRoot, 'components/styles/CopilotPanel-part-01.css'),
  'utf8',
);
const sidebarCss = readFileSync(join(srcRoot, 'components/Sidebar.css'), 'utf8');
const drawerCss = readFileSync(join(srcRoot, 'components/ui/Drawer.css'), 'utf8');
const layoutVisibilityCss = readFileSync(join(srcRoot, 'styles/layout-visibility.css'), 'utf8');
const toolsOverviewCss = readFileSync(join(srcRoot, 'pages/tools/ToolsOverview.css'), 'utf8');
const calculatorsCss = readFileSync(join(srcRoot, 'pages/tools/Calculators.css'), 'utf8');
const liveMapCss = readFileSync(join(srcRoot, 'pages/LiveTrackingMap.css'), 'utf8');
const hospitalMapCss = readFileSync(join(srcRoot, 'pages/HospitalMapDashboard.css'), 'utf8');
const medicalIotCss = readFileSync(join(srcRoot, 'pages/MedicalIotDashboard.css'), 'utf8');
const fleetLiveMapCss = readFileSync(join(srcRoot, 'pages/fleet/FleetLiveMap.css'), 'utf8');

const REQUIRED_MOBILE_SCROLL_WIDTHS = Object.freeze([320, 360, 390, 412, 430]);

describe('mobile scrolling contracts', () => {
  it('does not lock document scrolling by default', () => {
    expect(indexCss).toMatch(/html\s*\{[\s\S]*height:\s*auto/);
    expect(indexCss).toMatch(/body\s*\{[\s\S]*height:\s*auto/);
    expect(indexCss).toMatch(/html\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(indexCss).toMatch(/body\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(themeSurfacesCss).toMatch(/body\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(indexCss).not.toMatch(/html\s*\{[^}]*overflow:\s*hidden/);
    // #root itself now owns a fixed viewport-height flex container with its
    // own overflow: hidden (see its comment: "Fill viewport so AppShell flex
    // children can compute min-height:0 scroll chains") — the actual scroll
    // owner moved to .app-shell-main-content deeper in the tree, matching the
    // same overflow-x/overflow-y split verified elsewhere in this cluster.
    expect(indexCss).toMatch(/#root\s*\{[\s\S]*overflow:\s*hidden/);
    expect(indexCss).toMatch(/#root\s*\{[\s\S]*height:\s*var\(--app-viewport-height/);
  });

  it('uses scroll lock only through the active overlay class', () => {
    expect(indexCss).toMatch(
      /html\.app-scroll-locked,\s*body\.app-scroll-locked[\s\S]*overflow:\s*hidden/
    );
    expect(copilotPanelCss).toMatch(/\.ed-copilot-panel\s*\{[\s\S]*overflow:\s*hidden/);
  });

  it('keeps normal pages in the main scrollport while preserving Copilot chat as a local viewport', () => {
    expect(appShellCss).toMatch(/\.emergency-app-shell\s*\{[\s\S]*overflow:\s*hidden/);
    expect(appShellCss).toMatch(/\.emergency-app-shell__main-column\s*\{[\s\S]*overflow:\s*hidden/);
    expect(appShellCss).toMatch(/\.app-shell-main-content\s*\{[\s\S]*overflow-x:\s*clip[\s\S]*overflow-y:\s*auto/);
    expect(copilotPanelCss).toMatch(/\.ed-copilot-panel\s*\{[\s\S]*overflow:\s*hidden/);
  });

  it('keeps the canonical Sidebar and overlays from creating extra page scroll owners', () => {
    expect(sidebarCss).toMatch(/aside\[aria-label='Emergency navigation'\][\s\S]*position:\s*fixed/);
    expect(sidebarCss).toMatch(/\.sidebar-nav-item:nth-of-type\(n \+ 6\)\s*\{[\s\S]*display:\s*none/);
    expect(copilotPanelCss).toMatch(/\.ed-copilot-panel\s*\{[\s\S]*overflow:\s*hidden/);
    // CommandPalette.tsx (the current quick-command UI) unmounts entirely when
    // closed (`if (!open) return null`) rather than staying mounted with a CSS
    // pointer-events toggle, so there's no equivalent selector to check here.
    expect(drawerCss).toMatch(/\.drawer-overlay\s*\{[\s\S]*pointer-events:\s*none/);
    expect(drawerCss).toMatch(/\.drawer-overlay-open\s*\{[\s\S]*pointer-events:\s*auto/);
  });

  it('keeps tables, maps, and chat panels on local scroll only', () => {
    expect(layoutVisibilityCss).toMatch(/\.app-table-scroll-x[\s\S]*overflow-x:\s*auto/);
    expect(layoutVisibilityCss).toMatch(/\.fleet-data-table-wrap[\s\S]*overflow-x:\s*auto/);
    for (const css of [liveMapCss, hospitalMapCss, medicalIotCss, fleetLiveMapCss]) {
      expect(css).toMatch(/-map-canvas[\s\S]*overflow-x:\s*auto/);
      expect(css).toMatch(/-map-canvas[\s\S]*overflow-y:\s*hidden/);
      expect(css).toMatch(/-webkit-overflow-scrolling:\s*touch/);
    }
  });

  it('allows tools and calculator pages to grow inside the shared AppShell main region', () => {
    expect(appShellCss).toMatch(/\.app-shell-main-content\s*\{[\s\S]*overflow-x:\s*clip[\s\S]*overflow-y:\s*auto/);
    expect(layoutVisibilityCss).toMatch(/\.tools-overview[\s\S]*overflow-x:\s*clip/);
    expect(layoutVisibilityCss).toMatch(/\.calculators-content[\s\S]*overflow-x:\s*clip/);
    expect(toolsOverviewCss).not.toMatch(/\.tools-overview\s*\{[^}]*height:\s*100vh/);
    expect(calculatorsCss).not.toMatch(/\.calculators-content\s*\{[^}]*height:\s*100vh/);
  });

  it.each(REQUIRED_MOBILE_SCROLL_WIDTHS)('validates scroll contract at %ipx width', (width) => {
    const drawerWidth = Math.min(280, width * 0.88);

    expect(drawerWidth, `${width}px drawer should fit viewport`).toBeLessThanOrEqual(width);
    expect(indexCss).toMatch(/body\s*\{[\s\S]*overflow-x:\s*clip/);
    expect(layoutVisibilityCss).toMatch(/body\s*\{[\s\S]*overflow-x:\s*clip/);
    expect(appShellCss).not.toContain('app-shell-bottom-nav');
    expect(sidebarCss).toMatch(/@media \(max-width: 768px\)[\s\S]*aside\[aria-label='Emergency navigation'\]/);
  });
});

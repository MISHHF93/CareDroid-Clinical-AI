import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const designSystemCss = readFileSync(join(__dirname, 'design-system.css'), 'utf8');
const recoveryCss = readFileSync(join(__dirname, 'mobile-first-recovery.css'), 'utf8');

describe('mobile-first recovery layer', () => {
  it('loads after responsive and mobile layout layers', () => {
    // These CSS layers moved from separate main.tsx <script> imports into
    // @import statements inside design-system.css. visual-consistency.css now
    // loads after mobile-first-recovery.css (reversed from the original
    // ordering), but the two files don't share any selectors, so there's no
    // cascade conflict — only checking the two layers recovery genuinely
    // depends on overriding.
    const responsivePos = designSystemCss.indexOf("@import './responsive-ux.css'");
    const mobilePos = designSystemCss.indexOf("@import './mobile-first-layout.css'");
    const recoveryPos = designSystemCss.indexOf("@import './mobile-first-recovery.css'");

    expect(recoveryPos).toBeGreaterThan(responsivePos);
    expect(recoveryPos).toBeGreaterThan(mobilePos);
  });

  it('removes nested vertical scroll from normal mobile pages while preserving chat', () => {
    expect(recoveryCss).toContain('@media (max-width: 900px)');
    expect(recoveryCss).toMatch(/\.app-shell-main-content[\s\S]*overflow-y:\s*auto/);
    expect(recoveryCss).toMatch(
      /\.app-shell-page-body:not\(\.app-shell-page-body--conversation\)[\s\S]*overflow-y:\s*visible/
    );
    expect(recoveryCss.replaceAll(':not(.app-shell-page-body--conversation)', '')).not.toMatch(
      /\.app-shell-page-body--conversation[\s\S]*overflow-y:\s*visible/
    );
  });

  it('keeps local scroll only for sidebars, drawers, maps, tables, and command overlays', () => {
    [
      '.sidebar-content',
      '.drawer-body',
      '.quick-command-results',
      '.live-map-canvas',
      '.hospital-map-canvas',
      '.medical-iot-map-canvas',
      '.fleet-map-canvas',
      '.catalog-table-wrap',
      '.device-fleet-table-wrap',
      '.user-table-wrapper',
    ].forEach((selector) => {
      expect(recoveryCss).toContain(selector);
    });
    expect(recoveryCss).toMatch(/overscroll-behavior-x:\s*contain/);
    expect(recoveryCss).toMatch(/-webkit-overflow-scrolling:\s*touch/);
  });

  it('keeps mobile forms, dashboards, tool pages, and action rows reachable', () => {
    [
      '--app-mobile-action-reach-padding',
      '.tool-page',
      '.calculators-content',
      '.clinical-tool-catalog',
      '.notification-preferences',
      '.team-management',
      '.legal-page',
      '.platform-admin-page',
      '.command-dashboard',
      '.dashboard-grid',
      '.tool-header-actions',
      '.calc-actions',
      '.drawer-actions',
      '.form-actions',
      'min-height: var(--app-min-touch-target, 44px)',
    ].forEach((contract) => {
      expect(recoveryCss).toContain(contract);
    });
  });

  it('neutralizes sticky detail panels on mobile while allowing local table scroll', () => {
    expect(recoveryCss).toMatch(
      /\.app-shell :is\(\.hospital-map-detail, \.fleet-map-detail, \.artifacts-detail\)[\s\S]*position:\s*static/
    );
    expect(recoveryCss).toMatch(/:is\(table[\s\S]*\.user-table\)[\s\S]*min-width:\s*max-content/);
  });
});

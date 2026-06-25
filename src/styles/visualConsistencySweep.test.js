import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const visualConsistencyCss = readFileSync(join(__dirname, 'visual-consistency.css'), 'utf8');
const mainJsx = readFileSync(join(__dirname, '../main.jsx'), 'utf8');

describe('visual consistency sweep', () => {
  it('loads the visual consistency layer after existing responsive and mobile layers', () => {
    const responsivePos = mainJsx.indexOf("import './styles/responsive-ux.css'");
    const mobilePerformancePos = mainJsx.indexOf("import './styles/mobile-performance.css'");
    const consistencyPos = mainJsx.indexOf("import './styles/visual-consistency.css'");

    expect(consistencyPos).toBeGreaterThan(responsivePos);
    expect(consistencyPos).toBeGreaterThan(mobilePerformancePos);
  });

  it('normalizes the requested visual categories in one shared app-shell layer', () => {
    [
      '--app-visual-page-gap',
      '--app-visual-header-padding',
      '--app-visual-card-padding',
      '--app-visual-table-cell-padding',
      '--app-visual-control-radius',
      '--app-normalized-dashboard-grid-min',
      '.cd-page-header',
      "[class$='-hero']",
      "[class$='-card']",
      "[class$='-panel']",
      "[class$='-widget']",
      "[class*='table-wrap']",
      '.summary-card',
      '.cost-card',
      '.analytics-panel',
      '.tool-card-large',
      '.user-table-wrapper',
      "[role='search']",
      'font-size: var(--app-type-title)',
      'font-size: var(--app-type-small)',
      'width: var(--app-icon-size-sm)',
      'min-height: var(--app-button-height)',
      'min-height: var(--app-input-height)',
    ].forEach((contract) => {
      expect(visualConsistencyCss).toContain(contract);
    });
  });

  it('keeps the sweep scoped to the authenticated app shell', () => {
    expect(visualConsistencyCss).toContain(':is(.app-shell, .emergency-app-shell)');
    expect(visualConsistencyCss).toContain('@media (max-width: 768px)');
  });

  it('does not emit invalid :is()-suffix class selectors', () => {
    expect(visualConsistencyCss).not.toMatch(/:is\(\.app-shell,\s*\.emergency-app-shell\)-/);
    expect(visualConsistencyCss).toContain('.app-shell-page-body > main');
    expect(visualConsistencyCss).toContain('.app-shell-route-identity');
  });
});

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

const designSystemCss = readFileSync(join(__dirname, 'design-system.css'), 'utf8');
const ultrawideCss = readFileSync(join(__dirname, 'clinical-ultrawide-layer.css'), 'utf8');
const layoutEngineCss = readFileSync(join(__dirname, 'layout-engine.css'), 'utf8');

describe('clinical ultrawide layer', () => {
  it('loads after graphic layer in design system', () => {
    const graphicIndex = designSystemCss.indexOf("@import './clinical-graphic-layer.css'");
    const ultrawideIndex = designSystemCss.indexOf("@import './clinical-ultrawide-layer.css'");
    expect(graphicIndex).toBeGreaterThan(-1);
    expect(ultrawideIndex).toBeGreaterThan(graphicIndex);
  });

  it('defines 34-inch class breakpoints at 2560px and 3440px', () => {
    expect(ultrawideCss).toContain('@media (min-width: 2560px)');
    expect(ultrawideCss).toContain('@media (min-width: 3440px)');
    expect(ultrawideCss).toContain('--app-ultrawide-metric-columns');
    expect(ultrawideCss).toContain('--ed-whiteboard-card-min-ultrawide');
  });

  it('caps whiteboard and command center grids on ultrawide', () => {
    expect(ultrawideCss).toContain('.emergency-whiteboard-page__grid');
    expect(ultrawideCss).toContain('.hospital-command-center__metric-grid');
    expect(ultrawideCss).toContain('.hospital-command-center__actions');
  });

  it('HEAL-315: relaxes Reception command-panel widths beyond ReceptionWorkspace.css\'s 900px cap on ultrawide', () => {
    // ReceptionWorkspace.css caps these 3 selectors at 900px unconditionally
    // -- with the fluid primary intake column above correctly using
    // minmax(0, 1fr), that 900px cap (not the column) was the real ceiling,
    // leaving ~30%+ of a 2560px+ viewport unused. Guards against silently
    // losing this override on a future edit.
    const targets = [
      '.reception-command-segmented',
      '.reception-command-form-grid',
      '.reception-command-queue-row',
    ];
    for (const selector of targets) {
      expect(ultrawideCss).toContain(selector);
    }
    expect(ultrawideCss).toContain('max-width: 1300px');
    expect(ultrawideCss).toContain('max-width: 1500px');
  });

  it('HEAL-324 (fully extended): forces every shared-template/route-root page to fill its already-correctly-sized parent on ultrawide, overriding whatever else was capping it to ~1700px', () => {
    // Confirmed live (Playwright at 3440px): .emergency-whiteboard-page and
    // .hospital-command-center rendered at ~1700px width even though
    // --app-layout-content-max/--app-visual-page-max both already resolved
    // correctly (~2980-3320px) at every ancestor including the element
    // itself -- a competing rule elsewhere was winning. A later pass found
    // the WHOLE selector list shared this exact problem, not just those two
    // (reception-workspace, and cd-page-shell/emergency-route-page -- the
    // shared EmergencyRoutePage template EMS Coordination and others render
    // through -- were still capped too), so the plain/!important split was
    // folded into one !important rule covering the entire list. Guards
    // against silently losing this override, or silently narrowing the list
    // back down, on a future edit.
    const targets = [
      '.cd-page-shell,',
      '.emergency-route-page,',
      '.emergency-whiteboard-page,',
      '.hospital-command-center,',
      '.ems-pipeline,',
      '.reception-workspace,',
      '.dispatch-console',
    ];
    for (const selector of targets) {
      expect(ultrawideCss).toContain(selector);
    }
    expect(ultrawideCss).toContain('max-width: var(--app-layout-content-max) !important;');
    expect(ultrawideCss).toContain('width: 100% !important;');
  });

  it('extends layout-engine large breakpoints through 2200px', () => {
    expect(layoutEngineCss).toContain('@media (min-width: 2200px)');
    expect(layoutEngineCss).toContain('--app-layout-content-max');
  });
});
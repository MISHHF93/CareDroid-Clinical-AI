import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

const designSystemCss = readFileSync(join(__dirname, 'design-system.css'), 'utf8');
const graphicLayerCss = readFileSync(join(__dirname, 'clinical-graphic-layer.css'), 'utf8');
const routeSharedSource = readFileSync(join(__dirname, '../pages/emergency/emergencyRouteShared.tsx'), 'utf8');
const shellRouteTabSource = readFileSync(join(__dirname, '../components/chrome/ShellRouteTab.tsx'), 'utf8');
const emptyStateSource = readFileSync(join(__dirname, '../components/data-display/EmptyState.tsx'), 'utf8');
const patientCardSource = readFileSync(join(__dirname, '../components/PatientCard.tsx'), 'utf8');
const emsPipelineSource = readFileSync(join(__dirname, '../components/EMSPipeline.tsx'), 'utf8');
const commandCenterSource = readFileSync(join(__dirname, '../pages/emergency/HospitalCommandCenter.tsx'), 'utf8');
const receptionSource = readFileSync(join(__dirname, '../pages/emergency/ReceptionWorkspace.tsx'), 'utf8');

describe('clinical graphic layer', () => {
  it('loads graphic layer after page sweep', () => {
    const sweepIndex = designSystemCss.indexOf("@import './clinical-page-sweep.css'");
    const graphicIndex = designSystemCss.indexOf("@import './clinical-graphic-layer.css'");
    expect(sweepIndex).toBeGreaterThan(-1);
    expect(graphicIndex).toBeGreaterThan(sweepIndex);
  });

  it('defines graphic grid treatments for situation briefs and metrics', () => {
    expect(graphicLayerCss).toContain('emergency-route-situation-brief__list--graphic');
    expect(graphicLayerCss).toContain('emergency-route-metric-grid--graphic');
  });

  it('converts emergency route static summaries to graphic components', () => {
    expect(routeSharedSource).toContain('SituationGraphicCard');
    expect(routeSharedSource).toContain('MetricGraphicCard');
    expect(routeSharedSource).toContain('CdlEmptyIllustration');
  });

  it('keeps the shell tab decluttered (no graphic badge nesting)', () => {
    // The shell-declutter pass (commit eed08173) deliberately removed
    // RouteGraphicBadge from the flat context bar — ShellRouteTab's own doc
    // comment says so explicitly. RouteGraphicBadge itself is still a real,
    // exported component (src/components/graphics/CdlGraphicKit.tsx), just
    // no longer rendered here — confirmed via a repo-wide grep it has zero
    // render sites anywhere, not only removed from this one file.
    //
    // HEAL-187: the bar's OTHER original "stay flat" exclusion (breadcrumbs)
    // was deliberately reversed by explicit user decision once the app grew
    // past 118 routes — this test only ever guarded RouteGraphicBadge, not
    // breadcrumbs, so it's updated to match rather than relaxed.
    expect(shellRouteTabSource).not.toContain('RouteGraphicBadge');
    expect(shellRouteTabSource).toContain('No graphic-icon-badge nesting');
    expect(shellRouteTabSource).toContain('eed08173');
  });

  it('renders illustrated empty states by default', () => {
    expect(emptyStateSource).toContain('CdlEmptyIllustration');
    expect(emptyStateSource).toContain('resolveEmptyStateGraphic');
  });

  it('upgrades patient cards with acuity rings', () => {
    expect(patientCardSource).toContain('PatientAcuityRing');
    // The --graphic BEM modifier was folded into the base class once the
    // graphic acuity-ring treatment became the only treatment (no plain
    // variant left to distinguish it from).
    expect(patientCardSource).toContain('patient-card__priority-strip');
  });

  it('upgrades EMS pipeline rows with unit track graphics', () => {
    expect(emsPipelineSource).toContain('EmsUnitTrackGraphic');
    expect(emsPipelineSource).toContain('EmsOffloadGauge');
  });

  it('upgrades command center metrics and actions with graphic cards', () => {
    expect(commandCenterSource).toContain('CommandMetricGraphicCard');
    expect(commandCenterSource).toContain('CommandActionGraphicCard');
  });

  it('adds reception intake flow graphics', () => {
    expect(receptionSource).toContain('ReceptionFlowGraphic');
  });
});
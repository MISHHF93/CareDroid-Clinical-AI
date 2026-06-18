import { describe, expect, it } from 'vitest';
import {
  WHITEBOARD_DENSITY_TIER,
  auditWhiteboardDensity,
  evaluateWhiteboardDensity,
} from './whiteboardDensityModel.js';

describe('whiteboardDensityModel', () => {
  it('keeps primary surfaces visible under stress', () => {
    const density = evaluateWhiteboardDensity({
      waitingPatients: 40,
      emsArrivals: 5,
      reassessmentsDue: 10,
      referralsPending: 8,
      totalPatients: 63,
      signals: {
        emsAttention: true,
        reassessAttention: true,
        referralAttention: true,
        chargeNurseStrip: true,
        inboundEmsBanner: true,
      },
    });

    expect(density.surfaces.heroTitle.visible).toBe(true);
    expect(density.surfaces.primaryStats.visible).toBe(true);
    expect(density.surfaces.filters.visible).toBe(true);
    expect(density.surfaces.patientGrid.visible).toBe(true);
    expect(density.surfaces.awarenessBanner.visible).toBe(true);
  });

  it('hides duplicate chrome under elevated load', () => {
    const density = evaluateWhiteboardDensity({
      waitingPatients: 40,
      emsArrivals: 5,
      reassessmentsDue: 10,
      referralsPending: 8,
      totalPatients: 63,
      signals: {
        emsAttention: true,
        reassessAttention: true,
        referralAttention: true,
        chargeNurseStrip: true,
        inboundEmsBanner: true,
      },
    });

    expect(density.surfaces.heroDetail.visible).toBe(false);
    expect(density.surfaces.commandLayer.visible).toBe(false);
    expect(density.surfaces.missionControl.visible).toBe(false);
    expect(density.surfaces.emsAttention.visible).toBe(false);
    expect(density.surfaces.reassessAttention.visible).toBe(false);
    expect(density.surfaces.referralAttention.visible).toBe(false);
    expect(density.surfaces.secondaryStats.visible).toBe(false);
    expect(density.surfaces.opsDetail.defaultExpanded).toBe(false);
    expect(density.hiddenUnderLoad).toBeGreaterThanOrEqual(4);
  });

  it('defers audit strips to progressive ops detail', () => {
    const density = evaluateWhiteboardDensity({
      waitingPatients: 6,
      emsArrivals: 1,
      reassessmentsDue: 0,
      referralsPending: 0,
      totalPatients: 10,
      signals: { emsAttention: true },
    });

    expect(density.surfaces.opsDetail.visible).toBe(true);
    expect(density.surfaces.opsDetail.tier).toBe(WHITEBOARD_DENSITY_TIER.PROGRESSIVE);
    expect(density.surfaces.opsDetail.defaultExpanded).toBe(true);
  });

  it('suppresses domain strips when shift handoff is active', () => {
    const density = evaluateWhiteboardDensity({
      waitingPatients: 10,
      emsArrivals: 2,
      reassessmentsDue: 2,
      referralsPending: 2,
      totalPatients: 20,
      showShiftHandoffStrip: true,
      signals: {
        emsAttention: true,
        reassessAttention: true,
        referralAttention: true,
        chargeNurseStrip: true,
      },
    });

    expect(density.surfaces.shiftHandoff.visible).toBe(true);
    expect(density.surfaces.emsAttention.visible).toBe(false);
    expect(density.surfaces.referralAttention.visible).toBe(false);
    expect(density.surfaces.opsDetail.visible).toBe(false);
  });

  it('audits always-visible vs progressive disclosure tiers', () => {
    const report = auditWhiteboardDensity();
    expect(report.alwaysVisible).toContain('hero-title');
    expect(report.alwaysVisible).toContain('patient-grid');
    expect(report.progressiveDisclosure).toContain('ops-detail');
    expect(report.progressiveDisclosure).toContain('command-layer');
    expect(report.stressScenario.hiddenUnderLoad).toBeGreaterThan(0);
    expect(report.mitigations.length).toBeGreaterThan(0);
  });
});

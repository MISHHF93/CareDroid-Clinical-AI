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

  it('uses department status screen instead of patient grid in display mode', () => {
    const density = evaluateWhiteboardDensity({
      displayMode: true,
      waitingPatients: 12,
      emsArrivals: 2,
      reassessmentsDue: 3,
      referralsPending: 2,
      totalPatients: 20,
    });

    expect(density.surfaces.departmentStatusScreen.visible).toBe(true);
    expect(density.surfaces.heroTitle.visible).toBe(false);
    expect(density.surfaces.publicWaitingScreen.visible).toBe(false);
    expect(density.surfaces.patientGrid.visible).toBe(false);
    expect(density.surfaces.filters.visible).toBe(false);
    expect(density.surfaces.primaryStats.visible).toBe(false);
    expect(density.surfaces.waitingRoomSafety.visible).toBe(false);
    expect(density.surfaces.missionControl.visible).toBe(false);
  });

  it('uses public waiting screen instead of department status for waiting-room display', () => {
    const density = evaluateWhiteboardDensity({
      displayMode: true,
      publicWaitingDisplay: true,
      waitingPatients: 12,
      emsArrivals: 2,
      reassessmentsDue: 3,
      referralsPending: 2,
      totalPatients: 20,
    });

    expect(density.surfaces.publicWaitingScreen.visible).toBe(true);
    expect(density.surfaces.departmentStatusScreen.visible).toBe(false);
    expect(density.surfaces.heroTitle.visible).toBe(false);
    expect(density.surfaces.patientGrid.visible).toBe(false);
    expect(density.surfaces.waitingRoomSafety.visible).toBe(false);
  });

  it('hides staff hero on read-only whiteboard kiosk display', () => {
    const density = evaluateWhiteboardDensity({
      displayMode: true,
      publicWaitingDisplay: false,
      waitingPatients: 12,
      totalPatients: 20,
    });

    expect(density.surfaces.departmentStatusScreen.visible).toBe(true);
    expect(density.surfaces.heroTitle.visible).toBe(false);
    expect(density.surfaces.patientGrid.visible).toBe(false);
  });

  it('uses command center throughput instead of patient grid for COMMAND_CENTER_SCREEN', () => {
    const density = evaluateWhiteboardDensity({
      commandCenterScreen: true,
      waitingPatients: 12,
      emsArrivals: 2,
      reassessmentsDue: 3,
      referralsPending: 2,
      totalPatients: 20,
    });

    expect(density.surfaces.commandCenterThroughput.visible).toBe(true);
    expect(density.surfaces.patientGrid.visible).toBe(false);
    expect(density.surfaces.missionControl.visible).toBe(false);
    expect(density.surfaces.commandLayer.visible).toBe(false);
    expect(density.surfaces.waitingRoomSafety.visible).toBe(false);
  });

  it('hides ops detail audit drawer during practitioner cleanup', () => {
    const density = evaluateWhiteboardDensity({
      waitingPatients: 6,
      emsArrivals: 1,
      reassessmentsDue: 0,
      referralsPending: 0,
      totalPatients: 10,
      signals: { emsAttention: true },
    });

    expect(density.surfaces.opsDetail.visible).toBe(false);
    expect(density.surfaces.opsDetail.tier).toBe(WHITEBOARD_DENSITY_TIER.PROGRESSIVE);
    expect(density.surfaces.opsDetail.defaultExpanded).toBe(false);
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

  it('keeps charge nurse operational surfaces visible under load via density profile', () => {
    const density = evaluateWhiteboardDensity({
      waitingPatients: 40,
      emsArrivals: 5,
      reassessmentsDue: 10,
      referralsPending: 8,
      totalPatients: 63,
      densityProfile: {
        whiteboard: {
          preferOperationalStrips: true,
          showMissionControl: true,
          showQueueIntelligence: true,
          showSecondaryStats: true,
          showWaitingRoomSafety: true,
          showAttentionStrips: true,
          maxVisibleCards: 48,
          gridMinCardWidth: 250,
          gridGap: 10,
        },
      },
      signals: {
        emsAttention: true,
        reassessAttention: true,
        referralAttention: true,
        chargeNurseStrip: true,
        waitingRoomSafety: true,
      },
    });

    expect(density.surfaces.missionControl.visible).toBe(true);
    // Role strips are suppressed during practitioner cleanup (pilot mode).
    expect(density.surfaces.chargeNurseStrip.visible).toBe(false);
    expect(density.surfaces.patientGrid.maxVisibleCards).toBe(48);
  });

  it('suppresses physician clutter surfaces via patient-clinical density profile', () => {
    const density = evaluateWhiteboardDensity({
      waitingPatients: 12,
      emsArrivals: 1,
      reassessmentsDue: 2,
      referralsPending: 1,
      totalPatients: 20,
      densityProfile: {
        whiteboard: {
          preferOperationalStrips: false,
          showMissionControl: false,
          showQueueIntelligence: false,
          showSecondaryStats: false,
          showWaitingRoomSafety: false,
          showAttentionStrips: false,
          maxVisibleCards: 36,
          gridMinCardWidth: 300,
          gridGap: 14,
        },
      },
      signals: {
        emsAttention: true,
        reassessAttention: true,
        chargeNurseStrip: true,
        waitingRoomSafety: true,
      },
    });

    expect(density.surfaces.missionControl.visible).toBe(false);
    expect(density.surfaces.queueIntelligence.visible).toBe(false);
    expect(density.surfaces.waitingRoomSafety.visible).toBe(false);
    expect(density.surfaces.patientGrid.maxVisibleCards).toBe(36);
  });
});

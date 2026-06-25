import { describe, expect, it } from 'vitest';
import { EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';
import {
  applyRoleSurfaceOverrides,
  mergeRoleAwarePractitionerDensityProfile,
  resolvePractitionerLayoutTier,
} from './practitionerRoleSurfacePolicy';

const PILOT_BASE = {
  active: true,
  whiteboard: {
    showRoleStrips: false,
    showMissionControl: false,
    showCommandDashboard: false,
    showWhoNextPanel: false,
  },
  copilot: {
    showContextTab: false,
    showSafetyTab: false,
  },
  patientCard: {
    showToolChips: false,
    badgeLimit: 1,
  },
  analytics: {
    showSecondaryCharts: false,
  },
  settings: {
    showAuditSections: false,
    showGovernanceSections: false,
  },
};

const HIGH_OPERATIONAL_PROFILE = {
  id: 'high-operational',
  whiteboard: {
    showMissionControl: true,
    showQueueIntelligence: true,
    showSecondaryStats: true,
    showWaitingRoomSafety: true,
    showAttentionStrips: true,
    preferOperationalStrips: true,
    maxVisibleCards: 48,
    gridMinCardWidth: 250,
    gridGap: 10,
  },
  patientCard: {
    showScores: true,
    showSafetyFlags: true,
    showSignalsRow: true,
    showVitalsGrid: true,
    showExperienceBadge: true,
    showWhatHappensNext: true,
    showQueueReason: true,
    showMetaGrid: true,
    showReassessmentTimer: true,
  },
};

describe('practitionerRoleSurfacePolicy', () => {
  it('resolves layout tiers from role and screen mode', () => {
    expect(resolvePractitionerLayoutTier({ role: EMERGENCY_ROLE_IDS.registrationClerk })).toBe(
      'minimal',
    );
    expect(resolvePractitionerLayoutTier({ role: EMERGENCY_ROLE_IDS.physician })).toBe('clinical');
    expect(resolvePractitionerLayoutTier({ role: EMERGENCY_ROLE_IDS.chargeNurse })).toBe(
      'operational',
    );
    expect(
      resolvePractitionerLayoutTier({
        role: EMERGENCY_ROLE_IDS.triageNurse,
        screenMode: CARE_DROID_SCREEN_MODES.chargeNurse,
      }),
    ).toBe('operational');
  });

  it('keeps charge-nurse whiteboard trimmed during pilot cleanup', () => {
    const surfaces = applyRoleSurfaceOverrides(PILOT_BASE, {
      role: EMERGENCY_ROLE_IDS.chargeNurse,
      screenMode: CARE_DROID_SCREEN_MODES.chargeNurse,
    });

    expect(surfaces.whiteboard.showRoleStrips).toBe(false);
    expect(surfaces.whiteboard.showMissionControl).toBe(false);
    expect(surfaces.whiteboard.showCommandDashboard).toBe(false);
    expect(surfaces.whiteboard.showWhoNextPanel).toBe(false);
  });

  it('restores physician copilot context tabs during pilot', () => {
    const surfaces = applyRoleSurfaceOverrides(PILOT_BASE, {
      role: EMERGENCY_ROLE_IDS.physician,
      screenMode: CARE_DROID_SCREEN_MODES.physician,
    });

    expect(surfaces.copilot.showContextTab).toBe(true);
    expect(surfaces.copilot.showSafetyTab).toBe(true);
    expect(surfaces.patientCard.showToolChips).toBe(true);
    expect(surfaces.patientCard.badgeLimit).toBe(2);
    expect(surfaces.whiteboard.showMissionControl).toBe(false);
  });

  it('keeps registration clerk layouts fully trimmed', () => {
    const surfaces = applyRoleSurfaceOverrides(PILOT_BASE, {
      role: EMERGENCY_ROLE_IDS.registrationClerk,
      screenMode: CARE_DROID_SCREEN_MODES.reception,
    });

    expect(surfaces.whiteboard.showRoleStrips).toBe(false);
    expect(surfaces.copilot.showContextTab).toBe(false);
  });

  it('flattens operational density profiles for charge nurse during pilot cleanup', () => {
    const merged = mergeRoleAwarePractitionerDensityProfile(HIGH_OPERATIONAL_PROFILE, {
      role: EMERGENCY_ROLE_IDS.chargeNurse,
      screenMode: CARE_DROID_SCREEN_MODES.chargeNurse,
    });

    expect(merged.whiteboard.showMissionControl).toBe(false);
    expect(merged.whiteboard.showQueueIntelligence).toBe(false);
    expect(merged.patientCard.showScores).toBe(false);
    expect(merged.whiteboard.maxVisibleCards).toBe(18);
  });

  it('preserves physician clinical card density while trimming board command layers', () => {
    const merged = mergeRoleAwarePractitionerDensityProfile(HIGH_OPERATIONAL_PROFILE, {
      role: EMERGENCY_ROLE_IDS.physician,
      screenMode: CARE_DROID_SCREEN_MODES.physician,
    });

    expect(merged.whiteboard.showMissionControl).toBe(false);
    expect(merged.patientCard.showScores).toBe(true);
  });

  it('flattens clerk density profiles', () => {
    const merged = mergeRoleAwarePractitionerDensityProfile(HIGH_OPERATIONAL_PROFILE, {
      role: EMERGENCY_ROLE_IDS.registrationClerk,
      screenMode: CARE_DROID_SCREEN_MODES.reception,
    });

    expect(merged.whiteboard.showMissionControl).toBe(false);
    expect(merged.patientCard.showScores).toBe(false);
    expect(merged.patientCard.showQueueReason).toBe(false);
  });
});
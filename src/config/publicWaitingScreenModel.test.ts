import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import {
  PUBLIC_WAITING_SCREEN_WIDGETS,
  getPublicWaitingDisplayPath,
  resolvePublicWaitingScreenCapabilities,
} from './publicWaitingScreenModel';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';

describe('publicWaitingScreenModel', () => {
  it('builds public waiting display landing path', () => {
    expect(getPublicWaitingDisplayPath()).toBe(
      `${CANONICAL_ROUTES.emergencyWhiteboard}?display=waiting-room`,
    );
  });

  it('enables PHI-safe waiting-room widgets on PUBLIC_WAITING_DISPLAY', () => {
    const waiting = resolvePublicWaitingScreenCapabilities({
      screenMode: CARE_DROID_SCREEN_MODES.publicWaiting,
      roleLabel: 'Public display',
    });

    expect(waiting.isPublicWaitingScreen).toBe(true);
    expect(waiting.isKioskMode).toBe(true);
    expect(waiting.showWaitRange).toBe(true);
    expect(waiting.showCrowdLevel).toBe(true);
    expect(waiting.showTriageWait).toBe(true);
    expect(waiting.showCareProcessStages).toBe(true);
    expect(waiting.showPatientGuidance).toBe(true);
    expect(waiting.showSymptomEscalation).toBe(true);
    expect(waiting.showEmsCrowdingImpact).toBe(true);
    expect(waiting.visibleOperationalSurfaces).toEqual([
      PUBLIC_WAITING_SCREEN_WIDGETS.waitRange,
      PUBLIC_WAITING_SCREEN_WIDGETS.crowdLevel,
      PUBLIC_WAITING_SCREEN_WIDGETS.triageWait,
      PUBLIC_WAITING_SCREEN_WIDGETS.careProcessStages,
      PUBLIC_WAITING_SCREEN_WIDGETS.patientGuidance,
      PUBLIC_WAITING_SCREEN_WIDGETS.symptomEscalation,
      PUBLIC_WAITING_SCREEN_WIDGETS.emsCrowdingImpact,
    ]);
    expect(waiting.defaultFocus).toBe(PUBLIC_WAITING_SCREEN_WIDGETS.waitRange);
    expect(waiting.defaultLandingRoute).toContain('display=waiting-room');
  });

  it('hides public waiting widgets outside PUBLIC_WAITING_DISPLAY', () => {
    const triage = resolvePublicWaitingScreenCapabilities({
      screenMode: CARE_DROID_SCREEN_MODES.triage,
      roleLabel: 'Triage Nurse',
    });

    expect(triage.isPublicWaitingScreen).toBe(false);
    expect(triage.showWaitRange).toBe(false);
    expect(triage.showSymptomEscalation).toBe(false);
    expect(triage.visibleOperationalSurfaces).toHaveLength(0);
  });
});

import { describe, it, expect } from 'vitest';
import { ClinicalIntentRouter, routeClinicalIntent } from './clinicalIntentRouterBackend';

describe('clinicalIntentRouterBackend', () => {
  it('routes the exact hardcoded aliases (pre-existing behavior)', () => {
    expect(routeClinicalIntent('chest pain')?.routeId).toBe('chief-complaint-chest-pain');
    expect(routeClinicalIntent('trauma activation')?.routeId).toBe('chief-complaint-trauma');
  });

  it('returns null for unrecognized text, never forcing a nearest-match guess', () => {
    expect(routeClinicalIntent('feeling generally unwell')).toBeNull();
    expect(routeClinicalIntent('')).toBeNull();
  });

  /**
   * 2026-08-09: this router used to only know a small hand-picked alias list
   * per route, with no fallback to the canonical recognizeComplaint()
   * pipeline (unlike its frontend counterpart, src/data/clinicalIntentRouter.ts,
   * which the backend cannot import -- backend/tsconfig.build.json only
   * allows lib/ and src/types/). A patient/staff phrasing the canonical
   * recognizer already knows (e.g. "heart attack") would silently fail to
   * route here, degrading the real, live Copilot tool-recommendation surface
   * (CopilotPanel.tsx/PatientCardCopilot.tsx via usePatientOrchestration()).
   * Synced these aliases against HIGH_RISK_COMPLAINT_FLAG_DEFINITIONS'
   * keyword regexes (src/services/highRiskComplaintFlags.ts) for the 5
   * concepts both registries cover. This test locks in that sync so it
   * doesn't silently regress.
   */
  it('routes phrasings synced from HIGH_RISK_COMPLAINT_FLAG_DEFINITIONS that the hardcoded list used to miss', () => {
    expect(routeClinicalIntent('heart attack')?.routeId).toBe('chief-complaint-chest-pain');
    expect(routeClinicalIntent('chest tightness')?.routeId).toBe('chief-complaint-chest-pain');
    expect(routeClinicalIntent('angina')?.routeId).toBe('chief-complaint-chest-pain');

    expect(routeClinicalIntent("can't breathe")?.routeId).toBe('chief-complaint-shortness-of-breath');
    expect(routeClinicalIntent('difficulty breathing')?.routeId).toBe(
      'chief-complaint-shortness-of-breath',
    );

    expect(routeClinicalIntent('facial droop')).toBeTruthy();
    expect(routeClinicalIntent('slurred speech')?.routeId).toBe('chief-complaint-stroke-symptoms');
    expect(routeClinicalIntent('aphasia')?.routeId).toBe('chief-complaint-stroke-symptoms');

    expect(routeClinicalIntent('septic shock')?.routeId).toBe('chief-complaint-sepsis-concern');

    expect(routeClinicalIntent('acute abdomen')?.routeId).toBe('chief-complaint-abdominal-pain');
    expect(routeClinicalIntent('peritonitis')?.routeId).toBe('chief-complaint-abdominal-pain');
  });

  it('the ClinicalIntentRouter object wraps the same functions consistently', () => {
    expect(ClinicalIntentRouter.routeComplaint('heart attack')?.routeId).toBe(
      'chief-complaint-chest-pain',
    );
    expect(ClinicalIntentRouter.getRoutes().length).toBe(7);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLINICAL_DECISION_SUPPORT_DISCLAIMER,
  runCareDroidAI,
  validateCareDroidAIResponse,
} from './careDroidAI';

describe('careDroidAI node', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a strict triage recommendation response with clinician review', async () => {
    const response = await runCareDroidAI({
      intent: 'triage_recommendation',
      input: {
        symptoms: ['chest pain', 'shortness of breath'],
        vitals: { bloodPressure: '88/54', heartRate: 132, spo2: 90 },
        painLevel: 8,
        age: 76,
        arrivalMode: 'EMS',
        currentWaitTime: 20,
      },
      context: { sourceScreen: 'triage_queue', userRole: 'triage_nurse' },
    });

    expect(validateCareDroidAIResponse(response)).toBe(true);
    expect(response.status).toBe('success');
    expect(String(response.data.recommendedTriageLevel)).toMatch(/P1|P2/);
    expect(response.confidence).toBeGreaterThan(0);
    expect(response.requiresClinicianReview).toBe(true);
    expect(response.warnings).toContain(CLINICAL_DECISION_SUPPORT_DISCLAIMER);
    expect(response.data).toMatchObject({ clinicianOverrideRequired: true });
  });

  it('returns patient summary data with missing-information warnings', async () => {
    const response = await runCareDroidAI({
      intent: 'patient_summary',
      input: {
        demographics: { age: 44, sex: 'F' },
        intakeData: { symptoms: ['abdominal pain'] },
        triageNotes: [],
      },
    });

    expect(validateCareDroidAIResponse(response)).toBe(true);
    expect(response.status).toBe('success');
    expect(response.data.oneLineSummary).toContain('44-year-old');
    expect(response.data.missingInformation).toEqual(
      expect.arrayContaining(['Current vitals', 'Allergy status', 'Medication reconciliation']),
    );
    expect(response.warnings.join(' ')).toMatch(/incomplete/i);
  });

  it('rejects unsupported requests with a safe error shape', async () => {
    const response = await runCareDroidAI({
      intent: 'autonomous_diagnosis',
      input: 'diagnose now',
    });

    expect(validateCareDroidAIResponse(response)).toBe(true);
    expect(response.status).toBe('error');
    expect(response.confidence).toBe(0);
    expect(response.nextActions[0]).toMatch(/retry/i);
    expect(response.requiresClinicianReview).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { Priority, PatientState, type Patient } from '../types/emergency';
import {
  buildPatientJourneyAiInput,
  clearPatientJourneyAiDecisionCache,
  evaluatePatientJourneyAiDecisions,
  formatAiDecisionSummary,
  hasHighRiskAiSignal,
} from './patientJourneyAiDecisionService';

const chestPainPatient: Patient = {
  id: 'patient-1',
  mrn: 'MRN-001',
  firstName: 'Alex',
  lastName: 'Rivera',
  age: 58,
  sex: 'M',
  state: PatientState.Registration,
  priority: Priority.P3,
  chiefComplaint: 'Chest pain radiating to jaw',
  vitals: [
    {
      sbp: 88,
      dbp: 54,
      hr: 132,
      spo2: 90,
      pain: 9,
      recordedAt: new Date().toISOString(),
    },
  ],
  flags: [],
  notes: [],
  timeline: [],
} as Patient;

describe('patientJourneyAiDecisionService', () => {
  it('caches patient journey AI node bundles for unchanged patient context', async () => {
    clearPatientJourneyAiDecisionCache();
    const first = await evaluatePatientJourneyAiDecisions(chestPainPatient);
    const second = await evaluatePatientJourneyAiDecisions(chestPainPatient);
    expect(second).toBe(first);
  });

  it('maps registration and triage context into unified AI node input', () => {
    const input = buildPatientJourneyAiInput(chestPainPatient);
    expect(input.chiefComplaint).toContain('Chest pain');
    expect(input.vitals).toMatchObject({ heartRate: 132, spo2: 90 });
    expect(input.patientState).toBe(PatientState.Registration);
  });

  it('evaluates triage, intake, and critical assessments through CareDroid AI node', async () => {
    const bundle = await evaluatePatientJourneyAiDecisions(chestPainPatient);
    expect(bundle.triage.status).toBe('success');
    expect(bundle.intake.status).toBe('success');
    expect(bundle.critical.status).toBe('success');
    expect(bundle.triage.requiresClinicianReview).toBe(true);
    expect(hasHighRiskAiSignal(bundle)).toBe(true);
    expect(formatAiDecisionSummary(bundle)).toContain('AI triage advisory');
  });
});
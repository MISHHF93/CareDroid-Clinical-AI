import { describe, expect, it } from 'vitest';
import { PatientState } from '../types/emergency';
import {
  PATIENT_WORKFLOW_STEPS,
  UNIFIED_PATIENT_WORKFLOW_CONTRACT,
  estimateWorkflowClicksSaved,
  listPatientWorkflowSteps,
  resolveLegalNextStates,
  resolveWorkflowRouteForState,
  resolveWorkflowStepForState,
} from './unifiedPatientWorkflowModel';

describe('unifiedPatientWorkflowModel', () => {
  it('defines ten consolidated steps from arrival through discharge', () => {
    expect(PATIENT_WORKFLOW_STEPS).toHaveLength(10);
    expect(listPatientWorkflowSteps().map((step) => step.id)).toEqual([
      'arrival',
      'registration',
      'triage',
      'waiting',
      'assessment',
      'orders',
      'results',
      'disposition',
      'admission',
      'discharge',
    ]);
  });

  it('maps patient states to workflow routes with patient context', () => {
    const triageRoute = resolveWorkflowRouteForState(PatientState.Triage, 'patient-42');
    expect(triageRoute).toContain('patient=patient-42');
    expect(resolveWorkflowStepForState(PatientState.Assessment)?.ownerRole).toBe(
      'emergency_physician',
    );
  });

  it('aligns legal FSM transitions with workflow steps', () => {
    expect(resolveLegalNextStates(PatientState.Registration)).toContain(PatientState.Triage);
    expect(resolveLegalNextStates(PatientState.Disposition)).toEqual(
      expect.arrayContaining([PatientState.Discharge, PatientState.Admission]),
    );
  });

  it('estimates click savings across multi-step advancement', () => {
    expect(estimateWorkflowClicksSaved(PatientState.Arrival, PatientState.Triage)).toBeGreaterThan(
      0,
    );
    expect(estimateWorkflowClicksSaved(PatientState.Discharge, PatientState.Arrival)).toBe(0);
  });

  it('publishes a single workflow contract', () => {
    expect(UNIFIED_PATIENT_WORKFLOW_CONTRACT.engineId).toBe('unified-patient-workflow');
    expect(UNIFIED_PATIENT_WORKFLOW_CONTRACT.canonicalHandoff).toBe('completeIntakeHandoff');
    expect(UNIFIED_PATIENT_WORKFLOW_CONTRACT.canonicalNavigation).toBe('patientWorkflowNavigation');
    expect(UNIFIED_PATIENT_WORKFLOW_CONTRACT.humanOversightRequired).toBe(true);
  });
});

import { useMemo } from 'react';
import { useEmergencyStore } from '../store/emergencyStore';
import {
  estimateWorkflowClicksSaved,
  resolveLegalNextStates,
  resolveWorkflowStepForState,
} from '../config/unifiedPatientWorkflowModel';
import {
  resolveNextWorkflowRouteForPatient,
  resolvePatientWorkflowRoute,
  resolvePatientWorkflowStep,
} from '../services/patientWorkflowNavigation';
import type { Patient, PatientState } from '../types/emergency';

export type PatientWorkflowView = Readonly<{
  patient: Patient | null;
  step: ReturnType<typeof resolveWorkflowStepForState>;
  route: string | null;
  nextRoute: string | null;
  nextStates: readonly PatientState[];
  primaryAction: string | null;
  ownerRole: string | null;
  automationEvent: string | null;
  clicksSavedEstimate: number;
  hasPatient: boolean;
}>;

export function usePatientWorkflow(patientId?: string | null): PatientWorkflowView {
  const patients = useEmergencyStore((state) => state.patients);

  return useMemo(() => {
    const patient = patientId ? (patients.find((entry) => entry.id === patientId) ?? null) : null;
    if (!patient) {
      return Object.freeze({
        patient: null,
        step: null,
        route: null,
        nextRoute: null,
        nextStates: Object.freeze([] as PatientState[]),
        primaryAction: null,
        ownerRole: null,
        automationEvent: null,
        clicksSavedEstimate: 0,
        hasPatient: false,
      });
    }

    const step = resolvePatientWorkflowStep(patient);
    const nextStates = resolveLegalNextStates(patient.state);
    const nextState = nextStates[0];
    const clicksSavedEstimate = nextState
      ? estimateWorkflowClicksSaved(patient.state, nextState)
      : 0;

    return Object.freeze({
      patient,
      step,
      route: resolvePatientWorkflowRoute(patient),
      nextRoute: resolveNextWorkflowRouteForPatient(patient),
      nextStates,
      primaryAction: step?.primaryAction ?? null,
      ownerRole: step?.ownerRole ?? null,
      automationEvent: step?.automationEvent ?? null,
      clicksSavedEstimate,
      hasPatient: true,
    });
  }, [patientId, patients]);
}

export default usePatientWorkflow;

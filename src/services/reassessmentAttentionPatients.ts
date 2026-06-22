import { buildWaitingPatientReassessmentTimers } from '../engine/reassessmentTimerEngine';
import { patientMatchesReassessmentAttention } from '../components/whiteboard/reassessmentVisibilityModel';
import type { Patient } from '../types/emergency';

/** Patients needing reassessment attention — flags plus overdue waiting-room timers. */
export function collectReassessmentAttentionPatients(patients: Patient[] = []): Patient[] {
  const seen = new Set<string>();
  const attention: Patient[] = [];

  for (const patient of patients) {
    if (!patientMatchesReassessmentAttention(patient)) continue;
    if (seen.has(patient.id)) continue;
    seen.add(patient.id);
    attention.push(patient);
  }

  for (const timer of buildWaitingPatientReassessmentTimers(patients)) {
    if (!timer.isOverdue) continue;
    const patient = patients.find((entry) => entry.id === timer.patientId);
    if (!patient || seen.has(patient.id)) continue;
    seen.add(patient.id);
    attention.push(patient);
  }

  return attention;
}

import { AI_ENRICHED_AUTOMATION_CATEGORIES } from '../config/administrativeAutomationCatalog';
import type {
  AdministrativeAutomationCategory,
  AdministrativeAutomationTask,
} from '../types/administrativeAutomation';
import { PatientState, type Patient } from '../types/emergency';

const AI_ENRICHED_CATEGORIES = new Set<AdministrativeAutomationCategory>(
  AI_ENRICHED_AUTOMATION_CATEGORIES,
);

const PATIENT_JOURNEY_AI_STATES = new Set([
  PatientState.Registration,
  PatientState.Arrival,
  PatientState.Triage,
  PatientState.Waiting,
  PatientState.Assessment,
]);

export function taskHasAiDecision(task: AdministrativeAutomationTask): boolean {
  const decision = task.proposedPayload?.aiDecision;
  return Boolean(decision && typeof decision === 'object');
}

export function taskNeedsAiEnrichment(task: AdministrativeAutomationTask): boolean {
  if (!AI_ENRICHED_CATEGORIES.has(task.category)) return false;
  if (taskHasAiDecision(task)) return false;
  if (task.category === 'triage_preparation' && task.proposedPayload.arrivalId) return true;
  return Boolean(task.patientId);
}

export function patientsNeedingAiEnrichment(
  tasks: readonly AdministrativeAutomationTask[],
  patients: Patient[],
  maxPatients = 12,
): Patient[] {
  const tasksNeedingEnrichment = tasks.filter(taskNeedsAiEnrichment);
  if (!tasksNeedingEnrichment.length) return [];

  const patientIds = new Set(
    tasksNeedingEnrichment.map((task) => task.patientId).filter(Boolean) as string[],
  );

  return patients
    .filter((patient) => patientIds.has(patient.id) && PATIENT_JOURNEY_AI_STATES.has(patient.state))
    .slice(0, maxPatients);
}
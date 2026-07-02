import { AI_ENRICHED_AUTOMATION_CATEGORIES } from '../config/administrativeAutomationCatalog';
import type {
  AdministrativeAutomationCategory,
  AdministrativeAutomationSnapshot,
  AdministrativeAutomationTask,
} from '../types/administrativeAutomation';
import type { EMSArrival, Patient } from '../types/emergency';
import { patientsNeedingAiEnrichment, taskHasAiDecision } from './administrativeAutomationAiUtils';
import {
  evaluateEmsPrearrivalAiDecision,
  evaluatePatientJourneyAiDecisions,
  formatAiDecisionSummary,
  hasHighRiskAiSignal,
  aiPriorityFromDecisions,
  type PatientJourneyAiDecisionBundle,
} from './patientJourneyAiDecisionService';

const AI_ENRICHED_CATEGORIES = new Set<AdministrativeAutomationCategory>(
  AI_ENRICHED_AUTOMATION_CATEGORIES,
);

function bumpPriority(
  current: AdministrativeAutomationTask['priority'],
  suggested: ReturnType<typeof aiPriorityFromDecisions>,
): AdministrativeAutomationTask['priority'] {
  const rank = { critical: 0, high: 1, medium: 2, low: 3 };
  return rank[suggested] < rank[current] ? suggested : current;
}

function enrichTaskWithBundle(
  task: AdministrativeAutomationTask,
  bundle: PatientJourneyAiDecisionBundle,
): AdministrativeAutomationTask {
  const aiSummary = formatAiDecisionSummary(bundle);
  return Object.freeze({
    ...task,
    priority: bumpPriority(task.priority, aiPriorityFromDecisions(bundle)),
    summary: `${task.summary} ${aiSummary}`,
    proposedPayload: Object.freeze({
      ...task.proposedPayload,
      aiDecision: Object.freeze({
        nodeId: 'CareDroidUnifiedAINode',
        generatedAt: bundle.generatedAt,
        triage: bundle.triage.data,
        intake: bundle.intake.data,
        critical: bundle.critical.data,
        summary: bundle.summary?.data,
        redFlags: [
          ...(bundle.critical.redFlags || []),
          ...(bundle.triage.redFlags || []),
        ],
        requiresClinicianReview: true,
      }),
    }),
  });
}

export async function enrichAdministrativeAutomationSnapshotWithAi(
  snapshot: AdministrativeAutomationSnapshot,
  input: {
    patients: Patient[];
    emsArrivals?: EMSArrival[];
    maxPatients?: number;
  },
): Promise<AdministrativeAutomationSnapshot> {
  const patientsById = new Map(input.patients.map((patient) => [patient.id, patient]));
  const decisionCache = new Map<string, PatientJourneyAiDecisionBundle>();

  const candidates = patientsNeedingAiEnrichment(
    snapshot.tasks,
    input.patients,
    input.maxPatients ?? 12,
  );

  await Promise.all(
    candidates.map(async (patient) => {
      const bundle = await evaluatePatientJourneyAiDecisions(patient);
      decisionCache.set(patient.id, bundle);
    }),
  );

  const enrichedTasks = await Promise.all(
    snapshot.tasks.map(async (task) => {
      if (!AI_ENRICHED_CATEGORIES.has(task.category)) return task;
      if (taskHasAiDecision(task)) return task;

      if (task.category === 'triage_preparation' && task.proposedPayload.arrivalId) {
        const arrival = (input.emsArrivals || []).find(
          (entry) => entry.id === task.proposedPayload.arrivalId,
        );
        if (!arrival) return task;
        const patient = task.patientId ? patientsById.get(task.patientId) : undefined;
        const emsDecision = await evaluateEmsPrearrivalAiDecision(arrival, patient);
        return Object.freeze({
          ...task,
          priority: emsDecision.priority === 'critical' ? 'critical' : task.priority,
          summary: `${task.summary} EMS AI pre-arrival: ${emsDecision.data?.riskLevel || 'review'} — ${(emsDecision.redFlags || []).slice(0, 2).join('; ') || 'no red flags'}. Clinician review required.`,
          proposedPayload: Object.freeze({
            ...task.proposedPayload,
            aiDecision: Object.freeze({
              nodeId: 'CareDroidUnifiedAINode',
              intent: 'ems_prearrival_risk_summary',
              data: emsDecision.data,
              redFlags: emsDecision.redFlags,
              requiresClinicianReview: true,
            }),
          }),
        });
      }

      if (!task.patientId) return task;
      const bundle = decisionCache.get(task.patientId);
      if (!bundle) return task;
      if (task.category === 'escalation_workflow' && !hasHighRiskAiSignal(bundle)) {
        return task;
      }
      return enrichTaskWithBundle(task, bundle);
    }),
  );

  return Object.freeze({
    ...snapshot,
    tasks: Object.freeze(enrichedTasks),
  });
}
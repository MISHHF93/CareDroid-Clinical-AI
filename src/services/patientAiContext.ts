import type { PatientCardOrchestrationContext } from '../../lib/patient-orchestration';
import type { Patient } from '../types/emergency';
import { summarizeArtifactsForCopilot } from './patientDocumentArtifactModel';
import { buildNativeAiPatientSnapshot, formatRoutingLabel } from './nativeAiCore';
import { formatScoresForCopilot } from '../utils/clinicalScoreEvents';
import { latestPatientVitals } from '../utils/patientVitals';

export function buildCopilotPatientArtifactContext(
  patient: Patient | null | undefined,
  orchestration: PatientCardOrchestrationContext | null | undefined,
): Record<string, unknown> | null {
  if (!patient) return null;

  const vitals = latestPatientVitals(patient);
  const savedScores = formatScoresForCopilot(patient);
  const recentNotes = (patient.notes || [])
    .slice(-5)
    .map((note) => ({
      id: note.id,
      content: note.text || note.body || '',
      createdAt: note.createdAt,
      authorStaffId: note.authorStaffId,
    }));

  return {
    patientId: patient.id,
    mrn: patient.mrn,
    name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.mrn,
    demographics: {
      age: patient.age ?? null,
      sex: patient.sex ?? null,
      dob: patient.dob ?? null,
    },
    chiefComplaint: patient.chiefComplaint || patient.complaint || null,
    recentNotes,
    state: patient.state,
    priority: patient.priority,
    flags: patient.flags || [],
    vitals: vitals
      ? {
          hr: vitals.hr ?? null,
          sbp: vitals.sbp ?? null,
          dbp: vitals.dbp ?? null,
          spo2: vitals.spo2 ?? null,
          rr: vitals.rr ?? null,
          temp: vitals.temp ?? null,
          gcs: vitals.gcs ?? null,
        }
      : null,
    savedScores: savedScores || null,
    orchestration: orchestration
      ? {
          stage: orchestration.operationalStage,
          overlays: orchestration.stageOverlays,
          complaintRoute: orchestration.complaintRoute?.complaint || null,
          scoresMissing: orchestration.scoresMissing,
          scoresCompleted: orchestration.scoresCompleted,
          recommendations: (orchestration.prioritizedRecommendations ?? []).map((rec) => ({
            toolId: rec.toolId,
            label: rec.label,
            launchKind: rec.launchKind,
            reason: rec.reason,
            completed: rec.completed,
          })),
        }
      : null,
    documentArtifacts: patient.documentArtifacts?.length
      ? summarizeArtifactsForCopilot(patient.documentArtifacts)
      : null,
    nativeAi: (() => {
      const snapshot = buildNativeAiPatientSnapshot(patient);
      return {
        routing: {
          specialists: snapshot.routing.specialistDomains,
          label: formatRoutingLabel(snapshot.routing),
          confidence: snapshot.routing.confidence,
          keySignals: snapshot.routing.keySignals,
          sourceState: snapshot.sourceState,
        },
        specialistInferences: (snapshot.specialistInferences ?? []).map((inference) => ({
          domain: inference.domainId,
          label: inference.specialistLabel,
          prediction: inference.prediction,
          confidence: inference.confidence,
          keyPredictors: inference.keyPredictors,
          recommendedTools: inference.recommendedTools,
        })),
        triageInference: snapshot.triageInference,
        orientation: snapshot.orientation,
        prolongedStay: snapshot.prolongedStay,
        admissionMl: snapshot.admissionMl,
        textFeatures: (snapshot.textFeatures.fusedFeatures ?? []).slice(0, 6),
      };
    })(),
  };
}

export function buildCalculatorCopilotSeed(
  patient: Patient | undefined,
  calculatorName: string,
  orchestration?: PatientCardOrchestrationContext | null,
): string {
  if (!patient) {
    return `Help me use ${calculatorName} as clinical decision support only. Ask for any missing context before suggesting next steps.`;
  }

  const vitals = latestPatientVitals(patient);
  const savedScores = formatScoresForCopilot(patient);
  const complaint = patient.chiefComplaint || patient.complaint;
  const missingScores = orchestration?.scoresMissing?.length
    ? `Missing pathway scores: ${orchestration.scoresMissing.join(', ')}.`
    : null;

  return [
    `Help me use ${calculatorName} as clinical decision support for ${patient.firstName} ${patient.lastName} (${patient.mrn}).`,
    complaint ? `Chief complaint: ${complaint}.` : null,
    vitals
      ? `Latest vitals: HR ${vitals.hr ?? '--'}, BP ${vitals.sbp ?? '--'}/${vitals.dbp ?? '--'}, SpO2 ${vitals.spo2 ?? '--'}%, RR ${vitals.rr ?? '--'}, Temp ${vitals.temp ?? '--'}.`
      : null,
    savedScores ? `Recent saved scores: ${savedScores}.` : null,
    missingScores,
    orchestration?.complaintRoute?.guidance ? `Pathway guidance: ${orchestration.complaintRoute.guidance}` : null,
    'Ask for any missing context before suggesting next steps. Staff confirmation required.',
  ]
    .filter(Boolean)
    .join(' ');
}
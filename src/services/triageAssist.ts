import {
  buildOperationalContextFromCounts,
  buildTriageAssistEnvelope,
  patientInputFromEmergencyRecord,
  type TriageAssistEnvelope,
} from '../../lib/patient-orchestration';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import { PatientFlag, PatientState, type Patient } from '../types/emergency';
import { postTriageAssist } from './emergencyOsApi';

export type TriageAssistBuildOptions = {
  arrivalReason?: string;
  complaintCategory?: string;
  handoffSource?: string;
};

export function buildClientTriageAssist(
  patient: Patient,
  allPatients: Patient[] = [],
  options: TriageAssistBuildOptions = {},
): TriageAssistEnvelope {
  const operationalContext = buildOperationalContextFromCounts({
    triageCount: allPatients.filter((entry) => entry.state === PatientState.Triage).length,
    waitingCount: allPatients.filter((entry) => entry.state === PatientState.Waiting).length,
    emsInboundCount: allPatients.filter((entry) =>
      Array.isArray(entry.flags) ? entry.flags.includes(PatientFlag.EMSArrival) : false,
    ).length,
  });

  return buildTriageAssistEnvelope(
    {
      ...patientInputFromEmergencyRecord(patient),
      arrivalReason: options.arrivalReason || patient.chiefComplaint,
      complaintCategory: options.complaintCategory || patient.complaintCategory,
      source: options.handoffSource,
    },
    { operationalContext },
  );
}

export async function refreshTriageAssistFromBackend(
  patientId: string,
  context: TriageAssistBuildOptions = {},
): Promise<TriageAssistEnvelope | null> {
  if (!isBackendCapabilityEnabled('emergencyTriageAssist')) return null;
  try {
    const response = await postTriageAssist({
      patientId,
      arrivalReason: context.arrivalReason,
      complaintCategory: context.complaintCategory,
    });
    return response?.data?.triageAssist || null;
  } catch {
    return null;
  }
}

export function isTriageAssistVisible(
  patient: Patient | null | undefined,
  canReviewTriage: boolean,
): boolean {
  if (!patient || !canReviewTriage) return false;
  if (patient.state !== PatientState.Triage) return false;
  if (!patient.triageAssist || patient.triageAssist.dismissedAt) return false;
  return true;
}

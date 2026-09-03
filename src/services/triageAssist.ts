import {
  buildOperationalContextFromCounts,
  buildTriageAssistEnvelope,
  patientInputFromEmergencyRecord,
  type TriageAssistEnvelope,
} from '../../lib/patient-orchestration';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import { PatientFlag, PatientState, type Patient } from '../types/emergency';
import { postTriageAssist } from './emergencyOsApi';
import { enrichTriageAssistWithNativeAi } from './nativeAiTriageBridge';

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

  const envelope = buildTriageAssistEnvelope(
    {
      ...patientInputFromEmergencyRecord(patient),
      arrivalReason: options.arrivalReason || patient.chiefComplaint,
      complaintCategory: options.complaintCategory || patient.complaintCategory,
      source: options.handoffSource,
    },
    { operationalContext },
  );

  return enrichTriageAssistWithNativeAi(envelope, patient);
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
  if (
    !patient.triageAssist ||
    patient.triageAssist.dismissedAt ||
    patient.triageAssist.acceptedAt
  ) {
    return false;
  }
  if (patient.state === PatientState.Triage) return true;
  if (patient.triagePending) return true;
  if (patient.source === 'Self-arrival') return true;
  return false;
}

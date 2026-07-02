/**
 * Maps live patient registration, triage, vitals, and risk flags into CareDroid AI node
 * structured intents. Used by administrative automations — all outputs require human review.
 */

import { buildAutomationEngineContext } from '../config/automationEntitlement.config';
import type { CareDroidAIResponse } from '../../lib/ai/careDroidAI';
import type { CareDroidAIIntent } from '../../lib/ai/careDroidAITypes';
import { invokeUnifiedAiStructuredByIntent } from './careDroidUnifiedAiNode';
import type { EMSArrival, Patient, Vitals } from '../types/emergency';
import { PatientFlag, PatientState } from '../types/emergency';

export type PatientJourneyAiDecisionBundle = Readonly<{
  patientId: string;
  triage: CareDroidAIResponse;
  intake: CareDroidAIResponse;
  critical: CareDroidAIResponse;
  summary?: CareDroidAIResponse;
  emsPrearrival?: CareDroidAIResponse;
  generatedAt: string;
}>;

function readVitals(patient: Patient): Vitals | undefined {
  return patient.currentVitals || patient.vitals?.at(-1);
}

function patientFlags(patient: Patient): string[] {
  return (patient.flags || []).map((entry) =>
    typeof entry === 'string' ? entry : (entry as { type?: string })?.type || '',
  ).filter(Boolean);
}

function symptomList(patient: Patient): string[] {
  const complaint = patient.chiefComplaint || patient.complaint || patient.complaintCategory;
  return [complaint, ...(patient.symptoms || [])].filter(Boolean) as string[];
}

export function buildPatientJourneyAiInput(patient: Patient): Record<string, unknown> {
  const vitals = readVitals(patient);
  const waitMinutes = patient.waitTimeMinutes ?? patient.waitMinutes ?? 0;

  return {
    patientId: patient.id,
    patientName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.mrn,
    mrn: patient.mrn,
    age: patient.age,
    sex: patient.sex,
    symptoms: symptomList(patient),
    chiefComplaint: patient.chiefComplaint || patient.complaint,
    painLevel: vitals?.pain ?? vitals?.painScore,
    vitals: vitals
      ? {
          bloodPressure:
            vitals.bloodPressure ||
            (vitals.sbp && vitals.dbp ? `${vitals.sbp}/${vitals.dbp}` : undefined),
          heartRate: vitals.heartRate ?? vitals.hr,
          respiratoryRate: vitals.respiratoryRate ?? vitals.rr,
          spo2: vitals.oxygenSaturation ?? vitals.spo2,
          temperature: vitals.temperature ?? vitals.temp,
          gcs: vitals.gcs,
        }
      : undefined,
    arrivalMode: patient.arrivalMode || patient.source || patient.emsArrival?.transportMode,
    allergies: patient.allergies || [],
    medications: patient.medications || patient.emsArrival?.medicationsEnRoute || [],
    existingConditions: patient.flags || [],
    currentWaitTime: waitMinutes,
    triageLevel: patient.priority,
    patientState: patient.state,
    operationalFlags: patientFlags(patient),
    registrationComplete: patient.state !== PatientState.Arrival,
    triagePending: patient.state === PatientState.Triage,
  };
}

export function buildEmsPrearrivalAiInput(arrival: EMSArrival, patient?: Patient): Record<string, unknown> {
  const vitals = patient ? readVitals(patient) : undefined;
  return {
    unitName: arrival.unitName,
    etaMinutes: arrival.eta,
    chiefComplaint: arrival.chiefComplaint || patient?.chiefComplaint,
    severity: arrival.severity,
    symptoms: symptomList(patient || ({} as Patient)),
    vitals: vitals,
    preArrivalNotification: arrival.preArrivalNotification,
    medicationsEnRoute: patient?.emsArrival?.medicationsEnRoute || [],
    patientState: patient?.state,
    operationalFlags: patient ? patientFlags(patient) : [],
  };
}

function aiContext(sourceScreen: string, patientId: string) {
  const runtime = buildAutomationEngineContext();
  return {
    sourceScreen,
    organizationId: runtime.tenant?.id,
    workspaceId: runtime.workspaceId,
    tenant: {
      organizationId: runtime.tenant?.id,
      workspaceId: runtime.workspaceId,
      source: 'patient_journey_ai_decision',
    },
    unifiedAiNode: {
      nodeId: 'CareDroidUnifiedAINode',
      route: '/api/ai/node',
      capabilitySource: 'patient_journey_ai_decision',
    },
    patientId,
  };
}

async function invokePatientJourneyIntent(
  intent: CareDroidAIIntent,
  input: Record<string, unknown>,
  context: Record<string, unknown>,
): Promise<CareDroidAIResponse> {
  return invokeUnifiedAiStructuredByIntent({
    intent,
    input,
    context,
  });
}

export async function evaluatePatientJourneyAiDecisions(
  patient: Patient,
): Promise<PatientJourneyAiDecisionBundle> {
  const input = buildPatientJourneyAiInput(patient);
  const context = aiContext('administrative_automation_engine', patient.id);

  const [triage, intake, critical] = await Promise.all([
    invokePatientJourneyIntent('triage_recommendation', input, context),
    invokePatientJourneyIntent('patient_intake_assist', input, context),
    invokePatientJourneyIntent('critical_alert_assessment', input, context),
  ]);

  const needsSummary =
    patient.state !== PatientState.Discharge &&
    patient.state !== PatientState.Deceased;

  const summary = needsSummary
    ? await invokePatientJourneyIntent('patient_summary', {
        ...input,
        triageNotes: patient.notes?.slice(-3).map((note) => note.text || note.body).filter(Boolean),
        medicalHistory: patientFlags(patient),
      }, context)
    : undefined;

  return {
    patientId: patient.id,
    triage,
    intake,
    critical,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

export async function evaluateEmsPrearrivalAiDecision(
  arrival: EMSArrival,
  patient?: Patient,
): Promise<CareDroidAIResponse> {
  return invokePatientJourneyIntent(
    'ems_prearrival_risk_summary',
    buildEmsPrearrivalAiInput(arrival, patient),
    aiContext('administrative_automation_ems', patient?.id || arrival.id),
  );
}

export function aiPriorityFromDecisions(bundle: PatientJourneyAiDecisionBundle): 'critical' | 'high' | 'medium' | 'low' {
  const criticalSeverity = String(bundle.critical.data?.severity || '').toLowerCase();
  if (criticalSeverity === 'critical') return 'critical';
  if ((bundle.critical.redFlags || []).length > 0) return 'high';
  const triageLevel = String(bundle.triage.data?.recommendedTriageLevel || '').toUpperCase();
  if (triageLevel === 'P1' || triageLevel === 'RESUSCITATION') return 'critical';
  if (triageLevel === 'P2' || triageLevel === 'EMERGENT') return 'high';
  const missingFields = Array.isArray(bundle.intake.data?.missingFields)
    ? bundle.intake.data.missingFields.length
    : 0;
  if (missingFields >= 3) return 'medium';
  return 'medium';
}

export function formatAiDecisionSummary(bundle: PatientJourneyAiDecisionBundle): string {
  const triageLevel = bundle.triage.data?.recommendedTriageLevel || 'review required';
  const redFlags = (bundle.critical.redFlags || bundle.triage.redFlags || []).slice(0, 3);
  const missing = Array.isArray(bundle.intake.data?.missingFields)
    ? bundle.intake.data.missingFields.slice(0, 3).join(', ')
    : '';
  const parts = [
    `AI triage advisory: ${triageLevel}.`,
    redFlags.length ? `Red flags: ${redFlags.join('; ')}.` : 'No critical red flags in submitted data.',
    missing ? `Registration gaps: ${missing}.` : 'Registration fields appear complete for automated review.',
    'Licensed clinician must confirm before acuity, routing, or orders change.',
  ];
  return parts.join(' ');
}

export function hasHighRiskAiSignal(bundle: PatientJourneyAiDecisionBundle): boolean {
  return aiPriorityFromDecisions(bundle) === 'critical' || aiPriorityFromDecisions(bundle) === 'high';
}
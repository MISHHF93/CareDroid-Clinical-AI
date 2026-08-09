import { latestPatientVitals } from '../shared/patientClinicalHelpers';
import type { Patient } from '../../src/types/emergency';
import { CLINICAL_DOMAIN_SPECIALISTS, type ClinicalDomainSpecialist } from './clinicalDomainSpecialists';
import type { ClinicalDomainId, NativeAiSourceState, PanelRoutingDecision } from './types';

const ROUTER_VERSION = 'native-ai-router-v1';

function createRunId(): string {
  return `route-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function complaintText(patient: Patient): string {
  return [
    patient.chiefComplaint,
    patient.complaint,
    patient.complaintCategory,
    patient.arrival?.chiefComplaint,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function scoreSpecialist(
  specialist: ClinicalDomainSpecialist,
  complaint: string,
  patient: Patient,
): { score: number; signals: string[] } {
  const signals: string[] = [];
  let score = 0;

  specialist.keywords.forEach((keyword) => {
    if (keyword && complaint.includes(keyword)) {
      score += keyword.length > 8 ? 3 : 2;
      signals.push(`Complaint keyword: ${keyword}`);
    }
  });

  const vitals = latestPatientVitals(patient);
  if (vitals) {
    if (specialist.id === 'cardiac_vascular' && vitals.hr != null && vitals.hr > 100) {
      score += 1.5;
      signals.push(`HR elevated: ${vitals.hr}`);
    }
    if (specialist.id === 'pulmonary' && vitals.spo2 != null && vitals.spo2 < 94) {
      score += 2;
      signals.push(`SpO2 low: ${vitals.spo2}%`);
    }
    if (specialist.id === 'cardiac_vascular' && vitals.sbp != null && vitals.sbp < 90) {
      score += 2;
      signals.push(`SBP low: ${vitals.sbp}`);
    }
    if (specialist.id === 'gastro_oesophageal' && vitals.temp != null && vitals.temp >= 38) {
      score += 1;
      signals.push(`Fever: ${vitals.temp}°`);
    }
  }

  if (patient.emsArrival?.chiefComplaint) {
    const emsComplaint = patient.emsArrival.chiefComplaint.toLowerCase();
    specialist.keywords.forEach((keyword) => {
      if (keyword && emsComplaint.includes(keyword)) {
        score += 1;
        signals.push(`EMS complaint: ${keyword}`);
      }
    });
  }

  return { score, signals };
}

export function routePatientToClinicalSpecialists(
  patient: Patient,
  options: { sourceState?: NativeAiSourceState; auditEventId?: string } = {},
): PanelRoutingDecision {
  const complaint = complaintText(patient);
  const scored = CLINICAL_DOMAIN_SPECIALISTS.map((specialist) => {
    const result = scoreSpecialist(specialist, complaint, patient);
    return { specialist, ...result };
  }).sort((left, right) => right.score - left.score);

  const primary = scored[0]?.score > 0 ? scored[0] : { specialist: CLINICAL_DOMAIN_SPECIALISTS.at(-1)!, score: 0.5, signals: ['No strong domain match — general emergency fallback'] };
  const supporting = scored
    .slice(1)
    .filter((entry) => entry.score >= 2)
    .slice(0, 2)
    .map((entry) => entry.specialist.id);

  const confidence = Math.min(0.95, Math.max(0.45, primary.score / 8));

  return {
    runId: createRunId(),
    patientId: patient.id,
    routedAt: new Date().toISOString(),
    chiefComplaint: patient.chiefComplaint || patient.complaint || 'Unknown',
    primaryDomain: primary.specialist.id,
    specialistDomains: [primary.specialist.id, ...supporting.filter((id) => id !== primary.specialist.id)] as ClinicalDomainId[],
    confidence: Number(confidence.toFixed(2)),
    keySignals: primary.signals.slice(0, 6),
    routerModelVersion: ROUTER_VERSION,
    sourceState: options.sourceState || 'demo',
    auditEventId: options.auditEventId,
    disclaimer: 'Routed panel-of-experts decision is advisory. Staff must confirm clinical pathway.',
  };
}

export function formatRoutingLabel(decision: PanelRoutingDecision): string {
  const labels = decision.specialistDomains.map((domain) =>
    CLINICAL_DOMAIN_SPECIALISTS.find((specialist) => specialist.id === domain)?.label || domain,
  );
  return labels.join(' + ');
}
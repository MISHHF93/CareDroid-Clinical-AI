import {
  parseAllergyArtifactText,
  parseClinicalArtifactText,
  parseDischargeArtifactText,
  parseMedicationArtifactText,
  parseReferralArtifactText,
} from '../utils/clinicalArtifactParser';
import type { Patient } from '../types/emergency';
import { PatientFlag, PatientState } from '../types/emergency';
import type {
  ArtifactReviewStatus,
  ArtifactSourceStateLabel,
  ExtractDocumentArtifactsInput,
  PatientDocumentArtifact,
  PatientDocumentArtifactType,
  PatientDocumentSource,
} from '../types/patientDocumentArtifact';
import { hasPatientFlag } from '../utils/patientVitals';
import type { AIResponseSourceCategory } from '../../lib/ai/provenanceContract';

// Every artifact this file produces comes from a regex/keyword parser
// (clinicalArtifactParser.ts, the labeled() helper below) or from directly
// reading an existing patient flag/field -- zero LLM or model calls
// anywhere in this file. Found 2026-08-08: buildArtifact() previously
// defaulted safety.isAiDerived to true regardless, and several call sites
// hardcoded extractedBy: 'CareDroid Copilot' -- misleading, matching the
// exact same bug found and fixed in the backend's
// patient-document-artifact.service.ts (this file is its client-side
// offline-fallback twin, used by patientDocumentArtifactApi.ts whenever the
// backend extraction endpoint is unreachable, so it's a real, live path,
// not a preview).
const MODEL_VERSION = 'document-field-extractor-v1';
const EXTRACTOR_NAME = 'regex-field-extractor';
const DETERMINISTIC: AIResponseSourceCategory = 'DETERMINISTIC_RULE';

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function labeled(text: string, labels: string[]): { value?: string; span?: { startChar: number; endChar: number } } {
  for (const label of labels) {
    const pattern = new RegExp(`\\b${label}\\s*[:\\-]\\s*([^\\n;]{2,160})`, 'i');
    const match = text.match(pattern);
    if (match?.[1] && match.index != null) {
      const startChar = match.index + match[0].indexOf(match[1]);
      return {
        value: match[1].trim(),
        span: { startChar, endChar: startChar + match[1].length },
      };
    }
  }
  return {};
}

// requiresHumanReview is a clinical-safety property (does this need staff
// sign-off before use?), independent of whether it was AI-derived --
// deterministic extraction still needs review before clinical use. Kept as
// an explicit param, decoupled from isAiDerived (always false in this
// file), matching the same separation applied to the backend's
// patient-document-artifact.service.ts.
function defaultSafety(requiresHumanReview: boolean) {
  return {
    isAiDerived: false,
    requiresHumanReview,
    mayAffectClinicalWorkflow: true,
    disclaimer: undefined,
  };
}

function defaultVisibility(
  artifactType: PatientDocumentArtifactType,
): PatientDocumentArtifact['visibility'] {
  const showOnWhiteboard = [
    'REASSESSMENT_TRIGGER',
    'DETERIORATION_SIGNAL',
    'BOARDING_STATUS',
    'REFERRAL_STATUS',
    'EMS_HANDOFF',
  ].includes(artifactType);

  return {
    showOnPatientCard: true,
    showOnWhiteboard,
    showInCopilot: true,
  };
}

function fhirHintForType(type: PatientDocumentArtifactType): PatientDocumentArtifact['fhirResourceHint'] {
  const map: Partial<Record<PatientDocumentArtifactType, PatientDocumentArtifact['fhirResourceHint']>> = {
    ALLERGY: 'AllergyIntolerance',
    MEDICATION: 'MedicationStatement',
    CONDITION: 'Condition',
    VITAL_SIGN: 'Observation',
    LAB_RESULT: 'DiagnosticReport',
    PROCEDURE: 'Procedure',
    CHIEF_COMPLAINT: 'Condition',
    EMS_HANDOFF: 'Composition',
    TRIAGE_NOTE: 'Composition',
    PENDING_TASK: 'Task',
    COPILOT_TOOL_RECOMMENDATION: 'CarePlan',
    IDENTIFIER: 'Patient',
    ENCOUNTER: 'Encounter',
    DOCUMENT_METADATA: 'DocumentReference',
  };
  return map[type];
}

type BuildArtifactInput = Omit<
  PatientDocumentArtifact,
  'id' | 'createdAt' | 'updatedAt' | 'patientCardId' | 'confidence' | 'provenance' | 'safety' | 'visibility'
> & {
  patientCardId?: string;
  confidence?: number;
  /** Whether this artifact needs staff sign-off before clinical use -- independent of extraction mechanism. */
  requiresHumanReview: boolean;
  extractedBy?: string;
  modelVersion?: string;
  sourceState?: PatientDocumentArtifact['sourceState'];
  provenance?: Partial<PatientDocumentArtifact['provenance']> & {
    sourceType?: PatientDocumentSource['sourceType'];
    sourceSystem?: string;
  };
};

function buildArtifact(base: BuildArtifactInput): PatientDocumentArtifact {
  const timestamp = nowIso();
  const { provenance: provenanceInput, requiresHumanReview, extractedBy, modelVersion, ...rest } = base;
  return {
    ...rest,
    id: createId('artifact'),
    patientCardId: base.patientCardId || base.patientId,
    confidence: base.confidence ?? 0.72,
    provenance: {
      sourceType: provenanceInput?.sourceType || 'uploaded_document',
      sourceSystem: provenanceInput?.sourceSystem || 'uploaded_document',
      extractedBy: extractedBy || provenanceInput?.extractedBy || EXTRACTOR_NAME,
      modelVersion: modelVersion || provenanceInput?.modelVersion || MODEL_VERSION,
      extractedAt: timestamp,
      auditEventId: provenanceInput?.auditEventId,
      responseSource: provenanceInput?.responseSource || DETERMINISTIC,
    },
    safety: defaultSafety(requiresHumanReview),
    visibility: defaultVisibility(base.artifactType),
    fhirResourceHint: base.fhirResourceHint || fhirHintForType(base.artifactType),
    sourceState: base.sourceState || 'extracted',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function parserForSourceType(
  sourceType: PatientDocumentSource['sourceType'],
): 'allergy' | 'medication' | 'referral' | 'discharge' | null {
  if (sourceType === 'referral_note') return 'referral';
  if (sourceType === 'discharge_summary') return 'discharge';
  if (sourceType === 'ems_report') return 'referral';
  return null;
}

function extractClinicalFactsFromText(
  input: ExtractDocumentArtifactsInput,
  rawText: string,
): PatientDocumentArtifact[] {
  const artifacts: PatientDocumentArtifact[] = [];
  const parser = input.parser || parserForSourceType(input.sourceType);
  const referral = parseReferralArtifactText(rawText);
  const allergy = parseAllergyArtifactText(rawText);
  const medication = parseMedicationArtifactText(rawText);
  const discharge = parser === 'discharge' ? parseDischargeArtifactText(rawText) : {};

  const chiefComplaint = referral.chiefComplaint || labeled(rawText, ['chief complaint', 'presenting complaint']).value;
  if (chiefComplaint) {
    const span = labeled(rawText, ['chief complaint', 'presenting complaint']).span;
    artifacts.push(
      buildArtifact({
        patientId: input.patientId,
        encounterId: input.encounterId,
        sourceDocumentId: input.sourceDocumentId,
        artifactType: 'CHIEF_COMPLAINT',
        clinicalStatus: 'suggested',
        reviewStatus: 'pending_human_review',
        label: chiefComplaint,
        value: { complaint: chiefComplaint },
        sourceText: chiefComplaint,
        sourceSpan: span,
        confidence: input.confidence ?? 0.8,
        requiresHumanReview: true,
        sourceState: input.sourceState as ArtifactSourceStateLabel,
        provenance: {
          sourceType: input.sourceType,
          sourceSystem: input.sourceSystem || 'uploaded_document',
          extractedBy: EXTRACTOR_NAME,
          modelVersion: MODEL_VERSION,
          extractedAt: nowIso(),
        },
      }),
    );
  }

  if (allergy.substance || allergy.allergy) {
    artifacts.push(
      buildArtifact({
        patientId: input.patientId,
        encounterId: input.encounterId,
        sourceDocumentId: input.sourceDocumentId,
        artifactType: 'ALLERGY',
        clinicalStatus: 'suggested',
        reviewStatus: 'pending_human_review',
        label: allergy.substance || allergy.allergy || 'Allergy',
        normalizedCode: { system: 'SNOMED_CT', display: allergy.substance || allergy.allergy },
        value: {
          substance: allergy.substance || allergy.allergy,
          reaction: allergy.reaction,
          severity: allergy.severity || 'unknown',
        },
        sourceText: allergy.allergy || allergy.substance,
        confidence: input.confidence ?? 0.86,
        requiresHumanReview: true,
        sourceState: input.sourceState as ArtifactSourceStateLabel,
        provenance: {
          sourceType: input.sourceType,
          sourceSystem: input.sourceSystem || 'uploaded_document',
          extractedBy: EXTRACTOR_NAME,
          modelVersion: MODEL_VERSION,
          extractedAt: nowIso(),
        },
      }),
    );
  }

  if (medication.medication || medication.medicationName) {
    const medLabel = medication.medication || medication.medicationName || 'Medication';
    artifacts.push(
      buildArtifact({
        patientId: input.patientId,
        encounterId: input.encounterId,
        sourceDocumentId: input.sourceDocumentId,
        artifactType: 'MEDICATION',
        clinicalStatus: 'suggested',
        reviewStatus: 'pending_human_review',
        label: medLabel,
        normalizedCode: { system: 'RXNORM', display: medication.medicationName || medLabel },
        value: {
          name: medication.medicationName || medication.medication,
          dose: medication.dose,
          route: medication.route,
          frequency: medication.frequency,
        },
        sourceText: medLabel,
        confidence: input.confidence ?? 0.82,
        requiresHumanReview: true,
        sourceState: input.sourceState as ArtifactSourceStateLabel,
        provenance: {
          sourceType: input.sourceType,
          sourceSystem: input.sourceSystem || 'uploaded_document',
          extractedBy: EXTRACTOR_NAME,
          modelVersion: MODEL_VERSION,
          extractedAt: nowIso(),
        },
      }),
    );
  }

  const diagnoses = referral.diagnoses || discharge.diagnoses;
  if (diagnoses) {
    artifacts.push(
      buildArtifact({
        patientId: input.patientId,
        encounterId: input.encounterId,
        sourceDocumentId: input.sourceDocumentId,
        artifactType: 'CONDITION',
        clinicalStatus: 'suggested',
        reviewStatus: 'pending_human_review',
        label: diagnoses,
        normalizedCode: { system: 'ICD-10-CM', display: diagnoses },
        value: { problem: diagnoses },
        sourceText: diagnoses,
        confidence: input.confidence ?? 0.74,
        requiresHumanReview: true,
        sourceState: input.sourceState as ArtifactSourceStateLabel,
        provenance: {
          sourceType: input.sourceType,
          sourceSystem: input.sourceSystem || 'uploaded_document',
          extractedBy: EXTRACTOR_NAME,
          modelVersion: MODEL_VERSION,
          extractedAt: nowIso(),
        },
      }),
    );
  }

  const vitalsHr = labeled(rawText, ['heart rate', 'hr', 'pulse']);
  const vitalsBp = labeled(rawText, ['blood pressure', 'bp']);
  const vitalsSpo2 = labeled(rawText, ['spo2', 'oxygen saturation', 'o2 sat']);
  if (vitalsHr.value || vitalsBp.value || vitalsSpo2.value) {
    artifacts.push(
      buildArtifact({
        patientId: input.patientId,
        encounterId: input.encounterId,
        sourceDocumentId: input.sourceDocumentId,
        artifactType: 'VITAL_SIGN',
        clinicalStatus: 'suggested',
        reviewStatus: 'pending_human_review',
        label: 'Vitals mentioned',
        value: {
          hr: vitalsHr.value,
          bloodPressure: vitalsBp.value,
          spo2: vitalsSpo2.value,
        },
        sourceText: [vitalsHr.value, vitalsBp.value, vitalsSpo2.value].filter(Boolean).join(' · '),
        confidence: input.confidence ?? 0.7,
        requiresHumanReview: true,
        sourceState: input.sourceState as ArtifactSourceStateLabel,
        provenance: {
          sourceType: input.sourceType,
          sourceSystem: input.sourceSystem || 'uploaded_document',
          extractedBy: EXTRACTOR_NAME,
          modelVersion: MODEL_VERSION,
          extractedAt: nowIso(),
        },
      }),
    );
  }

  const troponin = labeled(rawText, ['troponin', 'trop']);
  if (troponin.value || /\btroponin\b/i.test(rawText)) {
    const pending = /pending|ordered|awaiting/i.test(rawText);
    artifacts.push(
      buildArtifact({
        patientId: input.patientId,
        encounterId: input.encounterId,
        sourceDocumentId: input.sourceDocumentId,
        artifactType: 'LAB_RESULT',
        clinicalStatus: 'suggested',
        reviewStatus: 'pending_human_review',
        label: pending ? 'Troponin mentioned, result pending' : `Troponin: ${troponin.value || 'mentioned'}`,
        normalizedCode: { system: 'LOINC', display: 'Troponin' },
        value: { analyte: 'troponin', result: troponin.value, status: pending ? 'pending' : 'mentioned' },
        sourceText: troponin.value || 'troponin',
        sourceSpan: troponin.span,
        confidence: input.confidence ?? 0.78,
        requiresHumanReview: true,
        sourceState: input.sourceState as ArtifactSourceStateLabel,
        provenance: {
          sourceType: input.sourceType,
          sourceSystem: input.sourceSystem || 'uploaded_document',
          extractedBy: EXTRACTOR_NAME,
          modelVersion: MODEL_VERSION,
          extractedAt: nowIso(),
        },
      }),
    );
  }

  if (input.sourceType === 'ems_report' || /\bEMS\b|\bambulance\b|\ben route\b/i.test(rawText)) {
    const handoff = labeled(rawText, ['handoff', 'ems report', 'prehospital', 'en route']);
    artifacts.push(
      buildArtifact({
        patientId: input.patientId,
        encounterId: input.encounterId,
        sourceDocumentId: input.sourceDocumentId,
        artifactType: 'EMS_HANDOFF',
        clinicalStatus: 'suggested',
        reviewStatus: 'pending_human_review',
        label: handoff.value ? `EMS handoff: ${handoff.value}` : 'EMS handoff note',
        value: { summary: handoff.value || rawText.slice(0, 240) },
        sourceText: handoff.value || rawText.slice(0, 240),
        sourceSpan: handoff.span,
        confidence: input.confidence ?? 0.75,
        requiresHumanReview: true,
        sourceState: input.sourceState as ArtifactSourceStateLabel,
        provenance: {
          sourceType: input.sourceType,
          sourceSystem: input.sourceSystem || 'uploaded_document',
          extractedBy: EXTRACTOR_NAME,
          modelVersion: MODEL_VERSION,
          extractedAt: nowIso(),
        },
      }),
    );
  }

  if (parser && parser !== 'referral') {
    const parsed = parseClinicalArtifactText(parser, rawText);
    if (Object.keys(parsed).length === 0 && artifacts.length === 0) {
      return artifacts;
    }
  }

  return artifacts;
}

export function buildDocumentSource(input: ExtractDocumentArtifactsInput): PatientDocumentSource {
  return {
    id: input.sourceDocumentId || createId('doc'),
    patientId: input.patientId,
    encounterId: input.encounterId,
    documentType: input.documentType,
    sourceSystem: input.sourceSystem || 'uploaded_document',
    sourceType: input.sourceType,
    filename: input.filename,
    capturedAt: nowIso(),
    sourceState: input.sourceState || 'extracted',
    fhirResourceHint: 'DocumentReference',
  };
}

export function extractDocumentArtifacts(input: ExtractDocumentArtifactsInput): {
  source: PatientDocumentSource;
  artifacts: PatientDocumentArtifact[];
} {
  const source = buildDocumentSource(input);
  const rawText = String(input.rawText || '').trim();
  const artifacts: PatientDocumentArtifact[] = [];

  if (!rawText) {
    return { source, artifacts };
  }

  artifacts.push(
    buildArtifact({
      patientId: input.patientId,
      encounterId: input.encounterId,
      sourceDocumentId: source.id,
      artifactType: 'DOCUMENT_METADATA',
      clinicalStatus: 'confirmed',
      reviewStatus: 'accepted',
      label: input.documentType,
      value: {
        documentType: input.documentType,
        sourceType: input.sourceType,
        filename: input.filename,
      },
      confidence: 1,
      requiresHumanReview: false,
      sourceState: input.sourceState || 'extracted',
      provenance: {
        sourceType: input.sourceType,
        sourceSystem: input.sourceSystem || 'uploaded_document',
        extractedBy: 'CareDroid Intake',
        modelVersion: 'intake-v1',
        extractedAt: nowIso(),
      },
    }),
  );

  artifacts.push(...extractClinicalFactsFromText({ ...input, sourceDocumentId: source.id }, rawText));
  artifacts.push(...deriveCopilotArtifactsFromText(input.patientId, rawText, source.id, input));

  return { source, artifacts };
}

function deriveCopilotArtifactsFromText(
  patientId: string,
  rawText: string,
  sourceDocumentId: string,
  input: ExtractDocumentArtifactsInput,
): PatientDocumentArtifact[] {
  const artifacts: PatientDocumentArtifact[] = [];
  const lower = rawText.toLowerCase();

  if (/chest pain|acs|mi\b|myocardial/i.test(lower)) {
    artifacts.push(
      buildArtifact({
        patientId,
        encounterId: input.encounterId,
        sourceDocumentId,
        artifactType: 'COPILOT_TOOL_RECOMMENDATION',
        clinicalStatus: 'suggested',
        reviewStatus: 'pending_human_review',
        label: 'Consider HEART score tool',
        value: { toolId: 'heart-score', reason: 'Chest pain documented in source text' },
        confidence: 0.68,
        requiresHumanReview: true,
        sourceState: input.sourceState as ArtifactSourceStateLabel,
        provenance: {
          sourceType: input.sourceType,
          sourceSystem: input.sourceSystem || 'copilot_synthesis',
          extractedBy: EXTRACTOR_NAME,
          modelVersion: MODEL_VERSION,
          extractedAt: nowIso(),
        },
      }),
      buildArtifact({
        patientId,
        encounterId: input.encounterId,
        sourceDocumentId,
        artifactType: 'COPILOT_TOOL_RECOMMENDATION',
        clinicalStatus: 'suggested',
        reviewStatus: 'pending_human_review',
        label: 'Consider ECG checklist',
        value: { toolId: 'ecg-checklist', reason: 'Chest pain pathway' },
        confidence: 0.65,
        requiresHumanReview: true,
        sourceState: input.sourceState as ArtifactSourceStateLabel,
        provenance: {
          sourceType: input.sourceType,
          sourceSystem: input.sourceSystem || 'copilot_synthesis',
          extractedBy: EXTRACTOR_NAME,
          modelVersion: MODEL_VERSION,
          extractedAt: nowIso(),
        },
      }),
    );
  }

  if (/warfarin|apixaban|rivaroxaban|anticoag/i.test(lower)) {
    artifacts.push(
      buildArtifact({
        patientId,
        encounterId: input.encounterId,
        sourceDocumentId,
        artifactType: 'COPILOT_MISSING_DATA',
        clinicalStatus: 'suggested',
        reviewStatus: 'pending_human_review',
        label: 'Review anticoagulant medication history',
        value: { question: 'Confirm indication, last dose, and reversal plan if applicable.' },
        confidence: 0.7,
        requiresHumanReview: true,
        sourceState: input.sourceState as ArtifactSourceStateLabel,
        provenance: {
          sourceType: input.sourceType,
          sourceSystem: input.sourceSystem || 'copilot_synthesis',
          extractedBy: EXTRACTOR_NAME,
          modelVersion: MODEL_VERSION,
          extractedAt: nowIso(),
        },
      }),
    );
  }

  if (/chest pain/i.test(lower)) {
    artifacts.push(
      buildArtifact({
        patientId,
        encounterId: input.encounterId,
        sourceDocumentId,
        artifactType: 'COPILOT_MISSING_DATA',
        clinicalStatus: 'suggested',
        reviewStatus: 'pending_human_review',
        label: 'Ask: exact symptom onset, aspirin given, prior CAD?',
        value: {
          questions: ['Exact symptom onset?', 'Aspirin given prehospital?', 'Prior CAD history?'],
        },
        confidence: 0.62,
        requiresHumanReview: true,
        sourceState: input.sourceState as ArtifactSourceStateLabel,
        provenance: {
          sourceType: input.sourceType,
          sourceSystem: input.sourceSystem || 'copilot_synthesis',
          extractedBy: EXTRACTOR_NAME,
          modelVersion: MODEL_VERSION,
          extractedAt: nowIso(),
        },
      }),
    );
  }

  return artifacts;
}

export function extractArtifactsFromPatient(patient: Patient): PatientDocumentArtifact[] {
  const artifacts: PatientDocumentArtifact[] = [];
  const complaint = patient.chiefComplaint || patient.complaint;
  const arrival = patient.arrival;

  if (complaint) {
    artifacts.push(
      buildArtifact({
        patientId: patient.id,
        artifactType: 'CHIEF_COMPLAINT',
        clinicalStatus: 'confirmed',
        reviewStatus: 'accepted',
        label: complaint,
        value: { complaint },
        confidence: 1,
        requiresHumanReview: false,
        sourceState: 'staff_entered',
        provenance: {
          sourceType: 'patient_record',
          sourceSystem: 'emergency_store',
          extractedBy: 'CareDroid Patient Record',
          modelVersion: 'patient-record-v1',
          extractedAt: nowIso(),
        },
      }),
    );
  }

  if (arrival) {
    artifacts.push(
      buildArtifact({
        patientId: patient.id,
        artifactType: 'ARRIVAL_CONTEXT',
        clinicalStatus: 'confirmed',
        reviewStatus: 'accepted',
        label: `Arrival: ${arrival.arrivalMode}`,
        value: {
          arrivalMode: arrival.arrivalMode,
          triageAcuity: arrival.triageAcuity,
          waitingRoomStatus: arrival.waitingRoomStatus,
        },
        confidence: 1,
        requiresHumanReview: false,
        sourceState: 'live',
        provenance: {
          sourceType: 'patient_record',
          sourceSystem: 'emergency_store',
          extractedBy: 'CareDroid Patient Record',
          modelVersion: 'patient-record-v1',
          extractedAt: nowIso(),
        },
      }),
    );
  }

  if (patient.emsArrival?.handoffSummary || patient.emsArrival?.notes) {
    const summary = patient.emsArrival.handoffSummary || patient.emsArrival.notes;
    artifacts.push(
      buildArtifact({
        patientId: patient.id,
        artifactType: 'EMS_HANDOFF',
        clinicalStatus: 'suggested',
        reviewStatus: 'pending_human_review',
        label: `EMS handoff: ${summary.slice(0, 80)}`,
        value: { summary, unitName: patient.emsArrival.unitName },
        sourceText: summary,
        confidence: 0.9,
        requiresHumanReview: false,
        sourceState: 'live',
        provenance: {
          sourceType: 'ems_report',
          sourceSystem: 'ems_intake',
          extractedBy: 'CareDroid EMS Intake',
          modelVersion: 'ems-v1',
          extractedAt: nowIso(),
        },
      }),
    );
  }

  if (hasPatientFlag(patient, PatientFlag.ReassessmentDue)) {
    artifacts.push(
      buildArtifact({
        patientId: patient.id,
        artifactType: 'REASSESSMENT_TRIGGER',
        clinicalStatus: 'suggested',
        reviewStatus: 'pending_human_review',
        label: 'Reassessment due',
        value: { trigger: 'reassessment_flag' },
        confidence: 0.95,
        requiresHumanReview: true,
        sourceState: 'live',
        provenance: {
          sourceType: 'patient_record',
          sourceSystem: 'reassessment_engine',
          extractedBy: 'CareDroid Reassessment',
          modelVersion: 'reassessment-v1',
          extractedAt: nowIso(),
        },
      }),
    );
  }

  if (hasPatientFlag(patient, PatientFlag.SepsisAlert) || hasPatientFlag(patient, PatientFlag.DeteriorationRisk)) {
    artifacts.push(
      buildArtifact({
        patientId: patient.id,
        artifactType: 'DETERIORATION_SIGNAL',
        clinicalStatus: 'suggested',
        reviewStatus: 'pending_human_review',
        label: hasPatientFlag(patient, PatientFlag.SepsisAlert) ? 'Sepsis signal' : 'Deterioration signal',
        value: {
          sepsis: hasPatientFlag(patient, PatientFlag.SepsisAlert),
          deterioration: hasPatientFlag(patient, PatientFlag.DeteriorationRisk),
        },
        confidence: 0.88,
        requiresHumanReview: true,
        sourceState: 'live',
        provenance: {
          sourceType: 'patient_record',
          sourceSystem: 'safety_engine',
          extractedBy: 'CareDroid Safety',
          modelVersion: 'safety-v1',
          extractedAt: nowIso(),
        },
      }),
    );
  }

  if (patient.referral) {
    artifacts.push(
      buildArtifact({
        patientId: patient.id,
        artifactType: 'REFERRAL_STATUS',
        clinicalStatus: 'confirmed',
        reviewStatus: 'accepted',
        label: `Referral: ${patient.referral.status || patient.referral.workflow || 'active'}`,
        value: {
          status: patient.referral.status,
          workflow: patient.referral.workflow,
          destination: (patient.referral as unknown as { destination?: string }).destination,
        },
        confidence: 1,
        requiresHumanReview: false,
        sourceState: 'live',
        provenance: {
          sourceType: 'patient_record',
          sourceSystem: 'referral_module',
          extractedBy: 'CareDroid Referral',
          modelVersion: 'referral-v1',
          extractedAt: nowIso(),
        },
      }),
    );
  }

  if (patient.state === PatientState.Admission || hasPatientFlag(patient, PatientFlag.PendingAdmission)) {
    artifacts.push(
      buildArtifact({
        patientId: patient.id,
        artifactType: 'BOARDING_STATUS',
        clinicalStatus: 'confirmed',
        reviewStatus: 'accepted',
        label: 'Boarding in progress',
        value: { state: patient.state },
        confidence: 1,
        requiresHumanReview: false,
        sourceState: 'live',
        provenance: {
          sourceType: 'patient_record',
          sourceSystem: 'boarding_module',
          extractedBy: 'CareDroid Boarding',
          modelVersion: 'boarding-v1',
          extractedAt: nowIso(),
        },
      }),
    );
  }

  return artifacts;
}

export function mergePatientDocumentArtifacts(
  existing: PatientDocumentArtifact[] = [],
  incoming: PatientDocumentArtifact[] = [],
): PatientDocumentArtifact[] {
  const byKey = new Map<string, PatientDocumentArtifact>();
  const keyFor = (artifact: PatientDocumentArtifact) =>
    `${artifact.artifactType}:${artifact.label.toLowerCase().trim()}`;

  existing.forEach((artifact) => byKey.set(keyFor(artifact), artifact));
  incoming.forEach((artifact) => {
    const key = keyFor(artifact);
    if (!byKey.has(key)) {
      byKey.set(key, artifact);
    }
  });

  return Array.from(byKey.values()).sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

export function countPendingReviewArtifacts(artifacts: PatientDocumentArtifact[] = []): number {
  return artifacts.filter(
    (artifact) =>
      artifact.reviewStatus === 'pending_human_review' || artifact.reviewStatus === 'needs_clarification',
  ).length;
}

export function artifactsForPatientCard(artifacts: PatientDocumentArtifact[] = []): PatientDocumentArtifact[] {
  return artifacts.filter((artifact) => artifact.visibility.showOnPatientCard);
}

export function artifactsForCopilot(artifacts: PatientDocumentArtifact[] = []): PatientDocumentArtifact[] {
  return artifacts.filter((artifact) => artifact.visibility.showInCopilot);
}

export function artifactsForWhiteboard(artifacts: PatientDocumentArtifact[] = []): PatientDocumentArtifact[] {
  return artifacts.filter((artifact) => artifact.visibility.showOnWhiteboard);
}

export function artifactTypeLabel(type: PatientDocumentArtifactType): string {
  const labels: Record<PatientDocumentArtifactType, string> = {
    IDENTITY_DEMOGRAPHIC: 'Demographics',
    IDENTIFIER: 'Identifier',
    ENCOUNTER: 'Encounter',
    DOCUMENT_METADATA: 'Document',
    CHIEF_COMPLAINT: 'Chief complaint',
    VITAL_SIGN: 'Vitals',
    ALLERGY: 'Allergy',
    MEDICATION: 'Medication',
    CONDITION: 'Problem',
    PAST_HISTORY: 'Past history',
    PROCEDURE: 'Procedure',
    LAB_RESULT: 'Lab',
    IMAGING_REFERENCE: 'Imaging',
    CLINICAL_NOTE: 'Clinical note',
    ARRIVAL_CONTEXT: 'Arrival',
    EMS_HANDOFF: 'Handoff note',
    TRIAGE_NOTE: 'Triage note',
    REASSESSMENT_TRIGGER: 'Reassessment',
    DETERIORATION_SIGNAL: 'Deterioration',
    REFERRAL_STATUS: 'Referral',
    BOARDING_STATUS: 'Boarding',
    PENDING_TASK: 'Pending task',
    CARE_STAGE: 'Care stage',
    COPILOT_SUMMARY: 'Summary',
    COPILOT_TIMELINE: 'Timeline',
    COPILOT_RISK_HIGHLIGHT: 'Risk highlight',
    COPILOT_TOOL_RECOMMENDATION: 'Tool suggestion',
    COPILOT_HANDOFF_SUMMARY: 'Handoff summary',
    COPILOT_MISSING_DATA: 'Clarify',
    COPILOT_CONTRADICTION: 'Conflict',
  };
  return labels[type] || type;
}

export function reviewStatusLabel(status: ArtifactReviewStatus): string {
  if (status === 'pending_human_review') return 'pending review';
  if (status === 'needs_clarification') return 'needs clarification';
  if (status === 'accepted') return 'confirmed';
  return 'rejected';
}

export function applyArtifactReview(
  artifact: PatientDocumentArtifact,
  input: {
    reviewStatus: ArtifactReviewStatus;
    clinicalStatus?: PatientDocumentArtifact['clinicalStatus'];
    reviewer?: string;
    reviewNote?: string;
  },
): PatientDocumentArtifact {
  const clinicalStatus =
    input.clinicalStatus ||
    (input.reviewStatus === 'accepted'
      ? 'confirmed'
      : input.reviewStatus === 'rejected'
        ? 'refuted'
        : artifact.clinicalStatus);

  return {
    ...artifact,
    reviewStatus: input.reviewStatus,
    clinicalStatus,
    reviewedBy: input.reviewer,
    reviewedAt: nowIso(),
    updatedAt: nowIso(),
    value: input.reviewNote ? { ...artifact.value, reviewNote: input.reviewNote } : artifact.value,
    safety: {
      ...artifact.safety,
      requiresHumanReview: input.reviewStatus === 'pending_human_review' || input.reviewStatus === 'needs_clarification',
    },
  };
}

export function summarizeArtifactsForCopilot(artifacts: PatientDocumentArtifact[]): Record<string, unknown> {
  const cardArtifacts = artifactsForCopilot(artifacts);
  return {
    clinicalFacts: cardArtifacts
      .filter((a) =>
        ['ALLERGY', 'MEDICATION', 'CONDITION', 'LAB_RESULT', 'CHIEF_COMPLAINT', 'EMS_HANDOFF'].includes(a.artifactType),
      )
      .map((a) => ({
        type: a.artifactType,
        label: a.label,
        clinicalStatus: a.clinicalStatus,
        reviewStatus: a.reviewStatus,
        confidence: a.confidence,
        isAiDerived: a.safety.isAiDerived,
      })),
    copilotSuggestions: cardArtifacts
      .filter((a) => a.artifactType.startsWith('COPILOT_'))
      .map((a) => ({
        type: a.artifactType,
        label: a.label,
        value: a.value,
        reviewStatus: a.reviewStatus,
      })),
    pendingReviewCount: countPendingReviewArtifacts(cardArtifacts),
    governance: {
      totalArtifacts: cardArtifacts.length,
      aiDerivedCount: cardArtifacts.filter((a) => a.safety.isAiDerived).length,
      disclaimer: 'Document artifacts are auditable extracts — staff confirmation required for clinical facts.',
    },
  };
}
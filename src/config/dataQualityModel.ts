/**
 * Data quality risk model — missing demographics, duplicates, arrival reason, verification.
 * Node-safe; duplicate pairing is supplied by dataQualityDiscovery.ts for UI accuracy.
 */

export const DATA_QUALITY_RISK = Object.freeze({
  MISSING_DEMOGRAPHICS: 'missing_demographics',
  DUPLICATE_PATIENT: 'duplicate_patient',
  MISSING_ARRIVAL_REASON: 'missing_arrival_reason',
  MISSING_VERIFICATION: 'missing_verification',
});

export const DATA_QUALITY_RISK_LABELS = Object.freeze({
  missing_demographics: 'Missing demographics',
  duplicate_patient: 'Possible duplicate',
  missing_arrival_reason: 'Missing arrival reason',
  missing_verification: 'Missing verification',
});

const CLOSED_STATES = new Set(['Discharge', 'Deceased']);

const PLACEHOLDER_NAME_PAIRS = [
  ['unknown', 'patient'],
  ['temporary', 'patient'],
  ['identity', 'pending'],
];

const PLACEHOLDER_COMPLAINTS = new Set([
  'unknown identity — clinical care priority',
  'temporary registration — identity to be reconciled',
  'identity verification deferred — intake allowed',
  'unknown',
  'complaint pending',
  'reason pending',
  'tbd',
]);

const TEMP_MRN_PREFIXES = ['TEMP-', 'TEMP-UNK-', 'TEMP-ID-', 'TEMP-EMS-'];

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function isActivePatient(patient) {
  return patient && !CLOSED_STATES.has(patient.state);
}

export function isProvisionalMrn(mrn = '') {
  const normalized = String(mrn || '').toUpperCase();
  return TEMP_MRN_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function isPlaceholderPatientName(patient) {
  const first = normalize(patient?.firstName);
  const last = normalize(patient?.lastName);
  return PLACEHOLDER_NAME_PAIRS.some(([a, b]) => first === a && last === b);
}

export function getMissingDemographicFields(patient) {
  const missing = [] as any[];
  if (!patient) return missing;

  if (!String(patient.dob || '').trim()) missing.push('date of birth');
  if (!String(patient.sex || '').trim()) missing.push('sex');
  if (isPlaceholderPatientName(patient)) missing.push('legal name');
  if (isProvisionalMrn(patient.mrn)) missing.push('permanent MRN');

  const hasContact = Boolean(
    String(patient.phone || patient.mobilePhone || '').replace(/\D/g, '').length >= 7,
  );
  const hasHealthCard = Boolean(
    String(patient.healthCardNumber || patient.healthCard || patient.phn || '').trim(),
  );
  if (!hasContact && !hasHealthCard && isActivePatient(patient)) {
    missing.push('contact or health card');
  }

  return missing;
}

export function hasMissingDemographics(patient) {
  return getMissingDemographicFields(patient).length > 0;
}

export function hasMissingArrivalReason(patient) {
  const complaint = normalize(patient?.chiefComplaint || patient?.complaint);
  if (!complaint) return true;
  if (PLACEHOLDER_COMPLAINTS.has(complaint)) return true;
  if (complaint.includes('identity') && complaint.includes('pending')) return true;
  if (complaint.includes('unknown identity')) return true;
  return false;
}

export function hasMissingVerification(patient) {
  if (!patient || !isActivePatient(patient)) return false;

  const flags = (patient.flags || []).map((flag) =>
    typeof flag === 'string' ? flag : flag?.type,
  );

  if (flags.includes('IdentityPending')) return true;
  if (patient.state === 'Registration' && (isProvisionalMrn(patient.mrn) || isPlaceholderPatientName(patient))) {
    return true;
  }
  if (isProvisionalMrn(patient.mrn) && patient.state !== 'Discharge') return true;

  return false;
}

export function assessPatientDataQualityRisks(patient, { duplicatePatientIds = new Set() }: any = {}) {
  if (!patient || !isActivePatient(patient)) return [];

  const risks = [] as any[];

  const missingDemographics = getMissingDemographicFields(patient);
  if (missingDemographics.length) {
    risks.push({
      id: `${patient.id}:missing_demographics`,
      category: DATA_QUALITY_RISK.MISSING_DEMOGRAPHICS,
      label: DATA_QUALITY_RISK_LABELS.missing_demographics,
      summary: `Missing ${missingDemographics.join(', ')}.`,
      missingFields: missingDemographics,
      severity: missingDemographics.includes('legal name') ? 'warning' : 'info',
      recommendedAction: 'verify_identity',
    });
  }

  if (hasMissingArrivalReason(patient)) {
    risks.push({
      id: `${patient.id}:missing_arrival_reason`,
      category: DATA_QUALITY_RISK.MISSING_ARRIVAL_REASON,
      label: DATA_QUALITY_RISK_LABELS.missing_arrival_reason,
      summary: 'Chief complaint or arrival reason is missing or still a placeholder.',
      severity: 'warning',
      recommendedAction: 'capture_complaint',
    });
  }

  if (hasMissingVerification(patient)) {
    risks.push({
      id: `${patient.id}:missing_verification`,
      category: DATA_QUALITY_RISK.MISSING_VERIFICATION,
      label: DATA_QUALITY_RISK_LABELS.missing_verification,
      summary: 'Identity verification is incomplete or deferred.',
      severity: 'warning',
      recommendedAction: 'verify_identity',
    });
  }

  if (duplicatePatientIds.has(patient.id)) {
    risks.push({
      id: `${patient.id}:duplicate_patient`,
      category: DATA_QUALITY_RISK.DUPLICATE_PATIENT,
      label: DATA_QUALITY_RISK_LABELS.duplicate_patient,
      summary: 'May match another active patient — confirm before creating a new chart.',
      severity: 'warning',
      recommendedAction: 'review_duplicate',
    });
  }

  return risks;
}

export function summarizeDataQualityRisks(patients = [] as any[], { duplicatePatientIds = new Set() }: any = {}) {
  const activePatients = patients.filter(isActivePatient);
  const byCategory = Object.values(DATA_QUALITY_RISK).reduce((counts, category) => {
    counts[category] = 0;
    return counts;
  }, ({} as Record<string, number>));

  const byPatient: any = {};
  let totalRisks = 0;

  activePatients.forEach((patient) => {
    const risks = assessPatientDataQualityRisks(patient, { duplicatePatientIds });
    if (!risks.length) return;
    byPatient[patient.id] = risks;
    totalRisks += risks.length;
    risks.forEach((risk) => {
      byCategory[risk.category] = (byCategory[risk.category] || 0) + 1;
    });
  });

  return {
    activePatientCount: activePatients.length,
    patientsWithRisks: Object.keys(byPatient).length,
    totalRisks,
    byCategory,
    byPatient,
  };
}

export const DATA_QUALITY_SURFACE_REGISTRY = Object.freeze([
  { id: 'reception-workspace', risks: Object.values(DATA_QUALITY_RISK) },
  { id: 'reception-queues', risks: ['missing_verification', 'missing_demographics', 'missing_arrival_reason'] },
  { id: 'patient-detail', risks: Object.values(DATA_QUALITY_RISK) },
  { id: 'patient-card', risks: ['missing_verification', 'missing_arrival_reason', 'duplicate_patient'] },
  { id: 'whiteboard-strip', risks: Object.values(DATA_QUALITY_RISK) },
]);

export function auditDataQualityExposure() {
  const requiredRisks = Object.values(DATA_QUALITY_RISK);
  const covered = new Set(DATA_QUALITY_SURFACE_REGISTRY.flatMap((surface) => surface.risks));

  return {
    surfaceCount: DATA_QUALITY_SURFACE_REGISTRY.length,
    requiredRisks,
    coveredRisks: [...covered],
    passesAudit:
      DATA_QUALITY_SURFACE_REGISTRY.length >= 4 &&
      requiredRisks.every((risk) => covered.has(risk)),
  };
}

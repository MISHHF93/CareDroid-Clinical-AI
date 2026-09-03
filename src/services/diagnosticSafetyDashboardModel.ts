import { buildClinicalAcuityEntry } from '../../lib/native-ai/clinicalAcuityModel';
import { calculateAnticipatedAdmissionScore } from '../engine/anticipatedAdmissionScore';
import { latestPatientVitals } from '../utils/patientVitals';
import { PatientFlag, PatientState, Priority, type Patient } from '../types/emergency';

export type DiagnosticRiskTier = 'critical' | 'high' | 'moderate' | 'watch' | 'stable';

export type DiagnosticSafetyPatientEntry = Readonly<{
  patientId: string;
  name: string;
  mrn: string;
  chiefComplaint: string;
  state: PatientState;
  priority: Priority;
  riskTier: DiagnosticRiskTier;
  riskScore: number;
  riskDrivers: readonly string[];
  humanReviewRequired: true;
}>;

export type DiagnosticSafetyDashboardSnapshot = Readonly<{
  updatedAt: string;
  totalActive: number;
  entries: readonly DiagnosticSafetyPatientEntry[];
  tierCounts: Readonly<Record<DiagnosticRiskTier, number>>;
}>;

const ACTIVE_STATES = new Set<PatientState>([
  PatientState.Arrival,
  PatientState.Registration,
  PatientState.Triage,
  PatientState.Waiting,
  PatientState.Assessment,
  PatientState.Orders,
  PatientState.Results,
  PatientState.Disposition,
  PatientState.Admission,
]);

function patientName(patient: Patient): string {
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.mrn;
}

function latestVitals(patient: Patient) {
  return latestPatientVitals(patient);
}

function hasAbnormalVitals(patient: Patient): boolean {
  const vitals = latestVitals(patient);
  if (!vitals) return false;
  return (
    (vitals.spo2 != null && vitals.spo2 < 94) ||
    (vitals.hr != null && (vitals.hr > 120 || vitals.hr < 50)) ||
    (vitals.sbp != null && (vitals.sbp < 90 || vitals.sbp > 180)) ||
    (vitals.temp != null && (vitals.temp >= 38 || vitals.temp < 36))
  );
}

function hasFlag(patient: Patient, flag: PatientFlag): boolean {
  return (patient.flags || []).some((entry) =>
    typeof entry === 'string'
      ? entry === flag
      : (entry as unknown as { type: string })?.type === flag,
  );
}

function clinicalRuleDrivers(patient: Patient): string[] {
  const drivers: string[] = [];
  const complaint =
    `${patient.chiefComplaint || ''} ${patient.complaintCategory || ''}`.toLowerCase();

  if ((patient.age ?? 0) >= 65 && /\bchest pain\b/.test(complaint)) {
    drivers.push('Elderly patient with chest pain');
  }
  if (hasAbnormalVitals(patient)) {
    drivers.push('Abnormal vitals on latest set');
  }
  if (hasFlag(patient, PatientFlag.ReassessmentDue)) {
    drivers.push('Reassessment overdue or due');
  }
  if (hasFlag(patient, PatientFlag.DeteriorationRisk)) {
    drivers.push('Deterioration risk flagged');
  }
  if (hasFlag(patient, PatientFlag.SepsisAlert)) {
    drivers.push('Sepsis alert active');
  }
  if (patient.priority === Priority.P1 || patient.priority === Priority.P2) {
    drivers.push(`High acuity (${patient.priority})`);
  }

  return drivers;
}

function tierFromScore(score: number, drivers: string[]): DiagnosticRiskTier {
  if (score >= 85 || drivers.some((driver) => driver.includes('Sepsis'))) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 45) return 'moderate';
  if (score >= 25 || drivers.length > 0) return 'watch';
  return 'stable';
}

const TIER_SORT: Record<DiagnosticRiskTier, number> = {
  critical: 0,
  high: 1,
  moderate: 2,
  watch: 3,
  stable: 4,
};

export function buildDiagnosticSafetyDashboardSnapshot(
  patients: Patient[],
  now = new Date(),
): DiagnosticSafetyDashboardSnapshot {
  const activePatients = patients.filter((patient) => ACTIVE_STATES.has(patient.state));

  const entries = activePatients.map((patient) => {
    const adta = calculateAnticipatedAdmissionScore({ patient });
    const acuity = buildClinicalAcuityEntry(patient, { now: now.getTime() });
    const ruleDrivers = clinicalRuleDrivers(patient);
    const riskDrivers = [
      ...new Set(
        [
          ...ruleDrivers,
          ...adta.envelope.rationale.slice(0, 2),
          `Clinical acuity score ${acuity.acuityScore}`,
          acuity.orientation ? `Predicted orientation: ${acuity.orientation}` : null,
        ].filter(Boolean) as string[],
      ),
    ];
    const riskScore = Math.min(
      100,
      Math.max(
        acuity.acuityScore,
        adta.score + ruleDrivers.length * 8 + (hasAbnormalVitals(patient) ? 10 : 0),
      ),
    );

    return {
      patientId: patient.id,
      name: patientName(patient),
      mrn: patient.mrn,
      chiefComplaint: patient.chiefComplaint || patient.complaint || 'Not recorded',
      state: patient.state,
      priority: patient.priority,
      riskTier: tierFromScore(riskScore, riskDrivers),
      riskScore,
      riskDrivers,
      humanReviewRequired: true as const,
    };
  });

  entries.sort((left, right) => {
    if (TIER_SORT[left.riskTier] !== TIER_SORT[right.riskTier]) {
      return TIER_SORT[left.riskTier] - TIER_SORT[right.riskTier];
    }
    return right.riskScore - left.riskScore;
  });

  const tierCounts = entries.reduce(
    (counts, entry) => {
      counts[entry.riskTier] += 1;
      return counts;
    },
    { critical: 0, high: 0, moderate: 0, watch: 0, stable: 0 } as Record<
      DiagnosticRiskTier,
      number
    >,
  );

  return {
    updatedAt: now.toISOString(),
    totalActive: entries.length,
    entries,
    tierCounts,
  };
}

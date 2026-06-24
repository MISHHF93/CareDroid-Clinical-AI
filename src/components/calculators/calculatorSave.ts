import { dispatchAlert } from '../../engine/alertEngine';
import { hasRunScores, routeComplaint } from '../../engine/complaintRouter';
import { useEmergencyStore } from '../../store/emergencyStore';
import type { ClinicalScoreSaveInput, Patient } from '../../types/emergency';
import { PatientFlag } from '../../types/emergency';

export type CalculatorSaveInput = {
  patientId?: string;
  scoreId?: string;
  scoreName: string;
  total: number | string;
  max?: number | string;
  band: string;
  recommendation?: string;
  fields: Record<string, unknown>;
  staffId?: string;
  critical?: boolean;
};

const SCORE_NAME_TO_ID: Record<string, string> = {
  heartscore: 'heart-score',
  qsofa: 'qsofa',
  news2: 'news2',
  nihss: 'nihss',
  ciwaar: 'ciwa-ar',
  columbiassrscale: 'columbia-suicide-severity-workflow',
  pediatricdrugcalculator: 'pediatric-dose-safety-checker',
  wellspe: 'wells-pe',
  wells: 'wells-pe',
  perc: 'perc',
  gcs: 'gcs',
  phq9: 'phq9',
  shockindex: 'shock-index',
};

function patientName(patient?: Patient): string {
  return patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.mrn : 'Patient';
}

export function resolveCalculatorScoreId(scoreName: string, scoreId?: string): string {
  if (scoreId) return scoreId;
  const normalized = String(scoreName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  if (SCORE_NAME_TO_ID[normalized]) return SCORE_NAME_TO_ID[normalized];
  return normalized || 'clinical-score';
}

function maybeClearScoreReassessmentFlag(patientId: string): void {
  const store = useEmergencyStore.getState();
  const patient = store.patients.find((candidate) => candidate.id === patientId);
  if (!patient?.flags.includes(PatientFlag.ScoreReassessmentRecommended)) return;

  const complaint = patient.chiefComplaint || patient.complaint || '';
  const route = routeComplaint(complaint);
  if (!route?.scoreIds.length) return;
  if (!hasRunScores(patient, route.scoreIds)) return;

  store.removeFlag(patientId, PatientFlag.ScoreReassessmentRecommended);
}

export function saveCalculatorResult(input: CalculatorSaveInput): boolean {
  if (!input.patientId) return false;

  const store = useEmergencyStore.getState();
  const patient = store.patients.find((candidate) => candidate.id === input.patientId);
  if (!patient) return false;

  const staffId = input.staffId || patient.assignedStaffId || store.activeShift.chargeStaffId || store.staff[0]?.id || 'system';
  const scoreId = resolveCalculatorScoreId(input.scoreName, input.scoreId);

  const payload: ClinicalScoreSaveInput = {
    patientId: input.patientId,
    scoreId,
    scoreLabel: input.scoreName,
    scoreTotal: input.total,
    max: input.max,
    band: input.band,
    recommendation: input.recommendation,
    fields: input.fields,
    staffId,
    critical: input.critical,
  };

  const saved = store.saveClinicalScore(payload);
  if (!saved) return false;

  maybeClearScoreReassessmentFlag(input.patientId);

  if (input.critical) {
    dispatchAlert({
      severity: 'Warning',
      title: `${input.scoreName} — ${input.band} risk`,
      message: `${patientName(patient)} scored ${input.total}${input.max !== undefined ? `/${input.max}` : ''}`,
      patientId: input.patientId,
      source: 'clinical-calculator-hub',
      metadata: {
        calculator: input.scoreName,
        scoreId,
        total: String(input.total),
        max: input.max !== undefined ? String(input.max) : undefined,
        band: input.band,
      },
    });
  }

  return true;
}
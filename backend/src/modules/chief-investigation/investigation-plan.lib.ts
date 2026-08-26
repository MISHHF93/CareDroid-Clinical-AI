/**
 * Deterministic investigation plan logic — pure functions, no I/O, no LLM.
 *
 * Everything a clinician sees in the synthesis (findings, overall state,
 * prepared-action suggestions) is derived here from explicit step outcomes.
 * Same inputs always produce the same outputs; this module is the auditable
 * core of the slice.
 */

import type { EmergencyVitals } from '../emergency-os/emergency-os.types';
import { HUMAN_REVIEW_DISCLAIMER } from '../../../../lib/ai/safetyPolicy';
import type {
  InvestigationContext,
  InvestigationFinding,
  InvestigationFindingState,
  PreparedActionSpec,
} from './chief-investigation.types';

/** Vitals older than this are flagged STALE_DATA rather than treated as current. */
export const VITALS_STALE_THRESHOLD_MS = 60 * 60 * 1000;

export const INVESTIGATION_PLAN_VERSION = 'deterioration@1';

export interface VitalsFreshness {
  hasVitals: boolean;
  latest?: EmergencyVitals;
  ageMinutes: number | null;
  stale: boolean;
}

export function deriveVitalsFreshness(
  vitals: EmergencyVitals[] | undefined,
  now: Date = new Date(),
): VitalsFreshness {
  if (!vitals || vitals.length === 0) {
    return { hasVitals: false, ageMinutes: null, stale: true };
  }
  const latest = vitals[vitals.length - 1];
  const recordedAt = Date.parse(latest.recordedAt);
  if (!Number.isFinite(recordedAt)) {
    return { hasVitals: true, latest, ageMinutes: null, stale: true };
  }
  const ageMinutes = Math.max(0, Math.round((now.getTime() - recordedAt) / 60000));
  return { hasVitals: true, latest, ageMinutes, stale: now.getTime() - recordedAt > VITALS_STALE_THRESHOLD_MS };
}

export type News2ParameterMapping =
  | { ok: true; parameters: Record<string, unknown>; assumptions: string[] }
  | { ok: false; missing: string[] };

/**
 * Map the latest ED vitals entry onto the NEWS2 executor schema. Fields the
 * board does not capture (supplemental oxygen, ACVPU) default to the benign
 * value and are reported as explicit assumptions, never as observations.
 */
export function mapLatestVitalsToNews2Parameters(latest: EmergencyVitals): News2ParameterMapping {
  const missing: string[] = [];
  if (typeof latest.rr !== 'number') missing.push('respiratoryRate');
  if (typeof latest.spo2 !== 'number') missing.push('spo2');
  if (typeof latest.sbp !== 'number') missing.push('systolicBp');
  if (typeof latest.hr !== 'number') missing.push('pulse');
  if (typeof latest.temp !== 'number') missing.push('temperature');
  if (missing.length > 0) return { ok: false, missing };

  const assumptions: string[] = [];
  const supplementalOxygen = Boolean((latest as { supplementalOxygen?: boolean }).supplementalOxygen);
  if (!(latest as { supplementalOxygen?: boolean }).supplementalOxygen) {
    assumptions.push('supplementalOxygen assumed false (not recorded on the vitals entry)');
  }
  assumptions.push('newConfusion (ACVPU) assumed "alert" (not recorded on the vitals entry)');
  assumptions.push('SpO2 scale 1 assumed (no hypercapnic target-range flag recorded)');

  return {
    ok: true,
    assumptions,
    parameters: {
      respiratoryRate: latest.rr,
      spo2: latest.spo2,
      spo2Scale: '1',
      supplementalOxygen,
      systolicBp: latest.sbp,
      pulse: latest.hr,
      newConfusion: false,
      temperature: latest.temp,
    },
  };
}

const TREND_FIELDS: Array<{ key: keyof EmergencyVitals; label: string; unit: string; higherIsWorse: boolean }> = [
  { key: 'hr', label: 'Heart rate', unit: 'bpm', higherIsWorse: true },
  { key: 'sbp', label: 'Systolic BP', unit: 'mmHg', higherIsWorse: false },
  { key: 'spo2', label: 'SpO2', unit: '%', higherIsWorse: false },
  { key: 'rr', label: 'Respiratory rate', unit: '/min', higherIsWorse: true },
  { key: 'temp', label: 'Temperature', unit: 'C', higherIsWorse: true },
];

export function deriveTrendNotes(vitals: EmergencyVitals[]): string[] {
  if (vitals.length < 2) return [];
  const previous = vitals[vitals.length - 2];
  const latest = vitals[vitals.length - 1];
  const notes: string[] = [];
  for (const field of TREND_FIELDS) {
    const prev = previous[field.key];
    const curr = latest[field.key];
    if (typeof prev !== 'number' || typeof curr !== 'number') continue;
    const delta = Number((curr - prev).toFixed(1));
    if (delta === 0) continue;
    const direction = delta > 0 ? 'rose' : 'fell';
    const concerning = delta > 0 ? field.higherIsWorse : !field.higherIsWorse;
    notes.push(
      `${field.label} ${direction} ${Math.abs(delta)} ${field.unit} since last recording${concerning ? ' (direction of concern)' : ''}`,
    );
  }
  return notes;
}

export interface InvestigationSynthesis {
  findings: InvestigationFinding[];
  overallState: InvestigationFindingState;
  preparedActionSpecs: PreparedActionSpec[];
}

function isElevatedNews2(ctx: InvestigationContext): boolean {
  if (!ctx.news2Executed) return false;
  return ctx.news2HasRed === true || ctx.news2RiskBand === 'high' || ctx.news2RiskBand === 'medium' || ctx.news2RiskBand === 'low_medium_red';
}

/**
 * Overall state precedence (most honest first):
 * OUTSIDE_SCOPE > TOOL_FAILURE > REQUIRES_HUMAN_REVIEW > STALE_DATA /
 * INSUFFICIENT_DATA > PARTIALLY_SUPPORTED > SUPPORTED.
 */
export function deriveOverallState(findings: InvestigationFinding[]): InvestigationFindingState {
  const states = new Set(findings.map((f) => f.state));
  if (states.has('OUTSIDE_SCOPE')) return 'OUTSIDE_SCOPE';
  if (states.has('TOOL_FAILURE')) return 'TOOL_FAILURE';
  if (states.has('REQUIRES_HUMAN_REVIEW')) return 'REQUIRES_HUMAN_REVIEW';
  if (states.has('STALE_DATA')) return 'STALE_DATA';
  if (states.has('INSUFFICIENT_DATA')) return 'INSUFFICIENT_DATA';
  if (states.has('PARTIALLY_SUPPORTED')) return 'PARTIALLY_SUPPORTED';
  return 'SUPPORTED';
}

export function deriveInvestigationSynthesis(ctx: InvestigationContext): InvestigationSynthesis {
  const findings: InvestigationFinding[] = [];
  const preparedActionSpecs: PreparedActionSpec[] = [];

  if (!ctx.patientVerified) {
    findings.push({
      state: 'OUTSIDE_SCOPE',
      summary:
        'Patient could not be verified within the current organizational scope. No patient data was analyzed.',
      evidence: ['patient lookup returned no in-scope record for the requested id'],
      sources: ['emergency-os patient registry'],
    });
    return { findings, overallState: deriveOverallState(findings), preparedActionSpecs };
  }

  findings.push({
    state: 'SUPPORTED',
    summary: 'Patient identity and encounter context verified within current scope.',
    evidence: ['in-scope patient record resolved'],
    sources: ['emergency-os patient registry'],
  });

  let dataQualityState: InvestigationFindingState | null = null;
  if (!ctx.hasVitals) {
    dataQualityState = 'INSUFFICIENT_DATA';
    findings.push({
      state: 'INSUFFICIENT_DATA',
      summary: 'No recorded vital signs available; physiological assessment cannot proceed.',
      evidence: ['patient has zero recorded vitals entries'],
      sources: ['emergency-os vitals'],
    });
    preparedActionSpecs.push({
      actionType: 'create_repeat_vitals_task',
      description: 'Record a fresh set of vital signs for this patient.',
      rationale: 'No vital signs are on record, so no early-warning calculation was possible.',
      expectedEffect: 'Creates a vitals task assignment for clinical staff to action.',
    });
  } else if (ctx.vitalsAgeMinutes === null || (ctx.vitalsAgeMinutes ?? 0) * 60000 > VITALS_STALE_THRESHOLD_MS) {
    dataQualityState = 'STALE_DATA';
    findings.push({
      state: 'STALE_DATA',
      summary: `Latest vital signs are stale (${ctx.vitalsAgeMinutes === null ? 'unparseable timestamp' : `${ctx.vitalsAgeMinutes} minutes old`}); findings may not reflect the patient's current condition.`,
      evidence: [`latest vitals recorded ${ctx.vitalsAgeMinutes === null ? 'at an unknown time' : `${ctx.vitalsAgeMinutes} minutes ago`}`],
      sources: ['emergency-os vitals'],
    });
    preparedActionSpecs.push({
      actionType: 'create_repeat_vitals_task',
      description: 'Record a fresh set of vital signs for this patient.',
      rationale: `Latest vitals exceed the ${VITALS_STALE_THRESHOLD_MS / 60000}-minute freshness threshold used by this investigation.`,
      expectedEffect: 'Creates a vitals task assignment for clinical staff to action.',
    });
  }

  if (!ctx.news2Executed && ctx.news2FailedReason) {
    findings.push({
      state: 'TOOL_FAILURE',
      summary: 'NEWS2 calculator failed to execute; no early-warning score is available.',
      evidence: [ctx.news2FailedReason],
      sources: ['tool-orchestrator: news2'],
    });
  }

  if (isElevatedNews2(ctx)) {
    findings.push({
      state: 'REQUIRES_HUMAN_REVIEW',
      summary: `Elevated NEWS2 result (${ctx.news2Total ?? 'n/a'}, band: ${ctx.news2RiskBand}${ctx.news2HasRed ? ', red score present' : ''}). Urgent clinical review recommended per NEWS2 escalation guidance.`,
      evidence: [
        `NEWS2 aggregate: ${ctx.news2Total}`,
        `risk band: ${ctx.news2RiskBand}`,
        ...(ctx.trendNotes.length > 0 ? ctx.trendNotes : []),
      ],
      sources: ['tool-orchestrator: news2 (RCP NEWS2 thresholds)', 'emergency-os vitals'],
    });
    preparedActionSpecs.push({
      actionType: 'request_urgent_reassessment',
      description: 'Request an urgent reassessment of this patient by a clinician.',
      rationale:
        'The deterministic NEWS2 result falls in an escalation band under RCP guidance; escalation remains a clinical decision requiring human approval.',
      expectedEffect: 'Creates a reassessment request pending clinician approval.',
    });
  } else if (ctx.news2Executed) {
    findings.push({
      state: 'SUPPORTED',
      summary: `NEWS2 calculated successfully (${ctx.news2Total}, band: ${ctx.news2RiskBand}); below escalation thresholds.`,
      evidence: [`NEWS2 aggregate: ${ctx.news2Total}`, `risk band: ${ctx.news2RiskBand}`],
      sources: ['tool-orchestrator: news2 (RCP NEWS2 thresholds)'],
    });
  }

  for (const note of ctx.trendNotes) {
    findings.push({
      state: 'PARTIALLY_SUPPORTED',
      summary: `Trend observation: ${note}.`,
      evidence: [note],
      sources: ['emergency-os vitals (last two recordings)'],
    });
  }

  if (ctx.assumptions.length > 0) {
    findings.push({
      state: 'PARTIALLY_SUPPORTED',
      summary: 'Some inputs were assumed rather than observed; see evidence for the exact assumptions.',
      evidence: [...ctx.assumptions],
      sources: ['input mapping'],
    });
  }

  return { findings, overallState: deriveOverallState(findings), preparedActionSpecs };
}

export const INVESTIGATION_DISCLAIMER = HUMAN_REVIEW_DISCLAIMER;

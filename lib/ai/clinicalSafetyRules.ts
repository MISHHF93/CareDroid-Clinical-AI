import { readAIPlatformConfig } from './config';
import {
  DISALLOWED_AUTONOMOUS_AI_ACTIONS,
  EXTERNAL_DATA_REVIEW_DISCLAIMER,
  HUMAN_REVIEW_DISCLAIMER,
} from './safetyPolicy';

export interface PatientVitalsSnapshot {
  hr?: number | null;
  bp?: string | null;
  rr?: number | null;
  o2?: number | null;
  spO2?: number | null;
}

export interface PatientSafetyContext {
  dpsScore?: number;
  chiefComplaint?: string;
  alerts?: string[];
  vitals?: PatientVitalsSnapshot;
}

export interface PriorityChangeEvaluation {
  allowed: boolean;
  requiresHumanReview: boolean;
  blockReasons: string[];
  floorReasons: string[];
  message: string;
}

export interface SuggestedActionSafetyInput {
  action?: string;
  patientDps?: number;
  requestedDps?: number;
  clinical?: boolean;
  disclaimer?: string;
  patient?: PatientSafetyContext;
}

export interface SuggestedActionSafetyResult {
  safe: boolean;
  violation?: string;
  floorReasons?: string[];
}

export function getClinicalSafetyRules() {
  return readAIPlatformConfig().governance;
}

export function detectAbnormalVitals(vitals?: PatientVitalsSnapshot): string[] {
  if (!vitals) return [];

  const hits: string[] = [];
  if (vitals.hr != null && vitals.hr > 120) hits.push('hr > 120');
  if (vitals.rr != null && vitals.rr > 24) hits.push('rr > 24');

  const oxygen = vitals.spO2 ?? vitals.o2;
  if (oxygen != null && oxygen < 92) hits.push('o2 < 92');

  if (vitals.bp) {
    const [systolic] = vitals.bp.split('/').map(Number);
    if (Number.isFinite(systolic) && systolic < 90) hits.push('bp < 90/60');
  }

  return hits;
}

export function detectProtectedConditions(text: string, conditions: string[]): string[] {
  const normalizedText = text.toLowerCase();
  return conditions.filter((condition) => {
    const spaced = condition.replace(/_/g, ' ');
    return normalizedText.includes(spaced) || normalizedText.includes(condition);
  });
}

export function collectPriorityFloorReasons(patient: PatientSafetyContext): string[] {
  const rules = getClinicalSafetyRules().cannotLowerPriorityFor;
  const reasons: string[] = [];

  if (patient.dpsScore != null && rules.dpsScores.includes(patient.dpsScore)) {
    reasons.push(`DPS${patient.dpsScore}`);
  }

  const clinicalText = [patient.chiefComplaint || '', ...(patient.alerts || [])].join(' ');
  for (const condition of detectProtectedConditions(clinicalText, rules.conditions)) {
    reasons.push(`${condition}_protocol`);
  }

  if (detectAbnormalVitals(patient.vitals).length > 0) {
    reasons.push('abnormal_vitals');
  }

  return reasons;
}

export function evaluatePriorityChange(
  patient: PatientSafetyContext,
  requestedDps: number,
): PriorityChangeEvaluation {
  const currentDps = patient.dpsScore ?? 5;
  const floorReasons = collectPriorityFloorReasons(patient);

  if (requestedDps <= currentDps) {
    return {
      allowed: true,
      requiresHumanReview: true,
      blockReasons: [],
      floorReasons,
      message: 'Priority escalation or equivalent priority is allowed for human review.',
    };
  }

  if (floorReasons.length > 0) {
    return {
      allowed: false,
      requiresHumanReview: true,
      blockReasons: floorReasons.map((reason) => `cannot_lower_priority:${reason}`),
      floorReasons,
      message: `Cannot lower priority: ${floorReasons.join(', ')}.`,
    };
  }

  return {
    allowed: true,
    requiresHumanReview: true,
    blockReasons: [],
    floorReasons,
    message: 'No safety-floor blocker detected.',
  };
}

export function checkSuggestedActionSafety(
  suggestedAction: SuggestedActionSafetyInput,
): SuggestedActionSafetyResult {
  if (suggestedAction.clinical && !suggestedAction.disclaimer) {
    return {
      safe: false,
      violation: 'Clinical recommendations require disclaimer',
    };
  }

  if (suggestedAction.action !== 'lower_priority') {
    return { safe: true };
  }

  const patient: PatientSafetyContext = suggestedAction.patient || {
    dpsScore: suggestedAction.patientDps,
  };
  const requestedDps = suggestedAction.requestedDps;
  const currentDps = patient.dpsScore;

  if (requestedDps != null && currentDps != null) {
    const evaluation = evaluatePriorityChange(patient, requestedDps);
    if (!evaluation.allowed) {
      return {
        safe: false,
        violation: evaluation.message,
        floorReasons: evaluation.floorReasons,
      };
    }
    return { safe: true, floorReasons: evaluation.floorReasons };
  }

  if (currentDps != null && getClinicalSafetyRules().cannotLowerPriorityFor.dpsScores.includes(currentDps)) {
    const floorReasons = [`DPS${currentDps}`];
    return {
      safe: false,
      violation: `Cannot lower priority: ${floorReasons.join(', ')}.`,
      floorReasons,
    };
  }

  const floorReasons = collectPriorityFloorReasons(patient);
  if (floorReasons.length > 0) {
    return {
      safe: false,
      violation: `Cannot lower priority: ${floorReasons.join(', ')}.`,
      floorReasons,
    };
  }

  return { safe: true };
}

export function patientSafetyContextFromRecord(patient: Record<string, unknown>): PatientSafetyContext {
  const vitals = (patient.vitals || patient.currentVitals || patient.current_vitals) as
    | Record<string, unknown>
    | undefined;

  return {
    dpsScore: (patient.dps_score ?? patient.dpsScore) as number | undefined,
    chiefComplaint: String(patient.chief_complaint ?? patient.chiefComplaint ?? ''),
    alerts: Array.isArray(patient.alerts) ? (patient.alerts as string[]) : [],
    vitals: vitals
      ? {
          hr: vitals.hr as number | null | undefined,
          bp: vitals.bp as string | null | undefined,
          rr: vitals.rr as number | null | undefined,
          o2: (vitals.o2 ?? vitals.spo2) as number | null | undefined,
          spO2: (vitals.spO2 ?? vitals.spo2 ?? vitals.o2) as number | null | undefined,
        }
      : undefined,
  };
}

export function buildSafetyRulesSnapshot() {
  const governance = getClinicalSafetyRules();
  const platformConfig = readAIPlatformConfig();

  return Object.freeze({
    cannotLowerPriorityFor: governance.cannotLowerPriorityFor,
    requiredDisclaimers: governance.requiredDisclaimers,
    disallowedAutonomousActions: DISALLOWED_AUTONOMOUS_AI_ACTIONS,
    auditRequirements: {
      logAllInteractions: true,
      redactRawPrompts: true,
      retentionDays: platformConfig.governance.auditRetentionDays,
      requireUserConsent: true,
    },
    rateLimits: {
      physician: { requestsPerMinute: 60 },
      nurse: { requestsPerMinute: 30 },
      charge_nurse: { requestsPerMinute: 45 },
      clerk: { requestsPerMinute: 10 },
      ems: { requestsPerMinute: 20 },
    },
    disclaimers: {
      humanReview: HUMAN_REVIEW_DISCLAIMER,
      externalDataReview: EXTERNAL_DATA_REVIEW_DISCLAIMER,
    },
  });
}
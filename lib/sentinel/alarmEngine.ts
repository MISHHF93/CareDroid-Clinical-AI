/**
 * Deterministic alarm fingerprinting, dedupe, suppression, and escalation policy.
 * Clinical rules live here; AI must not auto-ack or auto-activate pathways.
 */

import type {
  SentinelAlarmSeverity,
  SentinelAlarmStatus,
  SentinelAlarmUrgency,
} from './types';

export const DEFAULT_ESCALATION_ACK_DEADLINE_MS = 3 * 60 * 1000;
export const DEFAULT_SUPPRESS_COOLDOWN_MS = 10 * 60 * 1000;
export const DEFAULT_DEDUPE_BUCKET_MS = 5 * 60 * 1000;

export type AlarmFingerprintInput = Readonly<{
  source: string;
  category: string;
  subjectId: string;
  ruleId: string;
  /** Optional time bucket start ISO or epoch ms for temporal dedupe. */
  bucketStartMs?: number;
  bucketMs?: number;
}>;

/** FNV-1a style fingerprint for stable dedupe keys. */
export function buildAlarmFingerprint(input: AlarmFingerprintInput): string {
  const bucketMs = input.bucketMs ?? DEFAULT_DEDUPE_BUCKET_MS;
  const bucket =
    input.bucketStartMs != null
      ? Math.floor(input.bucketStartMs / bucketMs)
      : Math.floor(Date.now() / bucketMs);
  const raw = [
    input.source,
    input.category,
    input.subjectId,
    input.ruleId,
    String(bucket),
  ].join('::');
  let h = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `afp-${(h >>> 0).toString(16)}`;
}

export type SuppressionDecision = Readonly<{
  suppress: boolean;
  reason: string | null;
  suppressUntil: string | null;
}>;

export type SuppressionContext = Readonly<{
  nowMs?: number;
  existingOpenFingerprint: boolean;
  suppressUntilIso?: string | null;
  quietHours?: Readonly<{ startHour: number; endHour: number }> | null;
  rateLimitExceeded?: boolean;
  severity: SentinelAlarmSeverity;
}>;

/**
 * Alarm-fatigue mitigation: suppress duplicates, respect quiet hours for non-critical,
 * honor explicit suppressUntil, and rate limits.
 */
export function evaluateSuppression(ctx: SuppressionContext): SuppressionDecision {
  const nowMs = ctx.nowMs ?? Date.now();

  if (ctx.existingOpenFingerprint) {
    return Object.freeze({
      suppress: true,
      reason: 'duplicate_open_fingerprint',
      suppressUntil: null,
    });
  }

  if (ctx.suppressUntilIso) {
    const until = Date.parse(ctx.suppressUntilIso);
    if (Number.isFinite(until) && until > nowMs) {
      return Object.freeze({
        suppress: true,
        reason: 'explicit_suppress_window',
        suppressUntil: ctx.suppressUntilIso,
      });
    }
  }

  if (ctx.rateLimitExceeded && ctx.severity !== 'critical') {
    const suppressUntil = new Date(nowMs + DEFAULT_SUPPRESS_COOLDOWN_MS).toISOString();
    return Object.freeze({
      suppress: true,
      reason: 'rate_limit',
      suppressUntil,
    });
  }

  if (ctx.quietHours && ctx.severity === 'info') {
    const hour = new Date(nowMs).getUTCHours();
    const { startHour, endHour } = ctx.quietHours;
    const inQuiet =
      startHour <= endHour
        ? hour >= startHour && hour < endHour
        : hour >= startHour || hour < endHour;
    if (inQuiet) {
      return Object.freeze({
        suppress: true,
        reason: 'quiet_hours_info',
        suppressUntil: null,
      });
    }
  }

  return Object.freeze({ suppress: false, reason: null, suppressUntil: null });
}

export type EscalationInput = Readonly<{
  status: SentinelAlarmStatus;
  severity: SentinelAlarmSeverity;
  urgency: SentinelAlarmUrgency;
  createdAtIso: string;
  acknowledgedAtIso?: string | null;
  escalatedAtIso?: string | null;
  nowMs?: number;
  deadlineMs?: number;
}>;

export type EscalationDecision = Readonly<{
  shouldEscalate: boolean;
  reason: string | null;
}>;

export function evaluateEscalation(input: EscalationInput): EscalationDecision {
  if (input.status === 'acknowledged' || input.status === 'resolved' || input.status === 'dismissed' || input.status === 'expired' || input.status === 'suppressed') {
    return Object.freeze({ shouldEscalate: false, reason: null });
  }
  if (input.escalatedAtIso) {
    return Object.freeze({ shouldEscalate: false, reason: null });
  }
  if (input.severity !== 'critical' && input.urgency !== 'immediate') {
    return Object.freeze({ shouldEscalate: false, reason: null });
  }
  if (input.acknowledgedAtIso) {
    return Object.freeze({ shouldEscalate: false, reason: null });
  }

  const nowMs = input.nowMs ?? Date.now();
  const created = Date.parse(input.createdAtIso);
  if (!Number.isFinite(created)) {
    return Object.freeze({ shouldEscalate: false, reason: null });
  }
  const deadline = input.deadlineMs ?? DEFAULT_ESCALATION_ACK_DEADLINE_MS;
  if (nowMs - created >= deadline) {
    return Object.freeze({ shouldEscalate: true, reason: 'ack_deadline_exceeded' });
  }
  return Object.freeze({ shouldEscalate: false, reason: null });
}

export type AllowedAlarmTransition = Readonly<{
  from: SentinelAlarmStatus;
  to: SentinelAlarmStatus;
  allowed: boolean;
}>;

const ALLOWED: ReadonlyArray<readonly [SentinelAlarmStatus, SentinelAlarmStatus]> = [
  ['open', 'acknowledged'],
  ['open', 'escalated'],
  ['open', 'suppressed'],
  ['open', 'resolved'],
  ['open', 'dismissed'],
  ['open', 'expired'],
  ['escalated', 'acknowledged'],
  ['escalated', 'resolved'],
  ['escalated', 'dismissed'],
  ['escalated', 'expired'],
  ['acknowledged', 'resolved'],
  ['acknowledged', 'dismissed'],
  ['acknowledged', 'escalated'],
  ['suppressed', 'open'],
  ['suppressed', 'expired'],
  ['suppressed', 'dismissed'],
];

export function isAlarmTransitionAllowed(
  from: SentinelAlarmStatus,
  to: SentinelAlarmStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED.some(([a, b]) => a === from && b === to);
}

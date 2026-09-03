/**
 * Display PHI redaction — shared guards for public waiting displays,
 * read-only whiteboards, and hallway monitors.
 */
import type { EmergencyDisplayPrivacyPolicy } from './emergencyDisplayPrivacyPolicy';
import type { Patient, Staff } from '../types/emergency';

/** Structural PHI field names that must never appear in public display payloads. */
export const DISPLAY_PHI_FIELD_KEYS = Object.freeze([
  'firstName',
  'lastName',
  'name',
  'mrn',
  'healthCard',
  'healthCardNumber',
  'phn',
  'chiefComplaint',
  'complaintCategory',
  'notes',
  'timeline',
  'staffDetail',
  'actorName',
  'body',
  'text',
] as const);

/** Token patterns commonly associated with identifiers in free text. */
export const DISPLAY_PHI_TEXT_PATTERN = Object.freeze(
  /\b(mrn|dob|ssn|health\s*card|phn|hin)\b|(?:\bMRN[-\s]?\w+\b)|(?:\bHC[-\s]?\d+\b)|(?:\b\d{3}-\d{2}-\d{4}\b)|(?:\b\d{2}\/\d{2}\/\d{4}\b)|(?:\b[A-Z]{2,}-\d{3,}\b)/i,
);

const STRUCTURAL_PHI_PATTERN = new RegExp(`"(${DISPLAY_PHI_FIELD_KEYS.join('|')})"\\s*:`, 'i');

const MIN_TOKEN_LENGTH = 3;

export function collectDisplayPhiTokens(patients: Patient[] = [], staff: Staff[] = []): string[] {
  const tokens = new Set<string>();

  for (const patient of patients) {
    for (const value of [
      patient.firstName,
      patient.lastName,
      patient.name,
      patient.mrn,
      patient.healthCard,
      patient.healthCardNumber,
      patient.phn,
      patient.chiefComplaint,
      patient.complaintCategory,
    ]) {
      const normalized = String(value || '').trim();
      if (normalized.length >= MIN_TOKEN_LENGTH) tokens.add(normalized);
    }

    for (const note of patient.notes || []) {
      const noteText = String(note.text || note.body || '').trim();
      if (noteText.length >= MIN_TOKEN_LENGTH) tokens.add(noteText);
      const author = String(
        (note as unknown as Record<string, unknown>)['authorName'] || note.authorId || '',
      ).trim();
      if (author.length >= MIN_TOKEN_LENGTH) tokens.add(author);
    }

    for (const event of patient.timeline || []) {
      const summary = String(event.summary || event.note || '').trim();
      if (summary.length >= MIN_TOKEN_LENGTH) tokens.add(summary);
      const actor = String(
        (event as unknown as Record<string, unknown>)['actorName'] || event.staffId || '',
      ).trim();
      if (actor.length >= MIN_TOKEN_LENGTH) tokens.add(actor);
    }
  }

  for (const member of staff) {
    const name = String(member.displayName || member.name || '').trim();
    if (name.length >= MIN_TOKEN_LENGTH) tokens.add(name);
  }

  return [...tokens];
}

export function assertNoPhiTokensInSerializedDisplay(
  serialized: string,
  tokens: string[] = [],
): boolean {
  if (STRUCTURAL_PHI_PATTERN.test(serialized)) return false;
  if (DISPLAY_PHI_TEXT_PATTERN.test(serialized)) return false;

  for (const token of tokens) {
    if (token.length >= MIN_TOKEN_LENGTH && serialized.includes(token)) {
      return false;
    }
  }

  return true;
}

export function assertDisplayPayloadIsPhiSafe(value: unknown, tokens: string[] = []): boolean {
  return assertNoPhiTokensInSerializedDisplay(JSON.stringify(value), tokens);
}

export function formatPrivacySafeHealthCard(
  patient: Pick<Patient, 'healthCard' | 'healthCardNumber' | 'phn' | 'mrn'>,
  policy: EmergencyDisplayPrivacyPolicy,
): string {
  if (!policy.showHealthCard) return 'Health card hidden for display privacy';
  const card = patient.healthCardNumber || patient.healthCard || patient.phn || patient.mrn;
  return card ? String(card) : '—';
}

export function formatPrivacySafeNoteText(
  text: string | null | undefined,
  policy: EmergencyDisplayPrivacyPolicy,
): string {
  if (!policy.showNotes) return 'Notes hidden for display privacy';
  return String(text || '').trim() || '—';
}

export function formatPrivacySafeStaffComment(
  text: string | null | undefined,
  policy: EmergencyDisplayPrivacyPolicy,
): string {
  if (!policy.showStaffComments) return 'Staff comment hidden for display privacy';
  return String(text || '').trim() || '—';
}

export function redactDisplayText(
  text: string | null | undefined,
  policy: EmergencyDisplayPrivacyPolicy,
): string {
  const value = String(text || '').trim();
  if (!value) return '—';
  if (policy.aggregateMetricsOnly && DISPLAY_PHI_TEXT_PATTERN.test(value)) {
    return 'Redacted for display privacy';
  }
  return value;
}

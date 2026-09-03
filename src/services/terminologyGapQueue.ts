/**
 * Terminology gap queue — captures complaint text that recognizeComplaint()
 * could not confidently resolve, so it stays visible and reviewable instead of
 * silently disappearing or being forced into the nearest concept.
 *
 * This is a frontend-local, non-PHI queue (chief-complaint text + counts/timestamps
 * only — no patient name, DOB, MRN, or other identifiers). A durable backend table
 * (terminology_gap_events) is a real follow-up, not built in this round: it needs an
 * explicit schema/ownership decision (which ORM/entity module owns it, tenant
 * scoping, retention policy) the way this codebase's other cross-cutting schema
 * decisions have been deliberately deferred rather than guessed (see
 * project-scorecard-campaign memory's "score ceiling reality check" precedent).
 * This module's shape already matches the requested terminology_gap_events fields
 * so a future backend sync can map 1:1 onto it.
 */

import type {
  ComplaintCandidate,
  ComplaintRecognitionResult,
  ConfidenceTier,
} from '../data/clinicalTerminology/clinicalConceptTypes';

export type TerminologyGapReviewStatus = 'open' | 'reviewed' | 'mapped' | 'dismissed';

export interface TerminologyGapEvent {
  id: string;
  rawText: string;
  normalizedText: string;
  frequency: number;
  firstSeenAt: string;
  lastSeenAt: string;
  candidateMatches: ComplaintCandidate[];
  reviewStatus: TerminologyGapReviewStatus;
  reviewedBy: string | null;
  resolvedConceptId: string | null;
}

const STORAGE_KEY = 'caredroid.terminologyGapQueue.v1';
const MAX_ENTRIES = 500;

function canUseStorage(): boolean {
  return typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined';
}

function readQueue(): TerminologyGapEvent[] {
  if (!canUseStorage()) return [];
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(entries: TerminologyGapEvent[]): void {
  if (!canUseStorage()) return;
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Storage quota or privacy mode — degrade gracefully, the queue just stays in-memory for this session.
  }
}

function createGapId(now: string): string {
  return `gap-${Date.parse(now) || Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Records (or bumps the frequency of) a terminology gap. Call this whenever
 * recognizeComplaint() returns NO_MATCH or LOW_CONFIDENCE for staff-reviewed text.
 * Matches on normalizedText so "SOB variant" typos don't fragment into many rows.
 */
export function recordTerminologyGap(
  result: Pick<
    ComplaintRecognitionResult,
    'rawText' | 'normalizedText' | 'alternativeCandidates' | 'confidenceTier'
  >,
  now: string = new Date().toISOString(),
): TerminologyGapEvent | null {
  const gapTiers: ConfidenceTier[] = ['NO_MATCH', 'LOW_CONFIDENCE'];
  if (!gapTiers.includes(result.confidenceTier) || !result.normalizedText) return null;

  const queue = readQueue();
  const existing = queue.find((entry) => entry.normalizedText === result.normalizedText);

  if (existing) {
    existing.frequency += 1;
    existing.lastSeenAt = now;
    existing.candidateMatches = result.alternativeCandidates;
    writeQueue(queue);
    return existing;
  }

  const entry: TerminologyGapEvent = {
    id: createGapId(now),
    rawText: result.rawText,
    normalizedText: result.normalizedText,
    frequency: 1,
    firstSeenAt: now,
    lastSeenAt: now,
    candidateMatches: result.alternativeCandidates,
    reviewStatus: 'open',
    reviewedBy: null,
    resolvedConceptId: null,
  };
  queue.unshift(entry);
  writeQueue(queue);
  return entry;
}

export function listTerminologyGaps(
  options: { reviewStatus?: TerminologyGapReviewStatus } = {},
): TerminologyGapEvent[] {
  const queue = readQueue();
  if (!options.reviewStatus) return queue;
  return queue.filter((entry) => entry.reviewStatus === options.reviewStatus);
}

export function resolveTerminologyGap(
  gapId: string,
  resolution: {
    resolvedConceptId: string | null;
    reviewedBy: string;
    reviewStatus?: TerminologyGapReviewStatus;
  },
): TerminologyGapEvent | null {
  const queue = readQueue();
  const entry = queue.find((candidate) => candidate.id === gapId);
  if (!entry) return null;
  entry.resolvedConceptId = resolution.resolvedConceptId;
  entry.reviewedBy = resolution.reviewedBy;
  entry.reviewStatus =
    resolution.reviewStatus || (resolution.resolvedConceptId ? 'mapped' : 'reviewed');
  writeQueue(queue);
  return entry;
}

/** Test-only reset so specs don't leak state across files sharing the localStorage mock. */
export function __resetTerminologyGapQueueForTests(): void {
  writeQueue([]);
}

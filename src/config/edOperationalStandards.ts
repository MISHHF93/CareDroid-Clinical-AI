/**
 * ED operational standards — icon vocabulary, streaming lanes, automated events, governance envelope.
 * Aligns whiteboard and command surfaces with industry command-and-control conventions.
 */

import type { EnhancementMaturity } from './edPlatformEnhancementRegistry';

export type CareStreamingLane = 'resus' | 'majors' | 'minors' | 'utc' | 'fast-track' | 'observation';

export const CARE_STREAMING_LANES: ReadonlyArray<{
  id: CareStreamingLane;
  label: string;
  description: string;
}> = [
  { id: 'resus', label: 'Resus', description: 'Resuscitation / critical care bay' },
  { id: 'majors', label: 'Majors', description: 'Higher-acuity treatment area' },
  { id: 'minors', label: 'Minors', description: 'Lower-acuity ambulatory area' },
  { id: 'utc', label: 'UTC', description: 'Urgent treatment centre stream' },
  { id: 'fast-track', label: 'Fast track', description: 'Rapid assessment stream' },
  { id: 'observation', label: 'Observation', description: 'Extended assessment / short stay' },
];

export type WhiteboardOperationalEventId =
  | 'pre-arrival'
  | 'mse-due'
  | 'nurse-review-required'
  | 'boarding'
  | 'results-pending'
  | 'awaiting-consult'
  | 'awaiting-bed'
  | 'bed-clean'
  | 'bed-dirty'
  | 'bed-occupied'
  | 'isolation'
  | 'critical-labs'
  | 'sepsis-alert'
  | 'fall-risk'
  | 'adta-elevated';

export interface WhiteboardOperationalIcon {
  id: WhiteboardOperationalEventId;
  glyph: string;
  label: string;
  tone: 'critical' | 'warning' | 'info' | 'neutral' | 'flow';
  title: string;
}

export const WHITEBOARD_OPERATIONAL_ICONS: Record<
  WhiteboardOperationalEventId,
  WhiteboardOperationalIcon
> = {
  'pre-arrival': { id: 'pre-arrival', glyph: '🚑', label: 'Pre-arrival', tone: 'info', title: 'Inbound EMS or call-in with ETA' },
  'mse-due': { id: 'mse-due', glyph: '🧠', label: 'MSE due', tone: 'warning', title: 'Mental status exam review due' },
  'nurse-review-required': { id: 'nurse-review-required', glyph: '👩‍⚕️', label: 'Nurse review', tone: 'warning', title: 'Nurse assessment or triage review required' },
  boarding: { id: 'boarding', glyph: '🛏️', label: 'Boarding', tone: 'flow', title: 'Admitted — awaiting inpatient bed' },
  'results-pending': { id: 'results-pending', glyph: '🧪', label: 'Results pending', tone: 'warning', title: 'Awaiting critical or pending results' },
  'awaiting-consult': { id: 'awaiting-consult', glyph: '📞', label: 'Awaiting consult', tone: 'info', title: 'Specialist consult pending' },
  'awaiting-bed': { id: 'awaiting-bed', glyph: '⏳', label: 'Awaiting bed', tone: 'warning', title: 'Bed assignment or cleaning in progress' },
  'bed-clean': { id: 'bed-clean', glyph: '✨', label: 'Bed clean', tone: 'neutral', title: 'Treatment space ready' },
  'bed-dirty': { id: 'bed-dirty', glyph: '🧹', label: 'Bed dirty', tone: 'warning', title: 'Space needs cleaning' },
  'bed-occupied': { id: 'bed-occupied', glyph: '🔴', label: 'Occupied', tone: 'flow', title: 'Bed occupied' },
  isolation: { id: 'isolation', glyph: '☣️', label: 'Isolation', tone: 'critical', title: 'Isolation precautions active' },
  'critical-labs': { id: 'critical-labs', glyph: '⚗️', label: 'Critical labs', tone: 'critical', title: 'Critical laboratory values flagged' },
  'sepsis-alert': { id: 'sepsis-alert', glyph: '🦠', label: 'Sepsis', tone: 'critical', title: 'Sepsis alert active' },
  'fall-risk': { id: 'fall-risk', glyph: '⚠️', label: 'Fall risk', tone: 'warning', title: 'Fall risk precautions' },
  'adta-elevated': { id: 'adta-elevated', glyph: '📈', label: 'ADTA elevated', tone: 'warning', title: 'Anticipated admission score elevated — staff review' },
};

export interface OperationalScoreEnvelope<T> {
  value: T;
  maturity: EnhancementMaturity;
  humanReviewRequired: true;
  rationale: string[];
  sourceFields: string[];
  disclaimer: string;
}

export const OPERATIONAL_SCORE_DISCLAIMER =
  'Support signal only — requires clinician or charge review before operational or disposition action.';

export function buildOperationalScoreEnvelope<T>(input: {
  value: T;
  maturity?: EnhancementMaturity;
  rationale: string[];
  sourceFields: string[];
}): OperationalScoreEnvelope<T> {
  return {
    value: input.value,
    maturity: input.maturity || 'demo',
    humanReviewRequired: true,
    rationale: input.rationale,
    sourceFields: input.sourceFields,
    disclaimer: OPERATIONAL_SCORE_DISCLAIMER,
  };
}

export function priorityToEsiLabel(priority: string): string {
  const map: Record<string, string> = {
    P1: 'ESI 1 (immediate)',
    P2: 'ESI 2 (emergent)',
    P3: 'ESI 3 (urgent)',
    P4: 'ESI 4 (less urgent)',
    P5: 'ESI 5 (non-urgent)',
  };
  return map[priority] || 'Acuity pending nurse review';
}
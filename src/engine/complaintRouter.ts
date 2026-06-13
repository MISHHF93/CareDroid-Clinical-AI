import { ClinicalIntentRouter } from '../data/clinicalIntentRouter';
import type { Note, Patient } from '../types/emergency';

type ClinicalIntentCalculator = {
  id: string;
  label?: string;
};

type ClinicalIntentRoute = {
  routeId: string;
  complaint: string;
  calculators?: ClinicalIntentCalculator[];
  protocols?: string[];
  workflows?: string[];
  referrals?: string[];
  guidance?: string;
  safetyStatement?: string;
};

export type ComplaintRoute = ClinicalIntentRoute & {
  scoreIds: string[];
};

const SCORE_ALIASES: Record<string, string[]> = {
  'heart-score': ['heart', 'heart-score'],
  qsofa: ['qsofa', 'q-sofa'],
  news2: ['news2', 'news 2'],
  nihss: ['nihss'],
  'wells-pe': ['wells', 'wells-pe', 'wells pe'],
};

function normalize(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function noteMatchesScore(note: Note, scoreId: string): boolean {
  const metadata = note.metadata || {};
  const aliases = [scoreId, ...(SCORE_ALIASES[scoreId] || [])].map(normalize);
  const searchable = normalize(
    [
      note.text,
      note.body,
      metadata.scoreId,
      metadata.scoreLabel,
      metadata.scoreName,
      metadata.calculatorId,
    ].filter(Boolean).join(' '),
  );

  return aliases.some((alias) => alias && searchable.includes(alias));
}

export function routeComplaint(value: string): ComplaintRoute | null {
  const route = ClinicalIntentRouter.routeComplaint(value) as ClinicalIntentRoute | null;
  if (!route) return null;

  return {
    ...route,
    scoreIds: (route.calculators || []).map((calculator) => calculator.id),
  };
}

export function hasRunScores(patient: Patient, scoreIds: string[]): boolean {
  if (!scoreIds.length) return true;
  return scoreIds.every((scoreId) => patient.notes.some((note) => noteMatchesScore(note, scoreId)));
}

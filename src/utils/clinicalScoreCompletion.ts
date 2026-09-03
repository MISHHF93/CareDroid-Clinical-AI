import type { JourneyEvent, Note, Patient } from '../types/emergency';

const SCORE_EVENT_TYPES = new Set(['SCORE', 'ClinicalScoreSaved']);

export const SCORE_ALIASES: Record<string, string[]> = {
  'heart-score': ['heart', 'heart-score', 'heartscore'],
  qsofa: ['qsofa', 'q-sofa'],
  news2: ['news2', 'news 2'],
  nihss: ['nihss'],
  'wells-pe': ['wells', 'wells-pe', 'wells pe', 'wellspe'],
  'shock-index': ['shock', 'shock-index', 'shockindex'],
  phq9: ['phq9', 'phq-9'],
  'ciwa-ar': ['ciwa', 'ciwa-ar', 'ciwaar'],
  'columbia-suicide-severity-workflow': ['columbia', 'cssrs', 'c-ssrs', 'suicide'],
  'pediatric-dose-safety-checker': [
    'pediatric',
    'pediatricdrug',
    'pediatricdose',
    'pediatricdosing',
    'dose',
  ],
  perc: ['perc'],
  gcs: ['gcs'],
  'revised-trauma-score': ['revisedtrauma', 'rts', 'trauma'],
  'ranson-criteria': ['ranson', 'ransoncriteria'],
  'bisap-score': ['bisap'],
  'glasgow-blatchford-score': ['glasgowblatchford', 'gbs'],
  gad7: ['gad7', 'gad-7'],
};

function normalize(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function metadataSearchable(
  metadata: Record<string, string | number | boolean | null | undefined> = {},
): string {
  return normalize(
    [
      metadata.scoreId,
      metadata.calculatorId,
      metadata.scoreLabel,
      metadata.scoreName,
      metadata.toolId,
    ]
      .filter(Boolean)
      .join(' '),
  );
}

export function noteMatchesScore(note: Note, scoreId: string): boolean {
  const metadata = note.metadata || {};
  const aliases = [scoreId, ...(SCORE_ALIASES[scoreId] || [])].map(normalize);
  const searchable = normalize(
    [note.text, note.body, metadataSearchable(metadata)].filter(Boolean).join(' '),
  );
  return aliases.some((alias) => alias && searchable.includes(alias));
}

export function timelineEventMatchesScore(event: JourneyEvent, scoreId: string): boolean {
  if (!event?.type || !SCORE_EVENT_TYPES.has(event.type)) return false;
  const metadata = event.metadata || {};
  const aliases = [scoreId, ...(SCORE_ALIASES[scoreId] || [])].map(normalize);
  const searchable = normalize(
    [event.summary, event.note, metadataSearchable(metadata)].filter(Boolean).join(' '),
  );
  const metadataScoreId = normalize(metadata.scoreId || metadata.calculatorId);
  if (aliases.some((alias) => alias && metadataScoreId === alias)) return true;
  return aliases.some((alias) => alias && searchable.includes(alias));
}

export function patientHasScore(patient: Patient, scoreId: string): boolean {
  const notes = patient.notes || [];
  const timeline = patient.timeline || [];
  return (
    notes.some((note) => noteMatchesScore(note, scoreId)) ||
    timeline.some((event) => timelineEventMatchesScore(event, scoreId))
  );
}

export function listCompletedScoreIds(patient: Patient): string[] {
  const completed = new Set<string>();
  for (const scoreId of Object.keys(SCORE_ALIASES)) {
    if (patientHasScore(patient, scoreId)) completed.add(scoreId);
  }
  for (const note of patient.notes || []) {
    const scoreId = note.metadata?.scoreId || note.metadata?.calculatorId;
    if (scoreId) completed.add(String(scoreId));
  }
  for (const event of patient.timeline || []) {
    if (!SCORE_EVENT_TYPES.has(event.type || '')) continue;
    const scoreId = event.metadata?.scoreId || event.metadata?.calculatorId;
    if (scoreId) completed.add(String(scoreId));
  }
  return [...completed];
}

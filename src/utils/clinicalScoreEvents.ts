const SCORE_EVENT_TYPES = new Set(['SCORE', 'ClinicalScoreSaved']);
const RECENT_SCORE_WINDOW_MS = 4 * 60 * 60 * 1000;

function valueFromMetadata(metadata: any = {}, keys = [] as any[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

export function isScoreTimelineEvent(event) {
  return Boolean(event && SCORE_EVENT_TYPES.has(event.type));
}

export function scoreShortLabel(label = '') {
  const text = String(label || '').trim();
  const lower = text.toLowerCase();
  if (lower.includes('heart')) return 'HEART';
  if (lower.includes('qsofa')) return 'qSOFA';
  if (lower.includes('nihss')) return 'NIHSS';
  if (lower.includes('news2')) return 'NEWS2';
  if (lower.includes('timi')) return 'TIMI';
  if (lower.includes('grace')) return 'GRACE';
  return text.replace(/\s+score$/i, '') || 'Score';
}

export function scoreRiskTone(band = '') {
  const normalized = String(band || '').toLowerCase();
  if (/(high|severe|critical|red|shock|positive)/.test(normalized)) return 'red';
  if (/(moderate|intermediate|elevated|minor|yellow|warning)/.test(normalized)) return 'yellow';
  if (/(low|normal|negative|not high|no stroke|green)/.test(normalized)) return 'green';
  return 'neutral';
}

export function normalizeSavedScoreEvent(event) {
  if (!isScoreTimelineEvent(event)) return null;
  const metadata = event.metadata || {};
  const label = valueFromMetadata(metadata, ['scoreLabel', 'toolName', 'label', 'calculatorLabel']) || 'Score';
  const result = valueFromMetadata(metadata, ['scoreTotal', 'result', 'total', 'value']);
  const band = valueFromMetadata(metadata, ['band', 'riskBand', 'interpretation', 'severity']) || '';
  const staffId =
    event.staffId ||
    event.actorStaffId ||
    valueFromMetadata(metadata, ['staffId', 'ranByStaffId', 'authorStaffId']);

  return {
    id: event.id,
    event,
    toolId: valueFromMetadata(metadata, ['scoreId', 'toolId', 'calculatorId']) || '',
    toolName: String(label),
    shortLabel: scoreShortLabel(label),
    result,
    band: String(band),
    recommendation: valueFromMetadata(metadata, ['recommendation', 'summary']) || '',
    timestamp: event.timestamp,
    staffId: staffId || null,
    tone: scoreRiskTone(band),
  };
}

export function getSavedScores(patient) {
  return [...(patient?.timeline || [])]
    .map(normalizeSavedScoreEvent)
    .filter(Boolean)
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getRecentSavedScores(patient, now = new Date(), windowMs = RECENT_SCORE_WINDOW_MS) {
  const nowMs = now.getTime();
  const latestByTool = new Map();

  getSavedScores(patient).forEach((score: any) => {
    const timestampMs = new Date(score.timestamp).getTime();
    if (!Number.isFinite(timestampMs) || nowMs - timestampMs > windowMs) return;
    const key = score.toolId || score.toolName;
    if (!latestByTool.has(key)) latestByTool.set(key, score);
  });

  return [...latestByTool.values()];
}

export function formatScoreAge(timestamp, now = new Date()) {
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return 'time unknown';
  const minutes = Math.max(0, Math.round((now.getTime() - parsed) / 60000));
  if (minutes < 60) return `${minutes}min ago`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m ago` : `${hours}h ago`;
}

export function formatScoresForCopilot(patient, now = new Date()) {
  const scores = getRecentSavedScores(patient, now);
  if (!scores.length) return '';
  return scores
    .map((score) => `${score.shortLabel}=${score.result ?? '--'} (${score.band || 'band unknown'}, ${formatScoreAge(score.timestamp, now)})`)
    .join(', ');
}

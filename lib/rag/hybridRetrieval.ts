/**
 * Hybrid lexical + dense retrieval fusion (RRF).
 * Pure utilities — used by backend RetrievalService and offline eval.
 */

export interface HybridCandidate {
  id: string;
  text: string;
  vectorScore: number;
  metadata?: Record<string, unknown>;
}

export interface HybridScoredCandidate extends HybridCandidate {
  lexicalScore: number;
  fusedScore: number;
  vectorRank: number;
  lexicalRank: number;
}

export interface HybridFusionOptions {
  /** Reciprocal rank fusion constant (default 60) */
  rrfK?: number;
  /** Weight for vector rank channel (default 1) */
  vectorWeight?: number;
  /** Weight for lexical rank channel (default 1) */
  lexicalWeight?: number;
  topK?: number;
  /** Drop candidates below this fused score after normalization 0-1 (optional) */
  minFusedScore?: number;
}

const STOP = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'to',
  'in',
  'for',
  'on',
  'with',
  'is',
  'are',
  'be',
  'as',
  'at',
  'by',
  'from',
  'that',
  'this',
  'it',
  'was',
  'were',
  'will',
  'can',
  'may',
  'should',
  'must',
  'not',
  'no',
  'yes',
]);

export function tokenize(text: string): string[] {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/** Simple TF-style lexical overlap score with slight IDF-ish rarity boost via inverse token length. */
export function lexicalScore(query: string, document: string): number {
  const qTokens = tokenize(query);
  const dTokens = tokenize(document);
  if (!qTokens.length || !dTokens.length) return 0;

  const df = new Map<string, number>();
  for (const t of dTokens) df.set(t, (df.get(t) || 0) + 1);

  let score = 0;
  const seen = new Set<string>();
  for (const t of qTokens) {
    if (seen.has(t)) continue;
    seen.add(t);
    const tf = df.get(t) || 0;
    if (tf > 0) {
      score += 1 + Math.log(1 + tf);
    }
  }
  // Normalize by query unique tokens
  return Math.min(1, score / (qTokens.length * 1.5));
}

export function hybridFuse(
  query: string,
  candidates: HybridCandidate[],
  options: HybridFusionOptions = {},
): HybridScoredCandidate[] {
  const scored = candidates.map((c) => ({
    ...c,
    lexicalScore: lexicalScore(query, c.text),
  }));
  return fuseWithLexicalScores(scored, options);
}

function fuseWithLexicalScores(
  candidates: Array<HybridCandidate & { lexicalScore: number }>,
  options: HybridFusionOptions,
): HybridScoredCandidate[] {
  const rrfK = options.rrfK ?? 60;
  const vectorWeight = options.vectorWeight ?? 1;
  const lexicalWeight = options.lexicalWeight ?? 1;
  const topK = options.topK ?? candidates.length;

  const byVector = [...candidates].sort((a, b) => b.vectorScore - a.vectorScore);
  const byLexical = [...candidates].sort((a, b) => b.lexicalScore - a.lexicalScore);

  const vectorRank = new Map<string, number>();
  const lexicalRank = new Map<string, number>();
  byVector.forEach((c, i) => vectorRank.set(c.id, i + 1));
  byLexical.forEach((c, i) => lexicalRank.set(c.id, i + 1));

  const fused = candidates.map((c) => {
    const vr = vectorRank.get(c.id) || candidates.length;
    const lr = lexicalRank.get(c.id) || candidates.length;
    const fusedScore =
      vectorWeight * (1 / (rrfK + vr)) + lexicalWeight * (1 / (rrfK + lr));
    return {
      ...c,
      vectorRank: vr,
      lexicalRank: lr,
      fusedScore,
    };
  });

  // Normalize fused scores to 0-1 for thresholds
  const maxF = Math.max(...fused.map((c) => c.fusedScore), 1e-9);
  const normalized = fused.map((c) => ({
    ...c,
    fusedScore: c.fusedScore / maxF,
  }));

  const minFused = options.minFusedScore ?? 0;
  return normalized
    .filter((c) => c.fusedScore >= minFused)
    .sort((a, b) => b.fusedScore - a.fusedScore)
    .slice(0, topK);
}

export interface MetadataFilter {
  specialty?: string;
  jurisdiction?: string;
  evidenceGrade?: string | string[];
  documentTypes?: string[];
  documentType?: string;
  ragIngestAllowed?: boolean;
  reviewStatus?: string | string[];
  excludeExpired?: boolean;
  now?: Date;
}

/**
 * Soft metadata filter for registry-enriched chunks.
 * Missing metadata fields do not hard-fail unless explicitly required.
 */
export function passesMetadataFilter(
  metadata: Record<string, unknown> | undefined,
  filter: MetadataFilter = {},
): boolean {
  if (!metadata) return true;
  const m = metadata as Record<string, any>;
  const nested = (m.metadata || {}) as Record<string, any>;

  if (filter.specialty) {
    const spec = String(m.specialty || nested.specialty || '').toLowerCase();
    if (spec && !spec.includes(String(filter.specialty).toLowerCase())) return false;
  }

  if (filter.jurisdiction) {
    const j = String(m.jurisdiction || nested.jurisdiction || '').toLowerCase();
    if (j && !j.includes(String(filter.jurisdiction).toLowerCase())) return false;
  }

  if (filter.documentType || filter.documentTypes?.length) {
    const types = new Set(
      (filter.documentTypes || (filter.documentType ? [filter.documentType] : [])).map(String),
    );
    const t = String(m.type || '');
    if (types.size && t && !types.has(t)) return false;
  }

  if (filter.evidenceGrade) {
    const allowed = new Set(
      (Array.isArray(filter.evidenceGrade) ? filter.evidenceGrade : [filter.evidenceGrade]).map(
        String,
      ),
    );
    const g = String(m.evidenceGrade || nested.evidenceGrade || '');
    if (g && !allowed.has(g)) return false;
  }

  if (filter.reviewStatus) {
    const allowed = new Set(
      (Array.isArray(filter.reviewStatus) ? filter.reviewStatus : [filter.reviewStatus]).map(
        String,
      ),
    );
    const s = String(m.reviewStatus || nested.reviewStatus || '');
    if (s && !allowed.has(s)) return false;
  }

  if (filter.ragIngestAllowed === true) {
    const allowed = m.ragIngestAllowed ?? nested.ragIngestAllowed;
    if (allowed === false) return false;
  }

  if (filter.excludeExpired) {
    const exp = m.expiresAt || nested.expiresAt || m.expires_at || nested.expires_at;
    if (exp) {
      const when = new Date(String(exp));
      const now = filter.now || new Date();
      if (!Number.isNaN(when.getTime()) && when.getTime() < now.getTime()) return false;
    }
  }

  return true;
}

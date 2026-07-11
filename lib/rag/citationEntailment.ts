/**
 * Lightweight citation entailment / unsupported-claim filtering.
 * Token-overlap proxy (not full NLI) — safe default: strip weak claims.
 */

export interface EvidenceSpan {
  artifactId?: string;
  sourceId?: string;
  text: string;
}

export interface ClaimInput {
  text: string;
  citationArtifactId?: string | null;
  citationSourceId?: string | null;
}

export interface ClaimEntailmentResult {
  claim: string;
  supported: boolean;
  score: number;
  matchedEvidenceIds: string[];
  reason: string;
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
  'have',
  'has',
  'been',
  'than',
  'then',
  'into',
  'over',
  'under',
  'about',
]);

export function tokenizeClaim(text: string): string[] {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 3 && !STOP.has(t));
}

export function entailmentScore(claim: string, evidenceText: string): number {
  const tokens = tokenizeClaim(claim);
  if (!tokens.length) return 0;
  const evidence = String(evidenceText || '').toLowerCase();
  if (!evidence) return 0;
  const hits = tokens.filter((t) => evidence.includes(t)).length;
  return hits / tokens.length;
}

export function scoreClaimAgainstEvidence(
  claim: ClaimInput,
  evidence: EvidenceSpan[],
  options: { minScore?: number; requireCitationMatch?: boolean } = {},
): ClaimEntailmentResult {
  const minScore = options.minScore ?? 0.34;
  const claimText = claim.text;
  let best = 0;
  const matched: string[] = [];

  for (const span of evidence) {
    const id = span.artifactId || span.sourceId || '';
    if (options.requireCitationMatch) {
      const cite = claim.citationArtifactId || claim.citationSourceId;
      if (cite && id && cite !== id) continue;
    }
    const s = entailmentScore(claimText, span.text);
    if (s > best) best = s;
    if (s >= minScore && id) matched.push(id);
  }

  // Fabricated PMID with no evidence is never supported
  if (/PMID\s*\d{5,}/i.test(claimText) && evidence.length === 0) {
    return {
      claim: claimText,
      supported: false,
      score: 0,
      matchedEvidenceIds: [],
      reason: 'fabricated_or_unbacked_pmid',
    };
  }

  const supported = best >= minScore;
  return {
    claim: claimText,
    supported,
    score: best,
    matchedEvidenceIds: [...new Set(matched)],
    reason: supported ? 'token_overlap_entailment' : 'insufficient_evidence_overlap',
  };
}

export function filterSupportedClaims(
  claims: ClaimInput[],
  evidence: EvidenceSpan[],
  options?: { minScore?: number; requireCitationMatch?: boolean },
): { kept: ClaimEntailmentResult[]; stripped: ClaimEntailmentResult[] } {
  const kept: ClaimEntailmentResult[] = [];
  const stripped: ClaimEntailmentResult[] = [];
  for (const claim of claims) {
    const result = scoreClaimAgainstEvidence(claim, evidence, options);
    if (result.supported) kept.push(result);
    else stripped.push(result);
  }
  return { kept, stripped };
}

/**
 * Given free-text answer + retrieved chunks, flag sentences that look like
 * clinical claims without enough support.
 */
export function annotateAnswerClaims(
  answerText: string,
  evidenceTexts: string[],
  options?: { minScore?: number },
): { sentences: ClaimEntailmentResult[]; unsupportedRate: number } {
  const sentences = String(answerText || '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  const evidence: EvidenceSpan[] = evidenceTexts.map((text, i) => ({
    text,
    sourceId: `ev-${i}`,
  }));

  const results = sentences.map((s) =>
    scoreClaimAgainstEvidence({ text: s }, evidence, options),
  );
  const unsupported = results.filter((r) => !r.supported).length;
  return {
    sentences: results,
    unsupportedRate: results.length ? unsupported / results.length : 0,
  };
}

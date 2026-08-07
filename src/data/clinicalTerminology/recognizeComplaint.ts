import { normalizeComplaintText } from './normalizeComplaintText';
import { LOCAL_GENERAL_COMPLAINT_CONCEPTS } from './localComplaintConcepts';
import {
  HIGH_RISK_COMPLAINT_FLAG_DEFINITIONS,
  highRiskComplaintFlagLabel,
  type HighRiskComplaintFlagId,
} from '../../services/highRiskComplaintFlags';
import {
  confidenceTierForScore,
  type ClinicalConcept,
  type ComplaintCandidate,
  type ComplaintRecognitionResult,
  type MatchMethod,
} from './clinicalConceptTypes';

/**
 * raw patient/staff text
 * -> Unicode/case/punctuation/whitespace normalization (+ narrow abbreviation expansion)
 * -> high-risk fast-flag check (curated, tested regex registry — highRiskComplaintFlags.ts)
 * -> general local-concept synonym/lay-term/abbreviation matching
 * -> spelling-variant fuzzy fallback (bounded Levenshtein distance, LOW_CONFIDENCE only)
 * -> confidence score + tier + ambiguity surfaced via alternativeCandidates
 *
 * Unknown input is never forced into the nearest concept: NO_MATCH is a real, valid
 * outcome and the caller (see terminologyGapQueue.ts) is expected to keep the raw text
 * visible and reviewable rather than discard it.
 */

/**
 * Tests the curated high-risk keyword regexes against BOTH a light
 * (trim+lowercase, matching detectHighRiskComplaintFlags's own normalization —
 * so existing apostrophe-sensitive patterns like /\bcan't breathe\b/ keep
 * matching exactly as they do for that function's other callers) and the
 * fully-normalized text (punctuation/whitespace/apostrophe stripped — catches
 * "chest,   pain!!" and "cant breathe" typed without an apostrophe).
 */
function matchHighRiskFlags(rawText: string, normalizedText: string): HighRiskComplaintFlagId[] {
  const lightlyNormalized = String(rawText || '').trim().toLowerCase();
  const matches: HighRiskComplaintFlagId[] = [];
  for (const definition of HIGH_RISK_COMPLAINT_FLAG_DEFINITIONS) {
    const isMatch = definition.keywords.some(
      (pattern) => pattern.test(lightlyNormalized) || pattern.test(normalizedText),
    );
    if (isMatch) matches.push(definition.id);
  }
  return matches;
}

function wordBoundaryIncludes(haystack: string, needle: string): boolean {
  if (!needle) return false;
  const pattern = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
  return pattern.test(haystack);
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let previousRow = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 0; i < a.length; i += 1) {
    const currentRow = [i + 1];
    for (let j = 0; j < b.length; j += 1) {
      const cost = a[i] === b[j] ? 0 : 1;
      currentRow.push(
        Math.min(
          currentRow[j] + 1, // insertion
          previousRow[j + 1] + 1, // deletion
          previousRow[j] + cost, // substitution
        ),
      );
    }
    previousRow = currentRow;
  }
  return previousRow[b.length];
}

function fuzzyDistanceThreshold(wordLength: number): number {
  // Deliberately conservative: common short words ("tight"/"light", "chest"/"check")
  // are frequently exactly one edit apart, so words this short never fuzzy-match at
  // all — closing that gap is a MISSING_SYNONYM fix (explicit phrasing added to the
  // registry), not something a fuzzy layer should guess at. See recognizeComplaint.test.ts's
  // "does not fuzzy-match a short, unrelated word" case.
  if (wordLength <= 5) return 0;
  if (wordLength <= 8) return 1;
  return 2;
}

type ConceptTerm = { term: string; method: MatchMethod; concept: ClinicalConcept };

function allTermsForConcept(concept: ClinicalConcept): ConceptTerm[] {
  const terms: ConceptTerm[] = [
    { term: normalizeComplaintText(concept.canonicalName), method: 'exact', concept },
    ...concept.synonyms.map((term) => ({ term: normalizeComplaintText(term), method: 'synonym' as MatchMethod, concept })),
    ...concept.layTerms.map((term) => ({ term: normalizeComplaintText(term), method: 'lay-term' as MatchMethod, concept })),
    ...concept.abbreviations.map((term) => ({ term: normalizeComplaintText(term), method: 'abbreviation' as MatchMethod, concept })),
    ...concept.spellingVariants.map((term) => ({ term: normalizeComplaintText(term), method: 'spelling-variant' as MatchMethod, concept })),
  ];
  return terms.filter((entry) => entry.term.length > 0);
}

function matchGeneralConcepts(normalizedText: string): {
  matched: ComplaintCandidate | null;
  alternatives: ComplaintCandidate[];
} {
  const allTerms = LOCAL_GENERAL_COMPLAINT_CONCEPTS.flatMap(allTermsForConcept);
  const candidates: ComplaintCandidate[] = [];

  for (const { term, method, concept } of allTerms) {
    if (normalizedText === term) {
      candidates.push({
        conceptId: concept.id,
        canonicalName: concept.canonicalName,
        matchedTerm: term,
        matchMethod: method,
        confidence: 0.95,
      });
      continue;
    }
    if (wordBoundaryIncludes(normalizedText, term)) {
      candidates.push({
        conceptId: concept.id,
        canonicalName: concept.canonicalName,
        matchedTerm: term,
        matchMethod: method === 'exact' ? 'substring' : method,
        confidence: method === 'abbreviation' ? 0.75 : 0.85,
      });
    }
  }

  if (candidates.length) {
    candidates.sort((left, right) => right.confidence - left.confidence);
    const [best, ...rest] = dedupeByConcept(candidates);
    return { matched: best, alternatives: rest };
  }

  // Bounded spelling-variant fallback: only fires when nothing matched above.
  const fuzzy = fuzzyMatchGeneralConcepts(normalizedText, allTerms);
  if (fuzzy.length) {
    const sorted = dedupeByConcept(fuzzy).sort((left, right) => right.confidence - left.confidence);
    return { matched: sorted[0], alternatives: sorted.slice(1) };
  }

  return { matched: null, alternatives: [] };
}

function dedupeByConcept(candidates: ComplaintCandidate[]): ComplaintCandidate[] {
  const seen = new Map<string, ComplaintCandidate>();
  for (const candidate of candidates) {
    const existing = seen.get(candidate.conceptId);
    if (!existing || candidate.confidence > existing.confidence) {
      seen.set(candidate.conceptId, candidate);
    }
  }
  return [...seen.values()];
}

function fuzzyMatchGeneralConcepts(normalizedText: string, allTerms: ConceptTerm[]): ComplaintCandidate[] {
  const inputWords = normalizedText.split(' ').filter((word) => word.length >= 4);
  if (!inputWords.length) return [];

  const results: ComplaintCandidate[] = [];
  for (const { term, concept } of allTerms) {
    // Whole-phrase fuzzy: catches a typo anywhere in a short canonical phrase.
    if (term.length >= 4) {
      const wholeDistance = levenshteinDistance(normalizedText, term);
      if (wholeDistance > 0 && wholeDistance <= fuzzyDistanceThreshold(Math.max(normalizedText.length, term.length))) {
        results.push({
          conceptId: concept.id,
          canonicalName: concept.canonicalName,
          matchedTerm: term,
          matchMethod: 'fuzzy',
          confidence: 0.4,
        });
      }
    }
    // Per-word fuzzy: catches a single misspelled word inside a longer complaint.
    for (const termWord of term.split(' ')) {
      if (termWord.length < 4) continue;
      for (const inputWord of inputWords) {
        const distance = levenshteinDistance(inputWord, termWord);
        if (distance > 0 && distance <= fuzzyDistanceThreshold(Math.max(inputWord.length, termWord.length))) {
          results.push({
            conceptId: concept.id,
            canonicalName: concept.canonicalName,
            matchedTerm: term,
            matchMethod: 'fuzzy',
            confidence: 0.35,
          });
        }
      }
    }
  }
  return results;
}

export function recognizeComplaint(rawText: string | null | undefined): ComplaintRecognitionResult {
  const normalizedText = normalizeComplaintText(rawText);
  const warnings: string[] = [];

  if (!normalizedText) {
    return {
      rawText: rawText || '',
      normalizedText,
      matchedConceptId: null,
      canonicalName: null,
      matchedTerm: null,
      matchMethod: 'none',
      confidence: 0,
      confidenceTier: 'NO_MATCH',
      alternativeCandidates: [],
      sourceSystem: null,
      requiresHumanReview: true,
      warnings: ['Empty complaint text.'],
    };
  }

  // Pass 1: curated high-risk fast-flag registry (existing, tested keyword patterns).
  const highRiskMatches = matchHighRiskFlags(rawText || '', normalizedText);
  if (highRiskMatches.length) {
    const alternatives: ComplaintCandidate[] = highRiskMatches.slice(1).map((id) => ({
      conceptId: id,
      canonicalName: highRiskComplaintFlagLabel(id),
      matchedTerm: normalizedText,
      matchMethod: 'synonym',
      confidence: 0.9,
    }));
    const primaryId = highRiskMatches[0];
    return {
      rawText: rawText || '',
      normalizedText,
      matchedConceptId: primaryId,
      canonicalName: highRiskComplaintFlagLabel(primaryId),
      matchedTerm: normalizedText,
      matchMethod: 'synonym',
      confidence: 0.92,
      confidenceTier: 'HIGH_CONFIDENCE',
      alternativeCandidates: alternatives,
      sourceSystem: 'local',
      requiresHumanReview: true,
      warnings,
    };
  }

  // Pass 2: general (non-fast-flag) local complaint concepts.
  const { matched, alternatives } = matchGeneralConcepts(normalizedText);
  if (matched) {
    const tier = confidenceTierForScore(matched.confidence);
    if (tier === 'LOW_CONFIDENCE') {
      warnings.push('Spelling-variant / fuzzy match only — confirm with staff before use.');
    }
    return {
      rawText: rawText || '',
      normalizedText,
      matchedConceptId: matched.conceptId,
      canonicalName: matched.canonicalName,
      matchedTerm: matched.matchedTerm,
      matchMethod: matched.matchMethod,
      confidence: matched.confidence,
      confidenceTier: tier,
      alternativeCandidates: alternatives,
      sourceSystem: 'local',
      requiresHumanReview: tier !== 'HIGH_CONFIDENCE',
      warnings,
    };
  }

  return {
    rawText: rawText || '',
    normalizedText,
    matchedConceptId: null,
    canonicalName: null,
    matchedTerm: null,
    matchMethod: 'none',
    confidence: 0,
    confidenceTier: 'NO_MATCH',
    alternativeCandidates: [],
    sourceSystem: null,
    requiresHumanReview: true,
    warnings: ['No recognized complaint concept — raw text preserved for staff review.'],
  };
}

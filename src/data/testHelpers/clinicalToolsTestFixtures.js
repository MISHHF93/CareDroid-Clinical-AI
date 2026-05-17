/**
 * Deterministic fixtures for PHQ-9, GAD-7, COPD GOLD, and Rome IV IBS tests.
 */

import { PHQ9_ITEMS } from '../../utils/phq9Calculator';
import { GAD7_ITEMS } from '../../utils/gad7Calculator';

export const PHQ9_SEVERITY_BOUNDARIES = Object.freeze([
  { score: 0, category: 'none_minimal' },
  { score: 4, category: 'none_minimal' },
  { score: 5, category: 'mild' },
  { score: 9, category: 'mild' },
  { score: 10, category: 'moderate' },
  { score: 14, category: 'moderate' },
  { score: 15, category: 'moderately_severe' },
  { score: 19, category: 'moderately_severe' },
  { score: 20, category: 'severe' },
  { score: 27, category: 'severe' },
]);

export const GAD7_SEVERITY_BOUNDARIES = Object.freeze([
  { score: 0, category: 'none_minimal' },
  { score: 4, category: 'none_minimal' },
  { score: 5, category: 'mild' },
  { score: 9, category: 'mild' },
  { score: 10, category: 'moderate' },
  { score: 14, category: 'moderate' },
  { score: 15, category: 'severe' },
  { score: 21, category: 'severe' },
]);

/** @param {Record<string, number>} scores */
export function buildPhq9Responses(scores) {
  return Object.fromEntries(PHQ9_ITEMS.map((item) => [item.key, scores[item.key] ?? 0]));
}

/** @param {Record<string, number>} scores */
export function buildGad7Responses(scores) {
  return Object.fromEntries(GAD7_ITEMS.map((item) => [item.key, scores[item.key] ?? 0]));
}

/**
 * Extract keyword strings from backend tool.patterns.ts for a toolId block.
 * @param {string} patternsSource
 * @param {string} toolId
 */
export function extractToolPatternKeywords(patternsSource, toolId) {
  const idMarker = `toolId: '${toolId}'`;
  const idIdx = patternsSource.indexOf(idMarker);
  if (idIdx < 0) {
    throw new Error(`toolId ${toolId} not found in tool.patterns.ts`);
  }
  const kwIdx = patternsSource.indexOf('keywords:', idIdx);
  const startBracket = patternsSource.indexOf('[', kwIdx);
  const endBracket = patternsSource.indexOf('],', startBracket);
  if (startBracket < 0 || endBracket < 0) {
    throw new Error(`keywords array not found for ${toolId}`);
  }
  const chunk = patternsSource.slice(startBracket + 1, endBracket);
  return [...chunk.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

/**
 * @param {string} message
 * @param {readonly string[]} keywords
 */
export function messageMatchesToolKeywords(message, keywords) {
  const lower = message.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

/**
 * Mirrors preferPhq9 / preferGad7 / preferCopdGold / preferRomeIvIbs in tool.patterns.ts (disambiguation).
 * @param {string} message
 * @param {'phq9' | 'gad7' | 'copd-gold' | 'rome-iv-ibs'} toolId
 */
export function messageTriggersBackendDisambiguation(message, toolId) {
  const lower = message.toLowerCase();
  switch (toolId) {
    case 'phq9':
      return (
        lower.includes('phq9') ||
        lower.includes('phq-9') ||
        lower.includes('phq 9') ||
        lower.includes('patient health questionnaire') ||
        lower.includes('depression screen') ||
        lower.includes('depression questionnaire') ||
        lower.includes('mood screen') ||
        (lower.includes('depression') && lower.includes('screen'))
      );
    case 'gad7':
      return (
        lower.includes('gad7') ||
        lower.includes('gad-7') ||
        lower.includes('gad 7') ||
        lower.includes('generalized anxiety screen') ||
        lower.includes('anxiety screen') ||
        lower.includes('anxiety questionnaire') ||
        (lower.includes('anxiety') && lower.includes('screen'))
      );
    case 'copd-gold':
      return (
        lower.includes('copd gold') ||
        lower.includes('copd-gold') ||
        lower.includes('gold copd') ||
        lower.includes('gold classification') ||
        lower.includes('copd assessment') ||
        lower.includes('copd risk') ||
        (lower.includes('copd') && lower.includes('gold'))
      );
    case 'rome-iv-ibs':
      return (
        lower.includes('rome iv') ||
        lower.includes('rome-iv') ||
        lower.includes('rome 4') ||
        lower.includes('ibs criteria') ||
        lower.includes('irritable bowel syndrome criteria') ||
        (lower.includes('rome') && lower.includes('ibs')) ||
        (lower.includes('irritable bowel') && lower.includes('criteria'))
      );
    default:
      return false;
  }
}

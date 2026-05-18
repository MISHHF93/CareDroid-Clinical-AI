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

export { extractToolPatternKeywords } from '../parseToolPatterns';

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
    case 'dispatch-ai':
      return (
        lower.includes('dispatch intelligence') ||
        lower.includes('dispatch assistant') ||
        lower.includes('dispatch-ai') ||
        lower.includes('dispatch ai') ||
        lower.includes('vehicle dispatch') ||
        lower.includes('fleet dispatch') ||
        (lower.includes('dispatch') &&
          (lower.includes('assign') ||
            lower.includes('bottleneck') ||
            lower.includes('priorit') ||
            lower.includes('queue')))
      );
    case 'fleet-command':
      return (
        lower.includes('fleet command') ||
        lower.includes('fleet dashboard') ||
        lower.includes('fleet overview') ||
        lower.includes('fleet status') ||
        lower.includes('fleet telemetry') ||
        lower.includes('vehicle fleet') ||
        (lower.includes('fleet') && lower.includes('utilization'))
      );
    case 'predictive-maintenance':
      return (
        lower.includes('predictive maintenance') ||
        lower.includes('maintenance assistant') ||
        lower.includes('maintenance risk score') ||
        lower.includes('fleet maintenance risk') ||
        (lower.includes('maintenance') &&
          (lower.includes('anomaly') ||
            lower.includes('inspection window') ||
            lower.includes('diagnostic code')))
      );
    case 'route-optimizer':
      return (
        lower.includes('route optimizer') ||
        lower.includes('route optimization') ||
        lower.includes('optimize route') ||
        lower.includes('route planner') ||
        lower.includes('delivery route') ||
        (lower.includes('fleet') && lower.includes('route') && lower.includes('stop'))
      );
    default:
      return false;
  }
}

// Port of _deprecated-python/model.py's NLUModel._detect_subcategory and
// _extract_key_terms — only meaningful when the predicted intent is "emergency".

import { EMERGENCY_SUBCATEGORIES } from './training.config';

export function detectSubcategory(text: string, intent: string): string | null {
  if (intent !== 'emergency_alert') return null;

  const lower = text.toLowerCase();
  for (const [subcategory, keywords] of Object.entries(EMERGENCY_SUBCATEGORIES)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return subcategory;
    }
  }
  return 'unknown';
}

// Placeholder, matching model.py's _extract_key_terms — never implemented beyond
// returning an empty list there either (left for a future TF-IDF pass).
export function extractKeyTerms(_text: string, _intent: string): string[] {
  return [];
}

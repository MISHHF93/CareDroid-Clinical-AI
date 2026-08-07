/**
 * Free-text normalization for complaint recognition.
 *
 * raw text -> unicode normalize -> lowercase -> punctuation normalize
 * -> whitespace normalize -> abbreviation expansion
 *
 * The abbreviation list is deliberately short: only entries that are unambiguous
 * in an ED presenting-complaint context are included. Genuinely ambiguous
 * shorthand (e.g. "cp" — chest pain vs cerebral palsy vs cardiopulmonary) is
 * intentionally excluded rather than guessed.
 */

// Expand only as whole words so "sob" inside "sobbing" is untouched.
const ABBREVIATION_EXPANSIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bsob\b/g, 'shortness of breath'],
  [/\babdo\b/g, 'abdominal'],
  [/\bloc\b/g, 'loss of consciousness'],
  [/\bn\/v\b/g, 'nausea vomiting'],
  [/\bams\b/g, 'altered mental status'],
];

/**
 * Normalizes curly/smart quotes to straight ones before punctuation stripping,
 * so "can't breathe" typed with either apostrophe form normalizes identically.
 */
function normalizeApostrophes(value: string): string {
  return value.replace(/[‘’ʼ´`]/g, "'");
}

export function normalizeComplaintText(rawText: string | null | undefined): string {
  if (!rawText) return '';

  let text = String(rawText).normalize('NFKC');
  text = normalizeApostrophes(text);
  text = text.toLowerCase();
  // Drop apostrophes entirely (can't -> cant) rather than treat them as
  // word boundaries, so "can't breathe" and "cant breathe" normalize identically.
  text = text.replace(/'/g, '');
  // Punctuation (other than word chars, whitespace, %) becomes a space so
  // "chest-pain," and "chest pain" normalize the same way.
  text = text.replace(/[^\w\s%]/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();

  for (const [pattern, expansion] of ABBREVIATION_EXPANSIONS) {
    text = text.replace(pattern, expansion);
  }
  // Re-collapse whitespace in case an expansion introduced extra spaces.
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

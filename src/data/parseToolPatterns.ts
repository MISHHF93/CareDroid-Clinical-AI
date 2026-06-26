/**
 * Parse backend tool.patterns.ts for drift tests and alias sync.
 * Source of truth for NLU keyword lists: backend CLINICAL_TOOL_PATTERNS.
 */

/**
 * @param {string} source - contents of tool.patterns.ts
 * @returns {{ toolId: string, keywords: string[] }[]}
 */
function readQuotedField(source, fieldName, fromIndex) {
  const marker = source.indexOf(`${fieldName}: '`, fromIndex);
  if (marker < 0) return { value: null, end: fromIndex };
  const start = marker + fieldName.length + 3;
  const end = source.indexOf("'", start);
  if (end < 0) return { value: null, end: fromIndex };
  return { value: source.slice(start, end), end: end + 1 };
}

/**
 * @param {string} source
 * @returns {{ toolId: string, toolName: string, category: string, keywords: string[] }[]}
 */
export function parseClinicalToolPatternRecords(source) {
  const patterns = [] as any[];
  let searchFrom = 0;
  while (searchFrom < source.length) {
    const toolMarker = source.indexOf("toolId: '", searchFrom);
    if (toolMarker < 0) break;
    const toolIdStart = toolMarker + 9;
    const toolIdEnd = source.indexOf("'", toolIdStart);
    if (toolIdEnd < 0) break;
    const toolId = source.slice(toolIdStart, toolIdEnd);
    const { value: toolName } = readQuotedField(source, 'toolName', toolIdEnd);
    const { value: category } = readQuotedField(source, 'category', toolIdEnd);
    const kwMarker = source.indexOf('keywords:', toolIdEnd);
    const startBracket = source.indexOf('[', kwMarker);
    const endBracket = source.indexOf('],', startBracket);
    if (startBracket < 0 || endBracket < 0) break;
    const chunk = source.slice(startBracket + 1, endBracket);
    const keywords = [...chunk.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    patterns.push({
      toolId,
      toolName: toolName || '',
      category: category || '',
      keywords,
    });
    searchFrom = endBracket + 2;
  }
  return patterns;
}

/**
 * @param {string} source - contents of tool.patterns.ts
 * @returns {{ toolId: string, keywords: string[] }[]}
 */
export function parseClinicalToolPatterns(source) {
  return parseClinicalToolPatternRecords(source).map(({ toolId, keywords }) => ({
    toolId,
    keywords,
  }));
}

/**
 * @param {string} source
 * @param {string} toolId
 * @returns {string[]}
 */
export function extractToolPatternKeywords(source, toolId) {
  const pattern = parseClinicalToolPatterns(source).find((p) => p.toolId === toolId);
  if (!pattern) {
    throw new Error(`toolId ${toolId} not found in tool.patterns.ts`);
  }
  return pattern.keywords;
}

/**
 * @param {string} phrase
 */
export function normalizeAliasKey(phrase) {
  return String(phrase || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Hyphenated slug form used in NLU_TO_REGISTRY_ID and discovery aliases.
 * @param {string} phrase
 */
export function aliasToSlug(phrase) {
  return normalizeAliasKey(phrase).replace(/\s+/g, '-');
}

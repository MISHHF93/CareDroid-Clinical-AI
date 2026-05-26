export function normalizeLimit(limit?: string | number, fallback = 30, max = 100) {
  const parsed = typeof limit === 'number' ? limit : Number(limit);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

export function compactTitle(title: string, fallback = 'Memory') {
  return String(title || fallback)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

export function normalizeTags(tags?: string[]) {
  if (!Array.isArray(tags)) return [];
  return [
    ...new Set(
      tags
        .map((tag) =>
          String(tag || '')
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    ),
  ].slice(0, 20);
}

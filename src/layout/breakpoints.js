/** Match CSS `@media (max-width: 900px)` for compact / phone-tablet shell */
export const COMPACT_MEDIA_QUERY = '(max-width: 900px)';

/** Match Dashboard.css narrow tweaks at 600px */
export const NARROW_MEDIA_QUERY = '(max-width: 600px)';

export function getIsCompactViewport() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(COMPACT_MEDIA_QUERY).matches;
}

/**
 * HEAL-347.12/347.13: whether the operational app requires a real, backend-
 * authenticated session (authMode === 'real') to be reached at all, or falls
 * back to the demo/open-access identity like the rest of this session's
 * history. Defaults to ON in real browser use (dev server and production
 * build alike) now that a real login/register flow exists
 * (src/pages/auth/AuthPage.tsx, src/services/realAuthApi.ts) -- set
 * VITE_REQUIRE_REAL_AUTH=false as an explicit, local-only escape hatch (e.g.
 * while iterating on a page that doesn't yet care about auth).
 *
 * Defaults to OFF under Vitest specifically (import.meta.env.VITEST, the
 * same signal apiClient.ts's own isDev check already uses) -- the hundreds
 * of existing page/component/route tests render CareDroid's UI in isolation
 * to exercise THEIR OWN behavior, not the auth pipeline, and were never
 * written to simulate a full backend login handshake first. Forcing that
 * onto every unrelated test would be a much larger, separate undertaking
 * from "the real app redirects an unauthenticated visitor to /login" --
 * VITE_REQUIRE_REAL_AUTH=true still overrides this for a test that
 * specifically wants to exercise the gate itself (see router auth tests).
 */
function readEnvFlag(key: string, fallback: boolean): boolean {
  const raw = (import.meta as any)?.env?.[key];
  if (raw === undefined || raw === null || raw === '') return fallback;
  return String(raw).toLowerCase() === 'true';
}

const defaultGateValue = !(import.meta as any)?.env?.VITEST;

export const requireRealAuthGate: boolean = readEnvFlag('VITE_REQUIRE_REAL_AUTH', defaultGateValue);

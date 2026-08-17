import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// HEAL-320: 4 routes in router.tsx (ED Readiness, Diagnostics, Handoffs,
// Reports) passed a DIFFERENT CANONICAL_ROUTES value into their own
// CareDroidRouteGuard than the <Route path> they were mounted on -- a
// copy-paste error from the block each was adapted from (EMS, Tools,
// Shift, Analytics respectively). CareDroidRouteGuard checks permissions
// against whatever `path` prop it's given, not the actual URL, so this
// silently evaluated each of these 4 pages against a DIFFERENT page's
// allowedRoles -- e.g. Diagnostics' own route config grants
// quality_safety_officer access (and the nav shows it as clickable for
// that role), but the guard checked Tools' allowedRoles instead, which
// doesn't include that role, so clicking the visible, enabled nav item
// dead-ended on an access-denied wall. ED Readiness' mismatch (guarded
// against EMS) was the most severe: it both blocked 2 roles its own
// config allows (hospital_admin, patient_flow_coordinator) and over-granted
// a critical-arrivals readiness board to 7 roles that shouldn't see it
// (triage_nurse, emergency_physician, attending_physician,
// resident_physician, paramedic, registration_clerk, dispatcher).
//
// This test statically parses router.tsx's source so the whole class of
// "Route path and its own CareDroidRouteGuard path have drifted apart"
// bug is caught at test time, not discovered live per-role. It
// deliberately only matches the `path={CANONICAL_ROUTES.X}` form -- the
// specialty tool detail sub-routes (e.g.
// path="/emergency/tools/cardiology/:toolId") intentionally guard
// against the parent Tools route and are a different, correct pattern.

describe('router.tsx CareDroidRouteGuard path consistency (HEAL-320)', () => {
  it('every <Route path={CANONICAL_ROUTES.X}> guards itself with the same CANONICAL_ROUTES.X, not a different route', () => {
    const source = readFileSync(join(__dirname, 'router.tsx'), 'utf8');

    const pattern =
      /path=\{CANONICAL_ROUTES\.(\w+)\}\s+element=\{\s*<CareDroidRouteGuard path=\{CANONICAL_ROUTES\.(\w+)\}/g;

    const mismatches: string[] = [];
    let matchCount = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      matchCount += 1;
      const [, routePath, guardPath] = match;
      if (routePath !== guardPath) {
        mismatches.push(`<Route path={CANONICAL_ROUTES.${routePath}}> is guarded with CANONICAL_ROUTES.${guardPath} instead of its own route`);
      }
    }

    // Guards against the regex itself silently matching nothing (e.g. if
    // router.tsx's formatting changes) and this test passing vacuously.
    expect(matchCount).toBeGreaterThan(15);
    expect(mismatches).toEqual([]);
  });
});

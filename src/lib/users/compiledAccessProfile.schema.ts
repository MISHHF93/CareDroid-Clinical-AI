import { z } from 'zod';
import type { CompiledCareDroidAccessProfile } from './canonicalAccess';

/**
 * Runtime guard for a compiled access profile that arrives from an untrusted
 * boundary -- in practice `localStorage.caredroid_user_profile`, which any
 * previous build, a half-finished migration, a QA fixture or the user
 * themselves can leave in an arbitrary shape.
 *
 * This exists because a TypeScript type did not survive the trip. The consumer
 * chain was:
 *
 *   useEmergencyRolePermissions:  if (attached?.user) return attached;
 *   unified-navigation.config:    profile.role.hospitalRole
 *
 * The gate tested `user` and the consumer dereferenced `role`, so a stored
 * profile carrying `user` but no `role` passed as trusted and then threw
 * "Cannot read properties of undefined (reading 'hospitalRole')" from inside
 * AppShellFrame -- taking down the entire application shell, not just the
 * navigation. Reproduced live on 2026-08-31.
 *
 * Deliberately NOT a full mirror of CompiledCareDroidAccessProfile: that type
 * has ~15 members and restating them here would be a second source of truth
 * that silently rots. This validates only what consumers actually dereference
 * without optional chaining, and passes everything else through untouched.
 */
export const compiledAccessProfileSchema = z
  .object({
    user: z.object({}).loose(),
    role: z
      .object({
        // getVisibleNavigation reads hospitalRole and falls back to
        // emergencyRoleId, so at least one must be a usable string.
        hospitalRole: z.string().optional(),
        emergencyRoleId: z.string().optional(),
      })
      .loose()
      .refine(
        (role) => Boolean(role.hospitalRole?.trim() || role.emergencyRoleId?.trim()),
        { message: 'role must carry hospitalRole or emergencyRoleId' },
      ),
    // canAccessRoute branches on `'navigationAccess' in profile` and then
    // reads routeAccess/permissions unguarded, so a profile carrying the key
    // but not the arrays takes the "already compiled" path and throws on
    // .some()/.every(). Found by this file's own test: a fixture that had
    // role + navigationAccess but no routeAccess still crashed navigation.
    navigationAccess: z.array(z.string()),
    routeAccess: z.array(z.string()),
    permissions: z.array(z.string()),
  })
  .loose();

export type CompiledAccessProfileParseResult =
  | { ok: true; profile: CompiledCareDroidAccessProfile }
  | { ok: false; reason: string };

/**
 * Explicit success/failure rather than a throw or a silent cast: callers must
 * decide what to do with an unusable profile. The established recovery here is
 * to recompile one from the role, which useEmergencyRolePermissions already
 * does for sessions that never had a compiled profile at all.
 */
export function parseCompiledAccessProfile(value: unknown): CompiledAccessProfileParseResult {
  const result = compiledAccessProfileSchema.safeParse(value);
  if (result.success) {
    return { ok: true, profile: value as CompiledCareDroidAccessProfile };
  }
  const first = result.error.issues[0];
  const path = first?.path?.length ? first.path.join('.') : '(root)';
  return { ok: false, reason: `${path}: ${first?.message || 'invalid compiled access profile'}` };
}

/** Convenience predicate for call sites that only need a yes/no. */
export function isUsableCompiledAccessProfile(value: unknown): boolean {
  return parseCompiledAccessProfile(value).ok;
}

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Permission } from './backendPermissionCatalog';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * backendPermissionCatalog.ts's own header comment says it's a "Frontend
 * mirror of backend Permission enum -- single vocabulary for RBAC strings.
 * Matches backend/src/modules/auth/enums/permission.enum.ts" -- but nothing
 * ever verified that claim. Found via a route/permission-drift audit:
 * MANAGE_ORGANIZATION existed here with zero backend counterpart and zero
 * real frontend consumer (grepped for `Permission.MANAGE_ORGANIZATION`
 * dot-notation usage -- none; the plain string 'MANAGE_ORGANIZATION' used
 * throughout navigation.config.ts/saasProfileConstants.ts/userProfileCatalog.ts
 * is a completely separate, SaaS-tier route-gating vocabulary that just
 * happens to share some names with this HIPAA/PHI-oriented backend-mirror
 * enum -- the two systems are not the same and must not be conflated).
 */
function extractEnumMemberNames(source: string): Set<string> {
  const names = new Set<string>();
  const pattern = /^\s{1,4}([A-Z][A-Z0-9_]*)\s*[:=]\s*'[A-Z0-9_]+'/gm;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    names.add(match[1]);
  }
  return names;
}

describe('backendPermissionCatalog stays in sync with the real backend Permission enum', () => {
  it('has no permission names the backend enum does not also define', () => {
    const backendSource = readFileSync(
      join(__dirname, '../../backend/src/modules/auth/enums/permission.enum.ts'),
      'utf8',
    );
    const backendNames = extractEnumMemberNames(backendSource);
    const frontendNames = new Set(Object.keys(Permission));

    const frontendOnly = [...frontendNames].filter((name) => !backendNames.has(name)).sort();
    const backendOnly = [...backendNames].filter((name) => !frontendNames.has(name)).sort();

    expect(
      frontendOnly,
      `backendPermissionCatalog.ts defines permission(s) the real backend enum does not: ` +
        `${JSON.stringify(frontendOnly)}. Either the backend enum is missing them (a real gap -- ` +
        `nothing can enforce these server-side) or the frontend catalog has drifted and should drop them.`,
    ).toEqual([]);

    // Informational only, not asserted: the backend enum is allowed to have
    // permissions the frontend catalog doesn't mirror yet (e.g. brand-new,
    // not-yet-UI-gated server capabilities) -- that's not drift, just an
    // incomplete mirror. Logged so it's visible without failing the build.
    if (backendOnly.length) {
      console.log(
        `INFO backend Permission enum has ${backendOnly.length} member(s) not yet in backendPermissionCatalog.ts: ${JSON.stringify(backendOnly)}`,
      );
    }
  });
});

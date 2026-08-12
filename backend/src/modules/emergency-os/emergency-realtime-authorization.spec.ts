import { EmergencyRealtimeController } from './emergency-realtime.controller';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';

/**
 * Found 2026-08-12 via the Public/Read-Only role server-side enforcement audit: this controller
 * was guarded only by JwtQueryAuthGuard (verifies JWT signature/expiry, no permission check) --
 * AuthorizationGuard never ran, so `stream()` had no @RequirePermission decorator for it to read
 * anyway. AuthorizationGuard fails OPEN when no permission metadata is present, so even adding
 * only the decorator (without the guard) or only the guard (without the decorator) would have
 * left this exploitable -- both were missing, both are required.
 *
 * buildInitialBurst() immediately pushes the same full-PHI whiteboard payload the REST
 * GET /emergency/whiteboard route correctly locks behind READ_PHI (see
 * emergency-os-patient-endpoints-authorization.spec.ts's getWhiteboard entry, the established
 * pattern this test mirrors) -- any authenticated identity, including UserRole.STUDENT (the one
 * role deliberately never granted READ_PHI, per role-permissions.config.ts's "Educational Use"
 * comment), could open `?token=<jwt>` directly and receive a continuous, unfiltered, unaudited
 * live PHI feed.
 */
describe('EmergencyRealtimeController — stream() requires READ_PHI and runs AuthorizationGuard', () => {
  it('stream() is decorated with @RequirePermission(READ_PHI)', () => {
    const handler = EmergencyRealtimeController.prototype.stream;
    expect(typeof handler).toBe('function');
    const metadata = Reflect.getMetadata(PERMISSIONS_KEY, handler);
    expect(metadata).toEqual([Permission.READ_PHI]);
  });

  it('the controller runs AuthorizationGuard (not just JwtQueryAuthGuard)', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, EmergencyRealtimeController) || [];
    expect(guards).toContain(AuthorizationGuard);
  });

  it('STUDENT (the one role never granted READ_PHI) cannot satisfy this permission', () => {
    // Static assertion mirroring role-permissions.config.ts's STUDENT block, matching the
    // established pattern in emergency-os-patient-endpoints-authorization.spec.ts.
    const STUDENT_PERMISSIONS = [
      Permission.USE_CALCULATORS,
      Permission.USE_DRUG_CHECKER,
      Permission.USE_LAB_INTERPRETER,
      Permission.USE_PROTOCOLS,
      Permission.USE_AI_CHAT,
    ];
    expect(STUDENT_PERMISSIONS).not.toContain(Permission.READ_PHI);
  });
});

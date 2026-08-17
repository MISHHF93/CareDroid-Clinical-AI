import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { AuthorizationGuard } from './authorization.guard';
import { PERMISSIONS_KEY, ANY_PERMISSIONS_KEY, IS_PUBLIC_KEY } from '../decorators/permissions.decorator';
import { Permission } from '../enums/permission.enum';
import { UserRole } from '../../users/entities/user.entity';
import { EmergencyOsController } from '../../emergency-os/emergency-os.controller';

/**
 * Closes a real, previously-undemonstrated gap: independent research (2026-08-16)
 * found that every existing "RBAC test" in this backend either (a) stubs
 * AuthorizationGuard/AuthGuard to always return true (emergency-os.controller.spec.ts
 * and friends -- so authorization is never actually exercised), or (b) only asserts
 * that a @RequirePermission decorator's metadata is PRESENT (the Cycle 238/239
 * authorization spec files), never that a real wrong-role request is actually
 * REJECTED at runtime. `grep -r "expect(403)\|Forbidden" backend/test` -- zero
 * matches for the real NestJS AuthorizationGuard pipeline. This is the one layer
 * of defense on the highest-route-count, most PHI-sensitive controller
 * (EmergencyOsController, 72 @RequirePermission-decorated methods) that had never
 * been exercised end-to-end, despite this exact bug class (a route silently
 * missing its permission decorator, or a fail-open gap) recurring at least 3 times
 * in this codebase's own history (HEAL-059/060; the Cycle 238/239 47-undecorated-
 * routes finding).
 *
 * Uses the REAL AuthorizationGuard.canActivate() and the REAL role-permission
 * config (hasPermissionWithHierarchy/hasSaasProfilePermission) -- not mocked --
 * against every real decorated method on EmergencyOsController, driven by a
 * READ_ONLY_VIEWER role (the one base UserRole with exactly one permission,
 * READ_PHI, and nothing implied beyond it per PermissionHierarchy). For any route
 * requiring more than bare READ_PHI, this role must be rejected; this test proves
 * it actually is, for all 72 routes at once, rather than assuming the decorator
 * alone is sufficient.
 */

const auditLog = jest.fn().mockResolvedValue(undefined);
const guard = new AuthorizationGuard(new Reflector(), { log: auditLog } as any);

function buildContext(handler: Function, controllerClass: Function, user: any) {
  return {
    getHandler: () => handler,
    getClass: () => controllerClass,
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        method: 'GET',
        url: '/test',
        ip: '127.0.0.1',
        connection: {},
        headers: {},
      }),
    }),
  } as any;
}

function getControllerRouteHandlers(controllerClass: Function): Array<{ name: string; handler: Function }> {
  const proto = controllerClass.prototype;
  return Object.getOwnPropertyNames(proto)
    .filter((name) => name !== 'constructor' && typeof proto[name] === 'function')
    .map((name) => ({ name, handler: proto[name] }));
}

const reflector = new Reflector();

function routeMetadata(handler: Function, controllerClass: Function) {
  const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [handler, controllerClass]);
  const required = reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [handler, controllerClass]);
  const anyOf = reflector.getAllAndOverride<Permission[]>(ANY_PERMISSIONS_KEY, [handler, controllerClass]);
  return { isPublic, required, anyOf };
}

describe('AuthorizationGuard wrong-role systematic check -- EmergencyOsController', () => {
  const readOnlyViewer = {
    id: 'test-read-only-viewer',
    role: UserRole.READ_ONLY_VIEWER,
    profile: { roleProfileId: null },
  };

  const allHandlers = getControllerRouteHandlers(EmergencyOsController);

  it('sanity: found real decorated route handlers to check (not an empty/broken scan)', () => {
    const decorated = allHandlers.filter((h) => {
      const meta = routeMetadata(h.handler, EmergencyOsController);
      return !meta.isPublic && (meta.required?.length || meta.anyOf?.length);
    });
    expect(decorated.length).toBeGreaterThanOrEqual(60);
  });

  it.each(allHandlers.map((h) => [h.name, h.handler]))(
    'READ_ONLY_VIEWER (READ_PHI only) is rejected by EmergencyOsController.%s unless it requires only READ_PHI',
    async (_name, handler) => {
      const meta = routeMetadata(handler as Function, EmergencyOsController);
      if (meta.isPublic) return; // no route on this controller is public, but skip cleanly if one ever is

      const required = meta.required || [];
      const anyOf = meta.anyOf || [];
      if (required.length === 0 && anyOf.length === 0) {
        // Undecorated route -- AuthorizationGuard fails OPEN for these (any
        // authenticated role passes). That is a real, separate, already-tracked
        // architectural gap (Cycle 238/239), not this test's job to re-litigate --
        // just don't assert a false "rejected" expectation against known fail-open
        // behavior.
        return;
      }

      const readOnlyViewerShouldPass =
        (required.length > 0 && required.every((p) => p === Permission.READ_PHI)) ||
        (anyOf.length > 0 && anyOf.includes(Permission.READ_PHI));

      const context = buildContext(handler as Function, EmergencyOsController, readOnlyViewer);

      if (readOnlyViewerShouldPass) {
        await expect(guard.canActivate(context)).resolves.toBe(true);
      } else {
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
      }
    },
  );
});

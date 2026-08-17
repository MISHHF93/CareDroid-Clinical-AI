import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { AuthorizationGuard } from './authorization.guard';
import { PERMISSIONS_KEY, ANY_PERMISSIONS_KEY, IS_PUBLIC_KEY } from '../decorators/permissions.decorator';
import { Permission } from '../enums/permission.enum';

/**
 * Shared harness for the systematic wrong-role authorization check -- see
 * authorization.wrong-role.systematic.spec.ts (EmergencyOsController, where this
 * was first built and found 6 real permission-escalation bugs, HEAL-284) for the
 * full rationale. Extracted so additional controllers can reuse the same,
 * already-verified logic instead of each copy-pasting the guard-construction and
 * metadata-reading boilerplate.
 */

const auditLog = jest.fn().mockResolvedValue(undefined);
export const testAuthorizationGuard = new AuthorizationGuard(new Reflector(), { log: auditLog } as any);

const reflector = new Reflector();

export function getControllerRouteHandlers(
  controllerClass: Function,
): Array<{ name: string; handler: Function }> {
  const proto = (controllerClass as any).prototype;
  return Object.getOwnPropertyNames(proto)
    .filter((name) => name !== 'constructor' && typeof proto[name] === 'function')
    .map((name) => ({ name, handler: proto[name] }));
}

export function routeMetadata(handler: Function, controllerClass: Function) {
  const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [handler, controllerClass]);
  const required = reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [handler, controllerClass]);
  const anyOf = reflector.getAllAndOverride<Permission[]>(ANY_PERMISSIONS_KEY, [handler, controllerClass]);
  return { isPublic, required: required || [], anyOf: anyOf || [] };
}

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

/**
 * Asserts, for every real decorated route handler on controllerClass, that a
 * user whose ONLY permission is `soleGrantedPermission` (default: READ_PHI, via
 * UserRole.READ_ONLY_VIEWER-shaped input) is rejected unless the route's real
 * requirement is satisfiable by that single permission alone. Skips routes with
 * no decorator at all -- AuthorizationGuard fails OPEN for those by design
 * (a real, separately-tracked architectural gap, not this check's job).
 */
export async function assertOnlySoleGrantedPermissionPasses(
  controllerClass: Function,
  soleGrantedPermission: Permission,
  userOverrides: Record<string, unknown> = {},
) {
  const user = {
    id: 'test-minimal-privilege-user',
    role: 'read_only_viewer',
    profile: { roleProfileId: null },
    ...userOverrides,
  };

  const handlers = getControllerRouteHandlers(controllerClass);
  const results: Array<{ name: string; ok: boolean; detail: string }> = [];

  for (const { name, handler } of handlers) {
    const meta = routeMetadata(handler, controllerClass);
    if (meta.isPublic) continue;
    if (meta.required.length === 0 && meta.anyOf.length === 0) continue; // fail-open by design, not this check's concern

    const shouldPass =
      (meta.required.length > 0 && meta.required.every((p) => p === soleGrantedPermission)) ||
      (meta.anyOf.length > 0 && meta.anyOf.includes(soleGrantedPermission));

    const context = buildContext(handler, controllerClass, user);
    try {
      const granted = await testAuthorizationGuard.canActivate(context);
      if (shouldPass && granted === true) {
        results.push({ name, ok: true, detail: 'correctly granted' });
      } else if (!shouldPass) {
        results.push({
          name,
          ok: false,
          detail: `expected rejection (requires ${JSON.stringify(meta.required.length ? meta.required : meta.anyOf)}) but was granted`,
        });
      } else {
        results.push({ name, ok: false, detail: 'expected grant but canActivate returned falsy' });
      }
    } catch (error) {
      if (!shouldPass && error instanceof ForbiddenException) {
        results.push({ name, ok: true, detail: 'correctly rejected' });
      } else if (shouldPass) {
        results.push({ name, ok: false, detail: `expected grant but was rejected: ${(error as Error).message}` });
      } else {
        results.push({ name, ok: false, detail: `unexpected error type: ${error}` });
      }
    }
  }

  return results;
}

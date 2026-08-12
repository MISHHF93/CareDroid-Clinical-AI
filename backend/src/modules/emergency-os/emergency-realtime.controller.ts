import { Controller, MessageEvent, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { EmergencyRealtimeService } from './emergency-realtime.service';
import { JwtQueryAuthGuard } from './guards/jwt-query-auth.guard';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';

const HEARTBEAT_MS = 25_000;

/**
 * SECURITY FIX (found 2026-08-12, Public/Read-Only role server-side enforcement audit): this
 * controller previously guarded only with JwtQueryAuthGuard (verifies JWT signature/expiry, sets
 * request.user from the raw token payload) with NO AuthorizationGuard/@RequirePermission -- the
 * exact same "endpoint exists, permission model exists, decorator was never wired up" gap class
 * HEAL-121 found for the App Navigator, except this one leaks continuous, live, unfiltered PHI
 * rather than route metadata. buildInitialBurst() immediately pushes the same full-PHI whiteboard
 * payload the REST GET /emergency/whiteboard route correctly locks behind
 * @RequirePermission(Permission.READ_PHI) -- but ANY authenticated identity, including
 * UserRole.STUDENT (whose own role-permissions.config.ts entry has zero PHI permissions), could
 * open this SSE stream directly with just `?token=<jwt>` (exactly how the frontend itself
 * connects) and receive every subsequent broadcast, unfiltered, with zero audit trail since
 * AuthorizationGuard never ran. JwtQueryAuthGuard's request.user already carries `role`/`id`
 * (spread from the JWT's own claims, which include `role` -- see jwt-claims.util.ts's
 * buildAccessTokenClaims), so AuthorizationGuard works here without further plumbing.
 */
@ApiTags('emergency')
@ApiBearerAuth()
@UseGuards(JwtQueryAuthGuard, AuthorizationGuard)
@Controller('emergency/realtime')
export class EmergencyRealtimeController {
  constructor(private readonly realtimeService: EmergencyRealtimeService) {}

  @Sse('stream')
  @RequirePermission(Permission.READ_PHI)
  stream(): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      for (const event of this.realtimeService.buildInitialBurst()) {
        subscriber.next({ data: event });
      }

      const unsubscribe = this.realtimeService.subscribe((event) => {
        subscriber.next({ data: event });
      });

      const heartbeat = setInterval(() => {
        subscriber.next({
          data: {
            type: 'heartbeat',
            payload: { at: new Date().toISOString() },
          },
        });
      }, HEARTBEAT_MS);

      return () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
    });
  }
}

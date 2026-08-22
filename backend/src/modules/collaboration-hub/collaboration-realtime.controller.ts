import { Controller, MessageEvent, Req, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { CollaborationRealtimeService } from './collaboration-realtime.service';
import { CollaborationHubService } from './collaboration-hub.service';
import { JwtQueryAuthGuard } from '../emergency-os/guards/jwt-query-auth.guard';

const HEARTBEAT_MS = 25_000;
const MEMBERSHIP_REFRESH_MS = 60_000;

/**
 * SSE fan-out for the Collaboration Hub, guarded like emergency/realtime
 * (backend/src/modules/emergency-os/emergency-realtime.controller.ts) so
 * EventSource clients can authenticate via a `?token=` query param.
 *
 * Unlike the emergency board (shared operational data visible to any
 * authenticated staff member), collaboration channels can be private
 * (patient threads, incident channels, DMs) — so every event is filtered
 * per-connection against the requesting user's current channel memberships
 * before being written to the stream.
 */
@ApiTags('collaboration')
@ApiBearerAuth()
@UseGuards(JwtQueryAuthGuard)
@Controller('collaboration/realtime')
export class CollaborationRealtimeController {
  constructor(
    private readonly realtimeService: CollaborationRealtimeService,
    private readonly collaborationHubService: CollaborationHubService,
  ) {}

  @Sse('stream')
  stream(
    @Req()
    req: Request & {
      user?: { sub?: string; id?: string };
      tenantContext?: { organizationId?: string };
    },
  ): Observable<MessageEvent> {
    const userId = req.user?.sub || req.user?.id || '';
    // Per-channel membership filtering below (memberChannelIds) is the real
    // security boundary here and was already tenant-safe by construction --
    // a user simply has no membership row in another org's channel. This is
    // defense-in-depth to match the now-scoped bus (HEAL-347.91), not a fix
    // for a leak that existed on this specific stream.
    const organizationId = req.tenantContext?.organizationId;

    return new Observable<MessageEvent>((subscriber) => {
      let memberChannelIds = new Set<string>();

      const refreshMembership = async () => {
        try {
          memberChannelIds = await this.collaborationHubService.listMemberChannelIds(userId);
        } catch {
          // Keep the previous membership snapshot if the lookup fails transiently.
        }
      };

      subscriber.next({ data: { type: 'connected', payload: { mode: 'sse' } } });
      void refreshMembership();

      const membershipTimer = setInterval(() => void refreshMembership(), MEMBERSHIP_REFRESH_MS);

      const unsubscribe = this.realtimeService.subscribe((event) => {
        const payload = (event.payload || {}) as { channelId?: string };
        if (payload.channelId && !memberChannelIds.has(payload.channelId)) return;
        subscriber.next({ data: event });
      }, organizationId);

      const heartbeat = setInterval(() => {
        subscriber.next({
          data: { type: 'heartbeat', payload: { at: new Date().toISOString() } },
        });
      }, HEARTBEAT_MS);

      return () => {
        clearInterval(heartbeat);
        clearInterval(membershipTimer);
        unsubscribe();
      };
    });
  }
}

import { Controller, MessageEvent, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { EmergencyRealtimeService } from './emergency-realtime.service';
import { JwtQueryAuthGuard } from './guards/jwt-query-auth.guard';

const HEARTBEAT_MS = 25_000;

@ApiTags('emergency')
@ApiBearerAuth()
@UseGuards(JwtQueryAuthGuard)
@Controller('emergency/realtime')
export class EmergencyRealtimeController {
  constructor(private readonly realtimeService: EmergencyRealtimeService) {}

  @Sse('stream')
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

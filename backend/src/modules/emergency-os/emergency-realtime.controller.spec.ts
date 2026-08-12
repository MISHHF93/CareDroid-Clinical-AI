import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { EmergencyRealtimeController } from './emergency-realtime.controller';
import { EmergencyRealtimeService } from './emergency-realtime.service';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import {
  CareDroidCentralNodeService,
  EmergencyPatientService,
  EmergencySettingsService,
  EmergencyWhiteboardService,
  WorkflowActionLogService,
} from './emergency-os.services';

describe('EmergencyRealtimeController', () => {
  let controller: EmergencyRealtimeController;
  let realtimeService: EmergencyRealtimeService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [EmergencyRealtimeController],
      providers: [
        EmergencyRealtimeService,
        EmergencyWhiteboardService,
        WorkflowActionLogService,
        EmergencyPatientService,
        EmergencySettingsService,
        CareDroidCentralNodeService,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(() => ({ sub: 'user-1', tokenUse: 'access' })),
          },
        },
      ],
    })
      // These functional tests exercise the SSE stream directly (controller.stream()), not
      // through a real HTTP request pipeline, so AuthorizationGuard's own canActivate() never
      // runs either way -- but Nest's DI container still needs to construct it (per @UseGuards
      // metadata), which requires Reflector/AuditService that this minimal test module doesn't
      // provide. Real guard behavior (permission decorator + guard presence) is covered by
      // emergency-realtime-authorization.spec.ts instead, matching the established pattern in
      // emergency-os.controller.spec.ts.
      .overrideGuard(AuthorizationGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(EmergencyRealtimeController);
    realtimeService = moduleRef.get(EmergencyRealtimeService);
  });

  it('streams initial burst events to subscribers', async () => {
    const events: Array<{ type?: string }> = [];
    const subscription = controller.stream().subscribe({
      next: (message) => {
        const payload = typeof message.data === 'string' ? JSON.parse(message.data) : message.data;
        events.push(payload);
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    subscription.unsubscribe();

    expect(events.some((event) => event.type === 'connected')).toBe(true);
    expect(events.some((event) => event.type === 'whiteboard_snapshot')).toBe(true);
  });

  it('forwards bus events to active stream subscribers', async () => {
    const events: Array<{ type?: string }> = [];
    const subscription = controller.stream().subscribe({
      next: (message) => {
        const payload = typeof message.data === 'string' ? JSON.parse(message.data) : message.data;
        events.push(payload);
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    realtimeService.publish({ type: 'alert_created', payload: { id: 'alert-1' } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    subscription.unsubscribe();

    expect(events.some((event) => event.type === 'alert_created')).toBe(true);
  });
});

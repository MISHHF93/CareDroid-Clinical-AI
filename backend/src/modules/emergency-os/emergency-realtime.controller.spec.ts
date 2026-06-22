import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { EmergencyRealtimeController } from './emergency-realtime.controller';
import { EmergencyRealtimeService } from './emergency-realtime.service';
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
    }).compile();

    controller = moduleRef.get(EmergencyRealtimeController);
    realtimeService = moduleRef.get(EmergencyRealtimeService);
  });

  it('streams initial burst events to subscribers', async () => {
    const events: Array<{ type?: string }> = [];
    const subscription = controller.stream().subscribe({
      next: (message) => {
        const payload =
          typeof message.data === 'string' ? JSON.parse(message.data) : message.data;
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
        const payload =
          typeof message.data === 'string' ? JSON.parse(message.data) : message.data;
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

import { Test, TestingModule } from '@nestjs/testing';
import {
  EmergencyPatientService,
  ReassessmentService,
  WorkflowActionLogService,
} from './emergency-os.services';
import { EmailService } from '../email/email.service';

// Regression coverage for the 2026-08-08 fix: the Waiting Room Safety domain's own
// "Required for full marks" item asked to extend the already-real in-app escalation
// transition past the browser tab. Investigation found the scorecard's OWN prior "real
// backend cron" evidence was itself wrong -- reassessment.scheduler.ts only starts
// inside registerEmergencyMongooseRuntime(), gated behind ENABLE_MONGOOSE_EMERGENCY_OS
// (defaults false), so it never runs in the actual app. The genuinely-live mechanism is
// the frontend's alertLifecycleOrchestrator.ts 3-minute auto-escalation. This fix wires
// a real out-of-band email channel onto that live mechanism using the EmailService and
// INCIDENT_ESCALATION_EMAILS config that already existed but had no real sender.

const ORIGINAL_ENV = { ...process.env };

describe('ReassessmentService.notifyWaitingRoomEscalation', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.clearAllMocks();
  });

  it('sends a real email to every configured escalation recipient', async () => {
    process.env.INCIDENT_ESCALATION_EMAILS = 'charge-nurse@example.com,triage-lead@example.com';
    const sendEmail = jest.fn().mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowActionLogService,
        EmergencyPatientService,
        ReassessmentService,
        { provide: EmailService, useValue: { sendEmail } },
      ],
    }).compile();

    const service = module.get<ReassessmentService>(ReassessmentService);
    const result = await service.notifyWaitingRoomEscalation({
      patientId: 'patient-1',
      alertId: 'alert-1',
      title: 'Waiting room escalation',
      message: 'Critical alert unacknowledged for 3 minutes.',
    });

    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'charge-nurse@example.com',
        subject: expect.stringContaining('Waiting room escalation'),
      }),
    );
    expect(result.data.sent).toBe(true);
    expect(result.data.recipientCount).toBe(2);
    expect(result.data.sentCount).toBe(2);
  });

  it('does not throw and reports sent:false when no recipients are configured', async () => {
    delete process.env.INCIDENT_ESCALATION_EMAILS;
    const sendEmail = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowActionLogService,
        EmergencyPatientService,
        ReassessmentService,
        { provide: EmailService, useValue: { sendEmail } },
      ],
    }).compile();

    const service = module.get<ReassessmentService>(ReassessmentService);
    const result = await service.notifyWaitingRoomEscalation({ title: 'x', message: 'y' });

    expect(sendEmail).not.toHaveBeenCalled();
    expect(result.data.sent).toBe(false);
    expect(result.data.recipientCount).toBe(0);
  });

  it('does not throw when the email service is unavailable (graceful degradation)', async () => {
    process.env.INCIDENT_ESCALATION_EMAILS = 'charge-nurse@example.com';

    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkflowActionLogService, EmergencyPatientService, ReassessmentService],
    }).compile();

    const service = module.get<ReassessmentService>(ReassessmentService);
    await expect(
      service.notifyWaitingRoomEscalation({ title: 'x', message: 'y' }),
    ).resolves.toEqual(expect.objectContaining({ data: expect.objectContaining({ sent: false }) }));
  });

  it('does not fail the whole call when one recipient send rejects', async () => {
    process.env.INCIDENT_ESCALATION_EMAILS = 'bad@example.com,good@example.com';
    const sendEmail = jest
      .fn()
      .mockRejectedValueOnce(new Error('SMTP timeout'))
      .mockResolvedValueOnce(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowActionLogService,
        EmergencyPatientService,
        ReassessmentService,
        { provide: EmailService, useValue: { sendEmail } },
      ],
    }).compile();

    const service = module.get<ReassessmentService>(ReassessmentService);
    const result = await service.notifyWaitingRoomEscalation({ title: 'x', message: 'y' });

    expect(result.data.sent).toBe(true);
    expect(result.data.sentCount).toBe(1);
    expect(result.data.recipientCount).toBe(2);
  });
});

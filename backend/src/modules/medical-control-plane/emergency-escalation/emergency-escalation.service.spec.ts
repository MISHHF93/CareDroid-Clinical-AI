import {
  EmergencyEscalationService,
  EmergencySeverity,
  EscalationActionType,
} from './emergency-escalation.service';

describe('EmergencyEscalationService demo hardening', () => {
  it('marks external escalation actions as simulated placeholders', async () => {
    const auditService = { log: jest.fn().mockResolvedValue({}) };
    const metricsService = { recordEmergencyDetection: jest.fn() };
    const service = new EmergencyEscalationService(auditService as any, metricsService as any);

    const result = await service.escalate({ primaryIntent: 'emergency', confidence: 0.95 } as any, {
      severity: EmergencySeverity.CRITICAL,
      category: 'cardiac',
      keywords: ['chest pain'],
      context: {
        userId: 'user-1',
        message: 'Patient has crushing chest pain',
        timestamp: new Date('2026-06-06T18:00:00.000Z'),
      },
    });

    expect(result.simulationMode).toBe(true);
    expect(result.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: EscalationActionType.CALL_911,
          simulated: true,
          externalIntegrationRequired: true,
        }),
      ]),
    );
    expect(result.message).toMatch(/simulated escalation mode/i);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({
          simulationMode: true,
          externalIntegrationsConfigured: false,
        }),
      }),
    );
  });
});

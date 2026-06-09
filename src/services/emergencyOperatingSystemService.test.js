import { describe, expect, it } from 'vitest';
import EmergencyOperatingSystemService, {
  getEmergencyOperatingSystem,
} from './emergencyOperatingSystemService';

describe('EmergencyOperatingSystemService', () => {
  it('unifies the Emergency Workspace into one operating system payload', () => {
    const operatingSystem = getEmergencyOperatingSystem();

    expect(operatingSystem).toEqual(
      expect.objectContaining({
        serviceId: 'emergency-department-operating-system',
        title: 'Emergency Department Operating System',
        route: '/workspace/emergency',
        status: 'standalone-saas-ready',
        responsibilities: [
          'patient flow',
          'queue flow',
          'referral flow',
          'EMS flow',
          'capacity flow',
          'discharge flow',
        ],
      })
    );
  });

  it('contains all required Emergency operating layers', () => {
    const operatingSystem = EmergencyOperatingSystemService.getOperatingSystem();

    expect(operatingSystem.patientFlow.engine.metrics.totalStates).toBe(12);
    expect(operatingSystem.queueFlow.metrics.queueCount).toBe(7);
    expect(operatingSystem.referralFlow.departments).toEqual([
      'Cardiology',
      'Neurology',
      'Psychiatry',
      'Internal Medicine',
      'Surgery',
    ]);
    expect(operatingSystem.emsFlow.metrics.incomingCount).toBeGreaterThan(0);
    expect(operatingSystem.capacityFlow.score).toEqual(expect.any(Number));
    expect(operatingSystem.boardingFlow.metrics.boardingCount).toBeGreaterThan(0);
    expect(operatingSystem.copilot.copilotId).toBe('emergency-ai-copilot');
    expect(operatingSystem.analytics.route).toBe('/workspace/emergency/analytics');
    expect(operatingSystem.automationMarketplace.metrics.totalModules).toBe(10);
  });

  it('builds discharge flow from queue, capacity, and automation marketplace signals', () => {
    const operatingSystem = getEmergencyOperatingSystem();

    expect(operatingSystem.dischargeFlow).toEqual(
      expect.objectContaining({
        queue: expect.objectContaining({
          id: 'discharge-queue',
        }),
        dischargeCandidates: expect.any(Number),
        automations: expect.arrayContaining([
          expect.objectContaining({
            categories: expect.arrayContaining(['Discharge']),
          }),
        ]),
      })
    );
  });

  it('summarizes leadership status for the Emergency hero dashboard', () => {
    const operatingSystem = getEmergencyOperatingSystem();

    expect(operatingSystem.leadershipSummary).toEqual(
      expect.objectContaining({
        activePatients: expect.any(Number),
        waitingPatients: expect.any(Number),
        queueBottlenecks: expect.any(Number),
        emsArrivals: expect.any(Number),
        capacityScore: expect.any(Number),
        referralDelays: expect.any(Number),
        boardingCount: expect.any(Number),
        automationModules: 10,
      })
    );
    expect(operatingSystem.positioning).toMatch(/standalone SaaS solution/i);
  });
});

import { describe, expect, it } from 'vitest';
import { HospitalRoboticsFleetService } from './hospitalRoboticsFleetService';

describe('HospitalRoboticsFleetService', () => {
  it('registers and retrieves robots from the fleet', () => {
    const service = new HospitalRoboticsFleetService();
    const fleet = service.listFleet();
    expect(fleet.length).toBeGreaterThanOrEqual(3);

    const tug = service.getRobot('bot-tug-pharmacy-01');
    expect(tug).toBeDefined();
    expect(tug?.type).toBe('hospital_logistics');
    expect(tug?.status).toBe('docked');
  });

  it('dispatches a robot with payload and updates status to navigating', async () => {
    const service = new HospitalRoboticsFleetService();
    const result = await service.dispatchRobotTask({
      robotType: 'hospital_logistics',
      destinationZone: 'Emergency Department',
      destinationRoom: 'Resuscitation Room 1',
      payload: {
        payloadType: 'medications',
        description: 'Stat Alteplase (tPA) for Acute Ischemic Stroke',
        isSecureCompartmentLocked: true,
        requiresPinOrBadgeToUnlock: true,
        assignedPatientId: 'pt-10492',
        dispatchRequestId: 'disp-req-900',
        originLocation: 'Central Pharmacy',
        destinationLocation: 'Trauma Bay 1',
      },
      priority: 'stat_emergency',
      requestingUserId: 'physician-stroke-01',
      requestingUserRole: 'emergency_physician',
    });

    expect(result.success).toBe(true);
    expect(result.dispatchedRobotId).toBe('bot-tug-pharmacy-01');
    expect(result.estimatedArrivalSeconds).toBeGreaterThan(0);

    const robot = service.getRobot('bot-tug-pharmacy-01');
    expect(robot?.status).toBe('navigating');
    expect(robot?.currentPayload?.description).toContain('Alteplase');
  });

  it('triggers emergency stop on individual robot and rejects dispatch', async () => {
    const service = new HospitalRoboticsFleetService();
    const robotId = 'bot-tele-stroke-01';

    const stopped = await service.triggerRobotEmergencyStop(robotId);
    expect(stopped).toBe(true);

    const robot = service.getRobot(robotId);
    expect(robot?.safety.emergencyStopActive).toBe(true);
    expect(robot?.status).toBe('emergency_stopped');

    const dispatchAttempt = await service.dispatchRobotTask({
      robotId,
      destinationZone: 'ED',
      destinationRoom: 'Bay 3',
      priority: 'urgent',
      requestingUserId: 'nurse-01',
      requestingUserRole: 'emergency_nurse',
    });
    expect(dispatchAttempt.success).toBe(false);
    expect(dispatchAttempt.message).toContain('Emergency Stop');
  });

  it('resumes robot after emergency stop clearance', async () => {
    const service = new HospitalRoboticsFleetService();
    const robotId = 'bot-tele-stroke-01';
    await service.triggerRobotEmergencyStop(robotId);

    const resumed = await service.resumeRobot(robotId);
    expect(resumed).toBe(true);

    const robot = service.getRobot(robotId);
    expect(robot?.safety.emergencyStopActive).toBe(false);
    expect(robot?.status).toBe('docked');
  });

  it('triggers fleet-wide emergency stop across all robots', async () => {
    const service = new HospitalRoboticsFleetService();
    const count = await service.triggerFleetEmergencyStop();
    expect(count).toBeGreaterThanOrEqual(3);

    const summary = service.getFleetStatusSummary();
    expect(summary.emergencyStopped).toBe(count);
  });

  it('unlocks payload compartment only with valid badge or PIN', async () => {
    const service = new HospitalRoboticsFleetService();
    await service.dispatchRobotTask({
      robotId: 'bot-tug-pharmacy-01',
      destinationZone: 'ED',
      destinationRoom: 'Bay 1',
      payload: {
        payloadType: 'medications',
        description: 'Controlled Narcotic',
        isSecureCompartmentLocked: true,
        requiresPinOrBadgeToUnlock: true,
        dispatchRequestId: 'req-1',
        originLocation: 'Pharmacy',
        destinationLocation: 'ED',
      },
      priority: 'urgent',
      requestingUserId: 'nurse-9',
      requestingUserRole: 'emergency_nurse',
    });

    const failUnlock = await service.unlockPayloadCompartment('bot-tug-pharmacy-01', '12');
    expect(failUnlock).toBe(false);
    expect(service.getRobot('bot-tug-pharmacy-01')?.currentPayload?.isSecureCompartmentLocked).toBe(
      true,
    );

    const successUnlock = await service.unlockPayloadCompartment(
      'bot-tug-pharmacy-01',
      'BADGE-9912',
    );
    expect(successUnlock).toBe(true);
    expect(service.getRobot('bot-tug-pharmacy-01')?.currentPayload?.isSecureCompartmentLocked).toBe(
      false,
    );
  });
});

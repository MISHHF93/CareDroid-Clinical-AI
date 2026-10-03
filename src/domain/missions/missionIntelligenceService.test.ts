import { describe, expect, it } from 'vitest';
import { MissionIntelligenceService } from './missionIntelligenceService';

describe('MissionIntelligenceService', () => {
  it('registers and retrieves missions', () => {
    const service = new MissionIntelligenceService();
    const missions = service.listMissions();
    expect(missions.length).toBeGreaterThanOrEqual(1);

    const mci = service.getMission('mission-mci-drill-alpha');
    expect(mci).toBeDefined();
    expect(mci?.type).toBe('mass_casualty_response');
    expect(mci?.status).toBe('active');
  });

  it('activates mission and updates readiness score', () => {
    const service = new MissionIntelligenceService();
    service.createMission({
      id: 'mission-evac-01',
      codeName: 'EAST WING EVACUATION',
      type: 'hospital_evacuation',
      status: 'planning',
      severity: 'elevated',
      location: { siteName: 'East Wing Inpatient Pavilion' },
      commanderUserId: '',
      commanderRole: '',
      startedAtIso: new Date().toISOString(),
      readinessScorePercent: 0,
      safetyBriefingConfirmed: false,
      objectives: [
        {
          id: 'obj-evac-1',
          title: 'Evacuate Non-Ambulatory Patients',
          description: 'Transfer 12 bed-bound patients via smart stretchers to West Wing.',
          priority: 'critical',
          status: 'pending',
          assignedTeam: 'Transport Team',
          completionPercent: 0,
        },
      ],
      patients: [],
      allocatedAssets: [],
      personnel: [
        {
          userId: 'cmdr-jones',
          fullName: 'Chief Jones',
          role: 'Incident Commander',
          isIncidentCommander: true,
          team: 'Incident Command',
        },
      ],
      timeline: [],
    });

    const activated = service.activateMission(
      'mission-evac-01',
      'cmdr-jones',
      'emergency_physician',
    );
    expect(activated).toBe(true);

    const mission = service.getMission('mission-evac-01');
    expect(mission?.status).toBe('active');
    expect(mission?.safetyBriefingConfirmed).toBe(true);
    expect(mission?.readinessScorePercent).toBeGreaterThan(0);
    expect(mission?.timeline.length).toBeGreaterThan(0);
  });

  it('updates objective progress and recalculates score', () => {
    const service = new MissionIntelligenceService();
    const updated = service.updateObjective('mission-mci-drill-alpha', 'obj-2', 'completed', 100);
    expect(updated).toBe(true);

    const mission = service.getMission('mission-mci-drill-alpha');
    const obj = mission?.objectives.find((o) => o.id === 'obj-2');
    expect(obj?.status).toBe('completed');
    expect(obj?.completionPercent).toBe(100);
    expect(mission?.readinessScorePercent).toBeGreaterThanOrEqual(80);
  });

  it('allocates assets and attaches patient cases', () => {
    const service = new MissionIntelligenceService();
    const assetAllocated = service.allocateAsset('mission-mci-drill-alpha', {
      assetId: 'bot-tug-pharmacy-01',
      assetType: 'hospital_robot',
      name: 'Pharmacy Delivery Tug',
      status: 'en_route',
      fuelOrBatteryPercent: 95,
    });
    expect(assetAllocated).toBe(true);

    const patientAdded = service.addPatientCase('mission-mci-drill-alpha', {
      patientId: 'pt-mci-02',
      triageAcuity: 'ESI-2',
      chiefComplaint: 'Compound fracture, controlled bleeding',
      assignedVehicleOrBay: 'Trauma Bay 2',
      status: 'stabilizing',
    });
    expect(patientAdded).toBe(true);

    const mission = service.getMission('mission-mci-drill-alpha');
    expect(mission?.allocatedAssets.some((a) => a.assetId === 'bot-tug-pharmacy-01')).toBe(true);
    expect(mission?.patients.some((p) => p.patientId === 'pt-mci-02')).toBe(true);
  });

  it('completes a mission and marks conclusion timestamp', () => {
    const service = new MissionIntelligenceService();
    const completed = service.completeMission(
      'mission-mci-drill-alpha',
      'All patients transported, triage corridor demobilized.',
    );
    expect(completed).toBe(true);

    const mission = service.getMission('mission-mci-drill-alpha');
    expect(mission?.status).toBe('completed');
    expect(mission?.completedAtIso).toBeDefined();
  });
});

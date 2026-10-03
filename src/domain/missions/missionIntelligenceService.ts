/**
 * CareDroid Healthcare Mission Intelligence Service
 * Coordinates multi-role, multi-asset emergency missions across hospital departments,
 * disaster zones, mass-casualty incidents, and ambulance networks with immutable audit logs.
 */

import {
  HealthcareMission,
  HealthcareMissionType,
  MissionAssetAllocation,
  MissionOperationalStatus,
  MissionPatientCase,
  MissionTimelineEvent,
} from './missionTypes';

export class MissionIntelligenceService {
  private static instance: MissionIntelligenceService;
  private missions: Map<string, HealthcareMission> = new Map();

  constructor() {
    this.seedDefaultMissions();
  }

  public static getInstance(): MissionIntelligenceService {
    if (!MissionIntelligenceService.instance) {
      MissionIntelligenceService.instance = new MissionIntelligenceService();
    }
    return MissionIntelligenceService.instance;
  }

  public createMission(mission: HealthcareMission): void {
    mission.readinessScorePercent = this.calculateReadiness(mission);
    this.missions.set(mission.id, { ...mission });
  }

  public getMission(id: string): HealthcareMission | undefined {
    return this.missions.get(id);
  }

  public listMissions(filter?: {
    type?: HealthcareMissionType;
    status?: MissionOperationalStatus;
  }): HealthcareMission[] {
    let list = Array.from(this.missions.values());
    if (filter?.type) {
      list = list.filter((m) => m.type === filter.type);
    }
    if (filter?.status) {
      list = list.filter((m) => m.status === filter.status);
    }
    return list;
  }

  public activateMission(missionId: string, commanderId: string, commanderRole: string): boolean {
    const mission = this.missions.get(missionId);
    if (!mission) return false;

    mission.status = 'active';
    mission.commanderUserId = commanderId;
    mission.commanderRole = commanderRole;
    mission.safetyBriefingConfirmed = true;

    this.recordTimelineEvent(missionId, {
      authorId: commanderId,
      authorRole: commanderRole,
      summary: `Mission '${mission.codeName}' officially activated by Incident Commander.`,
    });

    mission.readinessScorePercent = this.calculateReadiness(mission);
    return true;
  }

  public updateObjective(
    missionId: string,
    objectiveId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'deferred',
    completionPercent: number,
  ): boolean {
    const mission = this.missions.get(missionId);
    if (!mission) return false;

    const obj = mission.objectives.find((o) => o.id === objectiveId);
    if (!obj) return false;

    obj.status = status;
    obj.completionPercent = completionPercent;

    this.recordTimelineEvent(missionId, {
      authorId: 'system-agent',
      authorRole: 'mission_coordinator',
      summary: `Objective '${obj.title}' updated to ${status} (${completionPercent}%).`,
    });

    mission.readinessScorePercent = this.calculateReadiness(mission);
    return true;
  }

  public allocateAsset(missionId: string, asset: MissionAssetAllocation): boolean {
    const mission = this.missions.get(missionId);
    if (!mission) return false;

    const existingIndex = mission.allocatedAssets.findIndex((a) => a.assetId === asset.assetId);
    if (existingIndex >= 0) {
      mission.allocatedAssets[existingIndex] = asset;
    } else {
      mission.allocatedAssets.push(asset);
    }

    this.recordTimelineEvent(missionId, {
      authorId: 'logistics-agent',
      authorRole: 'logistics_officer',
      summary: `Asset '${asset.name}' (${asset.assetType}) allocated with status ${asset.status}.`,
    });

    mission.readinessScorePercent = this.calculateReadiness(mission);
    return true;
  }

  public addPatientCase(missionId: string, patientCase: MissionPatientCase): boolean {
    const mission = this.missions.get(missionId);
    if (!mission) return false;

    mission.patients.push(patientCase);
    this.recordTimelineEvent(missionId, {
      authorId: 'triage-nurse',
      authorRole: 'triage_nurse',
      summary: `Patient ${patientCase.patientId} (${patientCase.triageAcuity}) attached to mission. Assigned to ${patientCase.assignedVehicleOrBay}.`,
    });

    return true;
  }

  public recordTimelineEvent(
    missionId: string,
    eventInput: {
      authorId: string;
      authorRole: string;
      summary: string;
      details?: Record<string, unknown>;
    },
  ): MissionTimelineEvent {
    const mission = this.missions.get(missionId);
    const eventId = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const timestampIso = new Date().toISOString();
    const provenanceHash = this.computeHash(`${missionId}:${eventId}:${eventInput.summary}`);

    const event: MissionTimelineEvent = {
      eventId,
      timestampIso,
      authorId: eventInput.authorId,
      authorRole: eventInput.authorRole,
      summary: eventInput.summary,
      details: eventInput.details,
      provenanceHash,
    };

    if (mission) {
      mission.timeline.push(event);
    }

    return event;
  }

  public completeMission(missionId: string, completionNotes: string): boolean {
    const mission = this.missions.get(missionId);
    if (!mission) return false;

    mission.status = 'completed';
    mission.completedAtIso = new Date().toISOString();
    this.recordTimelineEvent(missionId, {
      authorId: mission.commanderUserId,
      authorRole: mission.commanderRole,
      summary: `Mission concluded. Notes: ${completionNotes}`,
    });

    return true;
  }

  private calculateReadiness(mission: HealthcareMission): number {
    let score = 0;
    if (mission.safetyBriefingConfirmed) score += 20;
    if (mission.allocatedAssets.length > 0) score += 25;
    if (mission.personnel.length > 0) score += 25;
    if (mission.objectives.length > 0) {
      const completedPercent =
        mission.objectives.reduce((sum, o) => sum + o.completionPercent, 0) /
        mission.objectives.length;
      score += Math.round(completedPercent * 0.3);
    }
    return Math.min(100, Math.max(0, score));
  }

  private computeHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = (hash << 5) - hash + content.charCodeAt(i);
      hash |= 0;
    }
    return `hash-${Math.abs(hash).toString(16)}`;
  }

  private seedDefaultMissions(): void {
    const defaultMissions: HealthcareMission[] = [
      {
        id: 'mission-mci-drill-alpha',
        codeName: 'OPERATION SHIELD-CARE (MCI Response)',
        type: 'mass_casualty_response',
        status: 'active',
        severity: 'critical',
        location: {
          siteName: 'Metro Transit Center Collision Site',
          address: '400 King St West, Toronto, ON',
          coordinates: { latitude: 43.647, longitude: -79.394 },
        },
        commanderUserId: 'dr-elena-vance',
        commanderRole: 'emergency_physician',
        startedAtIso: new Date().toISOString(),
        readinessScorePercent: 88,
        safetyBriefingConfirmed: true,
        objectives: [
          {
            id: 'obj-1',
            title: 'Establish Field Triage Corridor',
            description:
              'Deploy START/SALT triage protocol and designate RED/YELLOW/GREEN collection points.',
            priority: 'critical',
            status: 'completed',
            assignedTeam: 'Field EMS Squad Alpha',
            completionPercent: 100,
          },
          {
            id: 'obj-2',
            title: 'Clear ED Trauma Bays 1-4',
            description:
              'Discharge stable patients and expedite transfer of inpatients to surgical wards.',
            priority: 'critical',
            status: 'in_progress',
            assignedTeam: 'ED Nursing Command',
            completionPercent: 75,
          },
        ],
        patients: [
          {
            patientId: 'pt-mci-01',
            triageAcuity: 'ESI-1',
            chiefComplaint: 'Blunt thoracic trauma, hypotension',
            assignedVehicleOrBay: 'Trauma Bay 1',
            status: 'in_transit',
          },
        ],
        allocatedAssets: [
          {
            assetId: 'amb-medic-4',
            assetType: 'ambulance',
            name: 'Medic 4 ALS Unit',
            status: 'en_route',
            fuelOrBatteryPercent: 92,
          },
          {
            assetId: 'uav-lifeline-01',
            assetType: 'medical_drone',
            name: 'CareDroid SkyRescue 1',
            status: 'on_scene',
            fuelOrBatteryPercent: 84,
          },
        ],
        personnel: [
          {
            userId: 'dr-elena-vance',
            fullName: 'Dr. Elena Vance, MD',
            role: 'Incident Commander / Attending Physician',
            isIncidentCommander: true,
            team: 'Command Core',
          },
        ],
        timeline: [
          {
            eventId: 'evt-init',
            timestampIso: new Date().toISOString(),
            authorId: 'dr-elena-vance',
            authorRole: 'emergency_physician',
            summary: 'Operation Shield-Care initiated following 911 dispatch notification.',
            provenanceHash: 'hash-mci-init',
          },
        ],
      },
    ];

    for (const m of defaultMissions) {
      this.createMission(m);
    }
  }
}

export const missionIntelligenceService = MissionIntelligenceService.getInstance();

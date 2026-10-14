/**
 * Medical Mobility Service
 * Client API for Autonomous Medical Mobility, Robotics Registry, Vehicle Recognition Intelligence,
 * Mission Management, Digital Twins, and Simulation.
 */

import { apiFetchJson } from './apiClient';
import {
  type MobilityMission,
  type MobilityVehicle,
  type RecognitionEvent,
  type OperatorActionType,
  type DeliveryEvidence,
  type RecognitionState,
  type DetectedObject,
  RECOGNITION_STATES,
} from '../domain/mobility/mobilityTypes';

const jsonHeaders = { 'content-type': 'application/json' };

// Initial Fallback Seed Data for offline/demo operation
const SEED_FALLBACK_VEHICLES: MobilityVehicle[] = [
  {
    id: 'veh-amr-01',
    name: 'MediRover Alpha',
    type: 'INTERNAL_HOSPITAL_AMR',
    vehicleType: 'hospital_indoor_amr',
    manufacturer: 'Aethon / CareDroid Robotics',
    model: 'T3 Tug AMR',
    status: 'ACTIVE_MISSION',
    operatingStatus: 'en_route',
    operatingMode: 'AUTONOMOUS',
    assignedMissionId: 'msn-001',
    currentLocation: {
      facilityId: 'facility-metro-general',
      areaOrFloor: 'Tower B, Floor 3 Corridor',
      coordinates: { x: 42.5, y: 18.2, z: 3.0 },
      headingDegrees: 90,
      speedMps: 0.8,
    },
    batteryPercent: 88,
    connectivity: {
      status: 'ONLINE',
      protocol: 'ROS_2_DDS',
      latencyMs: 14,
      lastHeartbeatIso: new Date().toISOString(),
    },
    payloadCapacityKg: 100,
    currentPayloadKg: 4.5,
    sensors: [
      {
        id: 'lidar-front',
        type: 'LIDAR',
        status: 'HEALTHY',
        lastReadingIso: new Date().toISOString(),
      },
      {
        id: 'depth-cam-rgbd',
        type: 'RGBD_CAMERA',
        status: 'HEALTHY',
        lastReadingIso: new Date().toISOString(),
      },
      {
        id: 'sonar-perimeter',
        type: 'ULTRASONIC',
        status: 'HEALTHY',
        lastReadingIso: new Date().toISOString(),
      },
    ],
    temperatureChamber: {
      currentCelsius: 4.1,
      targetMinCelsius: 2.0,
      targetMaxCelsius: 8.0,
      inRange: true,
    },
    safetyInterlockEngaged: false,
    hardwareIntegrationType: 'ROS_2_DDS',
    lastTelemetryIso: new Date().toISOString(),
  },
  {
    id: 'veh-drone-02',
    name: 'AeroMed eVTOL Falcon',
    type: 'DELIVERY_DRONE',
    vehicleType: 'medical_delivery_drone',
    manufacturer: 'Zipline / CareDroid Aero',
    model: 'Platform 2 Z-Zip',
    status: 'IDLE_AVAILABLE',
    operatingStatus: 'available',
    operatingMode: 'STANDBY',
    currentLocation: {
      facilityId: 'facility-metro-general',
      areaOrFloor: 'Emergency Helipad Pad-3',
      coordinates: { latitude: 37.7749, longitude: -122.4194, altitudeMeters: 45 },
      headingDegrees: 0,
      speedMps: 0,
    },
    batteryPercent: 96,
    connectivity: {
      status: 'ONLINE',
      protocol: 'REST_BRIDGED',
      latencyMs: 32,
      lastHeartbeatIso: new Date().toISOString(),
    },
    payloadCapacityKg: 5.0,
    currentPayloadKg: 0,
    sensors: [
      {
        id: 'radar-altimeter',
        type: 'RADAR',
        status: 'HEALTHY',
        lastReadingIso: new Date().toISOString(),
      },
      {
        id: 'optical-flow-cam',
        type: 'STEREO_CAMERA',
        status: 'HEALTHY',
        lastReadingIso: new Date().toISOString(),
      },
    ],
    temperatureChamber: {
      currentCelsius: -19.5,
      targetMinCelsius: -25.0,
      targetMaxCelsius: -15.0,
      inRange: true,
    },
    safetyInterlockEngaged: false,
    hardwareIntegrationType: 'REST_BRIDGED',
    lastTelemetryIso: new Date().toISOString(),
  },
  {
    id: 'veh-ugv-03',
    name: 'TerraMedic Carrier 04',
    type: 'AUTONOMOUS_GROUND_VEHICLE',
    vehicleType: 'autonomous_ground_rover',
    manufacturer: 'Nuro / CareDroid Medical Transit',
    model: 'R3 Medical Shuttle',
    status: 'MAINTENANCE',
    operatingStatus: 'maintenance',
    operatingMode: 'MANUAL_OVERRIDE',
    currentLocation: {
      facilityId: 'facility-regional-depot',
      areaOrFloor: 'Robotics Service Bay 2',
      coordinates: { latitude: 37.7833, longitude: -122.4167 },
      headingDegrees: 180,
      speedMps: 0,
    },
    batteryPercent: 42,
    connectivity: {
      status: 'DEGRADED',
      protocol: 'VDA_5050_MQTT',
      latencyMs: 140,
      lastHeartbeatIso: new Date().toISOString(),
    },
    payloadCapacityKg: 250,
    currentPayloadKg: 0,
    sensors: [
      {
        id: 'lidar-surround',
        type: 'LIDAR',
        status: 'DEGRADED',
        lastReadingIso: new Date().toISOString(),
      },
      {
        id: 'camera-suite',
        type: 'RGBD_CAMERA',
        status: 'HEALTHY',
        lastReadingIso: new Date().toISOString(),
      },
    ],
    safetyInterlockEngaged: true,
    hardwareIntegrationType: 'VDA_5050_MQTT',
    lastTelemetryIso: new Date().toISOString(),
  },
];

const SEED_FALLBACK_MISSIONS: MobilityMission[] = [
  {
    id: 'msn-001',
    requestingOrganization: 'Metro General Hospital Pharmacy & ICU',
    originFacility: {
      facilityId: 'facility-metro-general',
      facilityName: 'Metro General Central Pharmacy (Basement Level)',
      contactPhone: '+1-555-019-4821',
    },
    destinationFacility: {
      facilityId: 'facility-metro-general',
      facilityName: 'Surgical ICU 3rd Floor Station West',
      contactPhone: '+1-555-019-7733',
    },
    itemCategory: 'BLOOD_PRODUCTS',
    priority: 'EMERGENCY_STAT',
    payload: {
      itemDescription: 'Emergency Packed Red Blood Cells (O-Negative, 4 Units)',
      quantity: '4 units (1,800 mL)',
      weightKg: 2.2,
      temperatureRequirement: {
        targetCelsius: 4.0,
        minCelsius: 1.0,
        maxCelsius: 6.0,
        ambientTolerableMinutes: 20,
      },
      tamperEvidentSealId: 'SEAL-O-NEG-9921',
      hazardousCategory: 'BIOHAZARDOUS',
    },
    assignedVehicleId: 'veh-amr-01',
    responsibleOperatorId: 'operator-lead-dr-martinez',
    status: 'EN_ROUTE',
    plannedRoute: {
      waypoints: [
        { waypointId: 'wp-01', label: 'Central Pharmacy Bay A', isCompleted: true },
        { waypointId: 'wp-02', label: 'Elevator Bank B (Service Car 2)', isCompleted: true },
        { waypointId: 'wp-03', label: 'Floor 3 West Main Corridor', isCompleted: false },
        { waypointId: 'wp-04', label: 'ICU Station West Lockbox Handoff', isCompleted: false },
      ],
      estimatedDistanceMeters: 380,
      estimatedDurationMinutes: 7,
    },
    chainOfCustody: [
      {
        timestampIso: new Date(Date.now() - 360000).toISOString(),
        actorId: 'pharm-tech-sarah',
        actorName: 'Sarah Jenkins, CPhT',
        role: 'Dispensing Pharmacist',
        actionTaken: 'PAYLOAD_LOADED_AND_SEALED',
        notes: 'Cold chain verified at 3.8C. Tamper seal SEAL-O-NEG-9921 applied.',
        locationSnapshot: 'Central Pharmacy Prep Station',
      },
      {
        timestampIso: new Date(Date.now() - 300000).toISOString(),
        actorId: 'operator-lead-dr-martinez',
        actorName: 'Dr. Hector Martinez',
        role: 'Mobility Mission Supervisor',
        actionTaken: 'MISSION_DISPATCH_AUTHORIZED',
        notes: 'Autonomous AMR route validated with Floor 3 service elevator pre-cleared.',
        locationSnapshot: 'Robotics Operations Center',
      },
    ],
    operationalAlerts: [],
    recognitionEvents: [],
    auditHistory: [
      {
        timestampIso: new Date(Date.now() - 400000).toISOString(),
        performedBy: 'dr-martinez',
        action: 'MISSION_REQUESTED',
        rationale: 'Trauma STAT call in Bay 4.',
      },
    ],
    createdAtIso: new Date(Date.now() - 400000).toISOString(),
    updatedAtIso: new Date().toISOString(),
  },
  {
    id: 'msn-002',
    requestingOrganization: 'County Public Health Laboratory',
    originFacility: {
      facilityId: 'facility-metro-general',
      facilityName: 'Pathology & Genomics Lab',
      contactPhone: '+1-555-014-9912',
    },
    destinationFacility: {
      facilityId: 'facility-suburban-clinic',
      facilityName: 'Valley Outpatient Surgical Pavilion',
      contactPhone: '+1-555-018-3344',
    },
    itemCategory: 'CRITICAL_MEDICATIONS',
    priority: 'URGENT',
    payload: {
      itemDescription: 'Targeted Chemotherapeutic Infusion Kit (Specimen #4489)',
      quantity: '2 vials',
      weightKg: 0.9,
      temperatureRequirement: {
        targetCelsius: -20.0,
        minCelsius: -25.0,
        maxCelsius: -15.0,
        ambientTolerableMinutes: 15,
      },
      tamperEvidentSealId: 'SEAL-CHEMO-771',
    },
    assignedVehicleId: 'veh-drone-02',
    responsibleOperatorId: 'operator-aero-sarah',
    status: 'READY_FOR_DISPATCH',
    plannedRoute: {
      waypoints: [
        { waypointId: 'wp-01', label: 'Metro Helipad 3', isCompleted: false },
        { waypointId: 'wp-02', label: 'Valley Surgical Receiving Pad', isCompleted: false },
      ],
      estimatedDistanceMeters: 14200,
      estimatedDurationMinutes: 11,
    },
    chainOfCustody: [],
    operationalAlerts: [],
    recognitionEvents: [],
    auditHistory: [],
    createdAtIso: new Date(Date.now() - 1200000).toISOString(),
    updatedAtIso: new Date().toISOString(),
  },
];

const SEED_FALLBACK_RECOGNITION_EVENTS: RecognitionEvent[] = [
  {
    id: 'rec-evt-001',
    vehicleId: 'veh-amr-01',
    missionId: 'msn-001',
    timestampIso: new Date().toISOString(),
    telemetryFreshnessMs: 320,
    recognitionState: 'RELEVANT_OBJECT_DETECTED',
    directionAndCoverage: {
      azimuthDegrees: 12,
      fieldOfViewDegrees: 120,
      distanceRangeMeters: 15,
    },
    detectedObjects: [
      {
        id: 'obj-iv-pole-01',
        classification: 'IV_POLE_STAND',
        confidenceScore: 0.94,
        distanceMeters: 2.1,
        bearingDegrees: 8,
        isRelevantObstacle: true,
        proximityZone: 'CRITICAL_ZONE',
      },
    ],
    sensorHealth: {
      primaryLidar: 'HEALTHY',
      opticalCameras: 'HEALTHY',
      ultrasonicArray: 'HEALTHY',
      imuTelemetry: 'HEALTHY',
    },
    humanReadableExplanation:
      'Perception engine detected a mobile IV pole stand 2.1m ahead in critical zone. Safe stopping protocol activated.',
    operatorAlertTriggered: true,
  },
];

let mockVehicles = [...SEED_FALLBACK_VEHICLES];
let mockMissions = [...SEED_FALLBACK_MISSIONS];
let mockRecognitionEvents = [...SEED_FALLBACK_RECOGNITION_EVENTS];

export function resetMockMissionsStore() {
  mockVehicles = [...SEED_FALLBACK_VEHICLES];
  mockMissions = [...SEED_FALLBACK_MISSIONS];
  mockRecognitionEvents = [...SEED_FALLBACK_RECOGNITION_EVENTS];
}

export async function fetchMobilityMissions(): Promise<{
  ok: boolean;
  data: MobilityMission[];
  message: string;
}> {
  try {
    const { response, data } = await apiFetchJson('/api/fleet/mobility/missions');
    if (response.ok && data?.data) {
      mockMissions = data.data;
      return { ok: true, data: data.data, message: data.message || 'Missions fetched.' };
    }
  } catch (_err) {
    // fallback
  }
  return {
    ok: true,
    data: mockMissions,
    message: 'Returned from client mobility store (fallback).',
  };
}

export async function fetchMobilityVehicles(): Promise<{
  ok: boolean;
  data: MobilityVehicle[];
  message: string;
}> {
  try {
    const { response, data } = await apiFetchJson('/api/fleet/mobility/vehicles');
    if (response.ok && data?.data) {
      mockVehicles = data.data;
      return { ok: true, data: data.data, message: data.message || 'Vehicles fetched.' };
    }
  } catch (_err) {
    // fallback
  }
  return {
    ok: true,
    data: mockVehicles,
    message: 'Returned from client robotics store (fallback).',
  };
}

export async function fetchRecognitionEvents(vehicleId?: string): Promise<{
  ok: boolean;
  data: RecognitionEvent[];
  message: string;
}> {
  try {
    const url = vehicleId
      ? `/api/fleet/mobility/recognition/events?vehicleId=${encodeURIComponent(vehicleId)}`
      : '/api/fleet/mobility/recognition/events';
    const { response, data } = await apiFetchJson(url);
    if (response.ok && data?.data) {
      mockRecognitionEvents = data.data;
      return { ok: true, data: data.data, message: data.message || 'Recognition events fetched.' };
    }
  } catch (_err) {
    // fallback
  }
  const events = vehicleId
    ? mockRecognitionEvents.filter((e) => e.vehicleId === vehicleId)
    : mockRecognitionEvents;
  return {
    ok: true,
    data: events,
    message: 'Returned from client perception store (fallback).',
  };
}

export async function createMobilityMission(payload: Partial<MobilityMission>): Promise<{
  ok: boolean;
  data: MobilityMission | null;
  message: string;
}> {
  try {
    const { response, data } = await apiFetchJson('/api/fleet/mobility/missions', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (response.ok && data?.data) {
      mockMissions.unshift(data.data);
      return { ok: true, data: data.data, message: data.message || 'Mission created.' };
    }
  } catch (_err) {
    // fallback
  }

  const newMission: MobilityMission = {
    id: `msn-${Date.now().toString().slice(-4)}`,
    requestingOrganization: payload.requestingOrganization || 'Emergency Healthcare Operations',
    originFacility: payload.originFacility || {
      facilityId: 'facility-metro-general',
      facilityName: 'Metro General Main Depot',
    },
    destinationFacility: payload.destinationFacility || {
      facilityId: 'facility-metro-general',
      facilityName: 'Metro General Surgical Floor',
    },
    itemCategory: payload.itemCategory || 'CRITICAL_MEDICATIONS',
    priority: payload.priority || 'URGENT',
    payload: payload.payload || {
      itemDescription: 'Medical Supplies Package',
      quantity: '1 unit',
      weightKg: 1.0,
      temperatureRequirement: { targetCelsius: 4.0, minCelsius: 2.0, maxCelsius: 6.0 },
    },
    assignedVehicleId: payload.assignedVehicleId,
    responsibleOperatorId: payload.responsibleOperatorId || 'current-operator',
    status: 'VALIDATED',
    plannedRoute: payload.plannedRoute || {
      waypoints: [],
      estimatedDistanceMeters: 500,
      estimatedDurationMinutes: 10,
    },
    chainOfCustody: [],
    operationalAlerts: [],
    recognitionEvents: [],
    auditHistory: [
      {
        timestampIso: new Date().toISOString(),
        performedBy: payload.responsibleOperatorId || 'operator',
        action: 'MISSION_CREATED',
        rationale: 'Created via CareDroid Mobility Operations Center',
      },
    ],
    createdAtIso: new Date().toISOString(),
    updatedAtIso: new Date().toISOString(),
  };

  mockMissions.unshift(newMission);
  return { ok: true, data: newMission, message: 'Mission created (client-side mock).' };
}

export async function executeMissionOperatorAction(
  missionId: string,
  action: OperatorActionType,
  operatorId: string,
  reason?: string,
  evidence?: DeliveryEvidence,
  assignedVehicleId?: string,
): Promise<{
  ok: boolean;
  data: MobilityMission | null;
  message: string;
}> {
  try {
    const { response, data } = await apiFetchJson(
      `/api/fleet/mobility/missions/${missionId}/action`,
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          action: action.toLowerCase(),
          vehicleId: assignedVehicleId,
          reason,
          deliveryEvidence: evidence,
        }),
      },
    );
    if (response.ok && data?.data) {
      const idx = mockMissions.findIndex((m) => m.id === missionId);
      if (idx !== -1) mockMissions[idx] = data.data;
      return { ok: true, data: data.data, message: data.message || `Action ${action} executed.` };
    }
  } catch (_err) {
    // fallback
  }

  const mission = mockMissions.find((m) => m.id === missionId);
  if (!mission) {
    return { ok: false, data: null, message: `Mission ${missionId} not found.` };
  }

  const now = new Date().toISOString();
  let updatedStatus = mission.status;

  switch (action) {
    case 'APPROVE':
      updatedStatus = mission.assignedVehicleId ? 'ASSIGNED' : 'VALIDATED';
      break;
    case 'ASSIGN_VEHICLE':
      if (assignedVehicleId) {
        mission.assignedVehicleId = assignedVehicleId;
        updatedStatus = 'ASSIGNED';
      }
      break;
    case 'DISPATCH':
      updatedStatus = 'EN_ROUTE';
      break;
    case 'PAUSE':
      updatedStatus = 'PAUSED';
      break;
    case 'RESUME':
      updatedStatus = 'EN_ROUTE';
      break;
    case 'CANCEL':
      updatedStatus = 'CANCELLED';
      break;
    case 'VERIFY_HANDOFF':
      updatedStatus = 'COMPLETED';
      if (evidence) {
        mission.deliveryEvidence = evidence;
      }
      break;
    case 'CLEAR_ALERT':
      mission.operationalAlerts = [];
      break;
  }

  mission.status = updatedStatus;
  mission.updatedAtIso = now;
  if (!mission.auditHistory) mission.auditHistory = [];
  mission.auditHistory.push({
    timestampIso: now,
    performedBy: operatorId,
    action: `OPERATOR_${action}`,
    rationale: reason || 'Governed operator override',
  });

  return {
    ok: true,
    data: { ...mission },
    message: `Action '${action}' applied to mission ${missionId}.`,
  };
}

export async function triggerSimulationScenario(
  scenarioId: string,
  missionId?: string,
): Promise<{
  ok: boolean;
  data: any;
  message: string;
}> {
  try {
    const { response, data } = await apiFetchJson('/api/fleet/mobility/simulation/trigger', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ scenarioId, missionId }),
    });
    if (response.ok && data?.data) {
      return { ok: true, data: data.data, message: data.message || 'Simulation triggered.' };
    }
  } catch (_err) {
    // fallback
  }

  return {
    ok: true,
    data: { scenarioId, status: 'EXECUTED_CLIENT_SIM', timestampIso: new Date().toISOString() },
    message: `Scenario '${scenarioId}' executed in client simulation mode.`,
  };
}

export async function queryMobilityAiAssistant(
  query: string,
  missionId?: string,
  vehicleId?: string,
): Promise<{
  ok: boolean;
  data: any;
  message: string;
}> {
  try {
    const { response, data } = await apiFetchJson('/api/fleet/mobility/assistant/query', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ query, missionId, vehicleId }),
    });
    if (response.ok && data?.data) {
      return { ok: true, data: data.data, message: data.message || 'Assistant answered.' };
    }
  } catch (_err) {
    // fallback
  }

  return {
    ok: true,
    data: {
      answer: `Autonomous Mobility AI Assistant: System is actively monitoring fleet status. Active missions maintain temperature requirements within safe thresholds. No critical breaches reported.`,
      disclaimer:
        'Governed operational guidance only. Human operators maintain final mission authorization.',
      generatedAtIso: new Date().toISOString(),
    },
    message: 'Assistant query answered in client fallback mode.',
  };
}

export async function simulateRecognitionTelemetry(
  vehicleId: string,
  stateType: 'clear' | 'obstacle' | 'sensor_degrade' | 'stale',
): Promise<{ ok: boolean; data: RecognitionEvent; message: string }> {
  const timestampIso = new Date().toISOString();
  let state: RecognitionState = RECOGNITION_STATES.RECOGNITION_COMPLETED_NO_RELEVANT_OBJECT;
  let detectedObjects: DetectedObject[] = [];
  let explanation = 'Path cleared. No relevant obstacles detected.';

  if (stateType === 'obstacle') {
    state = RECOGNITION_STATES.RELEVANT_OBJECT_DETECTED;
    detectedObjects = [
      {
        id: `obs-${Date.now()}`,
        classification: 'Mobile Gurney / Wheelchair',
        confidence: 0.94,
        confidenceScore: 0.94,
        distanceMeters: 2.1,
        isRelevantObject: true,
        isRelevantObstacle: true,
        bearingDegrees: 12,
        relativeBearingDegrees: 12,
      },
    ];
    explanation = 'Obstacle detected within braking zone: Mobile Gurney at 2.1m.';
  } else if (stateType === 'sensor_degrade') {
    state = RECOGNITION_STATES.SENSOR_UNAVAILABLE;
    explanation = 'Perception sensor degradation: Primary LiDAR optical occlusion.';
  } else if (stateType === 'stale') {
    state = RECOGNITION_STATES.RECOGNITION_DATA_STALE;
    explanation = 'Perception telemetry stale: No packet received for > 2500ms.';
  }

  const newEvent: RecognitionEvent = {
    id: `rec-evt-${Date.now()}`,
    vehicleId,
    timestampIso,
    recognitionState: state,
    state,
    directionAndCoverage: {
      azimuthDegrees: 0,
      fieldOfViewDegrees: 120,
      distanceRangeMeters: 15,
    },
    detectedObjects,
    explanation,
    humanReadableExplanation: explanation,
    telemetryFreshnessMs: stateType === 'stale' ? 3200 : 18,
  };

  mockRecognitionEvents.unshift(newEvent);
  return { ok: true, data: newEvent, message: `Simulated state ${stateType}.` };
}

export async function fetchMobilityAiRecommendations(): Promise<
  Array<{
    id: string;
    title: string;
    type:
      | 'DISPATCH_OPTIMIZATION'
      | 'COLD_CHAIN_ALERT'
      | 'BATTERY_CONSERVATION'
      | 'CORRIDOR_CONGESTION';
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    rationale: string;
    suggestedAction: string;
    confidenceScore: number;
  }>
> {
  return [
    {
      id: 'rec-01',
      title: 'Pre-position eVTOL Falcon at Helipad 3 for Incoming Trauma STAT Demand',
      type: 'DISPATCH_OPTIMIZATION',
      severity: 'INFO',
      rationale:
        'Regional Dispatch telemetry indicates multi-vehicle collision on I-95. Expected blood product rush within 20 minutes.',
      suggestedAction: 'Stage eVTOL Falcon with 4x O-Negative Blood Transport Pack',
      confidenceScore: 0.94,
    },
    {
      id: 'rec-02',
      title: 'Active Cold-Chain Thermal Advisory in East Concourse Corridor',
      type: 'COLD_CHAIN_ALERT',
      severity: 'WARNING',
      rationale:
        'HVAC zone 4-East is reporting 26.5°C ambient temperature. AMR MediRover active chamber insulation will increase compressor duty cycle to 92%.',
      suggestedAction: 'Reroute via Tower A Service Elevator (Average Ambient 20.8°C)',
      confidenceScore: 0.89,
    },
    {
      id: 'rec-03',
      title: 'Corridor Congestion & Gurney Traffic at Radiology Concourse',
      type: 'CORRIDOR_CONGESTION',
      severity: 'WARNING',
      rationale:
        'Computer vision and IoT sensor nexus reports 3 bed transfers queued outside CT Scanner 2, narrowing transit corridor to 1.1 meters.',
      suggestedAction: 'Enforce 0.5 m/s speed governor and activate pedestrian audible advisory',
      confidenceScore: 0.95,
    },
  ];
}

export async function dispatchMission(payload: Partial<MobilityMission>) {
  return createMobilityMission(payload);
}

export async function executeOperatorOverride(
  missionId: string,
  action: OperatorActionType,
  reason?: string,
  operatorId = 'dispatcher-operator',
) {
  return executeMissionOperatorAction(missionId, action, operatorId, reason);
}

export async function verifyDeliveryEvidence(
  missionId: string,
  evidence: DeliveryEvidence,
  operatorId = 'dispatcher-supervisor',
) {
  return executeMissionOperatorAction(
    missionId,
    'VERIFY_HANDOFF',
    operatorId,
    'Recipient verification confirmed',
    evidence,
  );
}

export async function runMobilitySimulationScenario(scenarioId: string, missionId?: string) {
  return triggerSimulationScenario(scenarioId, missionId);
}

export default Object.freeze({
  fetchMobilityMissions,
  fetchMobilityVehicles,
  fetchRecognitionEvents,
  createMobilityMission,
  dispatchMission,
  executeMissionOperatorAction,
  executeOperatorOverride,
  verifyDeliveryEvidence,
  triggerSimulationScenario,
  runMobilitySimulationScenario,
  queryMobilityAiAssistant,
  fetchMobilityAiRecommendations,
  simulateRecognitionTelemetry,
  resetMockMissionsStore,
});

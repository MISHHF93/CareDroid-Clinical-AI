import type {
  EmergencyCall,
  EmergencyCallStatus,
  CallPriority,
  DispatcherAssessment,
  DispatchAssignment,
  EntityId,
  ISODateString,
} from '../types/emergency';


function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): ISODateString {
  return new Date().toISOString();
}

let callSequence = 1000;
function nextCallNumber(): string {
  callSequence += 1;
  return `CAD-${callSequence}`;
}

const activeCalls = new Map<EntityId, EmergencyCall>();

export function createEmergencyCall(params: {
  chiefComplaint: string;
  address: string;
  dispatcherId: EntityId;
  dispatcherName: string;
  callerName?: string;
  callerPhone?: string;
  crossStreet?: string;
  landmark?: string;
  patientAge?: number;
  patientSex?: 'male' | 'female' | 'unknown';
  patientConscious?: boolean;
  patientBreathing?: boolean;
  notes?: string;
}): EmergencyCall {
  const call: EmergencyCall = {
    id: generateId('call'),
    callNumber: nextCallNumber(),
    receivedAt: now(),
    callPriority: 'Charlie',
    status: 'received',
    chiefComplaint: params.chiefComplaint,
    callerName: params.callerName,
    callerPhone: params.callerPhone,
    location: {
      address: params.address,
      crossStreet: params.crossStreet,
      landmark: params.landmark,
    },
    patientAge: params.patientAge,
    patientSex: params.patientSex,
    patientConscious: params.patientConscious,
    patientBreathing: params.patientBreathing,
    dispatcherId: params.dispatcherId,
    dispatcherName: params.dispatcherName,
    notes: params.notes,
    updatedAt: now(),
  };
  activeCalls.set(call.id, call);
  void import('./emergencyCareJourneyOrchestrator').then(({ onEmergencyCallLogged }) => onEmergencyCallLogged(call));
  return call;
}

export function updateCallStatus(callId: EntityId, status: EmergencyCallStatus): EmergencyCall | null {
  const call = activeCalls.get(callId);
  if (!call) return null;
  const updated: EmergencyCall = { ...call, status, updatedAt: now() };
  activeCalls.set(callId, updated);
  if (status === 'triaged') {
    void import('./emergencyCareJourneyOrchestrator').then(({ onDispatcherTriage }) => onDispatcherTriage(callId));
  }
  return updated;
}

export function updateCallPriority(callId: EntityId, priority: CallPriority): EmergencyCall | null {
  const call = activeCalls.get(callId);
  if (!call) return null;
  const updated: EmergencyCall = { ...call, callPriority: priority, updatedAt: now() };
  activeCalls.set(callId, updated);
  if (call.status === 'received') {
    void import('./emergencyCareJourneyOrchestrator').then(({ onDispatcherTriage }) => onDispatcherTriage(callId));
  }
  return updated;
}

export function linkCallToEmsArrival(callId: EntityId, emsArrivalId: EntityId): EmergencyCall | null {
  const call = activeCalls.get(callId);
  if (!call) return null;
  const updated: EmergencyCall = { ...call, linkedEmsArrivalId: emsArrivalId, updatedAt: now() };
  activeCalls.set(callId, updated);
  return updated;
}

export function linkCallToPatient(callId: EntityId, patientId: EntityId): EmergencyCall | null {
  const call = activeCalls.get(callId);
  if (!call) return null;
  const updated: EmergencyCall = { ...call, linkedPatientId: patientId, updatedAt: now() };
  activeCalls.set(callId, updated);
  return updated;
}

export function closeCall(callId: EntityId): EmergencyCall | null {
  const call = activeCalls.get(callId);
  if (!call) return null;
  const updated: EmergencyCall = { ...call, status: 'closed', updatedAt: now() };
  activeCalls.set(callId, updated);
  return updated;
}

export function getActiveCall(callId: EntityId): EmergencyCall | null {
  return activeCalls.get(callId) ?? null;
}

export function getAllActiveCalls(): EmergencyCall[] {
  return [...activeCalls.values()].filter((c) => c.status !== 'closed');
}

export function createDispatcherAssessment(params: {
  callId: EntityId;
  dispatcherId: EntityId;
  determinedPriority: CallPriority;
  keySymptoms: string[];
  requiresALS: boolean;
  requiresBLS?: boolean;
  requiresAir?: boolean;
  hazmatConcern?: boolean;
  multiCasualtyIncident?: boolean;
  dispatchProtocol?: string;
  preArrivalInstructions?: string[];
  medicalHistoryFlags?: string[];
  notes?: string;
}): DispatcherAssessment {
  return {
    id: generateId('disp-assess'),
    callId: params.callId,
    dispatcherId: params.dispatcherId,
    assessedAt: now(),
    determinedPriority: params.determinedPriority,
    dispatchProtocol: params.dispatchProtocol,
    preArrivalInstructions: params.preArrivalInstructions ?? [],
    keySymptoms: params.keySymptoms,
    medicalHistoryFlags: params.medicalHistoryFlags ?? [],
    requiresALS: params.requiresALS,
    requiresBLS: params.requiresBLS ?? !params.requiresALS,
    requiresAir: params.requiresAir ?? false,
    hazmatConcern: params.hazmatConcern ?? false,
    multiCasualtyIncident: params.multiCasualtyIncident ?? false,
    notes: params.notes,
  };
}

export function createDispatchAssignment(params: {
  callId: EntityId;
  dispatchedBy: EntityId;
  unit: DispatchAssignment['unit'];
  estimatedResponseMinutes?: number;
  specialInstructions?: string;
}): DispatchAssignment {
  const assignment: DispatchAssignment = {
    id: generateId('assign'),
    callId: params.callId,
    assignedAt: now(),
    unit: params.unit,
    dispatchedBy: params.dispatchedBy,
    estimatedResponseMinutes: params.estimatedResponseMinutes,
    specialInstructions: params.specialInstructions,
    status: 'assigned',
  };
  updateCallStatus(params.callId, 'dispatched');
  return assignment;
}

export function acknowledgeDispatch(assignment: DispatchAssignment): DispatchAssignment {
  return { ...assignment, status: 'en_route', acknowledgedAt: now() };
}

export type DispatchCallSummary = {
  total: number;
  received: number;
  dispatched: number;
  enRoute: number;
  onScene: number;
  transporting: number;
  echoCount: number;
  deltaCount: number;
};

export function getDispatchSummary(): DispatchCallSummary {
  const calls = getAllActiveCalls();
  return {
    total: calls.length,
    received: calls.filter((c) => c.status === 'received').length,
    dispatched: calls.filter((c) => c.status === 'dispatched').length,
    enRoute: calls.filter((c) => c.status === 'ems_en_route').length,
    onScene: calls.filter((c) => c.status === 'ems_on_scene').length,
    transporting: calls.filter((c) => c.status === 'ems_transporting').length,
    echoCount: calls.filter((c) => c.callPriority === 'Echo').length,
    deltaCount: calls.filter((c) => c.callPriority === 'Delta').length,
  };
}

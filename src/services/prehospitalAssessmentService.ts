/**
 * PrehospitalAssessmentService — EMS field assessment lifecycle service.
 *
 * Models the complete prehospital tier: scene assessment, serial vitals,
 * interventions, medication administration, and packet transmission to the
 * receiving hospital. AI output (risk summaries) requires clinician review.
 */

import type {
  PrehospitalAssessment,
  PrehospitalVitals,
  EmsCrewUpdate,
  PrehospitalPacket,
  EntityId,
  ISODateString,
  Priority,
  PreArrivalNotification,
} from '../types/emergency';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): ISODateString {
  return new Date().toISOString();
}

const assessments = new Map<EntityId, PrehospitalAssessment>();
const crewUpdates = new Map<EntityId, EmsCrewUpdate[]>();
const packets = new Map<EntityId, PrehospitalPacket>();

export function createPrehospitalAssessment(params: {
  callId: EntityId;
  assignmentId: EntityId;
  crewLeadId: EntityId;
  crewLeadName: string;
  mechanism: string;
  chiefComplaint: string;
  initialVitals?: PrehospitalVitals;
  pediatricPatient?: boolean;
}): PrehospitalAssessment {
  const assessment: PrehospitalAssessment = {
    id: generateId('prehospital'),
    callId: params.callId,
    assignmentId: params.assignmentId,
    crewLeadId: params.crewLeadId,
    crewLeadName: params.crewLeadName,
    status: 'in_progress',
    sceneArrivalAt: now(),
    mechanism: params.mechanism,
    chiefComplaint: params.chiefComplaint,
    vitalsHistory: params.initialVitals ? [params.initialVitals] : [],
    currentVitals: params.initialVitals,
    interventions: [],
    medicationsAdministered: [],
    ivAccess: false,
    traumaActivation: false,
    strokeAlert: false,
    stemiAlert: false,
    sepsisConcern: false,
    pediatricPatient: params.pediatricPatient ?? false,
    obstetricConcern: false,
  };
  assessments.set(assessment.id, assessment);
  crewUpdates.set(assessment.id, []);
  return assessment;
}

export function recordVitals(
  assessmentId: EntityId,
  vitals: Omit<PrehospitalVitals, 'capturedAt'>,
  crewMemberId: EntityId,
): PrehospitalAssessment | null {
  const assessment = assessments.get(assessmentId);
  if (!assessment) return null;

  const snapshot: PrehospitalVitals = { ...vitals, capturedAt: now() };
  const updated: PrehospitalAssessment = {
    ...assessment,
    vitalsHistory: [...assessment.vitalsHistory, snapshot],
    currentVitals: snapshot,
  };
  assessments.set(assessmentId, updated);

  addCrewUpdate(assessmentId, {
    updateType: 'vitals_update',
    content: `Vitals updated: HR ${vitals.hr ?? '?'} SpO2 ${vitals.spo2 ?? '?'}% BP ${vitals.sbp ?? '?'}/${vitals.dbp ?? '?'}`,
    vitals: snapshot,
    crewMemberId,
  });

  return updated;
}

export function addIntervention(
  assessmentId: EntityId,
  intervention: string,
  crewMemberId: EntityId,
): PrehospitalAssessment | null {
  const assessment = assessments.get(assessmentId);
  if (!assessment) return null;

  const updated: PrehospitalAssessment = {
    ...assessment,
    interventions: [...assessment.interventions, intervention],
    ivAccess: assessment.ivAccess || /iv\s*access|iv\s*line|peripheral\s*iv/i.test(intervention),
    airwayManagement: /airway|intubat|bvm|nasop|orop|supraglottic/i.test(intervention)
      ? intervention
      : assessment.airwayManagement,
  };
  assessments.set(assessmentId, updated);

  addCrewUpdate(assessmentId, {
    updateType: 'intervention',
    content: intervention,
    crewMemberId,
  });

  return updated;
}

export function administerMedication(
  assessmentId: EntityId,
  medication: { name: string; dose: string; route: string },
  crewMemberId: EntityId,
): PrehospitalAssessment | null {
  const assessment = assessments.get(assessmentId);
  if (!assessment) return null;

  const entry = { ...medication, time: now() };
  const updated: PrehospitalAssessment = {
    ...assessment,
    medicationsAdministered: [...assessment.medicationsAdministered, entry],
  };
  assessments.set(assessmentId, updated);

  addCrewUpdate(assessmentId, {
    updateType: 'medication',
    content: `${medication.name} ${medication.dose} ${medication.route}`,
    crewMemberId,
  });

  return updated;
}

export function setAlerts(
  assessmentId: EntityId,
  flags: {
    traumaActivation?: boolean;
    strokeAlert?: boolean;
    stemiAlert?: boolean;
    sepsisConcern?: boolean;
    obstetricConcern?: boolean;
  },
): PrehospitalAssessment | null {
  const assessment = assessments.get(assessmentId);
  if (!assessment) return null;

  const updated: PrehospitalAssessment = { ...assessment, ...flags };
  assessments.set(assessmentId, updated);
  return updated;
}

export function setEstimatedArrival(
  assessmentId: EntityId,
  estimatedArrivalAt: ISODateString,
): PrehospitalAssessment | null {
  const assessment = assessments.get(assessmentId);
  if (!assessment) return null;

  const updated: PrehospitalAssessment = { ...assessment, estimatedArrivalAt };
  assessments.set(assessmentId, updated);
  return updated;
}

function addCrewUpdate(
  assessmentId: EntityId,
  update: Omit<EmsCrewUpdate, 'id' | 'assessmentId' | 'timestamp'>,
): void {
  const existing = crewUpdates.get(assessmentId) ?? [];
  const entry: EmsCrewUpdate = {
    id: generateId('crew-update'),
    assessmentId,
    timestamp: now(),
    ...update,
  };
  crewUpdates.set(assessmentId, [...existing, entry]);
}

export function addNarrative(
  assessmentId: EntityId,
  narrative: string,
  crewMemberId: EntityId,
): PrehospitalAssessment | null {
  const assessment = assessments.get(assessmentId);
  if (!assessment) return null;

  const updated: PrehospitalAssessment = { ...assessment, narrative };
  assessments.set(assessmentId, updated);

  addCrewUpdate(assessmentId, {
    updateType: 'note',
    content: narrative,
    crewMemberId,
  });

  return updated;
}

export function transmitPrehospitalPacket(params: {
  assessmentId: EntityId;
  destinationHospitalId?: EntityId;
  priority: Priority;
  summary: string;
  notification?: PreArrivalNotification;
}): PrehospitalPacket | null {
  const assessment = assessments.get(params.assessmentId);
  if (!assessment) return null;

  const transmitted: PrehospitalAssessment = {
    ...assessment,
    status: 'transmitted',
    transmittedAt: now(),
    sceneDepartureAt: assessment.sceneDepartureAt ?? now(),
  };
  assessments.set(params.assessmentId, transmitted);

  const packet: PrehospitalPacket = {
    id: generateId('packet'),
    callId: assessment.callId,
    assessmentId: params.assessmentId,
    createdAt: now(),
    transmittedAt: now(),
    destinationHospitalId: params.destinationHospitalId,
    priority: params.priority,
    summary: params.summary,
    assessment: transmitted,
    notification: params.notification,
    requiresClinicianReview: true,
  };

  packets.set(packet.id, packet);
  return packet;
}

export function getAssessment(assessmentId: EntityId): PrehospitalAssessment | null {
  return assessments.get(assessmentId) ?? null;
}

export function getAssessmentForCall(callId: EntityId): PrehospitalAssessment | null {
  return [...assessments.values()].find((a) => a.callId === callId) ?? null;
}

export function getCrewUpdates(assessmentId: EntityId): EmsCrewUpdate[] {
  return crewUpdates.get(assessmentId) ?? [];
}

export function getPacket(packetId: EntityId): PrehospitalPacket | null {
  return packets.get(packetId) ?? null;
}

export function getPacketForCall(callId: EntityId): PrehospitalPacket | null {
  return [...packets.values()].find((p) => p.callId === callId) ?? null;
}

export function getAllActiveAssessments(): PrehospitalAssessment[] {
  return [...assessments.values()].filter((a) => a.status === 'in_progress');
}

export type PrehospitalSummary = {
  activeAssessments: number;
  transmittedPackets: number;
  alertFlags: {
    trauma: number;
    stroke: number;
    stemi: number;
    sepsis: number;
  };
};

export function getPrehospitalSummary(): PrehospitalSummary {
  const all = [...assessments.values()];
  return {
    activeAssessments: all.filter((a) => a.status === 'in_progress').length,
    transmittedPackets: [...packets.values()].length,
    alertFlags: {
      trauma: all.filter((a) => a.traumaActivation).length,
      stroke: all.filter((a) => a.strokeAlert).length,
      stemi: all.filter((a) => a.stemiAlert).length,
      sepsis: all.filter((a) => a.sepsisConcern).length,
    },
  };
}

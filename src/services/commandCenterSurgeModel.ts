import type { CapacitySnapshot, EMSArrival, Patient, Room } from '../types/emergency';
import { PatientState } from '../types/emergency';
import type { CommandCenterTone } from '../components/whiteboard/commandCenterThroughputModel';

export type ZoneOccupancy = {
  zoneId: string;
  zoneLabel: string;
  occupied: number;
  total: number;
  availabilityPercent: number;
  tone: CommandCenterTone;
};

export type CommandCenterSurgeSnapshot = {
  active: boolean;
  level: 'normal' | 'elevated' | 'surge' | 'crisis';
  headline: string;
  zoneOccupancy: ZoneOccupancy[];
  boardingCount: number;
  offloadDelayCount: number;
  bottleneckLabel: string;
  metrics: Array<{
    id: string;
    label: string;
    value: string | number;
    tone: CommandCenterTone;
    thresholdLabel: string;
  }>;
};

function ragTone(ratio: number): CommandCenterTone {
  if (ratio >= 0.9) return 'critical';
  if (ratio >= 0.75) return 'warning';
  if (ratio >= 0.6) return 'watch';
  return 'stable';
}

function zoneLabel(room: Room): string {
  const type = String(room.type || '').toLowerCase();
  if (type.includes('resus')) return 'Resus';
  if (type.includes('fast')) return 'Fast track';
  if (type.includes('obs')) return 'Observation';
  if (type.includes('psych')) return 'Psych';
  return 'Treatment';
}

export function buildCommandCenterSurgeSnapshot(input: {
  patients?: Patient[];
  rooms?: Room[];
  capacity?: CapacitySnapshot;
  emsArrivals?: EMSArrival[];
  offloadDelayCount?: number;
  offloadTargetMinutes?: number;
}): CommandCenterSurgeSnapshot {
  const patients = input.patients || [];
  const rooms = input.rooms || [];
  const boardingCount = patients.filter(
    (patient) => patient.state === PatientState.Admission || patient.flags.includes('PendingAdmission' as never),
  ).length;
  const waitingCount = patients.filter((patient) => patient.state === PatientState.Waiting).length;
  const inboundEms = (input.emsArrivals || []).filter((arrival) => arrival.status === 'Inbound').length;
  const offloadDelayCount = input.offloadDelayCount ?? 0;

  const zoneMap = new Map<string, { occupied: number; total: number; label: string }>();
  rooms.forEach((room) => {
    const label = zoneLabel(room);
    const entry = zoneMap.get(label) || { occupied: 0, total: 0, label };
    entry.total += 1;
    if (room.status === 'Occupied' || room.patientId || room.currentPatientId) entry.occupied += 1;
    zoneMap.set(label, entry);
  });

  const zoneOccupancy: ZoneOccupancy[] = [...zoneMap.entries()].map(([zoneId, entry]) => {
    const ratio = entry.total ? entry.occupied / entry.total : 0;
    return {
      zoneId,
      zoneLabel: entry.label,
      occupied: entry.occupied,
      total: entry.total,
      availabilityPercent: entry.total ? Math.round((1 - ratio) * 100) : 100,
      tone: ragTone(ratio),
    };
  });

  const capacityScore = Number(input.capacity?.capacityScore ?? 0);
  const level: CommandCenterSurgeSnapshot['level'] =
    capacityScore >= 90 || boardingCount >= 8
      ? 'crisis'
      : capacityScore >= 75 || waitingCount >= 15
        ? 'surge'
        : capacityScore >= 60 || inboundEms >= 4
          ? 'elevated'
          : 'normal';

  const active = level === 'surge' || level === 'crisis';

  let bottleneckLabel = 'Flow within normal thresholds';
  if (boardingCount >= 5) bottleneckLabel = 'Inpatient boarding delaying ED throughput';
  else if (offloadDelayCount >= 2) bottleneckLabel = 'EMS offload delays at receiving bay';
  else if (waitingCount >= 12) bottleneckLabel = 'Provider queue bottleneck';
  else if (inboundEms >= 3) bottleneckLabel = 'Multiple inbound EMS units';

  return {
    active,
    level,
    headline:
      level === 'crisis'
        ? 'Crisis mode — escalate staffing and bed management'
        : level === 'surge'
          ? 'Surge mode — monitor capacity and boarding closely'
          : level === 'elevated'
            ? 'Elevated demand — proactive huddle recommended'
            : 'Operations stable',
    zoneOccupancy,
    boardingCount,
    offloadDelayCount,
    bottleneckLabel,
    metrics: [
      {
        id: 'boarding',
        label: 'Boarding patients',
        value: boardingCount,
        tone: boardingCount >= 6 ? 'critical' : boardingCount >= 3 ? 'warning' : 'stable',
        thresholdLabel: '≥6 critical · ≥3 watch',
      },
      {
        id: 'waiting',
        label: 'Waiting for provider',
        value: waitingCount,
        tone: waitingCount >= 15 ? 'critical' : waitingCount >= 8 ? 'warning' : 'stable',
        thresholdLabel: '≥15 critical · ≥8 watch',
      },
      {
        id: 'ems-inbound',
        label: 'Inbound EMS',
        value: inboundEms,
        tone: inboundEms >= 5 ? 'critical' : inboundEms >= 3 ? 'warning' : 'stable',
        thresholdLabel: '≥5 critical · ≥3 watch',
      },
      {
        id: 'offload-delays',
        label: 'Offload delays',
        value: offloadDelayCount,
        tone: offloadDelayCount >= 3 ? 'critical' : offloadDelayCount >= 1 ? 'warning' : 'stable',
        thresholdLabel: `>${input.offloadTargetMinutes ?? 15}m target`,
      },
    ],
  };
}
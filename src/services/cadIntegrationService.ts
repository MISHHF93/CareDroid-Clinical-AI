/**
 * CADIntegrationService — Computer-Aided Dispatch integration stub.
 *
 * Represents the CAD system that assigns ambulance/EMS units to emergency calls
 * based on location, unit availability, severity, and required resource type.
 * In production this would connect to an external CAD feed (e.g. Motorola PremierOne,
 * Hexagon). There is NO such connection here: this module manages a fixed,
 * in-memory, fictional 7-unit registry only (see `cadUnits` below) -- not
 * connected to a real ambulance, EMS unit, or 911/CAD dispatch system. Same
 * terminology/limitation as the separate physician-initiated SIMULATED
 * transport-request feature (EMSIntakeService.requestPhysicianTransport) --
 * DispatchConsole.tsx surfaces both, deliberately never linked to each other.
 */

import type { DispatchAssignment, EntityId, ISODateString, CallPriority } from '../types/emergency';

export type CADUnitType = 'ALS' | 'BLS' | 'Air' | 'Hazmat' | 'MCI';

export type CADUnitStatus =
  | 'available'
  | 'assigned'
  | 'en_route'
  | 'on_scene'
  | 'transporting'
  | 'at_hospital'
  | 'out_of_service';

export interface CADUnit {
  id: EntityId;
  callSign: string;
  type: CADUnitType;
  crewSize: number;
  baseLocation: string;
  status: CADUnitStatus;
  activeAssignmentId?: EntityId;
  lastUpdatedAt: ISODateString;
}

export interface CADEvent {
  id: EntityId;
  type:
    | 'unit_dispatched'
    | 'unit_en_route'
    | 'unit_on_scene'
    | 'unit_transporting'
    | 'unit_at_hospital'
    | 'unit_available'
    | 'assignment_cancelled';
  unitId: EntityId;
  assignmentId?: EntityId;
  callId?: EntityId;
  timestamp: ISODateString;
  notes?: string;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): ISODateString {
  return new Date().toISOString();
}

const cadUnits = new Map<EntityId, CADUnit>([
  [
    'unit-a1',
    {
      id: 'unit-a1',
      callSign: 'Medic 1',
      type: 'ALS',
      crewSize: 2,
      baseLocation: 'Station 1 — Downtown',
      status: 'available',
      lastUpdatedAt: now(),
    },
  ],
  [
    'unit-a2',
    {
      id: 'unit-a2',
      callSign: 'Medic 2',
      type: 'ALS',
      crewSize: 2,
      baseLocation: 'Station 2 — Midtown',
      status: 'available',
      lastUpdatedAt: now(),
    },
  ],
  [
    'unit-b1',
    {
      id: 'unit-b1',
      callSign: 'EMS 3',
      type: 'BLS',
      crewSize: 2,
      baseLocation: 'Station 3 — Eastside',
      status: 'available',
      lastUpdatedAt: now(),
    },
  ],
  [
    'unit-b2',
    {
      id: 'unit-b2',
      callSign: 'EMS 4',
      type: 'BLS',
      crewSize: 2,
      baseLocation: 'Station 4 — Westside',
      status: 'available',
      lastUpdatedAt: now(),
    },
  ],
  [
    'unit-air1',
    {
      id: 'unit-air1',
      callSign: 'Air Med 1',
      type: 'Air',
      crewSize: 3,
      baseLocation: 'Helipad — City General',
      status: 'available',
      lastUpdatedAt: now(),
    },
  ],
  [
    'unit-haz1',
    {
      id: 'unit-haz1',
      callSign: 'Hazmat 1',
      type: 'Hazmat',
      crewSize: 4,
      baseLocation: 'Station 5 — Industrial',
      status: 'available',
      lastUpdatedAt: now(),
    },
  ],
  [
    'unit-mci1',
    {
      id: 'unit-mci1',
      callSign: 'MCI Unit 1',
      type: 'MCI',
      crewSize: 6,
      baseLocation: 'Station 6 — North',
      status: 'available',
      lastUpdatedAt: now(),
    },
  ],
]);

const cadEvents: CADEvent[] = [];
const assignments = new Map<EntityId, DispatchAssignment>();

function selectUnit(
  unitType: CADUnitType,
  requiresAir: boolean,
  requiresHazmat: boolean,
): CADUnit | undefined {
  if (requiresAir) {
    return [...cadUnits.values()].find((u) => u.type === 'Air' && u.status === 'available');
  }
  if (requiresHazmat) {
    return [...cadUnits.values()].find((u) => u.type === 'Hazmat' && u.status === 'available');
  }
  return [...cadUnits.values()].find((u) => u.type === unitType && u.status === 'available');
}

function estimatedResponseMinutes(priority: CallPriority): number {
  const base = { Echo: 3, Delta: 5, Charlie: 8, Bravo: 12, Alpha: 18 };
  return base[priority] ?? 10;
}

export function cadDispatchUnit(params: {
  callId: EntityId;
  dispatchedBy: EntityId;
  priority: CallPriority;
  requiresALS: boolean;
  requiresAir?: boolean;
  requiresHazmat?: boolean;
  specialInstructions?: string;
}): DispatchAssignment | { error: string } {
  const unitType: CADUnitType = params.requiresALS ? 'ALS' : 'BLS';
  const unit = selectUnit(unitType, params.requiresAir ?? false, params.requiresHazmat ?? false);

  if (!unit) {
    return { error: `No available ${unitType} unit. All units are assigned.` };
  }

  const assignment: DispatchAssignment = {
    id: generateId('cad-assign'),
    callId: params.callId,
    assignedAt: now(),
    unit: {
      id: unit.id,
      callSign: unit.callSign,
      type: unit.type,
      crewSize: unit.crewSize,
      baseLocation: unit.baseLocation,
    },
    dispatchedBy: params.dispatchedBy,
    estimatedResponseMinutes: estimatedResponseMinutes(params.priority),
    specialInstructions: params.specialInstructions,
    status: 'assigned',
  };

  const updatedUnit: CADUnit = {
    ...unit,
    status: 'assigned',
    activeAssignmentId: assignment.id,
    lastUpdatedAt: now(),
  };
  cadUnits.set(unit.id, updatedUnit);
  assignments.set(assignment.id, assignment);

  cadEvents.push({
    id: generateId('cad-event'),
    type: 'unit_dispatched',
    unitId: unit.id,
    assignmentId: assignment.id,
    callId: params.callId,
    timestamp: now(),
  });

  return assignment;
}

export function cadUpdateAssignmentStatus(
  assignmentId: EntityId,
  status: DispatchAssignment['status'],
): DispatchAssignment | null {
  const assignment = assignments.get(assignmentId);
  if (!assignment) return null;

  const updated: DispatchAssignment = { ...assignment, status };
  assignments.set(assignmentId, updated);

  const unitEntry = [...cadUnits.values()].find((u) => u.activeAssignmentId === assignmentId);
  if (unitEntry) {
    const unitStatus: CADUnitStatus =
      status === 'en_route'
        ? 'en_route'
        : status === 'on_scene'
          ? 'on_scene'
          : status === 'transporting'
            ? 'transporting'
            : status === 'at_hospital'
              ? 'at_hospital'
              : 'available';

    const updatedUnit: CADUnit = {
      ...unitEntry,
      status: unitStatus,
      activeAssignmentId: unitStatus === 'available' ? undefined : unitEntry.activeAssignmentId,
      lastUpdatedAt: now(),
    };
    cadUnits.set(unitEntry.id, updatedUnit);

    const eventType: CADEvent['type'] =
      status === 'en_route'
        ? 'unit_en_route'
        : status === 'on_scene'
          ? 'unit_on_scene'
          : status === 'transporting'
            ? 'unit_transporting'
            : status === 'at_hospital'
              ? 'unit_at_hospital'
              : 'unit_available';

    cadEvents.push({
      id: generateId('cad-event'),
      type: eventType,
      unitId: unitEntry.id,
      assignmentId,
      timestamp: now(),
    });
  }

  return updated;
}

export function getCADUnit(unitId: EntityId): CADUnit | null {
  return cadUnits.get(unitId) ?? null;
}

export function getAllCADUnits(): CADUnit[] {
  return [...cadUnits.values()];
}

export function getAvailableUnits(type?: CADUnitType): CADUnit[] {
  return [...cadUnits.values()].filter(
    (u) => u.status === 'available' && (!type || u.type === type),
  );
}

export function getActiveAssignments(): DispatchAssignment[] {
  return [...assignments.values()].filter((a) => a.status !== 'available');
}

export function getAssignmentForCall(callId: EntityId): DispatchAssignment | null {
  return [...assignments.values()].find((assignment) => assignment.callId === callId) ?? null;
}

export function getCADEvents(limit = 50): CADEvent[] {
  return cadEvents.slice(-limit);
}

export type CADSystemSummary = {
  totalUnits: number;
  availableUnits: number;
  dispatchedUnits: number;
  enRouteUnits: number;
  onSceneUnits: number;
  transportingUnits: number;
  activeAssignments: number;
};

export function getCADSystemSummary(): CADSystemSummary {
  const units = getAllCADUnits();
  return {
    totalUnits: units.length,
    availableUnits: units.filter((u) => u.status === 'available').length,
    dispatchedUnits: units.filter((u) => u.status === 'assigned').length,
    enRouteUnits: units.filter((u) => u.status === 'en_route').length,
    onSceneUnits: units.filter((u) => u.status === 'on_scene').length,
    transportingUnits: units.filter((u) => u.status === 'transporting').length,
    activeAssignments: getActiveAssignments().length,
  };
}

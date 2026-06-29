/**
 * StaffRoutingService — routes alerts and patient assignments to the correct
 * clinical or operational role based on alert type, patient acuity, and
 * current staff availability.
 *
 * This service provides decision support only. All staff assignment decisions
 * require acknowledgment from a licensed clinician or charge nurse.
 */

import type {
  StaffAssignment,
  EntityId,
  ISODateString,
  Priority,
} from '../types/emergency';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): ISODateString {
  return new Date().toISOString();
}

const assignments = new Map<EntityId, StaffAssignment>();

export type RoutingScenario =
  | 'critical_alert'
  | 'ems_pre_arrival'
  | 'triage_backlog'
  | 'high_acuity_patient'
  | 'diagnostics_needed'
  | 'handoff_required'
  | 'boarding_watch'
  | 'capacity_surge';

export interface RoutingRecommendation {
  scenario: RoutingScenario;
  primaryRole: string;
  backupRole: string;
  rationale: string;
  urgency: 'immediate' | 'urgent' | 'routine';
  requiresClinicianReview: true;
}

const ROUTING_RULES: Record<RoutingScenario, RoutingRecommendation> = {
  critical_alert: {
    scenario: 'critical_alert',
    primaryRole: 'charge_nurse',
    backupRole: 'emergency_physician',
    rationale: 'Critical alerts require immediate charge nurse awareness and physician escalation path.',
    urgency: 'immediate',
    requiresClinicianReview: true,
  },
  ems_pre_arrival: {
    scenario: 'ems_pre_arrival',
    primaryRole: 'triage_nurse',
    backupRole: 'charge_nurse',
    rationale: 'EMS pre-arrivals need triage nurse review and bed/equipment preparation coordination.',
    urgency: 'urgent',
    requiresClinicianReview: true,
  },
  triage_backlog: {
    scenario: 'triage_backlog',
    primaryRole: 'triage_nurse',
    backupRole: 'charge_nurse',
    rationale: 'Triage backlog requires additional triage nursing resources or charge nurse reallocation.',
    urgency: 'urgent',
    requiresClinicianReview: true,
  },
  high_acuity_patient: {
    scenario: 'high_acuity_patient',
    primaryRole: 'emergency_physician',
    backupRole: 'charge_nurse',
    rationale: 'P1/P2 patients require direct physician assignment and charge nurse support.',
    urgency: 'immediate',
    requiresClinicianReview: true,
  },
  diagnostics_needed: {
    scenario: 'diagnostics_needed',
    primaryRole: 'registered_nurse',
    backupRole: 'lab_technician',
    rationale: 'Diagnostic orders require nursing initiation and lab/radiology coordination.',
    urgency: 'urgent',
    requiresClinicianReview: true,
  },
  handoff_required: {
    scenario: 'handoff_required',
    primaryRole: 'registered_nurse',
    backupRole: 'charge_nurse',
    rationale: 'Structured handoffs require bedside nurse documentation and charge nurse sign-off.',
    urgency: 'routine',
    requiresClinicianReview: true,
  },
  boarding_watch: {
    scenario: 'boarding_watch',
    primaryRole: 'patient_flow_coordinator',
    backupRole: 'charge_nurse',
    rationale: 'Boarding patients need patient flow coordinator monitoring and bed management.',
    urgency: 'urgent',
    requiresClinicianReview: true,
  },
  capacity_surge: {
    scenario: 'capacity_surge',
    primaryRole: 'charge_nurse',
    backupRole: 'hospital_admin',
    rationale: 'Capacity surge requires charge nurse surge protocol activation and admin notification.',
    urgency: 'immediate',
    requiresClinicianReview: true,
  },
};

export function recommendRouting(
  scenario: RoutingScenario,
): RoutingRecommendation {
  return ROUTING_RULES[scenario];
}

export function routingForPriority(priority: Priority): RoutingRecommendation {
  if (priority === 'P1' || priority === 'P2') {
    return ROUTING_RULES.high_acuity_patient;
  }
  return ROUTING_RULES.triage_backlog;
}

export function createStaffAssignment(params: {
  patientId?: EntityId;
  alertId?: EntityId;
  role: string;
  staffId?: EntityId;
  assignedBy: EntityId | 'system';
  reason: string;
}): StaffAssignment {
  const assignment: StaffAssignment = {
    id: generateId('staff-assign'),
    patientId: params.patientId,
    alertId: params.alertId,
    role: params.role,
    staffId: params.staffId,
    assignedAt: now(),
    assignedBy: params.assignedBy,
    status: 'pending',
    reason: params.reason,
  };
  assignments.set(assignment.id, assignment);
  return assignment;
}

export function acknowledgeAssignment(assignmentId: EntityId): StaffAssignment | null {
  const a = assignments.get(assignmentId);
  if (!a) return null;
  const updated: StaffAssignment = { ...a, status: 'accepted' };
  assignments.set(assignmentId, updated);
  return updated;
}

export function completeAssignment(assignmentId: EntityId): StaffAssignment | null {
  const a = assignments.get(assignmentId);
  if (!a) return null;
  const updated: StaffAssignment = { ...a, status: 'completed' };
  assignments.set(assignmentId, updated);
  return updated;
}

export function reassignStaff(
  assignmentId: EntityId,
  newStaffId: EntityId,
  newRole: string,
): StaffAssignment | null {
  const a = assignments.get(assignmentId);
  if (!a) return null;
  const updated: StaffAssignment = { ...a, staffId: newStaffId, role: newRole, status: 'reassigned', assignedAt: now() };
  assignments.set(assignmentId, updated);
  return updated;
}

export function getAssignment(assignmentId: EntityId): StaffAssignment | null {
  return assignments.get(assignmentId) ?? null;
}

export function getAssignmentsForAlert(alertId: EntityId): StaffAssignment[] {
  return [...assignments.values()].filter((a) => a.alertId === alertId);
}

export function getAssignmentsForPatient(patientId: EntityId): StaffAssignment[] {
  return [...assignments.values()].filter((a) => a.patientId === patientId);
}

export function getPendingAssignments(): StaffAssignment[] {
  return [...assignments.values()].filter((a) => a.status === 'pending');
}

export type StaffRoutingSummary = {
  totalAssignments: number;
  pendingAcknowledgement: number;
  activeAssignments: number;
  completedAssignments: number;
};

export function getStaffRoutingSummary(): StaffRoutingSummary {
  const all = [...assignments.values()];
  return {
    totalAssignments: all.length,
    pendingAcknowledgement: all.filter((a) => a.status === 'pending').length,
    activeAssignments: all.filter((a) => a.status === 'accepted').length,
    completedAssignments: all.filter((a) => a.status === 'completed').length,
  };
}

export function getAllRoutingRules(): RoutingRecommendation[] {
  return Object.values(ROUTING_RULES);
}

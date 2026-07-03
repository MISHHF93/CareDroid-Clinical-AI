/**
 * CareDroid Three-Minute Mission — standardized emergency workflow model.
 * One workflow for critical patients, critical alerts, and EMS pre-arrival.
 */
import { CANONICAL_ROUTES } from './routes.config';
import type { ResponseTimerPhase } from '../engine/threeMinuteTimerEngine';

export const THREE_MINUTE_MISSION_TARGET_SECONDS = 180;
export const THREE_MINUTE_MISSION_PRINCIPLE =
  'It takes 3 minutes to save someone\'s life.';

export type ThreeMinuteMissionTrigger =
  | 'critical_alert'
  | 'ems_pre_arrival'
  | 'critical_patient'
  | 'reassessment_breach';

export type ThreeMinuteMissionTaskId =
  | 'acknowledge'
  | 'assign_owner'
  | 'clinical_response'
  | 'notify_department';

export type ThreeMinuteMissionTaskStatus = 'pending' | 'complete' | 'skipped';

export type ThreeMinuteMissionTask = Readonly<{
  id: ThreeMinuteMissionTaskId;
  label: string;
  status: ThreeMinuteMissionTaskStatus;
  ownerRole: string;
  completedAt?: string;
  completedBy?: string;
}>;

export type ThreeMinuteMissionDefinition = Readonly<{
  trigger: ThreeMinuteMissionTrigger;
  label: string;
  defaultOwnerRole: string;
  route: string;
  departmentNotifications: readonly string[];
  aiIntent: 'three_minute_response_plan';
  tasks: readonly Readonly<{ id: ThreeMinuteMissionTaskId; label: string; ownerRole: string }>[];
}>;

export const THREE_MINUTE_MISSION_DEFINITIONS: readonly ThreeMinuteMissionDefinition[] = Object.freeze([
  Object.freeze({
    trigger: 'critical_alert',
    label: 'Critical alert response',
    defaultOwnerRole: 'triage_nurse',
    route: CANONICAL_ROUTES.emergencyAlerts,
    departmentNotifications: ['triage', 'nursing', 'emergency_physician'],
    aiIntent: 'three_minute_response_plan',
    tasks: Object.freeze([
      { id: 'acknowledge', label: 'Acknowledge alert', ownerRole: 'triage_nurse' },
      { id: 'assign_owner', label: 'Confirm clinical owner', ownerRole: 'charge_nurse' },
      { id: 'clinical_response', label: 'Begin bedside response', ownerRole: 'triage_nurse' },
      { id: 'notify_department', label: 'Notify department', ownerRole: 'charge_nurse' },
    ]),
  }),
  Object.freeze({
    trigger: 'ems_pre_arrival',
    label: 'EMS pre-arrival readiness',
    defaultOwnerRole: 'charge_nurse',
    route: CANONICAL_ROUTES.emergencyEms,
    departmentNotifications: ['ems', 'triage', 'nursing', 'patient_flow'],
    aiIntent: 'three_minute_response_plan',
    tasks: Object.freeze([
      { id: 'acknowledge', label: 'Acknowledge inbound unit', ownerRole: 'charge_nurse' },
      { id: 'assign_owner', label: 'Assign receiving team', ownerRole: 'charge_nurse' },
      { id: 'clinical_response', label: 'Prepare bay and equipment', ownerRole: 'triage_nurse' },
      { id: 'notify_department', label: 'Notify receiving departments', ownerRole: 'ems_coordinator' },
    ]),
  }),
  Object.freeze({
    trigger: 'critical_patient',
    label: 'Critical patient intake',
    defaultOwnerRole: 'triage_nurse',
    route: CANONICAL_ROUTES.emergencyReception,
    departmentNotifications: ['triage', 'nursing'],
    aiIntent: 'three_minute_response_plan',
    tasks: Object.freeze([
      { id: 'acknowledge', label: 'Acknowledge critical patient', ownerRole: 'triage_nurse' },
      { id: 'assign_owner', label: 'Assign bedside owner', ownerRole: 'charge_nurse' },
      { id: 'clinical_response', label: 'Start triage response', ownerRole: 'triage_nurse' },
      { id: 'notify_department', label: 'Alert charge nurse', ownerRole: 'charge_nurse' },
    ]),
  }),
  Object.freeze({
    trigger: 'reassessment_breach',
    label: 'Reassessment breach',
    defaultOwnerRole: 'bedside_nurse',
    route: CANONICAL_ROUTES.emergencyReassessment,
    departmentNotifications: ['nursing', 'emergency_physician'],
    aiIntent: 'three_minute_response_plan',
    tasks: Object.freeze([
      { id: 'acknowledge', label: 'Acknowledge reassessment due', ownerRole: 'bedside_nurse' },
      { id: 'assign_owner', label: 'Confirm reassessment owner', ownerRole: 'charge_nurse' },
      { id: 'clinical_response', label: 'Complete reassessment', ownerRole: 'bedside_nurse' },
      { id: 'notify_department', label: 'Escalate if overdue', ownerRole: 'charge_nurse' },
    ]),
  }),
]);

export type ThreeMinuteMission = Readonly<{
  missionId: string;
  timerId: string;
  patientId?: string;
  emsArrivalId?: string;
  subjectLabel: string;
  trigger: ThreeMinuteMissionTrigger;
  triggerAlertId: string;
  startedAt: string;
  phase: ResponseTimerPhase;
  ownerRole: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  breachAt?: string;
  tasks: readonly ThreeMinuteMissionTask[];
  departmentsNotified: readonly string[];
  route: string;
  aiIntent: 'three_minute_response_plan';
  humanReviewRequired: true;
  advisoryOnly: true;
}>;

export type ThreeMinuteMissionSnapshot = Readonly<{
  generatedAt: string;
  principle: string;
  targetSeconds: number;
  activeMissions: readonly ThreeMinuteMission[];
  breachCount: number;
  unacknowledgedCount: number;
  complianceRate: number;
}>;

const DEFINITION_BY_TRIGGER = Object.freeze(
  Object.fromEntries(THREE_MINUTE_MISSION_DEFINITIONS.map((def) => [def.trigger, def])),
) as Record<ThreeMinuteMissionTrigger, ThreeMinuteMissionDefinition>;

export function getThreeMinuteMissionDefinition(trigger: ThreeMinuteMissionTrigger): ThreeMinuteMissionDefinition {
  return DEFINITION_BY_TRIGGER[trigger];
}

export function buildDefaultMissionTasks(
  trigger: ThreeMinuteMissionTrigger,
  ownerRole: string,
): readonly ThreeMinuteMissionTask[] {
  const definition = getThreeMinuteMissionDefinition(trigger);
  return Object.freeze(
    definition.tasks.map((task) =>
      Object.freeze({
        id: task.id,
        label: task.label,
        status: task.id === 'assign_owner' ? 'complete' : 'pending',
        ownerRole: task.id === 'assign_owner' ? ownerRole : task.ownerRole,
        ...(task.id === 'assign_owner' ? { completedAt: new Date().toISOString() } : {}),
      }),
    ),
  );
}

export function emsPreArrivalSubjectId(emsArrivalId: string): string {
  return `ems:${emsArrivalId}`;
}
/**
 * TrackMind entity visibility matrix — create / edit / approve / export / admin by role.
 */
import { TRACKMIND_PERMISSION_KEYS } from './trackMindPermissionRegistry';
import {
  TRACKMIND_ROLE_ID,
  normalizeTrackMindRoleId,
  type TrackMindRoleId,
} from './trackMindRoleCatalog';

const K = TRACKMIND_PERMISSION_KEYS;
const R = TRACKMIND_ROLE_ID;

export const TRACKMIND_ENTITY = Object.freeze({
  raceDayStatus: 'race_day_status',
  stewardIncident: 'steward_incident',
  paddockObservation: 'paddock_observation',
  welfareObservation: 'welfare_observation',
  veterinaryRecord: 'veterinary_record',
  horseProfile: 'horse_profile',
  securityIncident: 'security_incident',
  facilitiesInspection: 'facilities_inspection',
  complianceEvidence: 'compliance_evidence',
  financeRecord: 'finance_record',
  fanExperienceRecord: 'fan_experience_record',
  approvalRequest: 'approval_request',
  auditPacket: 'audit_packet',
  tenantConfig: 'tenant_config',
} as const);

export type TrackMindEntityId = (typeof TRACKMIND_ENTITY)[keyof typeof TRACKMIND_ENTITY];

export type TrackMindEntityCapability = 'view' | 'create' | 'edit' | 'approve' | 'export' | 'admin';

type EntityCapabilityMap = Record<TrackMindEntityCapability, readonly TrackMindRoleId[]>;

export const TRACKMIND_ENTITY_CAPABILITY_MATRIX: Record<TrackMindEntityId, EntityCapabilityMap> =
  Object.freeze({
    [TRACKMIND_ENTITY.raceDayStatus]: Object.freeze({
      view: [R.raceDayOperationsManager, R.starterRaceOfficial, R.executiveLeadership, R.racetrackAdmin, R.dataAnalyticsUser],
      create: [R.raceDayOperationsManager],
      edit: [R.raceDayOperationsManager],
      approve: [R.raceDayOperationsManager, R.steward, R.racetrackAdmin],
      export: [R.raceDayOperationsManager, R.racetrackAdmin, R.auditorRegulator],
      admin: [R.racetrackAdmin, R.organizationAdmin],
    }),
    [TRACKMIND_ENTITY.stewardIncident]: Object.freeze({
      view: [R.steward, R.raceDayOperationsManager, R.auditorRegulator, R.executiveLeadership],
      create: [R.steward, R.raceDayOperationsManager],
      edit: [R.steward],
      approve: [R.steward, R.racetrackAdmin],
      export: [R.steward, R.complianceOfficer, R.auditorRegulator],
      admin: [R.racetrackAdmin],
    }),
    [TRACKMIND_ENTITY.paddockObservation]: Object.freeze({
      view: [R.paddockOfficial, R.raceDayOperationsManager, R.trainerLiaison],
      create: [R.paddockOfficial],
      edit: [R.paddockOfficial],
      approve: [R.raceDayOperationsManager],
      export: [R.racetrackAdmin, R.auditorRegulator],
      admin: [R.racetrackAdmin],
    }),
    [TRACKMIND_ENTITY.welfareObservation]: Object.freeze({
      view: [R.equineWelfareOfficer, R.veterinarian, R.steward, R.auditorRegulator],
      create: [R.equineWelfareOfficer],
      edit: [R.equineWelfareOfficer, R.veterinarian],
      approve: [R.equineWelfareOfficer, R.veterinarian, R.steward],
      export: [R.complianceOfficer, R.auditorRegulator],
      admin: [R.racetrackAdmin],
    }),
    [TRACKMIND_ENTITY.veterinaryRecord]: Object.freeze({
      view: [R.veterinarian, R.equineWelfareOfficer, R.auditorRegulator],
      create: [R.veterinarian],
      edit: [R.veterinarian],
      approve: [R.veterinarian, R.racetrackAdmin],
      export: [R.auditorRegulator],
      admin: [R.racetrackAdmin],
    }),
    [TRACKMIND_ENTITY.horseProfile]: Object.freeze({
      view: [R.trainerLiaison, R.paddockOfficial, R.raceDayOperationsManager],
      create: [R.trainerLiaison],
      edit: [R.trainerLiaison],
      approve: [R.raceDayOperationsManager],
      export: [R.racetrackAdmin],
      admin: [R.racetrackAdmin],
    }),
    [TRACKMIND_ENTITY.securityIncident]: Object.freeze({
      view: [R.securityManager, R.raceDayOperationsManager, R.auditorRegulator],
      create: [R.securityManager],
      edit: [R.securityManager],
      approve: [R.securityManager, R.raceDayOperationsManager],
      export: [R.securityManager, R.auditorRegulator],
      admin: [R.racetrackAdmin],
    }),
    [TRACKMIND_ENTITY.facilitiesInspection]: Object.freeze({
      view: [R.facilitiesManager, R.raceDayOperationsManager],
      create: [R.facilitiesManager],
      edit: [R.facilitiesManager],
      approve: [R.raceDayOperationsManager],
      export: [R.racetrackAdmin, R.auditorRegulator],
      admin: [R.racetrackAdmin],
    }),
    [TRACKMIND_ENTITY.complianceEvidence]: Object.freeze({
      view: [R.complianceOfficer, R.auditorRegulator, R.executiveLeadership],
      create: [R.complianceOfficer],
      edit: [R.complianceOfficer],
      approve: [R.complianceOfficer, R.organizationAdmin],
      export: [R.complianceOfficer, R.auditorRegulator],
      admin: [R.organizationAdmin],
    }),
    [TRACKMIND_ENTITY.financeRecord]: Object.freeze({
      view: [R.financeManager, R.executiveLeadership, R.auditorRegulator],
      create: [R.financeManager],
      edit: [R.financeManager],
      approve: [R.financeManager, R.organizationAdmin],
      export: [R.financeManager, R.auditorRegulator],
      admin: [R.organizationAdmin],
    }),
    [TRACKMIND_ENTITY.fanExperienceRecord]: Object.freeze({
      view: [R.ticketingFanExperienceManager, R.executiveLeadership],
      create: [R.ticketingFanExperienceManager],
      edit: [R.ticketingFanExperienceManager],
      approve: [R.ticketingFanExperienceManager],
      export: [R.ticketingFanExperienceManager],
      admin: [R.racetrackAdmin],
    }),
    [TRACKMIND_ENTITY.approvalRequest]: Object.freeze({
      view: Object.values(TRACKMIND_ROLE_ID),
      create: [R.raceDayOperationsManager, R.steward, R.starterRaceOfficial, R.paddockOfficial, R.equineWelfareOfficer, R.veterinarian, R.trainerLiaison, R.securityManager, R.facilitiesManager],
      edit: [R.raceDayOperationsManager, R.complianceOfficer, R.financeManager],
      approve: [R.raceDayOperationsManager, R.steward, R.complianceOfficer, R.financeManager, R.organizationAdmin, R.racetrackAdmin],
      export: [R.complianceOfficer, R.auditorRegulator],
      admin: [R.organizationAdmin],
    }),
    [TRACKMIND_ENTITY.auditPacket]: Object.freeze({
      view: [R.auditorRegulator, R.complianceOfficer, R.platformSuperAdmin],
      create: [R.complianceOfficer],
      edit: [],
      approve: [],
      export: [R.auditorRegulator, R.complianceOfficer, R.platformSuperAdmin],
      admin: [R.platformSuperAdmin],
    }),
    [TRACKMIND_ENTITY.tenantConfig]: Object.freeze({
      view: [R.organizationAdmin, R.racetrackAdmin, R.platformSuperAdmin],
      create: [R.platformSuperAdmin],
      edit: [R.organizationAdmin, R.racetrackAdmin, R.platformSuperAdmin],
      approve: [R.organizationAdmin, R.platformSuperAdmin],
      export: [R.auditorRegulator, R.platformSuperAdmin],
      admin: [R.platformSuperAdmin],
    }),
  });

export const TRACKMIND_ENTITY_PERMISSION_HINT: Partial<Record<TrackMindEntityId, string>> =
  Object.freeze({
    [TRACKMIND_ENTITY.raceDayStatus]: K.racedayStatusUpdate,
    [TRACKMIND_ENTITY.stewardIncident]: K.stewardIncidentReview,
    [TRACKMIND_ENTITY.paddockObservation]: K.paddockObservationCreate,
    [TRACKMIND_ENTITY.welfareObservation]: K.welfareObservationCreate,
    [TRACKMIND_ENTITY.veterinaryRecord]: K.veterinaryRecordWrite,
    [TRACKMIND_ENTITY.horseProfile]: K.horseOpsManage,
    [TRACKMIND_ENTITY.securityIncident]: K.securityIncidentManage,
    [TRACKMIND_ENTITY.facilitiesInspection]: K.facilitiesInspectionCreate,
    [TRACKMIND_ENTITY.complianceEvidence]: K.complianceEvidenceAttach,
    [TRACKMIND_ENTITY.financeRecord]: K.financeRecordManage,
    [TRACKMIND_ENTITY.fanExperienceRecord]: K.fanExperienceManage,
    [TRACKMIND_ENTITY.approvalRequest]: K.approvalRequest,
    [TRACKMIND_ENTITY.auditPacket]: K.auditExport,
    [TRACKMIND_ENTITY.tenantConfig]: K.racetrackConfigManage,
  });

export function canAccessTrackMindEntityCapability(
  role: string,
  entity: TrackMindEntityId,
  capability: TrackMindEntityCapability,
): boolean {
  const roleId = normalizeTrackMindRoleId(role);
  const matrix = TRACKMIND_ENTITY_CAPABILITY_MATRIX[entity];
  if (!matrix) return false;
  return (matrix[capability] || []).includes(roleId);
}

/**
 * TrackMind notification targeting by role.
 */
import { TRACKMIND_PERMISSION_KEYS } from './trackMindPermissionRegistry';
import {
  TRACKMIND_ROLE_ID,
  normalizeTrackMindRoleId,
  type TrackMindRoleId,
} from './trackMindRoleCatalog';

const K = TRACKMIND_PERMISSION_KEYS;
const R = TRACKMIND_ROLE_ID;

export const TRACKMIND_NOTIFICATION_CHANNEL = Object.freeze({
  operational: 'operational',
  approval: 'approval',
  executive: 'executive',
  welfare: 'welfare',
  security: 'security',
  compliance: 'compliance',
  finance: 'finance',
  platform: 'platform',
} as const);

export type TrackMindNotificationChannel =
  (typeof TRACKMIND_NOTIFICATION_CHANNEL)[keyof typeof TRACKMIND_NOTIFICATION_CHANNEL];

export const TRACKMIND_NOTIFICATION_CHANNEL_PERMISSION: Record<
  TrackMindNotificationChannel,
  string
> = Object.freeze({
  [TRACKMIND_NOTIFICATION_CHANNEL.operational]: K.notificationOperational,
  [TRACKMIND_NOTIFICATION_CHANNEL.approval]: K.notificationApproval,
  [TRACKMIND_NOTIFICATION_CHANNEL.executive]: K.notificationExecutive,
  [TRACKMIND_NOTIFICATION_CHANNEL.welfare]: K.kpiWelfareView,
  [TRACKMIND_NOTIFICATION_CHANNEL.security]: K.kpiSecurityView,
  [TRACKMIND_NOTIFICATION_CHANNEL.compliance]: K.kpiComplianceView,
  [TRACKMIND_NOTIFICATION_CHANNEL.finance]: K.kpiFinanceView,
  [TRACKMIND_NOTIFICATION_CHANNEL.platform]: K.supportDiagnosticsView,
});

export const TRACKMIND_ROLE_NOTIFICATION_CHANNELS: Record<
  TrackMindRoleId,
  readonly TrackMindNotificationChannel[]
> = Object.freeze({
  [R.platformSuperAdmin]: ['platform', 'executive', 'approval', 'compliance'],
  [R.organizationAdmin]: ['executive', 'approval', 'compliance', 'finance'],
  [R.racetrackAdmin]: ['operational', 'approval', 'compliance', 'security'],
  [R.raceDayOperationsManager]: ['operational', 'approval', 'security'],
  [R.steward]: ['operational', 'approval'],
  [R.starterRaceOfficial]: ['operational'],
  [R.paddockOfficial]: ['operational'],
  [R.equineWelfareOfficer]: ['welfare', 'operational'],
  [R.veterinarian]: ['welfare'],
  [R.trainerLiaison]: ['operational'],
  [R.securityManager]: ['security', 'operational', 'approval'],
  [R.facilitiesManager]: ['operational'],
  [R.complianceOfficer]: ['compliance', 'approval'],
  [R.financeManager]: ['finance', 'approval'],
  [R.ticketingFanExperienceManager]: ['operational'],
  [R.executiveLeadership]: ['executive', 'approval'],
  [R.auditorRegulator]: ['compliance'],
  [R.dataAnalyticsUser]: [],
  [R.supportInternalOperator]: ['platform'],
  [R.genericStaff]: ['operational'],
});

export function resolveTrackMindNotificationChannels(
  role: string,
  can: (permission: string) => boolean,
): TrackMindNotificationChannel[] {
  const roleId = normalizeTrackMindRoleId(role);
  const channels = TRACKMIND_ROLE_NOTIFICATION_CHANNELS[roleId] || [];
  return channels.filter((channel) => {
    const permission = TRACKMIND_NOTIFICATION_CHANNEL_PERMISSION[channel];
    return can(permission);
  });
}

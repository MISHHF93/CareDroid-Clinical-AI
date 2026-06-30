import { MEDICAL_THEME } from '../config/medicalTheme.constants';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { IconBell, IconSearch } from '@tabler/icons-react';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientFlag, type Alert, type Patient } from '../types/emergency';
import { CANONICAL_ROUTES } from '../config/routes.config';
import {
  filterOperationalMetrics,
  getOperationalMetricRoute,
  groupOperationalAlertsByMetric,
  OPERATIONAL_METRIC_REGISTRY,
  resolveOperationalAlertRoute,
} from '../config/operationalMetricsModel';

import {
  getAlertClassificationTier,
  resolveOperationalAlertEnvelope,
  sortAlertsByClassification,
  triageOperationalAlerts,
} from '../engine/alertClassificationModel';
import { EMERGENCY_OS_BRANDING } from '../config/emergencyOsBranding.config';
import {
  EMERGENCY_ACTIONS,
  EMERGENCY_ROLE_IDS,
  getReceptionEmbeddedIntakePath,
  getReceptionQuickCreatePath,
  isRegistrationClerkRole,
  prefersReceptionForPatientCreate,
  prefersReceptionForPatientSearch,
} from '../config/emergencyRolePermissions';
import { RECEPTION_COPY } from './reception/receptionCopy';
import { getCentralControlPolicy } from '../config/centralControl.config';
import { PILOT_CUSTOMER_MODE } from '../config/unified-navigation.config';
import {
  buildReassessmentTimerAlerts,
  buildReassessmentNotificationCenterSnapshot,
} from '../engine/reassessmentTimerEngine';
import { buildHighRiskComplaintAlerts } from '../services/highRiskComplaintFlags';
import { buildLwbsRiskAdvisoryAlerts } from '../services/lwbsRiskLayer';
import { buildDeteriorationWatchAlerts } from '../services/waitingRoomDeteriorationWatch';
import { buildWaitingRoomSafetyEscalationAlerts } from '../services/waitingRoomSafetyEscalationVisibilityModel';
import { buildTriageBreachAlerts } from '../services/triageBreachTimer';
import { buildProviderWaitBreachAlerts } from '../services/providerWaitBreachTimer';
import {
  escalationAlertTargets,
  isClinicalEscalationRecipientRole,
} from '../services/receptionEscalationWorkflow';
import { toast } from 'sonner';
import {
  buildEmsOffloadAlerts,
  buildEmsOffloadTrackerSummary,
} from '../services/emsOffloadTracker';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import { useCopilotChromeAccess } from '../hooks/useCopilotChromeAccess';
import HelpTrigger from './help/HelpTrigger';
import useEffectiveUserProfile from '../hooks/useEffectiveUserProfile';
import { navigateProfileAware } from '../navigation/profileRouteLaunch';
import useOperationalIntelligence from '../hooks/useOperationalIntelligence';
import useRouteScreenMode from '../hooks/useRouteScreenMode';
import useScreenModeCapabilities from '../hooks/useScreenModeCapabilities';
import {
  getPatientDisplayName,
  rankPatientsBySearch,
} from '../utils/patientSearch';
import { searchPatientsFromBackend } from '../services/patientManagementApi';
import PatientSearchResults from './PatientSearchResults';
import {
  buildEncounterSearchPath,
  buildEmsCasePath,
  buildQueueItemPath,
  buildReferralSearchPath,
  buildReceptionSearchFilterPath,
  buildViewEncounterPath,
  createEncounterForPatient,
} from '../services/patientSearchActions';
import {
  groupOperationalSearchHits,
  searchOperationalEntities,
  type OperationalSearchHit,
} from '../services/unifiedOperationalSearch';
import StaffWorkloadPanel from './StaffWorkloadPanel';
import UserAccountMenu from './account/UserAccountMenu';
import ProfileRoleSwitcher from './account/ProfileRoleSwitcher';
import useProfileSwitcherVisibility from '../hooks/useProfileSwitcherVisibility';
import OperationalAlertRail from './emergency/OperationalAlertRail';
import { isPilotStationKpiPolicyActive } from '../config/stationKpiPolicy';
import './ReassessmentDrawer.css';
import './Header.css';

const reassessmentBadgeFlags = new Set<string>([
  PatientFlag.ReassessmentDue,
  PatientFlag.DeteriorationRisk,
  PatientFlag.HighRisk,
  PatientFlag.SepsisAlert,
]);

const MAX_HEADER_PATIENT_RESULTS = 5;

type NotificationCenterAction = {
  key: string;
  label: string;
  disabled?: boolean;
  disabledLabel?: string;
  onSelect?: () => void;
};

function normalizeAlertKey(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function alertSeverityTone(alert: Alert): 'info' | 'warning' | 'critical' {
  const tier = getAlertClassificationTier(alert);
  if (tier === 'critical' || tier === 'high') return 'critical';
  if (tier === 'medium' || alert.severity === 'Warning') return 'warning';
  return 'info';
}

function formatClassificationLabel(alert: Alert): string {
  const tier = getAlertClassificationTier(alert);
  if (tier === 'critical') return 'Critical';
  if (tier === 'high') return 'High';
  if (tier === 'medium') return 'Medium';
  return 'Info';
}

function formatAlertTime(timestamp?: string): string {
  if (!timestamp) return 'Time pending';
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return 'Time pending';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function describeAlertSource(alert: Alert): string {
  const source = alert.source || alert.type || 'CareDroid';
  return String(source)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function alertPatientLabel(alert: Alert, patientById: Map<string, Patient>): string | null {
  if (!alert.patientId) return null;
  const patient = patientById.get(alert.patientId);
  if (!patient) return `Patient target unavailable (${alert.patientId})`;
  return `${getPatientDisplayName(patient)} · ${patient.mrn}`;
}

function getHeaderFlagValue(flag: unknown): string {
  if (typeof flag === 'object' && flag !== null && 'type' in flag) {
    const typedFlag = flag as { type?: unknown };
    return typeof typedFlag.type === 'string' ? typedFlag.type : '';
  }

  return typeof flag === 'string' ? flag : '';
}

function alertRoute(alert: Alert): string | null {
  return resolveOperationalAlertRoute(alert);
}

function routePermissionPath(path: string): string {
  return path.split(/[?#]/)[0] || path;
}

function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <span
      style={{
        color: MEDICAL_THEME.inkSubtle,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 12,
      }}
    >
      {now.toLocaleTimeString()}
    </span>
  );
}

function formatSyncAge(timestamp?: string | null): string {
  if (!timestamp) return 'no sync';
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return 'no sync';
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - parsed) / 60000));
  if (elapsedMinutes < 1) return 'now';
  if (elapsedMinutes < 60) return `${elapsedMinutes}m`;
  return `${Math.round(elapsedMinutes / 60)}h`;
}

type HeaderProps = {
  pageTitle?: string;
  pageSubtitle?: string;
};

export function Header({ pageTitle, pageSubtitle }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const emergencyRole = useEmergencyRolePermissions();
  const { canUseCopilot } = useCopilotChromeAccess();
  const copilotOpen = useEmergencyStore((store) => store.copilotOpen);
  const toggleCopilot = useEmergencyStore((store) => store.toggleCopilot);
  const { saasRole } = useEffectiveUserProfile();
  const routeScreenMode = useRouteScreenMode();
  const screenCapabilities = useScreenModeCapabilities();
  const patientLookupInputRef = useRef<HTMLInputElement>(null);
  const isReceptionRoute = location.pathname === CANONICAL_ROUTES.emergencyReception;
  const operationalIntelligence = useOperationalIntelligence({
    realtime: false,
    screenMode: routeScreenMode,
  });
  const websocket = useEmergencyStore((store) => store.websocket);
  const [syncPulse, setSyncPulse] = useState(false);
  const centralSnapshot = operationalIntelligence.centralSnapshot;
  const intelligenceSnapshot = operationalIntelligence.snapshot;
  const refreshError = operationalIntelligence.refreshError;

  useEffect(() => {
    if (!websocket.lastEventAt) return undefined;
    setSyncPulse(true);
    const timer = window.setTimeout(() => setSyncPulse(false), 1200);
    return () => window.clearTimeout(timer);
  }, [websocket.lastEventAt]);
  const alerts = useEmergencyStore((store) => store.alerts);
  const patients = useEmergencyStore((store) => store.patients);
  const referrals = useEmergencyStore((store) => store.referrals);
  const emsArrivals = useEmergencyStore((store) => store.emsArrivals);
  const staff = useEmergencyStore((store) => store.staff);
  const workflowLogs = useEmergencyStore((store) => store.workflowLogs);
  const rooms = useEmergencyStore((store) => store.rooms);
  const queues = useEmergencyStore((store) => store.queues);
  const thresholds = useEmergencyStore((store) => store.thresholds);
  const selectedPatientId = useEmergencyStore((store) => store.selectedPatientId);
  const loading = useEmergencyStore((store) => store.loading);
  const integrationEvents = useEmergencyStore((store) => store.integrationEvents);
  const selectPatient = useEmergencyStore((store) => store.selectPatient);
  const markAlertRead = useEmergencyStore((store) => store.markAlertRead);
  const acknowledgeAlert = useEmergencyStore((store) => store.acknowledgeAlert);
  const dismissAlert = useEmergencyStore((store) => store.dismissAlert);
  const centralControlSettings = useEmergencyStore(
    (store) => store.emergencySettings.centralControl,
  );
  const [alertDrawerOpen, setAlertDrawerOpen] = useState(false);
  const [showInformationalAlerts, setShowInformationalAlerts] = useState(false);
  const [localReadAlertIds, setLocalReadAlertIds] = useState<Set<string>>(() => new Set());
  const [localAcknowledgedAlertIds, setLocalAcknowledgedAlertIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [localDismissedAlertIds, setLocalDismissedAlertIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [staffWorkloadOpen, setStaffWorkloadOpen] = useState(false);
  const [patientLookupQuery, setPatientLookupQuery] = useState('');
  const [patientLookupOpen, setPatientLookupOpen] = useState(false);
  const [backendVerifiedPatientIds, setBackendVerifiedPatientIds] = useState<Set<string>>(
    () => new Set(),
  );
  const workloadPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.reassignWorkload);
  const canManageWorkload = workloadPresentation.enabled;
  const createPatientAction = emergencyRole.presentAction(EMERGENCY_ACTIONS.createPatient);
  const createReferralAction = emergencyRole.presentAction(EMERGENCY_ACTIONS.manageReferral);
  const dispositionAction = emergencyRole.presentAction(EMERGENCY_ACTIONS.completeDisposition);
  const canCreatePatient = createPatientAction.enabled;
  const canCreateReferral = createReferralAction.enabled;
  const canDischarge = dispositionAction.enabled;
  const canOpenPatients = emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyPatients);
  const centralControl = useMemo(
    () =>
      getCentralControlPolicy({
        role: emergencyRole.role,
        can: emergencyRole.can,
        settings: centralControlSettings,
      }),
    [centralControlSettings, emergencyRole],
  );
  const canSubmitCentralIntake =
    canCreatePatient || (centralControl.enabled && !emergencyRole.readOnly);
  const showProfileSwitcher = useProfileSwitcherVisibility();
  const operationalSummary = centralSnapshot.operationalSummary;
  const alertsSurfaceMetrics = useMemo(
    () => filterOperationalMetrics(operationalSummary.metrics, 'alerts'),
    [operationalSummary.metrics],
  );
  const syncMode = websocket.mode || centralSnapshot.sync.mode || 'polling';
  const syncAge = formatSyncAge(websocket.lastEventAt || centralSnapshot.sync.lastSyncedAt);
  const syncStale =
    websocket.status === 'connected'
      ? false
      : centralSnapshot.sync.stale || websocket.status === 'reconnecting';
  const syncLabel = syncStale
    ? `${syncMode.toUpperCase()} stale`
    : `${syncMode.toUpperCase()} ${syncAge}`;
  const syncTitle = [
    `Status: ${websocket.status || centralSnapshot.sync.status}`,
    `Mode: ${syncMode}`,
    `Last update: ${syncAge}`,
    `Source: ${centralSnapshot.sync.source}`,
    websocket.message || centralSnapshot.sync.message,
  ]
    .filter(Boolean)
    .join('. ');
  const patientById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );
  const storeAlertIds = useMemo(() => new Set(alerts.map((alert) => alert.id)), [alerts]);
  const reassessmentTimerAlerts = useMemo(
    () =>
      buildReassessmentNotificationCenterSnapshot(patients, { thresholds: { thresholds } }).alerts,
    [patients, thresholds],
  );
  const highRiskComplaintAlerts = useMemo(
    () => buildHighRiskComplaintAlerts(patients),
    [patients],
  );
  const lwbsRiskAdvisoryAlerts = useMemo(
    () =>
      buildLwbsRiskAdvisoryAlerts(
        patients,
        {
          waitingPatientCount: patients.filter((patient) => patient.state === 'Waiting').length,
          workflowLogs,
          staff,
        },
      ),
    [patients, staff, workflowLogs],
  );
  const deteriorationWatchAlerts = useMemo(
    () => buildDeteriorationWatchAlerts(patients, { emsArrivals }),
    [patients, emsArrivals],
  );
  const waitingRoomSafetyEscalationAlerts = useMemo(
    () =>
      buildWaitingRoomSafetyEscalationAlerts(patients, {
        workflowLogs,
        staff,
        alerts,
        communicationOverdueMinutes:
          Number(thresholds?.communicationOverdueMinutes ?? 30) || 30,
      }),
    [alerts, patients, staff, thresholds, workflowLogs],
  );
  const triageBreachAlerts = useMemo(
    () =>
      buildTriageBreachAlerts(patients, {
        settings: { emergencySettings: thresholds },
      }),
    [patients, thresholds],
  );
  const providerWaitBreachAlerts = useMemo(
    () =>
      buildProviderWaitBreachAlerts(patients, {
        settings: { emergencySettings: thresholds },
      }),
    [patients, thresholds],
  );
  const emsOffloadAlerts = useMemo(() => {
    const summary = buildEmsOffloadTrackerSummary(emsArrivals, {
      patients,
      staff,
      rooms,
      offloadTargetMinutes:
        Number(thresholds?.emsOffloadTargetMinutes ?? thresholds?.emsOffloadTargetMin ?? 15) || 15,
    });
    return buildEmsOffloadAlerts(summary);
  }, [emsArrivals, patients, rooms, staff, thresholds]);
  const supplementalAlerts = useMemo<Alert[]>(() => {
    const generatedAt = centralSnapshot.generatedAt || new Date().toISOString();
    const notices: Alert[] = [];
    if (centralSnapshot.sync.stale || centralSnapshot.sync.status !== 'connected') {
      notices.push({
        id: 'system-sync-status',
        type: 'System',
        severity: centralSnapshot.sync.stale ? 'Warning' : 'Info',
        title: centralSnapshot.sync.stale ? 'System sync delayed' : 'System sync status',
        message:
          centralSnapshot.sync.message || `Central node sync is ${centralSnapshot.sync.status}.`,
        createdAt: centralSnapshot.sync.lastSyncedAt || generatedAt,
        dismissed: false,
        source: 'central-node-sync',
        actionType: 'sync',
      });
    }
    if (
      centralSnapshot.aiCopilotContext.enabled &&
      centralSnapshot.aiCopilotContext.humanReviewRequired
    ) {
      notices.push({
        id: 'ai-copilot-safety-notice',
        type: 'AI',
        severity: 'Info',
        title: 'AI/Copilot safety notice',
        message: centralSnapshot.aiCopilotContext.safetyRule,
        createdAt: generatedAt,
        dismissed: false,
        source: 'ai-governance',
        actionType: 'copilot',
        metadata: {
          recentMessages: centralSnapshot.aiCopilotContext.recentMessages,
        },
      });
    }
    const latestIntegrationEvent = integrationEvents[0];
    if (latestIntegrationEvent) {
      const payloadText = JSON.stringify(latestIntegrationEvent.payload ?? {});
      const isProvincial = /provincial|health-card|eligibility|ehealth/i.test(
        `${latestIntegrationEvent.type} ${payloadText}`,
      );
      const isWarning = /error|fail|stale|reject|timeout/i.test(
        `${latestIntegrationEvent.type} ${payloadText}`,
      );
      notices.push({
        id: `integration-${latestIntegrationEvent.id}`,
        type: isProvincial ? 'Provincial' : 'Integration',
        severity: isWarning ? 'Warning' : 'Info',
        title: isProvincial ? 'Provincial data event' : 'Integration event received',
        message: isWarning
          ? 'Integration signal needs review before relying on downstream data.'
          : 'Integration signal captured in the CareDroid event stream.',
        createdAt: latestIntegrationEvent.receivedAt,
        dismissed: false,
        source: isProvincial ? 'provincial-data' : 'integration-events',
        actionType: isProvincial ? 'provincial' : 'integration',
      });
    }
    return notices;
  }, [centralSnapshot, integrationEvents]);
  const intelligenceAlerts = useMemo<Alert[]>(
    () =>
      intelligenceSnapshot.alerts.map((alert) => ({
        id: alert.id,
        type: 'OperationalIntelligence',
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        createdAt: alert.createdAt,
        dismissed: alert.dismissed,
        source: alert.source,
        actionType: 'operational-intelligence',
        metadata: {
          category: alert.category,
          reasonCodes: alert.reasonCodes.join(', '),
          advisoryOnly: true,
        },
      })),
    [intelligenceSnapshot.alerts],
  );
  const notificationAlerts = useMemo(() => {
    const byId = new Map<string, Alert>();
    for (const alert of [
      ...supplementalAlerts,
      ...reassessmentTimerAlerts,
      ...highRiskComplaintAlerts,
      ...lwbsRiskAdvisoryAlerts,
      ...deteriorationWatchAlerts,
      ...waitingRoomSafetyEscalationAlerts,
      ...triageBreachAlerts,
      ...providerWaitBreachAlerts,
      ...emsOffloadAlerts,
      ...intelligenceAlerts,
      ...centralSnapshot.operationalAlerts,
      ...alerts,
    ]) {
      const read = Boolean(alert.read || alert.dismissed || localReadAlertIds.has(alert.id));
      const acknowledged = Boolean(alert.acknowledged || localAcknowledgedAlertIds.has(alert.id));
      const dismissed = Boolean(alert.dismissed || localDismissedAlertIds.has(alert.id));
      byId.set(alert.id, { ...alert, read, acknowledged, dismissed });
    }
    return Array.from(byId.values())
      .filter((alert) => !alert.dismissed)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [
    alerts,
    centralSnapshot.operationalAlerts,
    intelligenceAlerts,
    localAcknowledgedAlertIds,
    localDismissedAlertIds,
    localReadAlertIds,
    reassessmentTimerAlerts,
    highRiskComplaintAlerts,
    lwbsRiskAdvisoryAlerts,
    deteriorationWatchAlerts,
    waitingRoomSafetyEscalationAlerts,
    triageBreachAlerts,
    providerWaitBreachAlerts,
    emsOffloadAlerts,
    supplementalAlerts,
  ]);

  const alertTriage = useMemo(
    () => triageOperationalAlerts(notificationAlerts),
    [notificationAlerts],
  );

  const visibleNotificationAlerts = useMemo(() => {
    const base = sortAlertsByClassification(
      showInformationalAlerts ? alertTriage.all : alertTriage.visible,
    );
    if (!screenCapabilities.isRegistrationScreen) return base;
    return base.filter((alert) => {
      const haystack = `${alert.type || ''} ${alert.title || ''} ${alert.message || ''}`.toLowerCase();
      if (getAlertClassificationTier(alert) === 'critical' && !/ems|ambulance|pre-arrival|inbound/.test(haystack)) {
        return false;
      }
      return true;
    });
  }, [alertTriage, screenCapabilities.isRegistrationScreen, showInformationalAlerts]);

  const unreadAlertCount = useMemo(
    () =>
      visibleNotificationAlerts.filter(
        (alert) =>
          !alert.read &&
          !alert.dismissed &&
          ['critical', 'high'].includes(getAlertClassificationTier(alert)),
      ).length,
    [visibleNotificationAlerts],
  );

  const groupedOperationalAlerts = useMemo(
    () => groupOperationalAlertsByMetric(visibleNotificationAlerts),
    [visibleNotificationAlerts],
  );

  const reassessmentAttentionCount = useMemo(
    () =>
      patients.filter((patient) =>
        ((patient.flags ?? []) as unknown[]).some((flag) =>
          reassessmentBadgeFlags.has(getHeaderFlagValue(flag)),
        ),
      ).length,
    [patients],
  );
  const patientLookupResults = useMemo(
    () =>
      rankPatientsBySearch(patients, patientLookupQuery, MAX_HEADER_PATIENT_RESULTS).map(
        (result) => result,
      ),
    [patientLookupQuery, patients],
  );

  const operationalSearchGroups = useMemo(
    () =>
      groupOperationalSearchHits(
        searchOperationalEntities({
          query: patientLookupQuery,
          patients,
          referrals,
          emsArrivals,
          queues,
        }),
      ),
    [emsArrivals, patientLookupQuery, patients, queues, referrals],
  );

  const firstOperationalHit = useMemo(() => {
    const ordered = [
      ...operationalSearchGroups.encounter,
      ...operationalSearchGroups.referral,
      ...operationalSearchGroups.ems,
      ...operationalSearchGroups.queue,
    ];
    return ordered[0] || null;
  }, [operationalSearchGroups]);

  const navigateEmergencyRoute = useCallback(
    (path: string) => {
      navigateProfileAware(navigate, path, { emergencyRole, saasRole });
    },
    [emergencyRole, navigate, saasRole],
  );

  const openSmartIntakeFromSearch = (options: { step?: string; patientId?: string } = {}) => {
    if (!canCreatePatient) return;
    if (isReceptionRoute) {
      document.dispatchEvent(
        new CustomEvent('open-reception-smart-intake', { detail: options }),
      );
      setPatientLookupOpen(false);
      return;
    }
    navigateEmergencyRoute(
      getReceptionEmbeddedIntakePath({
        step: options.step,
        patientId: options.patientId,
      }),
    );
    setPatientLookupOpen(false);
  };

  const openCentralIntake = () => {
    if (!canSubmitCentralIntake) return;
    if (isReceptionRoute || prefersReceptionForPatientCreate(emergencyRole.role, screenCapabilities.screenMode)) {
      if (isReceptionRoute) {
        document.dispatchEvent(new Event('open-reception-intake'));
        return;
      }
      navigateEmergencyRoute(getReceptionQuickCreatePath());
      return;
    }
    navigateEmergencyRoute(CANONICAL_ROUTES.emergencyWhiteboard);
    window.setTimeout(() => document.dispatchEvent(new Event('open-intake')), 0);
  };

  const openReferralWorkflow = () => {
    if (!canCreateReferral) return;
    navigateEmergencyRoute(`${CANONICAL_ROUTES.emergencyReferrals}?new=1`);
  };

  const openSelectedPatientDischarge = () => {
    if (!canDischarge || !selectedPatientId) return;
    document.dispatchEvent(new Event('open-patient-discharge'));
  };

  const openPatientLookupRoute = () => {
    const query = patientLookupQuery.trim();
    if (!canOpenPatients && !isReceptionRoute) return;
    if (isReceptionRoute || prefersReceptionForPatientSearch(emergencyRole.role, screenCapabilities.screenMode)) {
      const nextParams = new URLSearchParams(searchParams);
      if (query) nextParams.set('q', query);
      else nextParams.delete('q');
      setSearchParams(nextParams, { replace: true });
      setPatientLookupOpen(false);
      return;
    }
    if (emergencyRole.role === EMERGENCY_ROLE_IDS.registrationClerk) {
      navigateEmergencyRoute(
        query
          ? `${CANONICAL_ROUTES.emergencyReception}?q=${encodeURIComponent(query)}`
          : CANONICAL_ROUTES.emergencyReception,
      );
      setPatientLookupOpen(false);
      return;
    }
    navigateEmergencyRoute(
      query
        ? `${CANONICAL_ROUTES.emergencyPatients}?q=${encodeURIComponent(query)}`
        : CANONICAL_ROUTES.emergencyPatients,
    );
    setPatientLookupOpen(false);
  };

  const selectLookupPatient = (patientId: string) => {
    selectPatient(patientId);
    if (prefersReceptionForPatientSearch(emergencyRole.role, screenCapabilities.screenMode)) {
      navigateEmergencyRoute(
        `${CANONICAL_ROUTES.emergencyReception}?patientId=${encodeURIComponent(patientId)}`,
      );
      setPatientLookupQuery('');
      setPatientLookupOpen(false);
      return;
    }
    navigateEmergencyRoute(
      `${CANONICAL_ROUTES.emergencyPatients}?patientId=${encodeURIComponent(patientId)}`,
    );
    setPatientLookupQuery('');
    setPatientLookupOpen(false);
  };

  const handleSearchViewEncounter = (patientId: string, encounterId: string | null) => {
    selectPatient(patientId);
    navigateEmergencyRoute(buildViewEncounterPath(patientId, encounterId));
    setPatientLookupOpen(false);
  };

  const handleSearchCreateEncounter = (patientId: string) => {
    const handoff = createEncounterForPatient(useEmergencyStore.getState(), patientId);
    handleSearchViewEncounter(patientId, handoff.encounterId);
  };

  const handleSearchFilterQueues = (query: string) => {
    navigateEmergencyRoute(buildReceptionSearchFilterPath(query));
    setPatientLookupOpen(false);
  };

  const handleOpenOperationalHit = useCallback(
    (hit: OperationalSearchHit) => {
      if (hit.patientId) selectPatient(hit.patientId);

      if (hit.entityType === 'encounter' && hit.patientId) {
        navigateEmergencyRoute(buildEncounterSearchPath(hit.patientId, hit.encounterId));
      } else if (hit.entityType === 'referral' && hit.referralId) {
        navigateEmergencyRoute(buildReferralSearchPath(hit.referralId, hit.patientId));
      } else if (hit.entityType === 'ems' && hit.emsArrivalId) {
        navigateEmergencyRoute(buildEmsCasePath(hit.emsArrivalId));
      } else if (hit.entityType === 'queue') {
        navigateEmergencyRoute(buildQueueItemPath(hit.queueType || 'Waiting', hit.patientId));
      } else if (hit.entityType === 'patient' && hit.patientId) {
        selectLookupPatient(hit.patientId);
        return;
      }

      setPatientLookupQuery('');
      setPatientLookupOpen(false);
    },
    [navigateEmergencyRoute, selectLookupPatient, selectPatient],
  );

  const recordAlertRead = useCallback(
    (alertId: string) => {
      setLocalReadAlertIds((current) => new Set(current).add(alertId));
      if (storeAlertIds.has(alertId)) markAlertRead(alertId);
    },
    [markAlertRead, storeAlertIds],
  );

  const recordAlertAcknowledged = useCallback(
    (alertId: string) => {
      setLocalReadAlertIds((current) => new Set(current).add(alertId));
      setLocalAcknowledgedAlertIds((current) => new Set(current).add(alertId));
      if (storeAlertIds.has(alertId)) acknowledgeAlert(alertId);
    },
    [acknowledgeAlert, storeAlertIds],
  );

  const recordAlertDismissed = useCallback(
    (alertId: string) => {
      setLocalReadAlertIds((current) => new Set(current).add(alertId));
      setLocalDismissedAlertIds((current) => new Set(current).add(alertId));
      if (storeAlertIds.has(alertId)) dismissAlert(alertId);
    },
    [dismissAlert, storeAlertIds],
  );

  const openAlertRoute = useCallback(
    (alert: Alert): NotificationCenterAction => {
      if (alert.patientId) {
        const patientExists = patientById.has(alert.patientId);
        return {
          key: 'open-patient',
          label: 'Open patient',
          disabled: !patientExists,
          disabledLabel: 'Patient unavailable',
          onSelect: patientExists
            ? () => {
                selectPatient(alert.patientId || null);
                navigateEmergencyRoute(
                  `${CANONICAL_ROUTES.emergencyPatients}?patientId=${encodeURIComponent(alert.patientId || '')}`,
                );
                setAlertDrawerOpen(false);
              }
            : undefined,
        };
      }

      if (alert.actionFn) {
        return {
          key: 'custom-action',
          label: alert.actionLabel || 'Open action',
          onSelect: () => {
            alert.actionFn?.();
            setAlertDrawerOpen(false);
          },
        };
      }

      const route = alertRoute(alert);
      if (!route) {
        return {
          key: 'missing-target',
          label: 'Open target',
          disabled: true,
          disabledLabel: 'No target available',
        };
      }

      const canOpenRoute = emergencyRole.canAccessRoute(routePermissionPath(route));
      return {
        key: `open-${normalizeAlertKey(alert.type || alert.source || 'module')}`,
        label: alert.actionLabel || 'Open module',
        disabled: !canOpenRoute,
        disabledLabel: 'Route unavailable',
        onSelect: canOpenRoute
          ? () => {
              navigateEmergencyRoute(route);
              setAlertDrawerOpen(false);
            }
          : undefined,
      };
    },
    [emergencyRole, navigateEmergencyRoute, patientById, selectPatient],
  );

  const markAllNotificationsRead = () => {
    for (const alert of visibleNotificationAlerts) {
      recordAlertRead(alert.id);
    }
  };

  const syncPatientLookupQuery = (value: string) => {
    setPatientLookupQuery(value);
    if (!isReceptionRoute) return;
    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) nextParams.set('q', value.trim());
    else nextParams.delete('q');
    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    if (!isReceptionRoute) return;
    const urlQuery = searchParams.get('q') || '';
    setPatientLookupQuery(urlQuery);
  }, [isReceptionRoute, searchParams]);

  useEffect(() => {
    if (!isReceptionRoute) {
      setBackendVerifiedPatientIds(new Set());
      return;
    }
    const query = patientLookupQuery.trim();
    if (query.length < 2) {
      setBackendVerifiedPatientIds(new Set());
      return;
    }
    let cancelled = false;
    void searchPatientsFromBackend(query, { localPatients: patients, limit: MAX_HEADER_PATIENT_RESULTS })
      .then((response) => {
        if (cancelled) return;
        const verified = new Set(
          (response.results || [])
            .filter((entry) => entry.backendVerified)
            .map((entry) => entry.patientId),
        );
        setBackendVerifiedPatientIds(verified);
      })
      .catch(() => {
        if (!cancelled) setBackendVerifiedPatientIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [isReceptionRoute, patientLookupQuery, patients]);

  useEffect(() => {
    const focusLookup = () => patientLookupInputRef.current?.focus();
    document.addEventListener('focus-reception-search', focusLookup);
    if (isReceptionRoute) focusLookup();
    return () => document.removeEventListener('focus-reception-search', focusLookup);
  }, [isReceptionRoute]);

  useEffect(() => {
    const closePanels = () => {
      setAlertDrawerOpen(false);
      setStaffWorkloadOpen(false);
    };
    document.addEventListener('close-all-panels', closePanels);
    return () => document.removeEventListener('close-all-panels', closePanels);
  }, []);

  const toastedAlertIdsRef = useRef(new Set<string>());

  useEffect(() => {
    const handleReceptionEscalation = (event: Event) => {
      if (!isClinicalEscalationRecipientRole(emergencyRole.role)) return;
      const alert = (event as CustomEvent<{ alert?: Alert }>).detail?.alert;
      if (!alert?.id) return;

      const targets = escalationAlertTargets(alert);
      if (emergencyRole.role === 'triage_nurse' && !targets.includes('triage')) return;
      if (emergencyRole.role === 'charge_nurse' && !targets.includes('charge')) return;

      const envelope = resolveOperationalAlertEnvelope(alert);
      if (!envelope.showToast || toastedAlertIdsRef.current.has(alert.id)) return;
      toastedAlertIdsRef.current.add(alert.id);

      const toastFn = envelope.semantic === 'critical' ? toast.error : toast.warning;
      toastFn(alert.title, {
        description: alert.message,
        duration: envelope.state === 'critical' ? Infinity : 12000,
        action: alert.patientId
          ? {
              label: 'View patient',
              onClick: () => selectPatient(alert.patientId || null),
            }
          : undefined,
      });
    };

    document.addEventListener('reception-escalation-raised', handleReceptionEscalation);
    return () =>
      document.removeEventListener('reception-escalation-raised', handleReceptionEscalation);
  }, [emergencyRole.role, selectPatient]);

  const pilotHeaderMetrics = isPilotStationKpiPolicyActive() && screenCapabilities.showOperationalStrip;

  return (
    <header
      className={[
        'caredroid-header',
        'caredroid-header--compact',
        pilotHeaderMetrics ? 'caredroid-header--pilot-metrics' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="caredroid-header__topbar">
        <div className="caredroid-header__brand">
          <span
            className="caredroid-header__wordmark"
            title={EMERGENCY_OS_BRANDING.platformLine}
          >
            {screenCapabilities.productLabel}
          </span>
          {!screenCapabilities.isRegistrationScreen ? (
            canUseCopilot && emergencyRole.actionEnabled(EMERGENCY_ACTIONS.useCopilot) ? (
              <button
                type="button"
                className={[
                  'caredroid-header__copilot-pill',
                  copilotOpen ? 'caredroid-header__copilot-pill--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={copilotOpen}
                title={`${copilotOpen ? 'Close' : 'Open'} ${EMERGENCY_OS_BRANDING.copilotName} (C)`}
                onClick={toggleCopilot}
              >
                {EMERGENCY_OS_BRANDING.aiiosName}
              </button>
            ) : (
              <span className="caredroid-header__copilot-pill caredroid-header__copilot-pill--static">
                {EMERGENCY_OS_BRANDING.aiiosName}
              </span>
            )
          ) : null}
          <Clock />
        </div>

        <div className="caredroid-header__center">
          <div
            className="caredroid-header__page-title"
            aria-label="Current CareDroid page"
          >
            {screenCapabilities.isRegistrationScreen ? (
              pageSubtitle ? <span>{pageSubtitle}</span> : null
            ) : (
              <>
                <strong>{pageTitle || screenCapabilities.productLabel}</strong>
                {pageSubtitle ? <span>{pageSubtitle}</span> : null}
              </>
            )}
          </div>
          {screenCapabilities.showCentralNodeBadge && !PILOT_CUSTOMER_MODE.enabled ? (
            <span
              className="caredroid-header__central-node"
              title={`${centralControl.statusLabel}. ${centralControl.dashboardControlLabel}. ${centralControl.inputProfile.label}. ${centralControl.contributorMode ? 'Users submit inputs only.' : 'This role can operate central controls.'}`}
            >
              {centralControl.label}: {centralControl.contributorMode ? 'Input only' : 'Controller'}{' '}
              · {centralControl.inputProfile.label}
            </span>
          ) : null}
          {screenCapabilities.showOperationalStrip ? (
            <OperationalAlertRail
              className="caredroid-header__central-status"
              centralSnapshot={centralSnapshot}
              syncLabel={syncLabel}
              syncTitle={syncTitle}
              syncStale={syncStale}
              syncPulse={syncPulse}
              intelligenceSnapshot={intelligenceSnapshot}
              screenMode={routeScreenMode}
            />
          ) : null}
        </div>

        <div className="caredroid-header__actions">
          <div
            className="caredroid-header__primary-actions"
            aria-label="CareDroid primary actions"
          >
            <button
              type="button"
              className="caredroid-header__action caredroid-header__action--primary"
              onClick={openCentralIntake}
              disabled={!canSubmitCentralIntake}
              aria-label={
                isReceptionRoute
                  ? isRegistrationClerkRole(emergencyRole.role)
                    ? RECEPTION_COPY.header.registerTitle
                    : RECEPTION_COPY.identityCheck.title
                  : 'Create patient'
              }
              title={
                canSubmitCentralIntake
                  ? isReceptionRoute
                    ? isRegistrationClerkRole(emergencyRole.role)
                      ? RECEPTION_COPY.header.registerTitle
                      : RECEPTION_COPY.identityCheck.description
                    : 'Create a patient intake'
                  : `${emergencyRole.roleLabel} cannot create patients`
              }
            >
              {isReceptionRoute ? RECEPTION_COPY.header.register : 'Create'}
            </button>
            {!PILOT_CUSTOMER_MODE.enabled ? <HelpTrigger variant="icon" tab="page" /> : null}
            {!PILOT_CUSTOMER_MODE.enabled && screenCapabilities.showReassessAction ? (
            <button
              type="button"
              className="caredroid-header__action"
              onClick={() => document.dispatchEvent(new Event('open-reassessment-drawer'))}
              aria-label="Open reassessment queue"
              title="Open reassessment queue"
            >
              Reassess
            </button>
            ) : null}
            {!screenCapabilities.isRegistrationScreen ? (
            <>
            {!PILOT_CUSTOMER_MODE.enabled && createReferralAction.visible ? (
            <button
              type="button"
              className="caredroid-header__action"
              onClick={openReferralWorkflow}
              disabled={!canCreateReferral}
              aria-label="Create referral"
              title={
                canCreateReferral
                  ? 'Create referral or consult request'
                  : createReferralAction.readOnly
                    ? 'Referral workflow is read-only for this role'
                    : `${emergencyRole.roleLabel} cannot create referrals`
              }
            >
              Referral
            </button>
            ) : null}
            {!PILOT_CUSTOMER_MODE.enabled && dispositionAction.visible ? (
              <button
                type="button"
                className="caredroid-header__action"
                onClick={openSelectedPatientDischarge}
                disabled={!canDischarge || !selectedPatientId}
                aria-label="Discharge selected patient"
                title={
                  canDischarge
                    ? selectedPatientId
                      ? 'Open discharge confirmation for the selected patient'
                      : 'Select a patient before discharge'
                    : dispositionAction.readOnly
                      ? 'Disposition is read-only for this role'
                      : `${emergencyRole.roleLabel} cannot discharge patients`
                }
              >
                Discharge
              </button>
            ) : null}
            </>
            ) : null}
          </div>

          <div className={`caredroid-header__lookup${isReceptionRoute ? ' caredroid-header__lookup--primary' : ''}`}>
            <IconSearch size={15} stroke={2} aria-hidden />
            <input
              ref={patientLookupInputRef}
              type="search"
              value={patientLookupQuery}
              placeholder="Search patient, encounter, referral, EMS, queue..."
              aria-label={
                screenCapabilities.isRegistrationScreen ? 'Patient search' : 'Operational search'
              }
              onFocus={() => setPatientLookupOpen(true)}
              onChange={(event) => {
                syncPatientLookupQuery(event.target.value);
                setPatientLookupOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (patientLookupResults[0]) selectLookupPatient(patientLookupResults[0].patient.id);
                  else if (firstOperationalHit) handleOpenOperationalHit(firstOperationalHit);
                  else openPatientLookupRoute();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setPatientLookupOpen(false);
                }
              }}
            />
            {patientLookupOpen && patientLookupQuery.trim() ? (
              <div className="caredroid-header__lookup-results">
                <PatientSearchResults
                  query={patientLookupQuery}
                  results={patientLookupResults}
                  operationalGroups={operationalSearchGroups}
                  backendVerifiedPatientIds={backendVerifiedPatientIds}
                  canCreatePatient={canCreatePatient}
                  isReceptionRoute={isReceptionRoute}
                  onFindPatient={selectLookupPatient}
                  onStartIntake={(patientId) =>
                    openSmartIntakeFromSearch({ patientId, step: 'verify' })
                  }
                  onViewEncounter={handleSearchViewEncounter}
                  onCreateEncounter={handleSearchCreateEncounter}
                  onOpenOperationalHit={handleOpenOperationalHit}
                  onFilterQueues={handleSearchFilterQueues}
                  onStartNewIntake={() => openSmartIntakeFromSearch()}
                />
              </div>
            ) : null}
          </div>

          {!PILOT_CUSTOMER_MODE.enabled && !screenCapabilities.isRegistrationScreen ? (
          <button
            type="button"
            className="caredroid-header__palette-trigger"
            onClick={() => document.dispatchEvent(new Event('open-command-palette'))}
            aria-label="Open command palette"
            title="Search patients, encounters, referrals, EMS, and queues"
          >
            <IconSearch size={18} stroke={2} />
          </button>
          ) : null}

          {screenCapabilities.showReassessAction && reassessmentAttentionCount > 0 ? (
            <button
              type="button"
              className="reassessment-header-badge"
              onClick={() => document.dispatchEvent(new Event('open-reassessment-drawer'))}
              aria-label={`Open reassessment drawer: ${reassessmentAttentionCount} patients need attention`}
              title={`${reassessmentAttentionCount} patients need attention`}
            >
              {reassessmentAttentionCount}
            </button>
          ) : null}

          <button
            type="button"
            className="caredroid-header__icon-button caredroid-header__notification-trigger"
            onClick={() => setAlertDrawerOpen((open) => !open)}
            aria-label={`Notification Center${unreadAlertCount ? `: ${unreadAlertCount} unread` : ''}`}
            aria-haspopup="dialog"
            aria-expanded={alertDrawerOpen}
            title="Open Notification Center"
          >
            <IconBell size={18} stroke={2} aria-hidden />
            {unreadAlertCount > 0 ? (
              <span className="caredroid-header__notification-badge">
                {unreadAlertCount > 99 ? '99+' : unreadAlertCount}
              </span>
            ) : null}
          </button>

          {showProfileSwitcher ? <ProfileRoleSwitcher variant="compact" /> : null}

          <UserAccountMenu />

          {!PILOT_CUSTOMER_MODE.enabled && !screenCapabilities.isRegistrationScreen && workloadPresentation.visible ? (
            <button
              type="button"
              className="caredroid-header__workload-trigger"
              onClick={() => {
                if (canManageWorkload) setStaffWorkloadOpen((open) => !open);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                if (canManageWorkload) setStaffWorkloadOpen(true);
              }}
              aria-label="Staff workload"
              aria-haspopup="dialog"
              aria-expanded={staffWorkloadOpen}
              disabled={!canManageWorkload}
              title={
                canManageWorkload
                  ? 'Staff workload'
                  : `${emergencyRole.roleLabel} cannot reassign workload`
              }
            >
              DA
            </button>
          ) : null}
        </div>
      </div>

      {!PILOT_CUSTOMER_MODE.enabled ? (
      <div
        className="caredroid-header__command-context"
        aria-label="Operational command context"
      >
        {OPERATIONAL_METRIC_REGISTRY.map((metricDef) => {
          const metric = operationalSummary.metrics.find((m) => m.key === metricDef.key);
          return (
            <div
              key={metricDef.key}
              className="caredroid-header__command-metric"
              data-tone={metric?.tone}
            >
              <span className="caredroid-header__command-metric-value">
                {metric !== undefined ? String(metric.value) : '--'}
              </span>
              <span className="caredroid-header__command-metric-label">{metricDef.label}</span>
            </div>
          );
        })}
      </div>
      ) : null}

      {alertDrawerOpen ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="notification-center-title"
          className="emergency-os-notification-center"
        >
          <div className="emergency-os-notification-center__header">
            <div>
              <span>{screenCapabilities.productLabel}</span>
              <h2 id="notification-center-title">Notification Center</h2>
              <p>
                {unreadAlertCount
                  ? `${unreadAlertCount} unread critical/high notice${unreadAlertCount === 1 ? '' : 's'}`
                  : 'All priority notices reviewed'}
                {alertTriage.counts.critical || alertTriage.counts.high ? (
                  <>
                    {' '}
                    · {alertTriage.counts.critical} critical · {alertTriage.counts.high} high
                  </>
                ) : null}
              </p>
            </div>
            {alertsSurfaceMetrics.length > 0 ? (
              <div className="emergency-os-notification-center__metric-chips" aria-label="Alerts by operational metric">
                {alertsSurfaceMetrics.map((metric) => {
                  const bucket = groupedOperationalAlerts.byMetric[metric.key] ?? [];
                  if (!bucket.length) return null;
                  const route = getOperationalMetricRoute(metric.key);
                  return (
                    <button
                      key={metric.key}
                      type="button"
                      className="emergency-os-notification-center__metric-chip"
                      onClick={() => route && navigateEmergencyRoute(route)}
                      title={`${metric.label}: ${bucket.length} alert(s)`}
                    >
                      <strong>{bucket.length}</strong>
                      <span>{metric.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div className="emergency-os-notification-center__header-actions">
              {alertTriage.suppressed.length ? (
                <button
                  type="button"
                  onClick={() => setShowInformationalAlerts((open) => !open)}
                >
                  {showInformationalAlerts
                    ? 'Hide informational'
                    : `Show informational (${alertTriage.suppressed.length})`}
                </button>
              ) : null}
              <button
                type="button"
                onClick={markAllNotificationsRead}
                disabled={!visibleNotificationAlerts.some((alert) => !alert.read)}
              >
                Mark all read
              </button>
              <button
                type="button"
                onClick={() => setAlertDrawerOpen(false)}
                aria-label="Close alerts"
              >
                Close
              </button>
            </div>
          </div>
          {loading && !visibleNotificationAlerts.length ? (
            <div className="emergency-os-notification-center__state" role="status">
              Loading active {screenCapabilities.productLabel} notifications...
            </div>
          ) : refreshError && !visibleNotificationAlerts.length ? (
            <div
              className="emergency-os-notification-center__state emergency-os-notification-center__state--error"
              role="alert"
            >
              Notification data is using local CareDroid state. {refreshError}
            </div>
          ) : visibleNotificationAlerts.length > 0 ? (
            <div className="emergency-os-notification-center__list" role="list">
              {visibleNotificationAlerts.map((alert) => {
                const primaryAction = openAlertRoute(alert);
                const patientLabel = alertPatientLabel(alert, patientById);
                const encounterId =
                  typeof alert.metadata?.encounterId === 'string'
                    ? alert.metadata.encounterId
                    : null;

                return (
                  <article
                    key={alert.id}
                    role="listitem"
                    className="emergency-os-notification-card"
                    data-severity={alertSeverityTone(alert)}
                    data-read={alert.read ? 'true' : 'false'}
                  >
                    <div className="emergency-os-notification-card__meta">
                      <span>{formatClassificationLabel(alert)}</span>
                      <span>{describeAlertSource(alert)}</span>
                      <time dateTime={alert.createdAt}>{formatAlertTime(alert.createdAt)}</time>
                      <span>{alert.read ? 'Read' : 'Unread'}</span>
                      {alert.acknowledged ? <span>Acknowledged</span> : null}
                    </div>
                    <div className="emergency-os-notification-card__content">
                      <h3>{alert.title}</h3>
                      <p>{alert.message}</p>
                      {patientLabel || encounterId ? (
                        <div className="emergency-os-notification-card__context">
                          {patientLabel ? <span>{patientLabel}</span> : null}
                          {encounterId ? <span>Encounter {encounterId}</span> : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="emergency-os-notification-card__actions">
                      <button
                        type="button"
                        onClick={() => {
                          recordAlertRead(alert.id);
                          primaryAction.onSelect?.();
                        }}
                        disabled={primaryAction.disabled}
                        title={
                          primaryAction.disabled
                            ? primaryAction.disabledLabel || 'Action unavailable'
                            : primaryAction.label
                        }
                      >
                        {primaryAction.disabled
                          ? primaryAction.disabledLabel || 'Unavailable'
                          : primaryAction.label}
                      </button>
                      <button
                        type="button"
                        onClick={() => recordAlertAcknowledged(alert.id)}
                        disabled={Boolean(alert.acknowledged)}
                      >
                        {alert.acknowledged ? 'Acknowledged' : 'Acknowledge'}
                      </button>
                      <button
                        type="button"
                        onClick={() => recordAlertRead(alert.id)}
                        disabled={Boolean(alert.read)}
                      >
                        {alert.read ? 'Read' : 'Mark read'}
                      </button>
                      <button type="button" onClick={() => recordAlertDismissed(alert.id)}>
                        Dismiss
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="emergency-os-notification-center__state">
              No active CareDroid notifications. Capacity, EMS, reassessment, boarding, referral,
              sync, AI safety, and integration streams are clear.
            </div>
          )}
        </div>
      ) : null}

      {!screenCapabilities.isRegistrationScreen ? (
        <StaffWorkloadPanel open={staffWorkloadOpen} onClose={() => setStaffWorkloadOpen(false)} />
      ) : null}
    </header>
  );
}

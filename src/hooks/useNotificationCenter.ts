import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { raiseOperationalAlarm } from '../services/notificationToastPolicy';
import { useEmergencyStore } from '../store/emergencyStore';
import type { Alert } from '../types/emergency';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { EMERGENCY_ROLE_IDS } from '../config/emergencyRolePermissions';
import {
  filterOperationalMetrics,
  getOperationalMetricRoute,
  groupOperationalAlertsByMetric,
} from '../config/operationalMetricsModel';
import {
  getAlertClassificationTier,
  isAlertActionable,
  resolveOperationalAlertEnvelope,
  sortAlertsByClassification,
  triageOperationalAlerts,
} from '../engine/alertClassificationModel';
import {
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
import {
  buildEmsOffloadAlerts,
  buildEmsOffloadTrackerSummary,
} from '../services/emsOffloadTracker';
import { useEmergencyRolePermissions } from './useEmergencyRolePermissions';
import useEffectiveUserProfile from './useEffectiveUserProfile';
import { navigateProfileAware } from '../navigation/profileRouteLaunch';
import useOperationalIntelligence from './useOperationalIntelligence';
import useRouteScreenMode from './useRouteScreenMode';
import useScreenModeCapabilities from './useScreenModeCapabilities';
import {
  alertRoute,
  normalizeAlertKey,
  redactAlertForRole,
  routePermissionPath,
  type NotificationCenterAction,
} from '../utils/notificationCenterUtils';

export function useNotificationCenter() {
  const navigate = useNavigate();
  const emergencyRole = useEmergencyRolePermissions();
  const { saasRole } = useEffectiveUserProfile();
  const routeScreenMode = useRouteScreenMode();
  const screenCapabilities = useScreenModeCapabilities();
  const operationalIntelligence = useOperationalIntelligence({
    realtime: false,
    screenMode: routeScreenMode,
  });

  const alerts = useEmergencyStore((store) => store.alerts);
  const patients = useEmergencyStore((store) => store.patients);
  const referrals = useEmergencyStore((store) => store.referrals);
  const emsArrivals = useEmergencyStore((store) => store.emsArrivals);
  const staff = useEmergencyStore((store) => store.staff);
  const workflowLogs = useEmergencyStore((store) => store.workflowLogs);
  const rooms = useEmergencyStore((store) => store.rooms);
  const thresholds = useEmergencyStore((store) => store.thresholds);
  const loading = useEmergencyStore((store) => store.loading);
  const integrationEvents = useEmergencyStore((store) => store.integrationEvents);
  const selectPatient = useEmergencyStore((store) => store.selectPatient);
  const markAlertRead = useEmergencyStore((store) => store.markAlertRead);
  const acknowledgeAlert = useEmergencyStore((store) => store.acknowledgeAlert);
  const dismissAlert = useEmergencyStore((store) => store.dismissAlert);

  const centralSnapshot = operationalIntelligence.centralSnapshot;
  const intelligenceSnapshot = operationalIntelligence.snapshot;
  const refreshError = operationalIntelligence.refreshError;
  const operationalSummary = centralSnapshot.operationalSummary;

  const [showInformationalAlerts, setShowInformationalAlerts] = useState(false);
  const [localReadAlertIds, setLocalReadAlertIds] = useState<Set<string>>(() => new Set());
  const [localAcknowledgedAlertIds, setLocalAcknowledgedAlertIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [localDismissedAlertIds, setLocalDismissedAlertIds] = useState<Set<string>>(
    () => new Set(),
  );

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
  const highRiskComplaintAlerts = useMemo(() => buildHighRiskComplaintAlerts(patients), [patients]);
  const lwbsRiskAdvisoryAlerts = useMemo(
    () =>
      buildLwbsRiskAdvisoryAlerts(patients, {
        waitingPatientCount: patients.filter((patient) => patient.state === 'Waiting').length,
        workflowLogs,
        staff,
      }),
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

  const canViewPatients = emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyPatients);

  const visibleNotificationAlerts = useMemo(() => {
    const base = sortAlertsByClassification(
      showInformationalAlerts ? alertTriage.all : alertTriage.visible,
    );
    const registrationFiltered = !screenCapabilities.isRegistrationScreen
      ? base
      : base.filter((alert) => {
          const haystack = `${alert.type || ''} ${alert.title || ''} ${alert.message || ''}`.toLowerCase();
          if (
            getAlertClassificationTier(alert) === 'critical' &&
            !/ems|ambulance|pre-arrival|inbound/.test(haystack)
          ) {
            return false;
          }
          return true;
        });
    return canViewPatients
      ? registrationFiltered
      : registrationFiltered.map((alert) => redactAlertForRole(alert, canViewPatients));
  }, [alertTriage, canViewPatients, screenCapabilities.isRegistrationScreen, showInformationalAlerts]);

  const unreadAlertCount = useMemo(
    () => visibleNotificationAlerts.filter((alert) => isAlertActionable(alert)).length,
    [visibleNotificationAlerts],
  );

  const alertsSurfaceMetrics = useMemo(
    () => filterOperationalMetrics(operationalSummary.metrics, 'alerts'),
    [operationalSummary.metrics],
  );

  const groupedOperationalAlerts = useMemo(
    () => groupOperationalAlertsByMetric(visibleNotificationAlerts),
    [visibleNotificationAlerts],
  );

  const navigateEmergencyRoute = useCallback(
    (path: string) => {
      navigateProfileAware(navigate, path, { emergencyRole, saasRole });
    },
    [emergencyRole, navigate, saasRole],
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
    (alert: Alert, onClose?: () => void): NotificationCenterAction => {
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
                onClose?.();
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
            onClose?.();
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
              onClose?.();
            }
          : undefined,
      };
    },
    [emergencyRole, navigateEmergencyRoute, patientById, selectPatient],
  );

  const markAllNotificationsRead = useCallback(() => {
    for (const alert of visibleNotificationAlerts) {
      recordAlertRead(alert.id);
    }
  }, [recordAlertRead, visibleNotificationAlerts]);

  const toastedAlertIdsRef = useRef(new Set<string>());

  useEffect(() => {
    const handleReceptionEscalation = (event: Event) => {
      if (!isClinicalEscalationRecipientRole(emergencyRole.role)) return;
      const alert = (event as CustomEvent<{ alert?: Alert }>).detail?.alert;
      if (!alert?.id) return;

      const targets = escalationAlertTargets(alert);
      if (emergencyRole.role === EMERGENCY_ROLE_IDS.triageNurse && !targets.includes('triage')) return;
      if (emergencyRole.role === EMERGENCY_ROLE_IDS.chargeNurse && !targets.includes('charge')) return;

      const envelope = resolveOperationalAlertEnvelope(alert);
      if (!envelope.showToast || toastedAlertIdsRef.current.has(alert.id)) return;
      toastedAlertIdsRef.current.add(alert.id);
      raiseOperationalAlarm(alert);
    };

    document.addEventListener('reception-escalation-raised', handleReceptionEscalation);
    return () =>
      document.removeEventListener('reception-escalation-raised', handleReceptionEscalation);
  }, [emergencyRole.role, selectPatient]);

  return {
    productLabel: screenCapabilities.productLabel,
    loading,
    refreshError,
    unreadAlertCount,
    visibleNotificationAlerts,
    canViewPatients,
    alertTriage,
    alertsSurfaceMetrics,
    groupedOperationalAlerts,
    showInformationalAlerts,
    setShowInformationalAlerts,
    patientById,
    navigateEmergencyRoute,
    recordAlertRead,
    recordAlertAcknowledged,
    recordAlertDismissed,
    openAlertRoute,
    markAllNotificationsRead,
  };
}
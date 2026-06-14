import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBell, IconSearch } from '@tabler/icons-react';
import {
  useEmergencyStore,
  type EmergencyOperationalMetricKey,
} from '../store/emergencyStore';
import { PatientFlag, type Alert, type Patient } from '../types/emergency';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { EMERGENCY_OS_BRANDING } from '../config/emergencyOsBranding.config';
import { EMERGENCY_ACTIONS } from '../config/emergencyRolePermissions';
import { getCentralControlPolicy } from '../config/centralControl.config';
import { PILOT_CUSTOMER_MODE } from '../config/unified-navigation.config';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import useCareDroidCentralNode from '../hooks/useCareDroidCentralNode';
import StaffWorkloadPanel from './StaffWorkloadPanel';
import './ReassessmentDrawer.css';
import './Header.css';

const reassessmentBadgeFlags = new Set<string>([
  PatientFlag.ReassessmentDue,
  PatientFlag.DeteriorationRisk,
  PatientFlag.HighRisk,
  PatientFlag.SepsisAlert,
]);

const MAX_HEADER_PATIENT_RESULTS = 5;

const OPERATIONAL_METRIC_ROUTES: Record<EmergencyOperationalMetricKey, string> = {
  patientsToday: CANONICAL_ROUTES.emergencyPatients,
  waiting: `${CANONICAL_ROUTES.emergencyQueues}?queue=Waiting`,
  longestWait: `${CANONICAL_ROUTES.emergencyQueues}?queue=Waiting`,
  averageWait: `${CANONICAL_ROUTES.emergencyQueues}?queue=Waiting`,
  emsInbound: CANONICAL_ROUTES.emergencyEms,
  reassessmentsDue: CANONICAL_ROUTES.emergencyReassessment,
  capacityScore: CANONICAL_ROUTES.emergencyCapacity,
  boarders: CANONICAL_ROUTES.emergencyBoarding,
  referralsPending: CANONICAL_ROUTES.emergencyReferrals,
};

const ALERT_TYPE_ROUTES: Record<string, string> = {
  capacity: CANONICAL_ROUTES.emergencyCapacity,
  capacity_crisis: CANONICAL_ROUTES.emergencyCapacity,
  capacity_crunch: CANONICAL_ROUTES.emergencyCapacity,
  ems: CANONICAL_ROUTES.emergencyEms,
  eta: CANONICAL_ROUTES.emergencyEms,
  boarding: CANONICAL_ROUTES.emergencyBoarding,
  reassessment: CANONICAL_ROUTES.emergencyReassessment,
  reassessment_overdue: CANONICAL_ROUTES.emergencyReassessment,
  referral: CANONICAL_ROUTES.emergencyReferrals,
  referral_delay: CANONICAL_ROUTES.emergencyReferrals,
  queue: CANONICAL_ROUTES.emergencyQueues,
  sync: CANONICAL_ROUTES.emergencySettings,
  system: CANONICAL_ROUTES.emergencySettings,
  integration: CANONICAL_ROUTES.emergencyIntegrations,
  provincial: CANONICAL_ROUTES.emergencyProvincialHealth,
  ai: CANONICAL_ROUTES.emergencyCopilot,
  copilot: CANONICAL_ROUTES.emergencyCopilot,
};

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
  if (alert.severity === 'Critical') return 'critical';
  if (alert.severity === 'Warning') return 'warning';
  return 'info';
}

function formatAlertTime(timestamp?: string): string {
  if (!timestamp) return 'Time pending';
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return 'Time pending';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function describeAlertSource(alert: Alert): string {
  const source = alert.source || alert.type || 'Emergency OS';
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

function getPatientDisplayName(patient: Patient): string {
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.name || patient.mrn;
}

function patientLookupText(patient: Patient): string {
  return [
    getPatientDisplayName(patient),
    patient.mrn,
    patient.chiefComplaint,
    patient.complaint,
    patient.complaintCategory,
    patient.state,
    patient.priority,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function alertRoute(alert: Alert): string | null {
  const key = normalizeAlertKey(alert.actionType || alert.type);
  if (ALERT_TYPE_ROUTES[key]) return ALERT_TYPE_ROUTES[key];
  const text = `${alert.title} ${alert.message} ${alert.source || ''}`.toLowerCase();
  if (text.includes('ems')) return CANONICAL_ROUTES.emergencyEms;
  if (text.includes('board')) return CANONICAL_ROUTES.emergencyBoarding;
  if (text.includes('reassessment') || text.includes('reassess')) return CANONICAL_ROUTES.emergencyReassessment;
  if (text.includes('referral') || text.includes('transfer')) return CANONICAL_ROUTES.emergencyReferrals;
  if (text.includes('queue') || text.includes('wait')) return CANONICAL_ROUTES.emergencyQueues;
  if (text.includes('capacity')) return CANONICAL_ROUTES.emergencyCapacity;
  if (text.includes('provincial')) return CANONICAL_ROUTES.emergencyProvincialHealth;
  if (text.includes('integration') || text.includes('sync')) return CANONICAL_ROUTES.emergencyIntegrations;
  if (text.includes('ai') || text.includes('copilot')) return CANONICAL_ROUTES.emergencyCopilot;
  return null;
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
        color: '#9CA3AF',
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
  const emergencyRole = useEmergencyRolePermissions();
  const centralNode = useCareDroidCentralNode({ realtime: true });
  const centralSnapshot = centralNode.snapshot;
  const alerts = useEmergencyStore((store) => store.alerts);
  const patients = useEmergencyStore((store) => store.patients);
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
  const canManageWorkload = emergencyRole.can(EMERGENCY_ACTIONS.reassignWorkload);
  const canCreatePatient = emergencyRole.can(EMERGENCY_ACTIONS.createPatient);
  const canCreateReferral = emergencyRole.can(EMERGENCY_ACTIONS.manageReferral);
  const canDischarge = emergencyRole.can(EMERGENCY_ACTIONS.dischargePatient);
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
  const operationalSummary = centralSnapshot.operationalSummary;
  const syncMode = centralSnapshot.sync.mode || 'polling';
  const syncAge = formatSyncAge(centralSnapshot.sync.lastSyncedAt);
  const syncLabel = centralSnapshot.sync.stale
    ? `${syncMode.toUpperCase()} stale`
    : `${syncMode.toUpperCase()} ${syncAge}`;
  const syncTitle = [
    `Status: ${centralSnapshot.sync.status}`,
    `Mode: ${syncMode}`,
    `Last update: ${syncAge}`,
    `Source: ${centralSnapshot.sync.source}`,
    centralSnapshot.sync.message,
  ]
    .filter(Boolean)
    .join('. ');
  const patientById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );
  const storeAlertIds = useMemo(() => new Set(alerts.map((alert) => alert.id)), [alerts]);
  const supplementalAlerts = useMemo<Alert[]>(() => {
    const generatedAt = centralSnapshot.generatedAt || new Date().toISOString();
    const notices: Alert[] = [];
    if (centralSnapshot.sync.stale || centralSnapshot.sync.status !== 'connected') {
      notices.push({
        id: 'system-sync-status',
        type: 'System',
        severity: centralSnapshot.sync.stale ? 'Warning' : 'Info',
        title: centralSnapshot.sync.stale ? 'System sync delayed' : 'System sync status',
        message: centralSnapshot.sync.message || `Central node sync is ${centralSnapshot.sync.status}.`,
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
          : 'Integration signal captured in the Emergency OS event stream.',
        createdAt: latestIntegrationEvent.receivedAt,
        dismissed: false,
        source: isProvincial ? 'provincial-data' : 'integration-events',
        actionType: isProvincial ? 'provincial' : 'integration',
      });
    }
    return notices;
  }, [centralSnapshot, integrationEvents]);
  const notificationAlerts = useMemo(() => {
    const byId = new Map<string, Alert>();
    for (const alert of [...supplementalAlerts, ...centralSnapshot.operationalAlerts, ...alerts]) {
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
    localAcknowledgedAlertIds,
    localDismissedAlertIds,
    localReadAlertIds,
    supplementalAlerts,
  ]);

  const unreadAlertCount = useMemo(
    () => notificationAlerts.filter((alert) => !alert.read && !alert.dismissed).length,
    [notificationAlerts],
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
  const patientLookupResults = useMemo(() => {
    const query = patientLookupQuery.trim().toLowerCase();
    if (!query) return [];

    return patients
      .filter((patient) => patientLookupText(patient).includes(query))
      .slice(0, MAX_HEADER_PATIENT_RESULTS);
  }, [patientLookupQuery, patients]);

  const navigateEmergencyRoute = useCallback((path: string) => {
    const permissionPath = routePermissionPath(path);
    navigate(
      emergencyRole.canAccessRoute(permissionPath)
        ? path
        : emergencyRole.nearestRoute(permissionPath),
    );
  }, [emergencyRole, navigate]);

  const openCentralIntake = () => {
    if (!canSubmitCentralIntake) return;
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
    if (!canOpenPatients) return;
    navigateEmergencyRoute(
      query
        ? `${CANONICAL_ROUTES.emergencyPatients}?q=${encodeURIComponent(query)}`
        : CANONICAL_ROUTES.emergencyPatients,
    );
    setPatientLookupOpen(false);
  };

  const selectLookupPatient = (patientId: string) => {
    selectPatient(patientId);
    navigateEmergencyRoute(`${CANONICAL_ROUTES.emergencyPatients}?patientId=${encodeURIComponent(patientId)}`);
    setPatientLookupQuery('');
    setPatientLookupOpen(false);
  };

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
    for (const alert of notificationAlerts) {
      recordAlertRead(alert.id);
    }
  };

  useEffect(() => {
    const closePanels = () => {
      setAlertDrawerOpen(false);
      setStaffWorkloadOpen(false);
    };
    document.addEventListener('close-all-panels', closePanels);
    return () => document.removeEventListener('close-all-panels', closePanels);
  }, []);

  return (
    <header
      className="emergency-os-header"
      style={{
        height: 92,
        width: '100%',
        background: '#0D1117',
        borderBottom: '1px solid #1F2937',
        display: 'grid',
        gridTemplateRows: '48px 44px',
        flexShrink: 0,
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <div
        className="emergency-os-header__topbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          minWidth: 0,
          padding: '0 16px',
        }}
      >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span
          className="emergency-os-header__wordmark"
          title={EMERGENCY_OS_BRANDING.platformLine}
          style={{ fontSize: 14, fontWeight: 500, color: '#F9FAFB' }}
        >
          {EMERGENCY_OS_BRANDING.productName}
        </span>
        <span className="emergency-os-header__aiios-pill">
          {EMERGENCY_OS_BRANDING.aiiosName}
        </span>
        <Clock />
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          className="emergency-os-header__page-title"
          aria-label="Current Emergency OS page"
          style={{ display: 'grid', minWidth: 0, justifyItems: 'center' }}
        >
          <strong>{pageTitle || EMERGENCY_OS_BRANDING.productName}</strong>
          {pageSubtitle ? <span>{pageSubtitle}</span> : null}
        </div>
        {!PILOT_CUSTOMER_MODE.enabled ? (
          <span
            className="emergency-os-header__central-node"
            title={`${centralControl.statusLabel}. ${centralControl.dashboardControlLabel}. ${centralControl.inputProfile.label}. ${centralControl.contributorMode ? 'Users submit inputs only.' : 'This role can operate central controls.'}`}
          >
            {centralControl.label}: {centralControl.contributorMode ? 'Input only' : 'Controller'} ·{' '}
            {centralControl.inputProfile.label}
          </span>
        ) : null}
        <div
          className="emergency-os-header__central-status"
          aria-label="CareDroid central node live status"
        >
          <span data-tone={centralSnapshot.operationalSummary.metrics.find((metric) => metric.key === 'capacityScore')?.tone || 'neutral'}>
            CAP {centralSnapshot.capacityStatus.score} {centralSnapshot.capacityStatus.band}
          </span>
          <span data-tone={centralSnapshot.emsPressure.status === 'critical' ? 'critical' : centralSnapshot.emsPressure.inbound ? 'warning' : 'success'}>
            EMS {centralSnapshot.emsPressure.inbound}
          </span>
          <span data-tone={centralSnapshot.reassessmentStatus.due ? 'critical' : 'success'}>
            REA {centralSnapshot.reassessmentStatus.due}
          </span>
          <span data-tone={centralSnapshot.currentDepartmentStatus.activeAlerts ? 'critical' : 'success'}>
            ALR {centralSnapshot.currentDepartmentStatus.activeAlerts}
          </span>
          <span data-tone={centralSnapshot.sync.stale ? 'warning' : 'success'} title={syncTitle}>
            {syncLabel}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div className="emergency-os-header__primary-actions" aria-label="Emergency OS primary actions">
          <button
            type="button"
            className="emergency-os-header__action emergency-os-header__action--primary"
            onClick={openCentralIntake}
            disabled={!canSubmitCentralIntake}
            aria-label="Create patient"
            title={
              canSubmitCentralIntake
                ? 'Create a patient intake'
                : `${emergencyRole.roleLabel} cannot create patients`
            }
          >
            Create
          </button>
          <button
            type="button"
            className="emergency-os-header__action"
            onClick={() => document.dispatchEvent(new Event('open-reassessment-drawer'))}
            aria-label="Open reassessment queue"
            title="Open reassessment queue"
          >
            Reassess
          </button>
          <button
            type="button"
            className="emergency-os-header__action"
            onClick={openReferralWorkflow}
            disabled={!canCreateReferral}
            aria-label="Create referral"
            title={
              canCreateReferral
                ? 'Create referral or consult request'
                : `${emergencyRole.roleLabel} cannot create referrals`
            }
          >
            Referral
          </button>
          {!PILOT_CUSTOMER_MODE.enabled ? (
            <button
              type="button"
              className="emergency-os-header__action"
              onClick={openSelectedPatientDischarge}
              disabled={!canDischarge || !selectedPatientId}
              aria-label="Discharge selected patient"
              title={
                canDischarge
                  ? selectedPatientId
                    ? 'Open discharge confirmation for the selected patient'
                    : 'Select a patient before discharge'
                  : `${emergencyRole.roleLabel} cannot discharge patients`
              }
            >
              Discharge
            </button>
          ) : null}
        </div>

        <div className="emergency-os-header__lookup">
          <IconSearch size={15} stroke={2} aria-hidden />
          <input
            type="search"
            value={patientLookupQuery}
            placeholder="Patient lookup"
            aria-label="Patient lookup"
            onFocus={() => setPatientLookupOpen(true)}
            onChange={(event) => {
              setPatientLookupQuery(event.target.value);
              setPatientLookupOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (patientLookupResults[0]) selectLookupPatient(patientLookupResults[0].id);
                else openPatientLookupRoute();
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                setPatientLookupOpen(false);
              }
            }}
          />
          {patientLookupOpen && patientLookupQuery.trim() ? (
            <div className="emergency-os-header__lookup-results" role="listbox" aria-label="Patient lookup results">
              {patientLookupResults.length ? (
                patientLookupResults.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    role="option"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectLookupPatient(patient.id)}
                  >
                    <strong>{getPatientDisplayName(patient)}</strong>
                    <span>
                      {patient.mrn} · {patient.chiefComplaint || patient.complaint || 'Complaint not set'}
                    </span>
                  </button>
                ))
              ) : (
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={openPatientLookupRoute}>
                  Search all patients for "{patientLookupQuery.trim()}"
                </button>
              )}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => document.dispatchEvent(new Event('open-command-palette'))}
          aria-label="Open command palette"
          title="Search patients and actions"
          style={{
            width: 32,
            height: 32,
            border: '1px solid #1F2937',
            borderRadius: 8,
            background: '#111827',
            color: '#9CA3AF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <IconSearch size={18} stroke={2} />
        </button>

        {reassessmentAttentionCount > 0 ? (
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
          className="emergency-os-header__icon-button emergency-os-header__notification-trigger"
          onClick={() => setAlertDrawerOpen((open) => !open)}
          aria-label={`Notification Center${unreadAlertCount ? `: ${unreadAlertCount} unread` : ''}`}
          aria-haspopup="dialog"
          aria-expanded={alertDrawerOpen}
          title="Open Notification Center"
        >
          <IconBell size={18} stroke={2} aria-hidden />
          {unreadAlertCount > 0 ? (
            <span className="emergency-os-header__notification-badge">
              {unreadAlertCount > 99 ? '99+' : unreadAlertCount}
            </span>
          ) : null}
        </button>

        {!PILOT_CUSTOMER_MODE.enabled ? (
          <button
            type="button"
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
            style={{
              width: 24,
              height: 24,
              borderRadius: 999,
              border: '1px solid #1F2937',
              background: '#1C2333',
              color: '#9CA3AF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              cursor: canManageWorkload ? 'pointer' : 'not-allowed',
              opacity: canManageWorkload ? 1 : 0.6,
            }}
          >
            DA
          </button>
        ) : null}
      </div>
      </div>

      <nav
        className="emergency-os-header__operational-strip"
        aria-label="Operational command context"
      >
        {operationalSummary.metrics.map((metric) => {
          const route = OPERATIONAL_METRIC_ROUTES[metric.key];
          const canOpenRoute = emergencyRole.canAccessRoute(routePermissionPath(route));
          return (
            <button
              key={metric.key}
              type="button"
              className="emergency-os-header__operational-metric"
              data-tone={metric.tone || 'neutral'}
              onClick={() => {
                if (canOpenRoute) navigateEmergencyRoute(route);
              }}
              disabled={!canOpenRoute}
              title={`${metric.label}: ${metric.value}. Source: ${metric.source}`}
            >
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </button>
          );
        })}
      </nav>

      {alertDrawerOpen ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="notification-center-title"
          className="emergency-os-notification-center"
        >
          <div className="emergency-os-notification-center__header">
            <div>
              <span>Emergency OS</span>
              <h2 id="notification-center-title">Notification Center</h2>
              <p>
                {unreadAlertCount
                  ? `${unreadAlertCount} unread operational notice${unreadAlertCount === 1 ? '' : 's'}`
                  : 'All active notices reviewed'}
              </p>
            </div>
            <div className="emergency-os-notification-center__header-actions">
              <button
                type="button"
                onClick={markAllNotificationsRead}
                disabled={!notificationAlerts.some((alert) => !alert.read)}
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
          {loading && !notificationAlerts.length ? (
            <div className="emergency-os-notification-center__state" role="status">
              Loading active Emergency OS notifications...
            </div>
          ) : centralNode.refreshError && !notificationAlerts.length ? (
            <div className="emergency-os-notification-center__state emergency-os-notification-center__state--error" role="alert">
              Notification data is using local Emergency OS state. {centralNode.refreshError}
            </div>
          ) : notificationAlerts.length > 0 ? (
            <div className="emergency-os-notification-center__list" role="list">
              {notificationAlerts.map((alert) => {
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
                      <span>{alert.severity}</span>
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
              No active Emergency OS notifications. Capacity, EMS, reassessment, boarding,
              referral, sync, AI safety, and integration streams are clear.
            </div>
          )}
        </div>
      ) : null}

      <StaffWorkloadPanel open={staffWorkloadOpen} onClose={() => setStaffWorkloadOpen(false)} />
    </header>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBell, IconSearch } from '@tabler/icons-react';
import {
  useEmergencyStore,
  type EmergencyOperationalMetricKey,
} from '../store/emergencyStore';
import { PatientFlag, type Patient } from '../types/emergency';
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
  waiting: CANONICAL_ROUTES.emergencyQueues,
  longestWait: CANONICAL_ROUTES.emergencyQueues,
  emsInbound: CANONICAL_ROUTES.emergencyEms,
  reassessmentsDue: CANONICAL_ROUTES.emergencyReassessment,
  capacityScore: CANONICAL_ROUTES.emergencyCapacity,
  boarders: CANONICAL_ROUTES.emergencyBoarding,
  referralsPending: CANONICAL_ROUTES.emergencyReferrals,
};

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
  const selectPatient = useEmergencyStore((store) => store.selectPatient);
  const centralControlSettings = useEmergencyStore(
    (store) => store.emergencySettings.centralControl,
  );
  const [alertDrawerOpen, setAlertDrawerOpen] = useState(false);
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

  const unreadAlertCount = useMemo(
    () => alerts.filter((alert) => !alert.dismissed).length,
    [alerts],
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

  const navigateEmergencyRoute = (path: string) => {
    navigate(emergencyRole.canAccessRoute(path) ? path : emergencyRole.nearestRoute(path));
  };

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
    navigateEmergencyRoute(CANONICAL_ROUTES.emergencyPatients);
    setPatientLookupQuery('');
    setPatientLookupOpen(false);
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
          <span data-tone={centralSnapshot.sync.stale ? 'warning' : 'success'}>
            {centralSnapshot.sync.stale ? 'Sync stale' : 'Synced'}
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
          onClick={() => setAlertDrawerOpen((open) => !open)}
          aria-label="Alerts"
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
            position: 'relative',
          }}
        >
          <IconBell size={18} stroke={2} />
          {unreadAlertCount > 0 ? (
            <span
              style={{
                position: 'absolute',
                top: -5,
                right: -5,
                minWidth: 16,
                height: 16,
                borderRadius: 999,
                background: '#EF4444',
                color: '#F9FAFB',
                fontSize: 10,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 2px #0D1117',
              }}
            >
              {unreadAlertCount}
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
          const canOpenRoute = emergencyRole.canAccessRoute(route);
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
          aria-label="Alert drawer"
          style={{
            position: 'absolute',
            top: 48,
            right: 52,
            width: 320,
            maxHeight: 360,
            overflowY: 'auto',
            background: '#111827',
            border: '1px solid #1F2937',
            borderRadius: 12,
            padding: 12,
            boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
            zIndex: 120,
          }}
        >
          <div style={{ color: '#F9FAFB', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            Alerts
            <button
              type="button"
              onClick={() => setAlertDrawerOpen(false)}
              aria-label="Close alerts"
              style={{
                float: 'right',
                border: '1px solid #374151',
                borderRadius: 8,
                background: 'transparent',
                color: '#9CA3AF',
                cursor: 'pointer',
                fontSize: 11,
                padding: '3px 7px',
              }}
            >
              Close
            </button>
          </div>
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <button
                key={alert.id}
                type="button"
                onClick={() => {
                  if (alert.patientId) selectPatient(alert.patientId);
                  setAlertDrawerOpen(false);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: '#0B1120',
                  border: '1px solid #1F2937',
                  borderRadius: 10,
                  color: '#F9FAFB',
                  padding: 10,
                  marginBottom: 8,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    color: alert.severity === 'Critical' ? '#EF4444' : '#F59E0B',
                    fontSize: 11,
                  }}
                >
                  {alert.severity}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{alert.title}</div>
                <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>{alert.message}</div>
              </button>
            ))
          ) : (
            <div style={{ color: '#9CA3AF', fontSize: 12 }}>All clear</div>
          )}
        </div>
      ) : null}

      <StaffWorkloadPanel open={staffWorkloadOpen} onClose={() => setStaffWorkloadOpen(false)} />
    </header>
  );
}

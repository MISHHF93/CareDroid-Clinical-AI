import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientFlag, PatientState, Priority, type EMSArrival, type Patient } from '../../types/emergency';
import { hasPatientFlag, useEmergencyStore, type EmergencyOperationalMetricKey } from '../../store/emergencyStore';
import { useEmergencyWhiteboard, useUpgradeHarnessPatientFlow } from '../../hooks/useEmergencyOs';
import useCareDroidCentralNode from '../../hooks/useCareDroidCentralNode';
import { EMERGENCY_ACTIONS } from '../../config/emergencyRolePermissions';
import { getCentralControlPolicy } from '../../config/centralControl.config';
import { EMERGENCY_OS_BRANDING } from '../../config/emergencyOsBranding.config';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import PatientCard from '../../components/PatientCard';
import QuickIntake from '../../components/QuickIntake';
import WhoNextPanel from '../../components/WhoNextPanel';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import CapacityCrisisMode from '../../components/CapacityCrisisMode';
import QueueIntelligencePanel from '../../components/QueueIntelligencePanel';
import { sortWhiteboardPatients } from '../../utils/emergencyWhiteboardSorting';
import '../../components/EmergencyWhiteboard.css';

type FilterId = 'All' | 'Waiting' | 'Assessment' | 'High Risk' | 'EMS' | 'Boarding';
type UpgradeHarnessSignal = {
  capability: string;
  data?: {
    alerts?: unknown[];
    candidates?: unknown[];
  };
};

const FILTERS: FilterId[] = ['All', 'Waiting', 'Assessment', 'High Risk', 'EMS', 'Boarding'];
const CLOSED_REFERRAL_STATUSES = new Set(['Closed', 'Completed', 'Declined', 'PatientDeparted']);
const WHITEBOARD_COMMAND_METRIC_ROUTES: Record<EmergencyOperationalMetricKey, string> = {
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
const WHITEBOARD_COMMAND_METRIC_KEYS = new Set<EmergencyOperationalMetricKey>([
  'patientsToday',
  'averageWait',
  'emsInbound',
  'capacityScore',
  'boarders',
  'referralsPending',
]);

function isHighRisk(patient: Patient): boolean {
  return (
    patient.priority === Priority.P1 ||
    patient.priority === Priority.P2 ||
    hasPatientFlag(patient, PatientFlag.HighRisk) ||
    hasPatientFlag(patient, PatientFlag.DeteriorationRisk) ||
    hasPatientFlag(patient, PatientFlag.SepsisAlert)
  );
}

function isBoarding(patient: Patient): boolean {
  return (
    patient.state === PatientState.Admission || hasPatientFlag(patient, PatientFlag.PendingAdmission)
  );
}

function filterPatient(patient: Patient, activeFilter: FilterId): boolean {
  if (patient.state === PatientState.Discharge) return false;
  if (activeFilter === 'Waiting') return patient.state === PatientState.Waiting;
  if (activeFilter === 'Assessment') return patient.state === PatientState.Assessment;
  if (activeFilter === 'High Risk') return isHighRisk(patient);
  if (activeFilter === 'EMS') return hasPatientFlag(patient, PatientFlag.EMSArrival);
  if (activeFilter === 'Boarding') return isBoarding(patient);
  return true;
}

function isOpenReferralStatus(status?: string): boolean {
  return !CLOSED_REFERRAL_STATUSES.has(String(status || '').trim());
}

function matchesActiveQueue(
  patient: Patient,
  activeQueueFilter: string | null,
  pendingReferralPatientIds: Set<string>,
): boolean {
  if (!activeQueueFilter) return true;
  const filter = activeQueueFilter.trim().toLowerCase();

  if (filter === 'waiting') return patient.state === PatientState.Waiting;
  if (filter === 'triage') return patient.state === PatientState.Triage;
  if (filter === 'provider' || filter === 'assessment') return patient.state === PatientState.Assessment;
  if (filter === 'results') return patient.state === PatientState.Results;
  if (filter === 'admission' || filter === 'boarding') return isBoarding(patient);
  if (filter === 'referral') return pendingReferralPatientIds.has(patient.id);
  if (filter === 'discharge') return patient.state === PatientState.Disposition;
  if (filter === 'reassessment') {
    return (
      hasPatientFlag(patient, PatientFlag.ReassessmentDue) ||
      hasPatientFlag(patient, PatientFlag.DeteriorationRisk) ||
      hasPatientFlag(patient, PatientFlag.SepsisAlert)
    );
  }

  return true;
}

function findUpgradeSignal(
  signals: UpgradeHarnessSignal[],
  capability: string,
): UpgradeHarnessSignal | null {
  return signals.find((signal) => signal.capability === capability) || null;
}

function StatCard({
  value,
  label,
  tone = 'default',
  title,
}: {
  value: string | number;
  label: string;
  tone?: 'default' | 'info' | 'success' | 'warning' | 'critical';
  title?: string;
}) {
  const toneColor =
    tone === 'critical'
      ? 'var(--status-critical, #EF4444)'
      : tone === 'warning'
        ? 'var(--status-warning, #F59E0B)'
        : tone === 'success'
          ? 'var(--status-stable, #10B981)'
          : tone === 'info'
            ? 'var(--status-info, #60A5FA)'
            : 'var(--color-text-primary, #F9FAFB)';

  return (
    <div
      className="emergency-whiteboard-page__stat"
      title={title}
      style={{
        flex: '1 1 0',
        minWidth: 120,
        padding: '14px 16px',
        borderRight: '1px solid var(--color-border-subtle, #1F2937)',
      }}
    >
      <div
        style={{
          color: 'var(--color-text-primary, #F9FAFB)',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 24,
          lineHeight: 1.1,
          fontWeight: 700,
        }}
      >
        {value}
      </div>
      <div style={{ color: toneColor, fontSize: 12, fontWeight: tone === 'default' ? 500 : 800, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function minutesRemaining(arrival: EMSArrival): number {
  const target = new Date(arrival.estimatedArrivalTime).getTime();
  if (!Number.isFinite(target)) return arrival.eta ?? 0;
  return Math.ceil((target - Date.now()) / 60000);
}

function formatEta(arrival: EMSArrival): string {
  const remaining = minutesRemaining(arrival);
  if (arrival.status === 'Arrived' || arrival.status === 'Handoff' || remaining <= 0) return 'Arrived';
  return `${remaining} min`;
}

function patientName(patient: Patient): string {
  return `${patient.firstName} ${patient.lastName}`.trim() || patient.mrn;
}

function routePermissionPath(path: string): string {
  return path.split(/[?#]/)[0] || path;
}

function capacityTone(band?: string): 'success' | 'warning' | 'critical' | 'info' {
  if (band === 'Red') return 'critical';
  if (band === 'Orange' || band === 'Yellow') return 'warning';
  if (band === 'Green') return 'success';
  return 'info';
}

function formatFreshness(value?: string | null): string {
  if (!value) return 'local';
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'local';
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (elapsedMinutes < 1) return 'now';
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  return `${Math.round(elapsedMinutes / 60)}h ago`;
}

function MissionButton({
  label,
  onClick,
  disabled = false,
  title,
  tone = 'default',
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  tone?: 'default' | 'primary' | 'warning';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        border: '1px solid var(--color-border-subtle, #1F2937)',
        borderRadius: 12,
        background:
          tone === 'primary'
            ? 'var(--component-button-primary-bg, #2563EB)'
            : tone === 'warning'
              ? 'color-mix(in srgb, var(--status-warning, #F59E0B) 14%, var(--color-card, #172033))'
              : 'var(--color-floating-surface, #1E293B)',
        color: disabled ? 'var(--color-text-muted, #6B7280)' : 'var(--color-text-primary, #F9FAFB)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12,
        fontWeight: 850,
        minHeight: 36,
        opacity: disabled ? 0.58 : 1,
        padding: '8px 10px',
        textAlign: 'left',
      }}
    >
      {label}
    </button>
  );
}

export default function EmergencyWhiteboard() {
  const navigate = useNavigate();
  const emergencyRole = useEmergencyRolePermissions();
  const storePatients = useEmergencyStore((state) => state.patients);
  const storeCapacity = useEmergencyStore((state) => state.capacity);
  const storeLoading = useEmergencyStore((state) => state.loading);
  const rooms = useEmergencyStore((state) => state.rooms);
  const referrals = useEmergencyStore((state) => state.referrals);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const emsIncomingPatients = useEmergencyStore((state) => state.emsIncomingPatients);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const setQueueFilter = useEmergencyStore((state) => state.setQueueFilter);
  const activeQueueFilter = useEmergencyStore((state) => state.activeQueueFilter);
  const prepareEMSBay = useEmergencyStore((state) => state.prepareEMSBay);
  const convertEMSArrivalToPatient = useEmergencyStore((state) => state.convertEMSArrivalToPatient);
  const centralControlSettings = useEmergencyStore(
    (state) => state.emergencySettings.centralControl,
  );
  const whiteboard = useEmergencyWhiteboard();
  const upgradePatientFlow = useUpgradeHarnessPatientFlow();
  const whiteboardPayload = (
    whiteboard.data as { data?: { patients?: Patient[]; capacity?: typeof storeCapacity } } | null
  )?.data;
  const whiteboardGeneratedAt = (
    whiteboard.data as { generatedAt?: string } | null
  )?.generatedAt;
  const patients = useMemo(() => {
    const payloadPatients = whiteboardPayload?.patients;
    if (!payloadPatients?.length) return storePatients;
    const payloadIds = new Set(payloadPatients.map((patient) => patient.id));
    return [...payloadPatients, ...storePatients.filter((patient) => !payloadIds.has(patient.id))];
  }, [storePatients, whiteboardPayload?.patients]);
  const upgradeFlowSignals = (
    upgradePatientFlow.data as { data?: { signals?: UpgradeHarnessSignal[] } } | null
  )?.data?.signals || [];
  const wearableSignal = findUpgradeSignal(upgradeFlowSignals, 'wearable_iomt_processing');
  const vvtSignal = findUpgradeSignal(upgradeFlowSignals, 'virtual_visit_track');
  const wearableAlertCount = wearableSignal?.data?.alerts?.length || 0;
  const virtualVisitCandidateCount = vvtSignal?.data?.candidates?.length || 0;
  const capacity = whiteboardPayload?.capacity || storeCapacity;
  const [activeFilter, setActiveFilter] = useState<FilterId>('All');
  const [showIntake, setShowIntake] = useState(false);
  const [queuePanelCollapsed, setQueuePanelCollapsed] = useState(false);
  const [toast, setToast] = useState('');
  const [clockTick, setClockTick] = useState(() => Date.now());
  const canCreatePatient = emergencyRole.can(EMERGENCY_ACTIONS.createPatient);
  const canPrepareBay = emergencyRole.can(EMERGENCY_ACTIONS.prepareEmsBay);
  const canConvertEmsArrival = emergencyRole.can(EMERGENCY_ACTIONS.convertEmsArrival);
  const canManageReferral = emergencyRole.can(EMERGENCY_ACTIONS.manageReferral);
  const centralControl = useMemo(
    () =>
      getCentralControlPolicy({
        role: emergencyRole.role,
        can: emergencyRole.can,
        settings: centralControlSettings,
      }),
    [centralControlSettings, emergencyRole],
  );
  const centralNode = useCareDroidCentralNode({ screenMode: 'COMMAND_CENTER_DISPLAY' });
  const centralSnapshot = centralNode.snapshot;
  const commandLayerMetrics = centralSnapshot.operationalSummary.metrics.filter((metric) =>
    WHITEBOARD_COMMAND_METRIC_KEYS.has(metric.key),
  );
  const breachedQueueCount = centralSnapshot.queueHealth.filter((queue) => queue.breached).length;
  const canUseCentralIntake =
    canCreatePatient || (centralControl.enabled && !emergencyRole.readOnly);
  const isInitialLoading = (storeLoading || whiteboard.loading) && patients.length === 0;
  const activeEmsArrivals = useMemo(
    () => emsArrivals.filter((arrival) => !['Complete', 'Cancelled'].includes(arrival.status)),
    [emsArrivals],
  );
  const soonEmsArrivals = useMemo(
    () =>
      activeEmsArrivals.filter((arrival) => {
        const remaining = minutesRemaining(arrival);
        return arrival.status === 'Inbound' && remaining > 0 && remaining <= 10;
      }).length,
    [activeEmsArrivals, clockTick],
  );
  const reassessmentPatients = useMemo(
    () =>
      patients
        .filter(
          (patient) =>
            patient.flags.includes(PatientFlag.ReassessmentDue) ||
            patient.flags.includes(PatientFlag.DeteriorationRisk) ||
            patient.flags.includes(PatientFlag.SepsisAlert),
        )
        .sort(sortWhiteboardPatients),
    [patients],
  );

  const stats = useMemo(() => {
    const waiting = patients.filter((patient) => patient.state === PatientState.Waiting).length;
    const highRisk = patients.filter(isHighRisk).length;
    const boarding = patients.filter(isBoarding).length;
    const reassessmentDue =
      capacity.reassessmentDueCount ??
      capacity.reassessmentDue ??
      patients.filter((patient) => patient.flags.includes(PatientFlag.ReassessmentDue)).length;

    return {
      total: patients.length,
      waiting,
      highRisk,
      boarding,
      reassessmentDue,
    };
  }, [capacity.reassessmentDue, capacity.reassessmentDueCount, patients]);

  const pendingReferralPatientIds = useMemo(
    () =>
      new Set(
        referrals
          .filter((referral) => isOpenReferralStatus(referral.status))
          .map((referral) => referral.patientId),
      ),
    [referrals],
  );

  const visiblePatients = useMemo(
    () =>
      patients
        .filter((patient) =>
          activeQueueFilter
            ? matchesActiveQueue(patient, activeQueueFilter, pendingReferralPatientIds)
            : filterPatient(patient, activeFilter),
        )
        .sort(sortWhiteboardPatients),
    [activeFilter, activeQueueFilter, patients, pendingReferralPatientIds],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const openIntake = () => {
      if (canUseCentralIntake) setShowIntake(true);
    };
    const closePanels = () => setShowIntake(false);
    document.addEventListener('open-intake', openIntake);
    document.addEventListener('close-all-panels', closePanels);
    return () => {
      document.removeEventListener('open-intake', openIntake);
      document.removeEventListener('close-all-panels', closePanels);
    };
  }, [canUseCentralIntake]);

  useEffect(() => {
    const clearFilters = () => {
      setActiveFilter('All');
      setQueueFilter(null);
    };
    document.addEventListener('clear-whiteboard-filters', clearFilters);
    return () => document.removeEventListener('clear-whiteboard-filters', clearFilters);
  }, [setQueueFilter]);

  const openIntake = useCallback(() => {
    if (canUseCentralIntake) setShowIntake(true);
  }, [canUseCentralIntake]);

  const openRoute = useCallback((path: string) => {
    const permissionPath = routePermissionPath(path);
    navigate(
      emergencyRole.canAccessRoute(permissionPath)
        ? path
        : emergencyRole.nearestRoute(permissionPath),
    );
  }, [emergencyRole, navigate]);

  const openReferralWorkflow = useCallback((patientId?: string) => {
    if (!canManageReferral) return;
    const params = new URLSearchParams({ new: '1' });
    if (patientId) params.set('patientId', patientId);
    navigate(`${CANONICAL_ROUTES.emergencyReferrals}?${params.toString()}`);
  }, [canManageReferral, navigate]);

  const openQueueReview = useCallback((queue: FilterId | null = null) => {
    if (queue) {
      setActiveFilter(queue);
      setQueueFilter(queue);
    }
  }, [setQueueFilter]);

  const openReassessmentTasks = useCallback((patientId?: string) => {
    if (patientId) selectPatient(patientId);
    document.dispatchEvent(new Event('open-reassessment-drawer'));
  }, [selectPatient]);

  const convertArrival = useCallback((arrival: EMSArrival) => {
    if (!canConvertEmsArrival || arrival.patientId) return;
    convertEMSArrivalToPatient(arrival.id);
    setToast(`${arrival.unitId} added to whiteboard`);
    window.setTimeout(() => setToast(''), 2400);
    setActiveFilter('EMS');
    whiteboard.refresh();
  }, [canConvertEmsArrival, convertEMSArrivalToPatient, whiteboard.refresh]);

  const closeIntake = useCallback(() => setShowIntake(false), []);

  const handlePatientAdded = useCallback(
    (patient: Patient) => {
      setToast(`${patient.firstName} ${patient.lastName} added to whiteboard`);
      window.setTimeout(() => setToast(''), 2400);
      setActiveFilter('All');
      whiteboard.refresh();
    },
    [whiteboard.refresh],
  );

  return (
    <section className="emergency-whiteboard-page" style={{ minHeight: '100%', background: 'var(--color-background, #0B1220)' }}>
      <div
        className="emergency-whiteboard-page__hero"
        style={{
          display: 'grid',
          gap: 8,
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border-subtle, #1F2937)',
          background: 'var(--color-card, #172033)',
          boxShadow: 'none',
        }}
      >
        <div>
          <span
            style={{
              color: 'var(--status-info, #93C5FD)',
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {EMERGENCY_OS_BRANDING.platformLine}
          </span>
          <h1 style={{ color: 'var(--color-text-primary, #F9FAFB)', fontSize: 24, lineHeight: 1.08, margin: '3px 0 0' }}>
            {EMERGENCY_OS_BRANDING.commandCenterName}
          </h1>
          <p style={{ color: 'var(--color-text-secondary, #CBD5E1)', margin: '4px 0 0', maxWidth: 920, fontSize: 13 }}>
            {EMERGENCY_OS_BRANDING.commandCenterSummary}
          </p>
        </div>
        <div
          className="emergency-whiteboard-page__status"
          aria-label="AIIOS command center status"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {[
            `${centralControl.label} managed`,
            `${centralControl.inputProfile.label} input`,
            `${capacity.score} ${capacity.band} capacity`,
            `Updated ${formatFreshness(capacity.updatedAt || whiteboardGeneratedAt)}`,
            `${stats.total} active ED records`,
            `${emsArrivals.length + emsIncomingPatients.length} EMS signals`,
            `${breachedQueueCount} queue breaches`,
            `${centralSnapshot.boardingStatus.risk} boarding risk`,
            `${centralSnapshot.currentDepartmentStatus.activeAlerts} active alerts`,
            `${wearableAlertCount} IoMT review alerts`,
            `${virtualVisitCandidateCount} VVT candidates`,
            EMERGENCY_OS_BRANDING.safetyShort,
          ].map((item) => (
            <span
              key={item}
              style={{
                border: '1px solid var(--color-border-subtle, #1F2937)',
                borderRadius: 999,
                background: 'var(--color-floating-surface, #1E293B)',
                color: 'var(--color-text-primary, #E5E7EB)',
                fontSize: 12,
                fontWeight: 750,
                padding: '6px 10px',
              }}
            >
              {item}
            </span>
          ))}
        </div>
        <p style={{ color: 'var(--color-text-muted, #9CA3AF)', margin: 0, fontSize: 12 }}>
          {EMERGENCY_OS_BRANDING.roleFlowSummary} Inputs flow into{' '}
          {centralControl.inputProfile.escalationPath.replace(/-/g, ' ')} and remain subject to
          central policy.
        </p>
      </div>
      <CapacityCrisisMode
        capacity={capacity}
        patients={patients}
        rooms={rooms}
        referrals={referrals}
        emsArrivals={emsArrivals}
        emsIncomingPatients={emsIncomingPatients}
      />
      <section
        aria-label="Operational command layer metrics"
        style={{
          display: 'grid',
          gap: 10,
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border-subtle, #1F2937)',
          background: 'var(--color-surface, #111827)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <strong style={{ color: 'var(--color-text-primary, #F9FAFB)', fontSize: 13 }}>
            Operational command layer
          </strong>
          <span style={{ color: 'var(--color-text-muted, #9CA3AF)', fontSize: 12, fontWeight: 750 }}>
            {centralSnapshot.sync.source === 'backend-snapshot' ? 'Backend snapshot' : 'Local store'} -{' '}
            {formatFreshness(centralSnapshot.sync.lastSyncedAt || centralSnapshot.generatedAt)}
          </span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 8,
          }}
        >
          {commandLayerMetrics.map((metric) => {
            const route = WHITEBOARD_COMMAND_METRIC_ROUTES[metric.key];
            const canOpen = emergencyRole.canAccessRoute(routePermissionPath(route));
            const toneColor =
              metric.tone === 'critical'
                ? 'var(--status-critical, #EF4444)'
                : metric.tone === 'warning'
                  ? 'var(--status-warning, #F59E0B)'
                  : metric.tone === 'success'
                    ? 'var(--status-stable, #10B981)'
                    : 'var(--status-info, #60A5FA)';

            return (
              <button
                key={metric.key}
                type="button"
                onClick={() => {
                  if (canOpen) openRoute(route);
                }}
                disabled={!canOpen}
                title={`${metric.label}: ${metric.value}. Source: ${metric.source}. ${centralSnapshot.sync.message}`}
                style={{
                  border: '1px solid var(--color-border-subtle, #1F2937)',
                  borderRadius: 12,
                  background: 'var(--color-card, #172033)',
                  color: canOpen ? 'var(--color-text-primary, #F9FAFB)' : 'var(--color-text-muted, #9CA3AF)',
                  cursor: canOpen ? 'pointer' : 'not-allowed',
                  display: 'grid',
                  gap: 4,
                  minHeight: 68,
                  opacity: canOpen ? 1 : 0.58,
                  padding: 12,
                  textAlign: 'left',
                }}
              >
                <strong style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 22 }}>
                  {metric.value}
                </strong>
                <span style={{ color: toneColor, fontSize: 12, fontWeight: 850 }}>
                  {metric.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>
      <div
        className="emergency-whiteboard-page__stats"
        style={{
          background: 'var(--color-surface, #111827)',
          borderBottom: '1px solid var(--color-border-subtle, #1F2937)',
          display: 'flex',
          alignItems: 'stretch',
          overflowX: 'auto',
        }}
      >
        <StatCard value={stats.total} label="Total" />
        <StatCard value={stats.waiting} label="Waiting" />
        <StatCard value={stats.highRisk} label="High Risk" tone={stats.highRisk ? 'critical' : 'success'} />
        <StatCard value={`${capacity.score} ${capacity.band}`} label="Capacity" tone={capacityTone(capacity.band)} />
        <StatCard value={stats.reassessmentDue} label="Reassess Due" tone={stats.reassessmentDue ? 'warning' : 'success'} />
        <StatCard value={soonEmsArrivals} label="EMS <10m" tone={soonEmsArrivals ? 'critical' : 'success'} />
        <StatCard value={stats.boarding} label="Boarding" tone={stats.boarding ? 'warning' : 'success'} />
        <StatCard
          value={formatFreshness(capacity.updatedAt || whiteboardGeneratedAt)}
          label="Data Freshness"
          tone="info"
          title="Last Emergency OS capacity or whiteboard update"
        />
      </div>

      <section
        className="emergency-whiteboard-page__mission"
        aria-labelledby="whiteboard-mission-control-title"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 1.1fr) minmax(260px, 1fr) minmax(240px, 0.9fr)',
          gap: 12,
          padding: 16,
          borderBottom: '1px solid var(--color-border-subtle, #1F2937)',
          background: 'var(--color-background, #0B1220)',
        }}
      >
        <div
          className="emergency-whiteboard-page__mission-card"
          style={{
            border: '1px solid var(--color-border-subtle, #1F2937)',
            borderRadius: 14,
            background: 'var(--color-card, #172033)',
            padding: 12,
          }}
        >
          <span style={{ color: 'var(--status-info, #93C5FD)', fontSize: 11, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Mission control
          </span>
          <h2 id="whiteboard-mission-control-title" style={{ color: 'var(--color-text-primary, #F9FAFB)', fontSize: 16, margin: '4px 0 8px' }}>
            Critical actions from the board
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <MissionButton
              label="Central Intake"
              onClick={openIntake}
              disabled={!canUseCentralIntake}
              title={canUseCentralIntake ? 'Create patient using the existing quick intake modal' : 'Central intake unavailable for this role'}
              tone="primary"
            />
            <MissionButton
              label="Identity Review"
              onClick={() => openRoute(CANONICAL_ROUTES.emergencyIntake)}
              disabled={!emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyIntake)}
              title="Open existing Smart Intake identity workflow"
            />
            <MissionButton
              label={`Reassessment Tasks (${reassessmentPatients.length})`}
              onClick={() => openReassessmentTasks()}
              disabled={!reassessmentPatients.length}
              title={reassessmentPatients.length ? 'Open reassessment drawer' : 'No reassessment tasks are due'}
              tone={reassessmentPatients.length ? 'warning' : 'default'}
            />
            <MissionButton
              label="New Referral"
              onClick={() => openReferralWorkflow()}
              disabled={!canManageReferral}
              title={canManageReferral ? 'Open existing referral form' : 'Referral workflow unavailable for this role'}
            />
          </div>
        </div>

        <div
          className="emergency-whiteboard-page__mission-card"
          style={{
            border: '1px solid var(--color-border-subtle, #1F2937)',
            borderRadius: 14,
            background: 'var(--color-card, #172033)',
            padding: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <strong style={{ color: 'var(--color-text-primary, #F9FAFB)', fontSize: 13 }}>EMS arrivals</strong>
            <button
              type="button"
              disabled={!emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyEms)}
              onClick={() => openRoute(CANONICAL_ROUTES.emergencyEms)}
              title={
                emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyEms)
                  ? 'Open EMS arrivals'
                  : 'EMS is restricted for this role'
              }
              style={{
                border: 0,
                background: 'transparent',
                color: emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyEms)
                  ? 'var(--status-info, #93C5FD)'
                  : 'var(--color-text-muted, #94A3B8)',
                cursor: emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyEms) ? 'pointer' : 'not-allowed',
                fontWeight: 850,
              }}
            >
              Open EMS
            </button>
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {activeEmsArrivals.length ? activeEmsArrivals.slice(0, 3).map((arrival) => {
              const isIncoming = arrival.status === 'Inbound' && minutesRemaining(arrival) > 0;
              const canConvertNow = !isIncoming && !arrival.patientId;
              return (
                <article
                  className="emergency-whiteboard-page__arrival-card"
                  key={arrival.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 8,
                    border: '1px solid color-mix(in srgb, var(--status-info, #38BDF8) 32%, var(--color-border-default, #1F2937))',
                    borderRadius: 12,
                    background: 'var(--color-surface, #111827)',
                    boxShadow: 'inset 3px 0 0 var(--status-info, #38BDF8)',
                    padding: 10,
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--color-text-primary, #E0F2FE)', fontSize: 13 }}>{arrival.unitId} · {formatEta(arrival)}</strong>
                    <p style={{ color: 'var(--color-text-muted, #9CA3AF)', fontSize: 12, margin: '3px 0 0' }}>
                      {arrival.chiefComplaint} · {arrival.severity}
                    </p>
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => prepareEMSBay(arrival.id)}
                      disabled={!isIncoming || !canPrepareBay || Boolean(arrival.preparedRoomId)}
                      title={arrival.preparedRoomId ? 'Bay already prepared' : 'Prepare a bay for this inbound EMS unit'}
                      style={{ border: '1px solid color-mix(in srgb, var(--status-info, #38BDF8) 40%, var(--color-border-default, #1F2937))', borderRadius: 8, background: 'var(--color-floating-surface, #1E293B)', color: '#BAE6FD', cursor: isIncoming && canPrepareBay && !arrival.preparedRoomId ? 'pointer' : 'not-allowed', opacity: isIncoming && canPrepareBay && !arrival.preparedRoomId ? 1 : 0.55, fontWeight: 800, padding: '5px 7px' }}
                    >
                      {arrival.preparedRoomId ? 'Bay Ready' : 'Prepare Bay'}
                    </button>
                    <button
                      type="button"
                      onClick={() => convertArrival(arrival)}
                      disabled={!canConvertNow || !canConvertEmsArrival}
                      title={canConvertNow ? 'Convert arrived EMS unit to a whiteboard patient' : 'Conversion is available after arrival'}
                      style={{ border: '1px solid color-mix(in srgb, var(--status-stable, #10B981) 40%, var(--color-border-default, #1F2937))', borderRadius: 8, background: 'color-mix(in srgb, var(--status-stable, #10B981) 12%, var(--color-card, #172033))', color: '#A7F3D0', cursor: canConvertNow && canConvertEmsArrival ? 'pointer' : 'not-allowed', opacity: canConvertNow && canConvertEmsArrival ? 1 : 0.55, fontWeight: 800, padding: '5px 7px' }}
                    >
                      Add to Board
                    </button>
                  </div>
                </article>
              );
            }) : (
              <p style={{ color: 'var(--color-text-muted, #9CA3AF)', margin: 0, fontSize: 13 }}>No active EMS arrivals. Use EMS Intake for the full pipeline.</p>
            )}
          </div>
        </div>

        <div
          className="emergency-whiteboard-page__mission-card"
          style={{
            border: '1px solid var(--color-border-subtle, #1F2937)',
            borderRadius: 14,
            background: 'var(--color-card, #172033)',
            padding: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <strong style={{ color: 'var(--color-text-primary, #F9FAFB)', fontSize: 13 }}>Immediate tasks</strong>
            <span style={{ color: 'var(--color-text-muted, #9CA3AF)', fontSize: 12 }}>{referrals.length} referrals</span>
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {reassessmentPatients.length ? reassessmentPatients.slice(0, 3).map((patient) => (
              <button
                key={patient.id}
                type="button"
                onClick={() => openReassessmentTasks(patient.id)}
                style={{
                  border: '1px solid color-mix(in srgb, var(--status-warning, #F59E0B) 34%, var(--color-border-default, #1F2937))',
                  borderRadius: 12,
                  background: 'color-mix(in srgb, var(--status-warning, #F59E0B) 12%, var(--color-card, #172033))',
                  boxShadow: 'inset 3px 0 0 var(--status-warning, #F59E0B)',
                  color: '#FDE68A',
                  cursor: 'pointer',
                  display: 'grid',
                  gap: 2,
                  padding: 10,
                  textAlign: 'left',
                }}
              >
                <strong>{patientName(patient)}</strong>
                <span style={{ color: 'var(--color-text-secondary, #D1D5DB)', fontSize: 12 }}>{patient.priority} · {patient.chiefComplaint}</span>
              </button>
            )) : (
              <p style={{ color: 'var(--color-text-muted, #9CA3AF)', margin: 0, fontSize: 13 }}>No reassessment tasks are due.</p>
            )}
            <MissionButton label="Filter Waiting Queue" onClick={() => openQueueReview('Waiting')} />
          </div>
        </div>
      </section>

      <div
        className="emergency-whiteboard-page__controls"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          padding: 16,
          borderBottom: '1px solid var(--color-border-subtle, #1F2937)',
        }}
      >
        <div className="emergency-whiteboard-page__filters" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {FILTERS.map((filter) => {
            const active = filter === activeFilter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => {
                  setActiveFilter(filter);
                  setQueueFilter(null);
                }}
                style={{
                  border: '1px solid var(--color-border-subtle, #1F2937)',
                  borderRadius: 999,
                  background: active ? 'var(--color-text-primary, #F9FAFB)' : 'transparent',
                  color: active ? 'var(--color-background, #111827)' : 'var(--color-text-muted, #9CA3AF)',
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {filter}
              </button>
            );
          })}
        </div>

        <div className="emergency-whiteboard-page__card-key" aria-label="Patient card visual key">
          <span><i style={{ background: 'var(--priority-p1, #EF4444)' }} /> CTAS band</span>
          <span><i style={{ background: 'var(--status-danger, #EF4444)' }} /> Critical risk</span>
          <span><i style={{ background: 'var(--status-warning, #F59E0B)' }} /> Wait/reassess</span>
          <span><i style={{ background: 'var(--color-secondary, #38BDF8)' }} /> EMS</span>
          <span><i style={{ background: 'var(--color-accent, #A78BFA)' }} /> Boarding</span>
        </div>

        <button
          className="emergency-whiteboard-page__intake-button"
          type="button"
          onClick={openIntake}
          disabled={!canUseCentralIntake}
          title={
            canUseCentralIntake
              ? 'Send a new patient input to the Central Node'
              : `${emergencyRole.roleLabel} cannot submit central intake inputs`
          }
          style={{
            border: '1px solid var(--color-border-subtle, #1F2937)',
            borderRadius: 12,
            background: 'var(--component-button-primary-bg, #2563EB)',
            color: 'var(--component-button-primary-fg, #F9FAFB)',
            padding: '10px 14px',
            fontSize: 14,
            fontWeight: 700,
            cursor: canUseCentralIntake ? 'pointer' : 'not-allowed',
            opacity: canUseCentralIntake ? 1 : 0.58,
            whiteSpace: 'nowrap',
          }}
        >
          + Central Intake
        </button>
      </div>

      {showIntake && canUseCentralIntake ? (
        <QuickIntake onClose={closeIntake} onAdded={handlePatientAdded} />
      ) : null}

      <section
        className="emergency-whiteboard-page__queue-intelligence"
        aria-label="Whiteboard queue intelligence"
      >
        <QueueIntelligencePanel
          collapsed={queuePanelCollapsed}
          onCollapsedChange={setQueuePanelCollapsed}
        />
      </section>

      {activeQueueFilter ? (
        <div
          role="status"
          style={{
            alignItems: 'center',
            borderBottom: '1px solid var(--color-border-subtle, #1F2937)',
            color: 'var(--color-text-primary, #F9FAFB)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'space-between',
            padding: '10px 16px',
          }}
        >
          <span style={{ color: '#BFDBFE', fontSize: 13, fontWeight: 850 }}>
            Showing the {activeQueueFilter} queue on the Whiteboard.
          </span>
          <button
            type="button"
            onClick={() => setQueueFilter(null)}
            style={{
              border: '1px solid var(--color-border-subtle, #1F2937)',
              borderRadius: 999,
              background: 'transparent',
              color: 'var(--color-text-primary, #F9FAFB)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 850,
              padding: '6px 10px',
            }}
          >
            Clear queue filter
          </button>
        </div>
      ) : null}

      {isInitialLoading ? <SkeletonLoader variant="whiteboard" /> : null}

      {whiteboard.error ? (
        <div
          role="alert"
          style={{
            margin: 16,
            padding: 12,
            border: '1px solid #7F1D1D',
            borderRadius: 12,
            background: '#450A0A',
            color: '#FCA5A5',
          }}
        >
          {whiteboard.error}. Showing the last local Emergency OS state.
        </div>
      ) : null}

      {toast ? (
        <div
          role="status"
          style={{
            position: 'fixed',
            right: 20,
            bottom: 20,
            zIndex: 320,
            border: '1px solid #10B981',
            borderRadius: 12,
            background: '#052E2B',
            color: '#D1FAE5',
            padding: '12px 14px',
            fontWeight: 700,
            boxShadow: 'none',
          }}
        >
          {toast}
        </div>
      ) : null}

      {!whiteboard.loading && visiblePatients.length > 0 ? (
        <div
          className="emergency-whiteboard-page__grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 290px), 1fr))',
            gap: 14,
            padding: 14,
          }}
        >
          {visiblePatients.map((patient) => (
            <PatientCard key={patient.id} patient={patient} missionControlActions />
          ))}
        </div>
      ) : !whiteboard.loading ? (
        <div
          style={{
            minHeight: 360,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9CA3AF',
            fontSize: 20,
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          {!activeQueueFilter && activeFilter === 'All'
            ? 'No active patients are currently on the board.'
            : `No patients match the ${activeQueueFilter || activeFilter} filter. Clear filters to return to the active board.`}
        </div>
      ) : null}
      <WhoNextPanel mode="floating" />
    </section>
  );
}

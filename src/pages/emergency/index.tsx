import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientFlag, PatientState, Priority, type EMSArrival, type Patient } from '../../types/emergency';
import { useEmergencyStore } from '../../store/emergencyStore';
import { useEmergencyWhiteboard } from '../../hooks/useEmergencyOs';
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
import { sortWhiteboardPatients } from '../../utils/emergencyWhiteboardSorting';
import '../../components/EmergencyWhiteboard.css';

type FilterId = 'All' | 'Waiting' | 'Assessment' | 'High Risk' | 'EMS' | 'Boarding';

const FILTERS: FilterId[] = ['All', 'Waiting', 'Assessment', 'High Risk', 'EMS', 'Boarding'];

function isHighRisk(patient: Patient): boolean {
  return (
    patient.priority === Priority.P1 ||
    patient.priority === Priority.P2 ||
    patient.flags.includes(PatientFlag.HighRisk) ||
    patient.flags.includes(PatientFlag.DeteriorationRisk) ||
    patient.flags.includes(PatientFlag.SepsisAlert)
  );
}

function isBoarding(patient: Patient): boolean {
  return (
    patient.state === PatientState.Admission || patient.flags.includes(PatientFlag.PendingAdmission)
  );
}

function filterPatient(patient: Patient, activeFilter: FilterId): boolean {
  if (patient.state === PatientState.Discharge) return false;
  if (activeFilter === 'Waiting') return patient.state === PatientState.Waiting;
  if (activeFilter === 'Assessment') return patient.state === PatientState.Assessment;
  if (activeFilter === 'High Risk') return isHighRisk(patient);
  if (activeFilter === 'EMS') return patient.flags.includes(PatientFlag.EMSArrival);
  if (activeFilter === 'Boarding') return isBoarding(patient);
  return true;
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div
      className="emergency-whiteboard-page__stat"
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
      <div style={{ color: 'var(--color-text-muted, #9CA3AF)', fontSize: 12, marginTop: 4 }}>{label}</div>
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
  const prepareEMSBay = useEmergencyStore((state) => state.prepareEMSBay);
  const convertEMSArrivalToPatient = useEmergencyStore((state) => state.convertEMSArrivalToPatient);
  const centralControlSettings = useEmergencyStore(
    (state) => state.emergencySettings.centralControl,
  );
  const whiteboard = useEmergencyWhiteboard();
  const whiteboardPayload = (
    whiteboard.data as { data?: { patients?: Patient[]; capacity?: typeof storeCapacity } } | null
  )?.data;
  const patients = useMemo(() => {
    const payloadPatients = whiteboardPayload?.patients;
    if (!payloadPatients?.length) return storePatients;
    const payloadIds = new Set(payloadPatients.map((patient) => patient.id));
    return [...payloadPatients, ...storePatients.filter((patient) => !payloadIds.has(patient.id))];
  }, [storePatients, whiteboardPayload?.patients]);
  const capacity = whiteboardPayload?.capacity || storeCapacity;
  const [activeFilter, setActiveFilter] = useState<FilterId>('All');
  const [showIntake, setShowIntake] = useState(false);
  const [toast, setToast] = useState('');
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
  const canUseCentralIntake =
    canCreatePatient || (centralControl.enabled && !emergencyRole.readOnly);
  const isInitialLoading = (storeLoading || whiteboard.loading) && patients.length === 0;
  const activeEmsArrivals = useMemo(
    () => emsArrivals.filter((arrival) => !['Complete', 'Cancelled'].includes(arrival.status)),
    [emsArrivals],
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

    return {
      total: patients.length,
      waiting,
      highRisk,
      boarding,
    };
  }, [patients]);

  const visiblePatients = useMemo(
    () =>
      patients
        .filter((patient) => filterPatient(patient, activeFilter))
        .sort(sortWhiteboardPatients),
    [activeFilter, patients],
  );

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
    navigate(
      emergencyRole.canAccessRoute(path)
        ? path
        : emergencyRole.nearestRoute(path),
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
    openRoute(CANONICAL_ROUTES.emergencyQueues);
  }, [openRoute, setQueueFilter]);

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
            `${stats.total} active ED records`,
            `${emsArrivals.length + emsIncomingPatients.length} EMS signals`,
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
        <StatCard value={stats.highRisk} label="High Risk" />
        <StatCard value={stats.boarding} label="Boarding" />
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
              onClick={() => openRoute(CANONICAL_ROUTES.emergencyEms)}
              style={{ border: 0, background: 'transparent', color: 'var(--status-info, #93C5FD)', cursor: 'pointer', fontWeight: 850 }}
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
                onClick={() => setActiveFilter(filter)}
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))',
            gap: 10,
            padding: 12,
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
          {activeFilter === 'All'
            ? 'No active patients are currently on the board.'
            : `No patients match the ${activeFilter} filter. Clear filters to return to the active board.`}
        </div>
      ) : null}
      <WhoNextPanel mode="floating" />
    </section>
  );
}

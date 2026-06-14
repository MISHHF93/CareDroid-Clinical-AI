import { useCallback, useEffect, useMemo, useState } from 'react';
import { PatientFlag, PatientState, Priority, type Patient } from '../../types/emergency';
import { useEmergencyStore } from '../../store/emergencyStore';
import { useEmergencyWhiteboard } from '../../hooks/useEmergencyOs';
import { EMERGENCY_ACTIONS } from '../../config/emergencyRolePermissions';
import { getCentralControlPolicy } from '../../config/centralControl.config';
import { EMERGENCY_OS_BRANDING } from '../../config/emergencyOsBranding.config';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import PatientCard from '../../components/PatientCard';
import QuickIntake from '../../components/QuickIntake';
import WhoNextPanel from '../../components/WhoNextPanel';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import CapacityCrisisMode from '../../components/CapacityCrisisMode';
import { sortWhiteboardPatients } from '../../utils/emergencyWhiteboardSorting';

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
      style={{
        flex: '1 1 0',
        minWidth: 120,
        padding: '14px 16px',
        borderRight: '1px solid #1F2937',
      }}
    >
      <div
        style={{
          color: '#F9FAFB',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 24,
          lineHeight: 1.1,
          fontWeight: 700,
        }}
      >
        {value}
      </div>
      <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function EmergencyWhiteboard() {
  const emergencyRole = useEmergencyRolePermissions();
  const storePatients = useEmergencyStore((state) => state.patients);
  const storeCapacity = useEmergencyStore((state) => state.capacity);
  const storeLoading = useEmergencyStore((state) => state.loading);
  const rooms = useEmergencyStore((state) => state.rooms);
  const referrals = useEmergencyStore((state) => state.referrals);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const emsIncomingPatients = useEmergencyStore((state) => state.emsIncomingPatients);
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

  const stats = useMemo(() => {
    const waiting = patients.filter((patient) => patient.state === PatientState.Waiting).length;
    const highRisk = patients.filter(isHighRisk).length;
    const boarding = patients.filter(isBoarding).length;

    return {
      total: patients.length,
      waiting,
      highRisk,
      boarding,
      capacityScore: capacity.score,
    };
  }, [capacity.score, patients]);

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

  const openIntake = useCallback(() => {
    if (canUseCentralIntake) setShowIntake(true);
  }, [canUseCentralIntake]);

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
    <section style={{ minHeight: '100%', background: '#0A0E1A' }}>
      <div
        style={{
          display: 'grid',
          gap: 12,
          padding: '16px',
          borderBottom: '1px solid #1F2937',
          background:
            'linear-gradient(135deg, rgba(37,99,235,0.18), rgba(15,23,42,0.98) 44%, rgba(16,185,129,0.12))',
        }}
      >
        <div>
          <span
            style={{
              color: '#93C5FD',
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {EMERGENCY_OS_BRANDING.platformLine}
          </span>
          <h1 style={{ color: '#F9FAFB', fontSize: 28, lineHeight: 1.1, margin: '4px 0 0' }}>
            {EMERGENCY_OS_BRANDING.commandCenterName}
          </h1>
          <p style={{ color: '#CBD5E1', margin: '6px 0 0', maxWidth: 920, fontSize: 13 }}>
            {EMERGENCY_OS_BRANDING.commandCenterSummary}
          </p>
        </div>
        <div
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
                border: '1px solid rgba(148,163,184,0.22)',
                borderRadius: 999,
                background: 'rgba(15,23,42,0.72)',
                color: '#E5E7EB',
                fontSize: 12,
                fontWeight: 750,
                padding: '6px 10px',
              }}
            >
              {item}
            </span>
          ))}
        </div>
        <p style={{ color: '#9CA3AF', margin: 0, fontSize: 12 }}>
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
        style={{
          background: '#111827',
          borderBottom: '1px solid #1F2937',
          display: 'flex',
          alignItems: 'stretch',
          overflowX: 'auto',
        }}
      >
        <StatCard value={stats.total} label="Total" />
        <StatCard value={stats.waiting} label="Waiting" />
        <StatCard value={stats.highRisk} label="High Risk" />
        <StatCard value={stats.boarding} label="Boarding" />
        <StatCard value={stats.capacityScore} label="Capacity Score" />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: 16,
          borderBottom: '1px solid rgba(31,41,55,0.65)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {FILTERS.map((filter) => {
            const active = filter === activeFilter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                style={{
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 999,
                  background: active ? '#F9FAFB' : 'transparent',
                  color: active ? '#111827' : '#9CA3AF',
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
          type="button"
          onClick={openIntake}
          disabled={!canUseCentralIntake}
          title={
            canUseCentralIntake
              ? 'Send a new patient input to the Central Node'
              : `${emergencyRole.roleLabel} cannot submit central intake inputs`
          }
          style={{
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: 12,
            background: '#2563EB',
            color: '#F9FAFB',
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
            boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
          }}
        >
          {toast}
        </div>
      ) : null}

      {!whiteboard.loading && visiblePatients.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
            padding: 16,
          }}
        >
          {visiblePatients.map((patient) => (
            <PatientCard key={patient.id} patient={patient} />
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
          Department Clear
        </div>
      ) : null}
      <WhoNextPanel mode="floating" />
    </section>
  );
}

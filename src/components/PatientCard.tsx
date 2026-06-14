import { memo, useCallback, type KeyboardEvent, type MouseEvent } from 'react';
import { Patient, PatientFlag, PatientState } from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { EMERGENCY_ACTIONS } from '../config/emergencyRolePermissions';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import './PatientCard.css';

type PatientCardProps = {
  patient: Patient;
  keyboardSelected?: boolean;
  highlighted?: boolean;
  missionControlActions?: boolean;
  onKeyboardFocus?: () => void;
};

type LegacyVitals = NonNullable<Patient['vitals'][number]> & {
  heartRate?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  oxygenSaturation?: number;
  temperature?: number;
};

const priorityColors = {
  P1: 'var(--priority-p1)',
  P2: 'var(--priority-p2)',
  P3: 'var(--priority-p3)',
  P4: 'var(--priority-p4)',
  P5: 'var(--priority-p5)',
};

const stateColors: Partial<Record<PatientState, string>> = {
  [PatientState.Waiting]: 'var(--status-warning)',
  [PatientState.Assessment]: 'var(--status-info)',
  [PatientState.Orders]: 'var(--color-secondary)',
  [PatientState.Results]: 'var(--status-success)',
};

const patientStateOrder = Object.values(PatientState);

const flagColors: Partial<Record<PatientFlag, string>> = {
  [PatientFlag.SepsisAlert]: 'var(--status-danger)',
  [PatientFlag.DeteriorationRisk]: 'var(--status-danger)',
  [PatientFlag.ReassessmentDue]: 'var(--status-warning)',
  [PatientFlag.ScoreReassessmentRecommended]: 'var(--status-warning)',
  [PatientFlag.LongWait]: 'var(--capacity-orange)',
  [PatientFlag.LWBSRisk]: 'var(--status-danger)',
  [PatientFlag.HighRisk]: 'var(--status-danger)',
  [PatientFlag.EMSArrival]: 'var(--color-secondary)',
  [PatientFlag.PendingAdmission]: 'var(--color-accent)',
};

const flagLabels: Partial<Record<PatientFlag, string>> = {
  [PatientFlag.SepsisAlert]: 'SEP',
  [PatientFlag.DeteriorationRisk]: 'DET',
  [PatientFlag.ReassessmentDue]: 'REA',
  [PatientFlag.ScoreReassessmentRecommended]: 'SCR',
  [PatientFlag.LongWait]: 'WAIT',
  [PatientFlag.LWBSRisk]: 'LWBS',
  [PatientFlag.HighRisk]: 'RISK',
  [PatientFlag.EMSArrival]: 'EMS',
  [PatientFlag.PendingAdmission]: 'ADM',
};

function latestVitals(patient: Patient): LegacyVitals | undefined {
  return patient.vitals.at(-1) as LegacyVitals | undefined;
}

function truncateComplaint(complaint: string): string {
  return complaint.length > 30 ? `${complaint.slice(0, 30)}...` : complaint;
}

function waitMinutes(arrivalTime: string): number {
  const arrivedAt = new Date(arrivalTime).getTime();
  if (!Number.isFinite(arrivedAt)) return 0;
  return Math.max(0, Math.round((Date.now() - arrivedAt) / 60000));
}

function waitColor(minutes: number): string {
  if (minutes > 60) return 'var(--status-danger)';
  if (minutes > 45) return 'var(--status-warning)';
  return 'var(--color-text-secondary)';
}

function nextPatientState(current: PatientState): PatientState {
  const index = patientStateOrder.indexOf(current);
  return patientStateOrder[Math.min(index + 1, patientStateOrder.length - 1)];
}

function navigateTo(path: string): void {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function staffInitials(name?: string): string {
  if (!name) return '--';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function noteContent(note: Patient['notes'][number]): string {
  return `${note.text || ''} ${note.body || ''} ${JSON.stringify(note.metadata || {})}`;
}

function scoreBadges(patient: Patient): string[] {
  const scores = new Set<string>();
  patient.notes.forEach((note) => {
    const content = noteContent(note);
    ['HEART', 'qSOFA', 'NEWS2', 'NIHSS', 'GCS', 'Wells', 'PERC'].forEach((scoreName) => {
      if (new RegExp(`\\b${scoreName}\\b`, 'i').test(content)) {
        scores.add(scoreName);
      }
    });
    const scoreLabel = note.metadata?.scoreLabel || note.metadata?.scoreId;
    if (scoreLabel) scores.add(String(scoreLabel).slice(0, 14));
  });
  return [...scores].slice(0, 3);
}

function PatientCard({
  patient: patientProp,
  keyboardSelected = false,
  highlighted = false,
  missionControlActions = false,
  onKeyboardFocus,
}: PatientCardProps) {
  const emergencyRole = useEmergencyRolePermissions();
  const patient = useEmergencyStore((store) =>
    store.patients.find((candidate) => candidate.id === patientProp.id)
  ) || patientProp;
  const selectPatient = useEmergencyStore((store) => store.selectPatient);
  const movePatientToState = useEmergencyStore((store) => store.movePatientToState);
  const addFlag = useEmergencyStore((store) => store.addFlag);
  const staff = useEmergencyStore((store) => store.staff);
  const assignedStaff = staff.find((member) => member.id === patient.assignedStaffId);
  const patientName = `${patient.firstName} ${patient.lastName}`.trim();
  // Merged from src/components/EmergencyPatientCard.jsx: tolerate legacy vital field names.
  const vitals = latestVitals(patient);
  const minutesWaiting = waitMinutes(patient.arrivalTime);
  const hasReassessmentDue = patient.flags.includes(PatientFlag.ReassessmentDue);
  const hasDeteriorationRisk = patient.flags.includes(PatientFlag.DeteriorationRisk);
  const hasEmsArrival = patient.flags.includes(PatientFlag.EMSArrival) || patient.source === 'EMS';
  const hasLongWait = patient.flags.includes(PatientFlag.LongWait);
  const hasLwbsRisk = patient.flags.includes(PatientFlag.LWBSRisk);
  const isBoarding = patient.state === PatientState.Admission || patient.flags.includes(PatientFlag.PendingAdmission);
  const isDischarged = patient.state === PatientState.Discharge || patient.state === PatientState.Deceased;
  const scores = scoreBadges(patient);
  const waitStatusColor = hasLwbsRisk ? '#EF4444' : hasLongWait ? '#F59E0B' : waitColor(minutesWaiting);
  const canTransition = emergencyRole.can(EMERGENCY_ACTIONS.transitionPatient);
  const canManageFlags = emergencyRole.can(EMERGENCY_ACTIONS.manageFlags);
  const canManageReferral = emergencyRole.can(EMERGENCY_ACTIONS.manageReferral);
  const canDischarge = emergencyRole.can(EMERGENCY_ACTIONS.dischargePatient);
  const nextState = nextPatientState(patient.state);
  const canMoveNext = canTransition && nextState !== patient.state && !isDischarged;
  const canBoardPatient = canTransition && !isBoarding && !isDischarged;

  const hr = vitals?.hr ?? vitals?.heartRate;
  const sbp = vitals?.sbp ?? vitals?.bpSystolic;
  const dbp = vitals?.dbp ?? vitals?.bpDiastolic;
  const spo2 = vitals?.spo2 ?? vitals?.oxygenSaturation;
  const temp = vitals?.temp ?? vitals?.temperature;
  const hrAbnormal = hr !== undefined && (hr > 120 || hr < 50);
  const bpAbnormal = sbp !== undefined && (sbp < 90 || sbp > 180);
  const spo2Abnormal = spo2 !== undefined && spo2 < 94;
  const tempAbnormal = temp !== undefined && (temp >= 38 || temp < 36);
  const handleSelect = useCallback(() => selectPatient(patient.id), [patient.id, selectPatient]);
  const handleTimelineClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    selectPatient(patient.id);
  }, [patient.id, selectPatient]);
  const handleDetailClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    selectPatient(patient.id);
  }, [patient.id, selectPatient]);
  const handleMoveNext = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!canMoveNext) return;
    movePatientToState(patient.id, nextState, patient.assignedStaffId || 'whiteboard-command', 'Moved from Whiteboard mission control');
  }, [canMoveNext, movePatientToState, nextState, patient.assignedStaffId, patient.id]);
  const handleReassessment = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!hasReassessmentDue && !canManageFlags) return;
    if (!hasReassessmentDue) addFlag(patient.id, PatientFlag.ReassessmentDue);
    selectPatient(patient.id);
    document.dispatchEvent(new Event('open-reassessment-drawer'));
  }, [addFlag, canManageFlags, hasReassessmentDue, patient.id, selectPatient]);
  const handleReferral = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!canManageReferral || !emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyReferrals)) return;
    selectPatient(patient.id);
    const params = new URLSearchParams({ patientId: patient.id, new: '1' });
    navigateTo(`${CANONICAL_ROUTES.emergencyReferrals}?${params.toString()}`);
  }, [canManageReferral, emergencyRole, patient.id, selectPatient]);
  const handleBoarding = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!canBoardPatient) return;
    movePatientToState(patient.id, PatientState.Admission, patient.assignedStaffId || 'whiteboard-command', 'Boarding launched from Whiteboard mission control');
  }, [canBoardPatient, movePatientToState, patient.assignedStaffId, patient.id]);
  const handleDischarge = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!canDischarge || isDischarged) return;
    selectPatient(patient.id);
    window.setTimeout(() => document.dispatchEvent(new Event('open-patient-discharge')), 0);
  }, [canDischarge, isDischarged, patient.id, selectPatient]);
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectPatient(patient.id);
    }
  }, [patient.id, selectPatient]);

  return (
    <div
      className={[
        'patient-card',
        hasReassessmentDue ? 'patient-card--reassessment-due' : '',
        hasDeteriorationRisk ? 'patient-card--deterioration-risk' : '',
        hasEmsArrival ? 'patient-card--ems-arrival' : '',
        hasLongWait ? 'patient-card--long-wait' : '',
        hasLwbsRisk ? 'patient-card--lwbs-risk' : '',
        missionControlActions ? 'patient-card--mission-control' : '',
        keyboardSelected ? 'patient-card--keyboard-selected' : '',
        highlighted ? 'patient-card--highlighted' : '',
      ].filter(Boolean).join(' ')}
      data-patient-card-id={patient.id}
      onClick={handleSelect}
      onFocus={onKeyboardFocus}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{
        background: 'var(--color-card)',
        border: 0,
        borderLeft: `4px solid ${priorityColors[patient.priority]}`,
        borderRadius: 'var(--radius-lg)',
        minHeight: missionControlActions ? 164 : 108,
        padding: 'var(--space-3)',
        cursor: 'pointer',
        position: 'relative',
        boxShadow: hasLwbsRisk
          ? '0 0 0 1px color-mix(in srgb, var(--status-danger) 34%, transparent), var(--app-elevation-card)'
          : patient.priority === 'P1'
            ? '0 0 0 1px color-mix(in srgb, var(--status-danger) 28%, transparent), var(--app-elevation-card)'
            : hasLongWait
              ? 'inset 0 3px 0 var(--status-warning), var(--app-elevation-card)'
              : 'var(--app-elevation-card)',
        overflow: 'hidden',
      }}
      aria-label={`${patientName}, ${patient.state}, ${patient.priority}`}
    >
      {hasLwbsRisk ? <span className="patient-card__lwbs-badge">LWBS RISK</span> : null}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingRight: hasLwbsRisk ? 76 : 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 650, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {patientName}
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', marginTop: 1 }}>{patient.mrn}</div>
        </div>
        <div style={{ background: 'var(--color-floating-surface)', color: 'var(--color-text-secondary)', borderRadius: 999, padding: '2px 8px', fontSize: 'var(--font-size-xs)', flex: '0 0 auto' }}>
          {patient.age}/{patient.sex}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 6, minWidth: 0 }}>
        <div style={{ background: 'var(--color-floating-surface)', borderRadius: 'var(--radius-sm)', padding: '2px 8px', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-primary)', flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {truncateComplaint(patient.chiefComplaint)}
        </div>
        <div style={{ background: 'var(--color-floating-surface)', borderRadius: 'var(--radius-sm)', padding: '2px 8px', fontSize: 'var(--font-size-xs)', color: stateColors[patient.state] ?? 'var(--color-text-secondary)', flex: '0 0 auto' }}>
          {patient.state}
        </div>
        {hasEmsArrival ? (
          <div style={{ background: 'color-mix(in srgb, var(--color-secondary) 14%, var(--color-floating-surface))', borderRadius: 'var(--radius-sm)', padding: '2px 8px', fontSize: 'var(--font-size-xs)', color: 'var(--color-secondary)', flex: '0 0 auto' }}>
            EMS
          </div>
        ) : null}
      </div>

      <div className="patient-card__vitals">
        <span style={{ color: hrAbnormal ? 'var(--status-danger)' : 'var(--color-text-secondary)' }}>HR {hr ?? '--'}</span>
        <span style={{ color: bpAbnormal ? 'var(--status-warning)' : 'var(--color-text-secondary)' }}>BP {sbp ?? '--'}/{dbp ?? '--'}</span>
        <span style={{ color: spo2Abnormal ? 'var(--status-danger)' : 'var(--color-text-secondary)' }}>SpO2 {spo2 ?? '--'}%</span>
        <span className="patient-card__vital-temp" style={{ color: tempAbnormal ? 'var(--status-warning)' : 'var(--color-text-secondary)' }}>T {temp ?? '--'}°</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <div style={{ color: waitStatusColor, fontSize: 11, fontWeight: hasLongWait || hasLwbsRisk ? 800 : 400 }}>
          Wait {minutesWaiting}m
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {patient.roomId ? (
            <div style={{ background: 'var(--color-floating-surface)', color: 'var(--color-text-secondary)', borderRadius: 999, padding: '2px 8px', fontSize: 'var(--font-size-xs)' }}>
              {patient.roomId.toUpperCase()}
            </div>
          ) : null}
          <div style={{ width: 24, height: 24, borderRadius: 999, background: 'var(--color-floating-surface)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-xs)' }}>
            {staffInitials(assignedStaff?.name)}
          </div>
          <button
            type="button"
            className="patient-card__timeline-button"
            aria-label={`Open timeline for ${patientName}`}
            onClick={handleTimelineClick}
          >
            Timeline
          </button>
        </div>
      </div>

      {scores.length ? (
        <div className="patient-card__scores" aria-label="Saved score badges">
          {scores.map((score) => (
            <span key={score}>{score}</span>
          ))}
        </div>
      ) : null}

      <div className="patient-card__flags" aria-label="Patient flags">
        {patient.flags.map((flag) => {
          const color = flagColors[flag];
          if (!color) return null;
          return (
            <span
              key={flag}
              title={flag}
              aria-label={flag}
              style={{
                minWidth: 7,
                height: 14,
                borderRadius: 999,
                background: color,
                color: 'var(--app-on-solid)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 8,
                fontWeight: 800,
                padding: '0 4px',
              }}
            >
              {flagLabels[flag] || flag.slice(0, 3).toUpperCase()}
            </span>
          );
        })}
      </div>

      {missionControlActions ? (
        <div className="patient-card__mission-actions" aria-label={`Whiteboard actions for ${patientName}`}>
          <button type="button" onClick={handleDetailClick}>Detail</button>
          <button
            type="button"
            onClick={handleMoveNext}
            disabled={!canMoveNext}
            title={canMoveNext ? `Move to ${nextState}` : 'Queue move unavailable for this patient or role'}
          >
            Next
          </button>
          <button
            type="button"
            onClick={handleReassessment}
            disabled={!hasReassessmentDue && !canManageFlags}
            title={
              hasReassessmentDue
                ? 'Open reassessment task'
                : canManageFlags
                  ? 'Flag patient for reassessment'
                  : 'Reassessment launch unavailable for this role'
            }
          >
            {hasReassessmentDue ? 'Reassess' : '+Reassess'}
          </button>
          <button
            type="button"
            onClick={handleReferral}
            disabled={!canManageReferral}
            title={canManageReferral ? 'Create referral from existing workflow' : 'Referral workflow unavailable for this role'}
          >
            Refer
          </button>
          <button
            type="button"
            onClick={handleBoarding}
            disabled={!canBoardPatient}
            title={canBoardPatient ? 'Move patient to boarding/admission state' : 'Boarding action unavailable for this patient or role'}
          >
            {isBoarding ? 'Boarded' : 'Board'}
          </button>
          <button
            type="button"
            onClick={handleDischarge}
            disabled={!canDischarge || isDischarged}
            title={canDischarge && !isDischarged ? 'Open discharge confirmation' : 'Discharge unavailable for this patient or role'}
          >
            Discharge
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default memo(PatientCard);

import { memo, useCallback, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react';
import { Patient, PatientFlag, PatientState, PriorityLabel } from '../types/emergency';
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
  [PatientFlag.SepsisAlert]: 'Sepsis alert',
  [PatientFlag.DeteriorationRisk]: 'Deterioration risk',
  [PatientFlag.ReassessmentDue]: 'Reassessment due',
  [PatientFlag.ScoreReassessmentRecommended]: 'Score review',
  [PatientFlag.LongWait]: 'Long wait',
  [PatientFlag.LWBSRisk]: 'LWBS risk',
  [PatientFlag.HighRisk]: 'High risk',
  [PatientFlag.EMSArrival]: 'EMS arrival',
  [PatientFlag.PendingAdmission]: 'Pending admission',
  [PatientFlag.PsychAlert]: 'Psych alert',
  [PatientFlag.Isolation]: 'Isolation',
  [PatientFlag.DeterioratingNeuro]: 'Neuro change',
  [PatientFlag.StrokeCode]: 'Stroke code',
};

type SignalTone = 'critical' | 'warning' | 'info' | 'flow';

type StatusSignal = {
  id: string;
  label: string;
  tone: SignalTone;
};

const CLOSED_REFERRAL_STATUSES = new Set(['Closed', 'Completed', 'Declined', 'PatientDeparted']);

function getSignalBadges({
  patient,
  hasReassessmentDue,
  hasDeteriorationRisk,
  hasEmsArrival,
  hasLongWait,
  hasLwbsRisk,
  isBoarding,
  hasReferralPending,
  hasTransferPending,
  hasCapacityPressure,
}: {
  patient: Patient;
  hasReassessmentDue: boolean;
  hasDeteriorationRisk: boolean;
  hasEmsArrival: boolean;
  hasLongWait: boolean;
  hasLwbsRisk: boolean;
  isBoarding: boolean;
  hasReferralPending: boolean;
  hasTransferPending: boolean;
  hasCapacityPressure: boolean;
}): StatusSignal[] {
  return [
    patient.flags.includes(PatientFlag.SepsisAlert)
      ? { id: 'sepsis', label: 'Sepsis alert', tone: 'critical' as const }
      : null,
    hasDeteriorationRisk
      ? { id: 'deterioration', label: 'Deterioration risk', tone: 'critical' as const }
      : null,
    hasLwbsRisk ? { id: 'lwbs', label: 'LWBS risk', tone: 'critical' as const } : null,
    patient.flags.includes(PatientFlag.HighRisk)
      ? { id: 'high-risk', label: 'High risk', tone: 'critical' as const }
      : null,
    hasReassessmentDue
      ? { id: 'reassessment', label: 'Reassessment due', tone: 'warning' as const }
      : null,
    patient.flags.includes(PatientFlag.ScoreReassessmentRecommended)
      ? { id: 'score-review', label: 'Score review', tone: 'warning' as const }
      : null,
    hasLongWait ? { id: 'long-wait', label: 'Long wait', tone: 'warning' as const } : null,
    hasEmsArrival ? { id: 'ems', label: 'EMS arrival', tone: 'info' as const } : null,
    isBoarding ? { id: 'boarding', label: 'Boarding', tone: 'flow' as const } : null,
    hasTransferPending ? { id: 'transfer', label: 'Transfer pending', tone: 'flow' as const } : null,
    !hasTransferPending && hasReferralPending
      ? { id: 'referral', label: 'Referral pending', tone: 'info' as const }
      : null,
    hasCapacityPressure
      ? { id: 'capacity-pressure', label: 'Capacity pressure', tone: 'warning' as const }
      : null,
  ].filter(Boolean) as StatusSignal[];
}

function latestVitals(patient: Patient): LegacyVitals | undefined {
  return patient.vitals.at(-1) as LegacyVitals | undefined;
}

function truncateComplaint(complaint: string): string {
  return complaint.length > 42 ? `${complaint.slice(0, 42)}...` : complaint;
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

function abnormalVitalsSummary({
  hrAbnormal,
  bpAbnormal,
  spo2Abnormal,
  tempAbnormal,
}: {
  hrAbnormal: boolean;
  bpAbnormal: boolean;
  spo2Abnormal: boolean;
  tempAbnormal: boolean;
}): string {
  const abnormal = [
    hrAbnormal ? 'heart rate' : '',
    bpAbnormal ? 'blood pressure' : '',
    spo2Abnormal ? 'oxygen saturation' : '',
    tempAbnormal ? 'temperature' : '',
  ].filter(Boolean);
  return abnormal.length ? `Abnormal ${abnormal.join(', ')}.` : 'Vitals within displayed thresholds.';
}

function isOpenReferralStatus(status?: string): boolean {
  return !CLOSED_REFERRAL_STATUSES.has(String(status || '').trim());
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
  const referrals = useEmergencyStore((store) => store.referrals);
  const capacityBand = useEmergencyStore((store) => store.capacity.band);
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
  const openReferral = referrals.find(
    (referral) => referral.patientId === patient.id && isOpenReferralStatus(referral.status),
  );
  const hasReferralPending = Boolean(openReferral);
  const hasTransferPending = openReferral?.workflow === 'Transfer';
  const hasCapacityPressure =
    (capacityBand === 'Orange' || capacityBand === 'Red') &&
    (isBoarding || hasLongWait || hasReassessmentDue || hasEmsArrival);
  const scores = scoreBadges(patient);
  const waitStatusColor = hasLwbsRisk ? '#EF4444' : hasLongWait ? '#F59E0B' : waitColor(minutesWaiting);
  const priorityLabel = PriorityLabel[patient.priority] || String(patient.priority);
  const signalBadges = getSignalBadges({
    patient,
    hasReassessmentDue,
    hasDeteriorationRisk,
    hasEmsArrival,
    hasLongWait,
    hasLwbsRisk,
    isBoarding,
    hasReferralPending,
    hasTransferPending,
    hasCapacityPressure,
  });
  const cardStyle = {
    '--patient-priority-color': priorityColors[patient.priority],
  } as CSSProperties;
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
  const patientCardAriaLabel = [
    patientName,
    patient.priority,
    patient.state,
    patient.chiefComplaint,
    `wait ${minutesWaiting} minutes`,
    hasReassessmentDue ? 'reassessment due' : '',
    hasDeteriorationRisk ? 'deterioration risk' : '',
    abnormalVitalsSummary({ hrAbnormal, bpAbnormal, spo2Abnormal, tempAbnormal }),
    hasTransferPending ? 'transfer pending' : hasReferralPending ? 'referral pending' : '',
    hasCapacityPressure ? `${capacityBand} capacity pressure` : '',
  ]
    .filter(Boolean)
    .join(', ');
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
        `patient-card--priority-${patient.priority}`,
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
      style={cardStyle}
      aria-label={patientCardAriaLabel}
    >
      <div className="patient-card__priority-strip" aria-label={`${patient.priority} ${priorityLabel}`}>
        <span className="patient-card__priority-code">{patient.priority}</span>
        <span className="patient-card__priority-label">{priorityLabel}</span>
        <span className="patient-card__state-pill">{patient.state}</span>
      </div>

      <div className="patient-card__identity">
        <div className="patient-card__identity-main">
          <strong>{patientName}</strong>
          <span>{patient.mrn}</span>
        </div>
        <div className="patient-card__demographics">
          <span>{patient.age}</span>
          <span>{patient.sex}</span>
        </div>
      </div>

      <div className="patient-card__complaint" title={patient.chiefComplaint}>
        {truncateComplaint(patient.chiefComplaint)}
      </div>

      <div className="patient-card__signals" aria-label="Patient priority signals">
        {signalBadges.length ? (
          signalBadges.map((signal) => (
            <span key={signal.id} className={`patient-card__signal patient-card__signal--${signal.tone}`}>
              {signal.label}
            </span>
          ))
        ) : (
          <span className="patient-card__signal patient-card__signal--stable">No active risk flags</span>
        )}
      </div>

      <div className="patient-card__meta-grid">
        <div className="patient-card__meta-item">
          <span>Wait</span>
          <strong style={{ color: waitStatusColor }}>{minutesWaiting}m</strong>
        </div>
        <div className="patient-card__meta-item">
          <span>Room</span>
          <strong>{patient.roomId ? patient.roomId.toUpperCase() : 'Unassigned'}</strong>
        </div>
        <div className="patient-card__meta-item">
          <span>Staff</span>
          <strong>{staffInitials(assignedStaff?.name)}</strong>
        </div>
      </div>

      <div className="patient-card__vitals" aria-label={abnormalVitalsSummary({ hrAbnormal, bpAbnormal, spo2Abnormal, tempAbnormal })}>
        <span className={hrAbnormal ? 'patient-card__vital patient-card__vital--critical' : 'patient-card__vital'}>
          <small>HR</small>
          <strong>{hr ?? '--'}</strong>
        </span>
        <span className={bpAbnormal ? 'patient-card__vital patient-card__vital--warning' : 'patient-card__vital'}>
          <small>BP</small>
          <strong>{sbp ?? '--'}/{dbp ?? '--'}</strong>
        </span>
        <span className={spo2Abnormal ? 'patient-card__vital patient-card__vital--critical' : 'patient-card__vital'}>
          <small>SpO2</small>
          <strong>{spo2 ?? '--'}%</strong>
        </span>
        <span className={tempAbnormal ? 'patient-card__vital patient-card__vital--warning patient-card__vital-temp' : 'patient-card__vital patient-card__vital-temp'}>
          <small>Temp</small>
          <strong>{temp ?? '--'}°</strong>
        </span>
      </div>

      {scores.length ? (
        <div className="patient-card__scores" aria-label="Saved score badges">
          {scores.map((score) => (
            <span key={score}>{score}</span>
          ))}
        </div>
      ) : null}

      <div className="patient-card__flags" aria-label="Patient flags and statuses">
        {patient.flags.map((flag) => {
          const color = flagColors[flag];
          const label = flagLabels[flag];
          if (!color || !label) return null;
          return (
            <span
              key={flag}
              title={flag}
              aria-label={label}
              style={{
                '--patient-flag-color': color,
              } as CSSProperties}
              className="patient-card__flag"
            >
              {label}
            </span>
          );
        })}
      </div>

      <button
        type="button"
        className="patient-card__timeline-button"
        aria-label={`Open timeline for ${patientName}`}
        onClick={handleTimelineClick}
      >
        Timeline
      </button>

      {missionControlActions ? (
        <div className="patient-card__mission-actions" aria-label={`Whiteboard actions for ${patientName}`}>
          <button type="button" onClick={handleDetailClick}>Open Detail</button>
          <button
            type="button"
            onClick={handleMoveNext}
            disabled={!canMoveNext}
            title={canMoveNext ? `Move to ${nextState}` : 'Queue move unavailable for this patient or role'}
          >
            Move: {nextState}
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

import { Patient, PatientFlag, PatientState } from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';
import './PatientCard.css';

type PatientCardProps = {
  patient: Patient;
  keyboardSelected?: boolean;
  highlighted?: boolean;
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
  P1:'#EF4444', P2:'#F97316',
  P3:'#F59E0B', P4:'#10B981', P5:'#6B7280'
};

const stateColors: Partial<Record<PatientState, string>> = {
  [PatientState.Waiting]: '#F59E0B',
  [PatientState.Assessment]: '#3B82F6',
  [PatientState.Orders]: '#8B5CF6',
  [PatientState.Results]: '#10B981',
};

const flagColors: Partial<Record<PatientFlag, string>> = {
  [PatientFlag.SepsisAlert]: '#EF4444',
  [PatientFlag.DeteriorationRisk]: '#EF4444',
  [PatientFlag.ReassessmentDue]: '#F59E0B',
  [PatientFlag.ScoreReassessmentRecommended]: '#F59E0B',
  [PatientFlag.LongWait]: '#F97316',
  [PatientFlag.HighRisk]: '#EF4444',
  [PatientFlag.EMSArrival]: '#38BDF8',
  [PatientFlag.PendingAdmission]: '#A78BFA',
};

const flagLabels: Partial<Record<PatientFlag, string>> = {
  [PatientFlag.SepsisAlert]: 'SEP',
  [PatientFlag.DeteriorationRisk]: 'DET',
  [PatientFlag.ReassessmentDue]: 'REA',
  [PatientFlag.ScoreReassessmentRecommended]: 'SCR',
  [PatientFlag.LongWait]: 'WAIT',
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
  if (minutes > 60) return '#EF4444';
  if (minutes > 45) return '#F59E0B';
  return '#6B7280';
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

export default function PatientCard({
  patient,
  keyboardSelected = false,
  highlighted = false,
  onKeyboardFocus,
}: PatientCardProps) {
  const selectPatient = useEmergencyStore((store) => store.selectPatient);
  const staff = useEmergencyStore((store) => store.staff);
  const assignedStaff = staff.find((member) => member.id === patient.assignedStaffId);
  const patientName = `${patient.firstName} ${patient.lastName}`.trim();
  // Merged from src/components/EmergencyPatientCard.jsx: tolerate legacy vital field names.
  const vitals = latestVitals(patient);
  const minutesWaiting = waitMinutes(patient.arrivalTime);
  const hasReassessmentDue = patient.flags.includes(PatientFlag.ReassessmentDue);
  const hasDeteriorationRisk = patient.flags.includes(PatientFlag.DeteriorationRisk);
  const hasEmsArrival = patient.flags.includes(PatientFlag.EMSArrival) || patient.source === 'EMS';
  const scores = scoreBadges(patient);

  const hr = vitals?.hr ?? vitals?.heartRate;
  const sbp = vitals?.sbp ?? vitals?.bpSystolic;
  const dbp = vitals?.dbp ?? vitals?.bpDiastolic;
  const spo2 = vitals?.spo2 ?? vitals?.oxygenSaturation;
  const temp = vitals?.temp ?? vitals?.temperature;
  const hrAbnormal = hr !== undefined && (hr > 120 || hr < 50);
  const bpAbnormal = sbp !== undefined && (sbp < 90 || sbp > 180);
  const spo2Abnormal = spo2 !== undefined && spo2 < 94;
  const tempAbnormal = temp !== undefined && (temp >= 38 || temp < 36);

  return (
    <div
      className={[
        'patient-card',
        hasReassessmentDue ? 'patient-card--reassessment-due' : '',
        hasDeteriorationRisk ? 'patient-card--deterioration-risk' : '',
        hasEmsArrival ? 'patient-card--ems-arrival' : '',
        keyboardSelected ? 'patient-card--keyboard-selected' : '',
        highlighted ? 'patient-card--highlighted' : '',
      ].filter(Boolean).join(' ')}
      data-patient-card-id={patient.id}
      onClick={() => selectPatient(patient.id)}
      onFocus={onKeyboardFocus}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectPatient(patient.id);
        }
      }}
      style={{
        background: '#111827',
        border: '1px solid #1F2937',
        borderLeft: `4px solid ${priorityColors[patient.priority]}`,
        borderRadius: 8,
        height: 120,
        padding: 12,
        cursor: 'pointer',
        position: 'relative',
        boxShadow: patient.priority === 'P1' ? '0 0 12px #EF444440' : undefined,
        overflow: 'hidden',
      }}
      aria-label={`${patientName}, ${patient.state}, ${patient.priority}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#F9FAFB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {patientName}
          </div>
          <div style={{ color: '#6B7280', fontSize: 10, marginTop: 1 }}>{patient.mrn}</div>
        </div>
        <div style={{ background: '#1C2333', color: '#9CA3AF', borderRadius: 999, padding: '2px 8px', fontSize: 11, flex: '0 0 auto' }}>
          {patient.age}/{patient.sex}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 6, minWidth: 0 }}>
        <div style={{ background: '#1C2333', borderRadius: 12, padding: '2px 8px', fontSize: 11, color: '#F9FAFB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {truncateComplaint(patient.chiefComplaint)}
        </div>
        <div style={{ background: '#1C2333', borderRadius: 12, padding: '2px 8px', fontSize: 11, color: stateColors[patient.state] ?? '#6B7280', flex: '0 0 auto' }}>
          {patient.state}
        </div>
        {hasEmsArrival ? (
          <div style={{ background: '#082F49', borderRadius: 12, padding: '2px 8px', fontSize: 11, color: '#7DD3FC', flex: '0 0 auto' }}>
            EMS
          </div>
        ) : null}
      </div>

      <div className="patient-card__vitals">
        <span style={{ color: hrAbnormal ? '#EF4444' : '#9CA3AF' }}>HR {hr ?? '--'}</span>
        <span style={{ color: bpAbnormal ? '#F59E0B' : '#9CA3AF' }}>BP {sbp ?? '--'}/{dbp ?? '--'}</span>
        <span style={{ color: spo2Abnormal ? '#EF4444' : '#9CA3AF' }}>SpO2 {spo2 ?? '--'}%</span>
        <span style={{ color: tempAbnormal ? '#F59E0B' : '#9CA3AF' }}>T {temp ?? '--'}°</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <div style={{ color: waitColor(minutesWaiting), fontSize: 11 }}>
          Wait {minutesWaiting}m
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {patient.roomId ? (
            <div style={{ background: '#1C2333', color: '#9CA3AF', borderRadius: 999, padding: '2px 8px', fontSize: 11 }}>
              {patient.roomId.toUpperCase()}
            </div>
          ) : null}
          <div style={{ width: 24, height: 24, borderRadius: 999, background: '#1C2333', color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
            {staffInitials(assignedStaff?.name)}
          </div>
          <button
            type="button"
            className="patient-card__timeline-button"
            aria-label={`Open timeline for ${patientName}`}
            onClick={(event) => {
              event.stopPropagation();
              selectPatient(patient.id);
            }}
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
                color: '#F9FAFB',
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
    </div>
  );
}

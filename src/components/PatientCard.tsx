import { Patient, PatientFlag, PatientState } from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';
import './PatientCard.css';

type PatientCardProps = {
  patient: Patient;
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
  [PatientFlag.LongWait]: '#F97316',
};

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

export default function PatientCard({ patient }: PatientCardProps) {
  const selectPatient = useEmergencyStore((store) => store.selectPatient);
  const staff = useEmergencyStore((store) => store.staff);
  const assignedStaff = staff.find((member) => member.id === patient.assignedStaffId);
  const patientName = `${patient.firstName} ${patient.lastName}`.trim();
  const vitals = patient.vitals[0];
  const minutesWaiting = waitMinutes(patient.arrivalTime);
  const hasReassessmentDue = patient.flags.includes(PatientFlag.ReassessmentDue);

  const hrAbnormal = vitals?.hr !== undefined && (vitals.hr > 120 || vitals.hr < 50);
  const spo2Abnormal = vitals?.spo2 !== undefined && vitals.spo2 < 94;

  return (
    <div
      className={hasReassessmentDue ? 'patient-card patient-card--reassessment-due' : 'patient-card'}
      data-patient-card-id={patient.id}
      onClick={() => selectPatient(patient.id)}
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
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#F9FAFB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {patientName}
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
      </div>

      <div style={{ fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: '#6B7280', marginTop: 6 }}>
        <span style={{ color: hrAbnormal ? '#EF4444' : '#6B7280' }}>HR: {vitals?.hr ?? '--'}</span>{' '}
        BP: {vitals?.sbp ?? '--'}/{vitals?.dbp ?? '--'}{' '}
        <span style={{ color: spo2Abnormal ? '#EF4444' : '#6B7280' }}>SpO2: {vitals?.spo2 ?? '--'}%</span>{' '}
        T:{vitals?.temp ?? '--'}°
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

      <div style={{ position: 'absolute', bottom: 8, left: 12, display: 'flex', gap: 5 }}>
        {patient.flags.map((flag) => {
          const color = flagColors[flag];
          if (!color) return null;
          return (
            <span
              key={flag}
              title={flag}
              aria-label={flag}
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                background: color,
                display: 'inline-block',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

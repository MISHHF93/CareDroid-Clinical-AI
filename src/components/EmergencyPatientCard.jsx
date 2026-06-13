import React from 'react';
import { getPatientFlagType, hasPatientFlag, useEmergencyStore } from '../../store/emergencyStore';

const priorityColors = {
  P1: '#EF4444',
  P2: '#F97316',
  P3: '#F59E0B',
  P4: '#10B981',
  P5: '#6B7280',
};

const stateColors = {
  Waiting: '#F59E0B',
  Assessment: '#3B82F6',
  Orders: '#8B5CF6',
  Results: '#10B981',
  Disposition: '#F97316',
  Discharge: '#6B7280',
};

const flagColors = {
  SepsisAlert: '#EF4444',
  DeteriorationRisk: '#EF4444',
  ReassessmentDue: '#F59E0B',
  ScoreReassessmentRecommended: '#F59E0B',
  LongWait: '#F97316',
  HighRisk: '#EF4444',
};

function latestVitals(patient) {
  return Array.isArray(patient.vitals) ? patient.vitals.at(-1) : patient.vitals;
}

function truncateComplaint(complaint = '') {
  return complaint.length > 30 ? `${complaint.slice(0, 30)}...` : complaint;
}

function waitMinutes(arrivalTime) {
  const arrivedAt = new Date(arrivalTime).getTime();
  if (!Number.isFinite(arrivedAt)) return 0;
  return Math.max(0, Math.round((Date.now() - arrivedAt) / 60000));
}

function waitColor(minutes) {
  if (minutes > 60) return '#EF4444';
  if (minutes > 45) return '#F59E0B';
  return '#6B7280';
}

function staffInitials(member) {
  const name = member?.displayName || member?.name || [member?.firstName, member?.lastName].filter(Boolean).join(' ');
  if (!name) return '--';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function EmergencyPatientCard({
  patient,
  keyboardSelected = false,
  highlighted = false,
  onKeyboardFocus,
}) {
  const selectPatient = useEmergencyStore((store) => store.selectPatient);
  const staff = useEmergencyStore((store) => store.staff);
  const assignedStaff = staff.find((member) => member.id === patient.assignedStaffId);
  const vitals = latestVitals(patient) || {};
  const minutesWaiting = waitMinutes(patient.arrivalTime);
  const hasReassessmentDue = hasPatientFlag(patient, 'ReassessmentDue');
  const flagTypes = patient.flags.map(getPatientFlagType);

  const hr = vitals.hr ?? vitals.heartRate;
  const sbp = vitals.sbp ?? vitals.bpSystolic;
  const dbp = vitals.dbp ?? vitals.bpDiastolic;
  const spo2 = vitals.spo2 ?? vitals.oxygenSaturation;
  const temp = vitals.temp ?? vitals.temperature;
  const hrAbnormal = Number.isFinite(Number(hr)) && (Number(hr) > 120 || Number(hr) < 50);
  const spo2Abnormal = Number.isFinite(Number(spo2)) && Number(spo2) < 94;

  return (
    <div
      className={[
        'patient-card',
        hasReassessmentDue ? 'patient-card--reassessment-due' : '',
        keyboardSelected ? 'ed-whiteboard__card--keyboard-selected' : '',
        highlighted ? 'ed-whiteboard__card--highlighted' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-patient-card-id={patient.id}
      onClick={() => selectPatient(patient.id)}
      onFocus={() => onKeyboardFocus?.()}
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
        borderLeft: `4px solid ${priorityColors[patient.priority] || '#6B7280'}`,
        borderRadius: 8,
        height: 120,
        padding: 12,
        cursor: 'pointer',
        position: 'relative',
        boxShadow: patient.priority === 'P1' ? '0 0 12px #EF444440' : undefined,
        overflow: 'hidden',
      }}
      aria-label={`${patient.firstName} ${patient.lastName}, ${patient.state}, ${patient.priority}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#F9FAFB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {patient.firstName} {patient.lastName}
        </div>
        <div style={{ background: '#1C2333', color: '#9CA3AF', borderRadius: 999, padding: '2px 8px', fontSize: 11, flex: '0 0 auto' }}>
          {patient.age}/{patient.sex}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 6, minWidth: 0 }}>
        <div style={{ background: '#1C2333', borderRadius: 12, padding: '2px 8px', fontSize: 11, color: '#F9FAFB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {truncateComplaint(patient.chiefComplaint || patient.complaint || patient.complaintCategory)}
        </div>
        <div style={{ background: '#1C2333', borderRadius: 12, padding: '2px 8px', fontSize: 11, color: stateColors[patient.state] ?? '#6B7280', flex: '0 0 auto' }}>
          {patient.state}
        </div>
      </div>

      <div style={{ fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: '#6B7280', marginTop: 6 }}>
        <span style={{ color: hrAbnormal ? '#EF4444' : '#6B7280' }}>HR: {hr ?? '--'}</span>{' '}
        BP: {sbp ?? '--'}/{dbp ?? '--'}{' '}
        <span style={{ color: spo2Abnormal ? '#EF4444' : '#6B7280' }}>SpO2: {spo2 ?? '--'}%</span>{' '}
        T:{temp ?? '--'}°
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <div style={{ color: waitColor(minutesWaiting), fontSize: 11 }}>
          Wait {minutesWaiting}m
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {patient.roomId ? (
            <div style={{ background: '#1C2333', color: '#9CA3AF', borderRadius: 999, padding: '2px 8px', fontSize: 11 }}>
              {String(patient.roomId).toUpperCase()}
            </div>
          ) : null}
          <div style={{ width: 24, height: 24, borderRadius: 999, background: '#1C2333', color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
            {staffInitials(assignedStaff)}
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 8, left: 12, display: 'flex', gap: 5 }}>
        {flagTypes.map((flagType) => {
          const color = flagColors[flagType];
          if (!color) return null;
          return (
            <span
              key={flagType}
              title={flagType}
              aria-label={flagType}
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

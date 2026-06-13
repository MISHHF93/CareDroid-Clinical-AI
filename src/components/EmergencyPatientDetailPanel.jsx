import React, { useMemo, useState } from 'react';
import { PatientState, Priority } from '../../types/emergency';
import { getPatientFlagType, hasPatientFlag, useEmergencyStore } from '../../store/emergencyStore';
import './PatientDetailPanel.css';

const patientStateOrder = Object.values(PatientState);

const priorityColors = {
  [Priority.P1]: '#EF4444',
  [Priority.P2]: '#F97316',
  [Priority.P3]: '#F59E0B',
  [Priority.P4]: '#10B981',
  [Priority.P5]: '#6B7280',
};

const emptyVitalsForm = {
  hr: '',
  bpSystolic: '',
  bpDiastolic: '',
  spo2: '',
  temp: '',
  rr: '',
  gcs: '',
  pain: '',
};

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function patientName(patient) {
  return `${patient.firstName} ${patient.lastName}`;
}

function formatTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function latestVitals(patient) {
  return Array.isArray(patient.vitals) ? patient.vitals.at(-1) : patient.vitals;
}

function noteText(note) {
  return note.body || note.text || '';
}

function noteTimestamp(note) {
  return note.createdAt || note.timestamp;
}

function noteAuthor(note) {
  return note.authorStaffId || note.authorId || 'system';
}

function makeEvent(patientId, type, summary, extra = {}) {
  return {
    id: createId('evt'),
    patientId,
    type,
    timestamp: new Date().toISOString(),
    summary,
    ...extra,
  };
}

function parseVitals(form, recordedBy) {
  const numeric = (value) => {
    if (String(value ?? '').trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    hr: numeric(form.hr),
    bpSystolic: numeric(form.bpSystolic),
    bpDiastolic: numeric(form.bpDiastolic),
    spo2: numeric(form.spo2),
    temp: numeric(form.temp),
    rr: numeric(form.rr),
    gcs: numeric(form.gcs),
    pain: numeric(form.pain),
    recordedAt: new Date().toISOString(),
    recordedBy,
  };
}

function nextPatientState(current) {
  const index = patientStateOrder.indexOf(current);
  return patientStateOrder[Math.min(index + 1, patientStateOrder.length - 1)];
}

function Badge({ children, color }) {
  return (
    <span
      style={{
        background: '#1C2333',
        color,
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 999,
        padding: '4px 9px',
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}

function FieldButton({ children, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? '#1F2937' : 'transparent',
        border: '1px solid #374151',
        color: disabled ? '#6B7280' : '#F9FAFB',
        borderRadius: 10,
        padding: '8px 10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

export default function EmergencyPatientDetailPanel() {
  const patients = useEmergencyStore((state) => state.patients);
  const staff = useEmergencyStore((state) => state.staff);
  const rooms = useEmergencyStore((state) => state.rooms);
  const selectedPatientId = useEmergencyStore((state) => state.selectedPatientId);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const updatePatient = useEmergencyStore((state) => state.updatePatient);
  const movePatientToState = useEmergencyStore((state) => state.movePatientToState);
  const dischargePatient = useEmergencyStore((state) => state.dischargePatient);
  const assignStaff = useEmergencyStore((state) => state.assignStaff);
  const assignRoom = useEmergencyStore((state) => state.assignRoom);
  const addFlag = useEmergencyStore((state) => state.addFlag);
  const removeFlag = useEmergencyStore((state) => state.removeFlag);
  const addVitals = useEmergencyStore((state) => state.addVitals);
  const addNote = useEmergencyStore((state) => state.addNote);
  const scheduleReassessmentReminder = useEmergencyStore((state) => state.scheduleReassessmentReminder);
  const completeReassessmentReminder = useEmergencyStore((state) => state.completeReassessmentReminder);
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [vitalsForm, setVitalsForm] = useState(emptyVitalsForm);
  const [noteTextValue, setNoteTextValue] = useState('');
  const [actionMode, setActionMode] = useState(null);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) || null,
    [patients, selectedPatientId]
  );

  if (!selectedPatient) return null;

  const currentStateIndex = patientStateOrder.indexOf(selectedPatient.state);
  const currentVitals = latestVitals(selectedPatient) || {};
  const actorStaffId = selectedPatient.assignedStaffId || activeShift?.chargeStaffId || staff[0]?.id || 'system';
  const sortedNotes = [...(selectedPatient.notes || [])].sort(
    (a, b) => new Date(noteTimestamp(b)).getTime() - new Date(noteTimestamp(a)).getTime()
  );
  const hasReassessmentDue = hasPatientFlag(selectedPatient, 'ReassessmentDue');
  const pendingReminder = (selectedPatient.reassessmentReminders || []).find(
    (reminder) => reminder.status !== 'completed'
  );

  const updatePriority = (priority) => {
    updatePatient(selectedPatient.id, {
      priority,
      timeline: [
        ...selectedPatient.timeline,
        makeEvent(selectedPatient.id, 'Triage', `Acuity assigned as ${priority}.`, {
          metadata: { selectedPriority: priority, source: 'pilot-detail-panel' },
        }),
      ],
    });
  };

  const moveToState = (toState, summary = `Moved patient to ${toState}.`) => {
    movePatientToState(selectedPatient.id, toState, {
      timelineEvent: makeEvent(selectedPatient.id, 'StateChange', summary, {
        from: selectedPatient.state,
        to: toState,
        fromState: selectedPatient.state,
        toState,
        staffId: actorStaffId,
        actorStaffId,
      }),
    });
  };

  const triggerReassessment = () => {
    const dueAt = new Date(Date.now() - 60_000).toISOString();
    scheduleReassessmentReminder?.(selectedPatient.id, {
      scheduledBy: actorStaffId,
      dueAt,
      note: 'Pilot walkthrough reassessment trigger.',
    });
    addFlag(selectedPatient.id, 'ReassessmentDue', {
      reason: 'Pilot walkthrough reassessment trigger.',
      severity: 'Warning',
      detectedAt: new Date().toISOString(),
    });
  };

  const completeReassessment = () => {
    if (pendingReminder) {
      completeReassessmentReminder(selectedPatient.id, pendingReminder.id, {
        completedBy: actorStaffId,
      });
    }
    if (hasReassessmentDue) removeFlag(selectedPatient.id, 'ReassessmentDue');
    addNote(selectedPatient.id, {
      id: createId('note'),
      patientId: selectedPatient.id,
      authorStaffId: actorStaffId,
      type: 'Clinical',
      body: 'Pilot reassessment completed. No immediate deterioration identified.',
      createdAt: new Date().toISOString(),
    });
  };

  const submitVitals = (event) => {
    event.preventDefault();
    addVitals(selectedPatient.id, parseVitals(vitalsForm, actorStaffId));
    setVitalsForm(emptyVitalsForm);
    setShowVitalsForm(false);
  };

  const submitNote = (event) => {
    event.preventDefault();
    const body = noteTextValue.trim();
    if (!body) return;
    addNote(selectedPatient.id, {
      id: createId('note'),
      patientId: selectedPatient.id,
      authorStaffId: actorStaffId,
      type: 'Clinical',
      body,
      createdAt: new Date().toISOString(),
    });
    setNoteTextValue('');
  };

  return (
    <aside
      className="patient-detail"
      aria-label={`${patientName(selectedPatient)} detail panel`}
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        width: 480,
        height: '100vh',
        background: '#111827',
        borderLeft: '1px solid #1F2937',
        zIndex: 100,
        overflowY: 'auto',
        color: '#F9FAFB',
        boxShadow: '-24px 0 60px rgba(0,0,0,0.36)',
      }}
    >
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          background: '#111827',
          padding: 16,
          borderBottom: '1px solid #1F2937',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>{patientName(selectedPatient)}</h2>
            <div style={{ marginTop: 4, color: '#9CA3AF', fontSize: 12 }}>{selectedPatient.mrn}</div>
          </div>
          <button
            type="button"
            onClick={() => selectPatient(null)}
            aria-label="Close patient detail"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid #374151',
              background: 'transparent',
              color: '#F9FAFB',
              cursor: 'pointer',
              fontSize: 18,
            }}
          >
            X
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <Badge color={priorityColors[selectedPatient.priority] || '#9CA3AF'}>{selectedPatient.priority}</Badge>
          <Badge color="#9CA3AF">{selectedPatient.state}</Badge>
          <FieldButton onClick={() => moveToState(nextPatientState(selectedPatient.state))}>
            Move to Next State
          </FieldButton>
        </div>
      </header>

      <section style={{ padding: 16, borderBottom: '1px solid #1F2937' }} aria-label="Acuity assignment">
        <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#9CA3AF' }}>Acuity</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.values(Priority).map((priority) => (
            <FieldButton key={priority} onClick={() => updatePriority(priority)}>
              Set CTAS {priority}
            </FieldButton>
          ))}
        </div>
      </section>

      <section style={{ padding: 16, borderBottom: '1px solid #1F2937' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#9CA3AF' }}>Pilot Workflow</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <FieldButton onClick={() => moveToState(PatientState.Waiting, 'Moved to waiting after triage.')}>
            Move to Waiting
          </FieldButton>
          <FieldButton onClick={triggerReassessment}>Trigger Reassessment</FieldButton>
          <FieldButton onClick={completeReassessment} disabled={!hasReassessmentDue && !pendingReminder}>
            Complete Reassessment
          </FieldButton>
          <FieldButton onClick={() => moveToState(PatientState.Assessment, 'Moved to assessment after reassessment.')}>
            Move to Assessment
          </FieldButton>
          <FieldButton onClick={() => moveToState(PatientState.Disposition, 'Disposition marked after assessment.')}>
            Mark Disposition
          </FieldButton>
          <FieldButton onClick={() => setActionMode(actionMode === 'discharge' ? null : 'discharge')}>
            Discharge Patient
          </FieldButton>
        </div>
      </section>

      <section style={{ padding: 16, borderBottom: '1px solid #1F2937' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#9CA3AF' }}>Journey Timeline</h3>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {patientStateOrder.map((state, index) => (
            <span
              key={state}
              style={{
                border: '1px solid #374151',
                borderRadius: 999,
                background: index <= currentStateIndex ? '#1D4ED81F' : '#0B1120',
                color: index <= currentStateIndex ? '#BFDBFE' : '#6B7280',
                padding: '5px 8px',
                fontSize: 11,
              }}
            >
              {state}
            </span>
          ))}
        </div>
      </section>

      <section style={{ padding: 16, borderBottom: '1px solid #1F2937' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 13, color: '#9CA3AF' }}>Latest Vitals</h3>
          <FieldButton onClick={() => setShowVitalsForm((open) => !open)}>Add Vitals</FieldButton>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginTop: 12 }}>
          {[
            ['HR', currentVitals.hr],
            ['SBP', currentVitals.bpSystolic ?? currentVitals.sbp],
            ['DBP', currentVitals.bpDiastolic ?? currentVitals.dbp],
            ['SpO2', currentVitals.spo2],
            ['Temp', currentVitals.temp],
            ['RR', currentVitals.rr],
            ['GCS', currentVitals.gcs],
            ['Pain', currentVitals.pain],
          ].map(([label, value]) => (
            <div key={label} style={{ background: '#0B1120', border: '1px solid #1F2937', borderRadius: 10, padding: 10 }}>
              <div style={{ color: '#9CA3AF', fontSize: 11 }}>{label}</div>
              <div style={{ color: '#F9FAFB', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 22, marginTop: 3 }}>
                {value ?? '--'}
              </div>
            </div>
          ))}
        </div>
        {showVitalsForm ? (
          <form onSubmit={submitVitals} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
            {Object.keys(emptyVitalsForm).map((key) => (
              <input
                key={key}
                aria-label={key.toUpperCase()}
                placeholder={key.toUpperCase()}
                value={vitalsForm[key]}
                onChange={(event) => setVitalsForm((form) => ({ ...form, [key]: event.target.value }))}
                style={{
                  background: '#0B1120',
                  border: '1px solid #374151',
                  borderRadius: 8,
                  color: '#F9FAFB',
                  padding: 9,
                  minWidth: 0,
                }}
              />
            ))}
            <button
              type="submit"
              style={{
                gridColumn: 'span 4',
                background: '#2563EB',
                border: 'none',
                borderRadius: 10,
                color: '#F9FAFB',
                padding: 10,
                cursor: 'pointer',
              }}
            >
              Save Vitals
            </button>
          </form>
        ) : null}
      </section>

      <section style={{ padding: 16, borderBottom: '1px solid #1F2937' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#9CA3AF' }}>Active Flags</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {selectedPatient.flags.length ? (
            selectedPatient.flags.map((flag) => {
              const flagType = getPatientFlagType(flag);
              return (
                <span
                  key={flagType}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#1C2333',
                    color: '#F9FAFB',
                    borderRadius: 999,
                    padding: '5px 8px',
                    fontSize: 12,
                  }}
                >
                  {flagType}
                  <button
                    type="button"
                    onClick={() => removeFlag(selectedPatient.id, flagType)}
                    aria-label={`Remove ${flagType}`}
                    style={{ border: 0, background: 'transparent', color: '#9CA3AF', cursor: 'pointer' }}
                  >
                    x
                  </button>
                </span>
              );
            })
          ) : (
            <span style={{ color: '#9CA3AF', fontSize: 12 }}>No active flags.</span>
          )}
        </div>
      </section>

      <section style={{ padding: 16, borderBottom: '1px solid #1F2937' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#9CA3AF' }}>Notes</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sortedNotes.map((note) => (
            <div key={note.id} style={{ background: '#0B1120', borderRadius: 10, padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9CA3AF', fontSize: 11 }}>
                <span>{noteAuthor(note)}</span>
                <span>{formatTime(noteTimestamp(note))}</span>
              </div>
              <div style={{ color: '#F9FAFB', fontSize: 13, marginTop: 6 }}>{noteText(note)}</div>
            </div>
          ))}
        </div>
        <form onSubmit={submitNote} style={{ marginTop: 12 }}>
          <textarea
            value={noteTextValue}
            onChange={(event) => setNoteTextValue(event.target.value)}
            placeholder="Add Note"
            style={{
              width: '100%',
              minHeight: 76,
              boxSizing: 'border-box',
              resize: 'vertical',
              background: '#0B1120',
              border: '1px solid #374151',
              borderRadius: 10,
              color: '#F9FAFB',
              padding: 10,
            }}
          />
          <button type="submit" style={{ marginTop: 8, background: '#2563EB', border: 0, borderRadius: 10, color: '#F9FAFB', padding: '9px 12px', cursor: 'pointer' }}>
            Submit Note
          </button>
        </form>
      </section>

      {actionMode === 'staff' ? (
        <section style={{ padding: 16, borderBottom: '1px solid #1F2937', background: '#0B1120' }}>
          <select
            defaultValue={selectedPatient.assignedStaffId || ''}
            onChange={(event) => {
              if (event.target.value) assignStaff(selectedPatient.id, event.target.value);
              setActionMode(null);
            }}
            style={{ width: '100%', background: '#111827', color: '#F9FAFB', border: '1px solid #374151', borderRadius: 8, padding: 10 }}
          >
            <option value="">Choose staff</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName || member.name || `${member.firstName} ${member.lastName}`}
              </option>
            ))}
          </select>
        </section>
      ) : null}

      {actionMode === 'room' ? (
        <section style={{ padding: 16, borderBottom: '1px solid #1F2937', background: '#0B1120' }}>
          <select
            defaultValue={selectedPatient.roomId || ''}
            onChange={(event) => {
              if (event.target.value) assignRoom(selectedPatient.id, event.target.value);
              setActionMode(null);
            }}
            style={{ width: '100%', background: '#111827', color: '#F9FAFB', border: '1px solid #374151', borderRadius: 8, padding: 10 }}
          >
            <option value="">Choose room</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} ({room.status})
              </option>
            ))}
          </select>
        </section>
      ) : null}

      {actionMode === 'discharge' ? (
        <section style={{ padding: 16, borderBottom: '1px solid #1F2937', background: '#0B1120' }}>
          <p style={{ margin: '0 0 10px', color: '#F9FAFB' }}>Discharge this patient?</p>
          <FieldButton
            onClick={() => {
              dischargePatient(selectedPatient.id, {
                timelineEvent: makeEvent(selectedPatient.id, 'DispositionUpdated', 'Patient discharged from pilot walkthrough.', {
                  from: selectedPatient.state,
                  to: PatientState.Discharge,
                  fromState: selectedPatient.state,
                  toState: PatientState.Discharge,
                  actorStaffId,
                }),
              });
              setActionMode(null);
            }}
          >
            Confirm Discharge
          </FieldButton>
        </section>
      ) : null}

      <div
        style={{
          position: 'sticky',
          bottom: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
          padding: 16,
          background: '#111827',
          borderTop: '1px solid #1F2937',
        }}
      >
        <FieldButton onClick={() => setActionMode(actionMode === 'staff' ? null : 'staff')}>Assign Staff</FieldButton>
        <FieldButton onClick={() => setActionMode(actionMode === 'room' ? null : 'room')}>Assign Room</FieldButton>
      </div>
    </aside>
  );
}

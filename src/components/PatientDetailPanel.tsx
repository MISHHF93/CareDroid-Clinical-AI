import { FormEvent, useMemo, useState } from 'react';
import {
  Alert,
  Note,
  Patient,
  PatientFlag,
  PatientState,
  Priority,
  Room,
  Staff,
  Vitals,
} from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';
import HEARTScore from './calculators/HEARTScore';
import QSOFA from './calculators/qSOFA';
import PediatricDrugCalc from './calculators/PediatricDrugCalc';
import './PatientDetailPanel.css';

const priorityColors: Record<Priority, string> = {
  [Priority.P1]: '#EF4444',
  [Priority.P2]: '#F97316',
  [Priority.P3]: '#F59E0B',
  [Priority.P4]: '#10B981',
  [Priority.P5]: '#6B7280',
};

const patientStateOrder = Object.values(PatientState);

const emptyVitalsForm = {
  hr: '',
  sbp: '',
  dbp: '',
  spo2: '',
  temp: '',
  rr: '',
  gcs: '',
  pain: '',
};

type VitalsForm = typeof emptyVitalsForm;
type ActionMode = null | 'staff' | 'room' | 'escalate' | 'discharge';

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTime(value?: string): string {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function initials(nameOrId: string): string {
  return nameOrId
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function staffName(staff: Staff[], staffId: string): string {
  return staff.find((member) => member.id === staffId)?.name || staffId;
}

function journeyTimestamp(patient: Patient, state: PatientState): string | undefined {
  if (state === PatientState.Arrival) return patient.arrivalTime;
  if (state === PatientState.Triage) return patient.triageTime;
  return patient.timeline.find((event) => event.to === state)?.timestamp;
}

function nextPatientState(current: PatientState): PatientState {
  const index = patientStateOrder.indexOf(current);
  return patientStateOrder[Math.min(index + 1, patientStateOrder.length - 1)];
}

function vitalTone(label: string, value?: number): string {
  if (value === undefined) return '#F9FAFB';
  if (label === 'SpO2' && value < 94) return '#EF4444';
  if (label === 'HR' && (value > 120 || value < 50)) return '#EF4444';
  if (label === 'SBP' && (value > 180 || value < 90)) return '#F59E0B';
  if (label === 'Temp' && (value >= 38 || value < 36)) return '#F59E0B';
  if (label === 'RR' && (value > 24 || value < 10)) return '#F59E0B';
  if (label === 'GCS' && value < 15) return '#F59E0B';
  return '#F9FAFB';
}

function parseVitals(form: VitalsForm, recordedBy: string): Vitals {
  const numeric = (value: string): number | undefined => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  return {
    hr: numeric(form.hr),
    sbp: numeric(form.sbp),
    dbp: numeric(form.dbp),
    spo2: numeric(form.spo2),
    temp: numeric(form.temp),
    rr: numeric(form.rr),
    gcs: numeric(form.gcs),
    pain: numeric(form.pain),
    recordedAt: new Date().toISOString(),
    recordedBy,
  };
}

function Badge({ children, color }: { children: string; color: string }) {
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

function FieldButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'transparent',
        border: '1px solid #374151',
        color: '#F9FAFB',
        borderRadius: 10,
        padding: '8px 10px',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

export default function PatientDetailPanel() {
  const patients = useEmergencyStore((state) => state.patients);
  const staff = useEmergencyStore((state) => state.staff);
  const rooms = useEmergencyStore((state) => state.rooms);
  const selectedPatientId = useEmergencyStore((state) => state.selectedPatientId);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const updatePatient = useEmergencyStore((state) => state.updatePatient);
  const movePatientToState = useEmergencyStore((state) => state.movePatientToState);
  const assignStaff = useEmergencyStore((state) => state.assignStaff);
  const assignRoom = useEmergencyStore((state) => state.assignRoom);
  const addFlag = useEmergencyStore((state) => state.addFlag);
  const removeFlag = useEmergencyStore((state) => state.removeFlag);
  const addVitals = useEmergencyStore((state) => state.addVitals);
  const addAlert = useEmergencyStore((state) => state.addAlert);
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [vitalsForm, setVitalsForm] = useState<VitalsForm>(emptyVitalsForm);
  const [flagToAdd, setFlagToAdd] = useState<PatientFlag>(PatientFlag.ReassessmentDue);
  const [noteText, setNoteText] = useState('');
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [heartScoreOpen, setHeartScoreOpen] = useState(false);
  const [qsofaOpen, setQsofaOpen] = useState(false);
  const [pediatricDrugCalcOpen, setPediatricDrugCalcOpen] = useState(false);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) || null,
    [patients, selectedPatientId],
  );

  if (!selectedPatient) return null;

  const currentStateIndex = patientStateOrder.indexOf(selectedPatient.state);
  const latestVitals = selectedPatient.vitals.at(-1);
  const actorStaffId = selectedPatient.assignedStaffId || staff[0]?.id || 'system';
  const sortedNotes = [...selectedPatient.notes].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const submitVitals = (event: FormEvent) => {
    event.preventDefault();
    addVitals(selectedPatient.id, parseVitals(vitalsForm, actorStaffId));
    setVitalsForm(emptyVitalsForm);
    setShowVitalsForm(false);
  };

  const submitNote = (event: FormEvent) => {
    event.preventDefault();
    const text = noteText.trim();
    if (!text) return;

    const note: Note = {
      id: createId('note'),
      text,
      authorId: actorStaffId,
      timestamp: new Date().toISOString(),
    };

    updatePatient(selectedPatient.id, { notes: [...selectedPatient.notes, note] });
    setNoteText('');
  };

  const escalate = () => {
    const alert: Alert = {
      id: createId('alert'),
      severity: 'Critical',
      title: 'Patient escalated',
      message: `${selectedPatient.firstName} ${selectedPatient.lastName} was escalated for urgent review.`,
      patientId: selectedPatient.id,
      createdAt: new Date().toISOString(),
      dismissed: false,
    };
    addAlert(alert);
    addFlag(selectedPatient.id, PatientFlag.HighRisk);
    setActionMode(null);
  };

  return (
    <aside
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
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>
              {selectedPatient.firstName} {selectedPatient.lastName}
            </h2>
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
          <Badge color={priorityColors[selectedPatient.priority]}>{selectedPatient.priority}</Badge>
          <Badge color="#9CA3AF">{selectedPatient.state}</Badge>
          <button
            type="button"
            onClick={() => movePatientToState(selectedPatient.id, nextPatientState(selectedPatient.state), actorStaffId)}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: '1px solid #374151',
              color: '#F9FAFB',
              borderRadius: 10,
              padding: '8px 10px',
              cursor: 'pointer',
            }}
          >
            Move to Next State
          </button>
        </div>
      </header>

      <section style={{ padding: 16, borderBottom: '1px solid #1F2937' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#9CA3AF' }}>Journey Timeline</h3>
        <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
          <div style={{ display: 'flex', minWidth: 760, alignItems: 'flex-start' }}>
            {patientStateOrder.map((state, index) => {
              const completed = index < currentStateIndex;
              const current = state === selectedPatient.state;
              const timestamp = completed ? journeyTimestamp(selectedPatient, state) : undefined;

              return (
                <div key={state} style={{ flex: 1, position: 'relative', textAlign: 'center' }}>
                  {index < patientStateOrder.length - 1 ? (
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
                        left: '50%',
                        right: '-50%',
                        height: 2,
                        background: completed ? '#3B82F6' : '#374151',
                      }}
                    />
                  ) : null}
                  <div
                    className={current ? 'patient-detail-timeline-dot--current' : undefined}
                    style={{
                      width: 16,
                      height: 16,
                      margin: '0 auto',
                      borderRadius: 999,
                      border: `2px solid ${completed || current ? '#3B82F6' : '#6B7280'}`,
                      background: completed || current ? '#3B82F6' : 'transparent',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  />
                  <div style={{ marginTop: 8, fontSize: 10, color: current ? '#F9FAFB' : '#9CA3AF' }}>{state}</div>
                  {timestamp ? (
                    <div style={{ marginTop: 3, fontSize: 10, color: '#6B7280' }}>{formatTime(timestamp)}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section style={{ padding: 16, borderBottom: '1px solid #1F2937' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 13, color: '#9CA3AF' }}>Latest Vitals</h3>
          <FieldButton onClick={() => setShowVitalsForm((open) => !open)}>Add Vitals</FieldButton>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginTop: 12 }}>
          {[
            ['HR', latestVitals?.hr],
            ['SBP', latestVitals?.sbp],
            ['DBP', latestVitals?.dbp],
            ['SpO2', latestVitals?.spo2],
            ['Temp', latestVitals?.temp],
            ['RR', latestVitals?.rr],
            ['GCS', latestVitals?.gcs],
            ['Pain', latestVitals?.pain],
          ].map(([label, value]) => (
            <div key={label} style={{ background: '#0B1120', border: '1px solid #1F2937', borderRadius: 10, padding: 10 }}>
              <div style={{ color: '#9CA3AF', fontSize: 11 }}>{label}</div>
              <div
                style={{
                  color: vitalTone(String(label), typeof value === 'number' ? value : undefined),
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: 22,
                  marginTop: 3,
                }}
              >
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
                value={vitalsForm[key as keyof VitalsForm]}
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
          {selectedPatient.flags.map((flag) => (
            <span
              key={flag}
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
              {flag}
              <button
                type="button"
                onClick={() => removeFlag(selectedPatient.id, flag)}
                aria-label={`Remove ${flag}`}
                style={{ border: 0, background: 'transparent', color: '#9CA3AF', cursor: 'pointer' }}
              >
                x
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <select
            value={flagToAdd}
            onChange={(event) => setFlagToAdd(event.target.value as PatientFlag)}
            style={{ flex: 1, background: '#0B1120', color: '#F9FAFB', border: '1px solid #374151', borderRadius: 8, padding: 9 }}
          >
            {Object.values(PatientFlag).map((flag) => (
              <option key={flag} value={flag}>{flag}</option>
            ))}
          </select>
          <FieldButton onClick={() => addFlag(selectedPatient.id, flagToAdd)}>Add Flag</FieldButton>
        </div>
      </section>

      <section style={{ padding: 16, borderBottom: '1px solid #1F2937' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#9CA3AF' }}>Notes</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sortedNotes.map((note) => (
            <div key={note.id} style={{ background: '#0B1120', borderRadius: 10, padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9CA3AF', fontSize: 11 }}>
                <span>{initials(staffName(staff, note.authorId))}</span>
                <span>{formatTime(note.timestamp)}</span>
              </div>
              <div style={{ color: '#F9FAFB', fontSize: 13, marginTop: 6 }}>{note.text}</div>
            </div>
          ))}
        </div>
        <form onSubmit={submitNote} style={{ marginTop: 12 }}>
          <textarea
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
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

      {actionMode ? (
        <section style={{ padding: 16, borderBottom: '1px solid #1F2937', background: '#0B1120' }}>
          {actionMode === 'staff' ? (
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
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          ) : null}
          {actionMode === 'room' ? (
            <select
              defaultValue={selectedPatient.roomId || ''}
              onChange={(event) => {
                if (event.target.value) assignRoom(selectedPatient.id, event.target.value);
                setActionMode(null);
              }}
              style={{ width: '100%', background: '#111827', color: '#F9FAFB', border: '1px solid #374151', borderRadius: 8, padding: 10 }}
            >
              <option value="">Choose room</option>
              {rooms.map((room: Room) => (
                <option key={room.id} value={room.id}>{room.name} ({room.status})</option>
              ))}
            </select>
          ) : null}
          {actionMode === 'escalate' ? (
            <div>
              <p style={{ margin: '0 0 10px', color: '#F9FAFB' }}>Escalate this patient and create a critical alert?</p>
              <FieldButton onClick={escalate}>Confirm Escalation</FieldButton>
            </div>
          ) : null}
          {actionMode === 'discharge' ? (
            <div>
              <p style={{ margin: '0 0 10px', color: '#F9FAFB' }}>Discharge this patient?</p>
              <FieldButton
                onClick={() => {
                  movePatientToState(selectedPatient.id, PatientState.Discharge, actorStaffId, 'Discharged from detail panel');
                  setActionMode(null);
                }}
              >
                Confirm Discharge
              </FieldButton>
            </div>
          ) : null}
        </section>
      ) : null}

      <section style={{ padding: 16, borderBottom: '1px solid #1F2937' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#9CA3AF' }}>Clinical Calculators</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <FieldButton onClick={() => setHeartScoreOpen(true)}>HEART Score</FieldButton>
          <FieldButton onClick={() => setQsofaOpen(true)}>qSOFA</FieldButton>
          <FieldButton onClick={() => setPediatricDrugCalcOpen(true)}>Peds Drugs</FieldButton>
        </div>
      </section>

      <div
        style={{
          position: 'sticky',
          bottom: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          padding: 16,
          background: '#111827',
          borderTop: '1px solid #1F2937',
        }}
      >
        <FieldButton onClick={() => setActionMode(actionMode === 'staff' ? null : 'staff')}>Assign Staff</FieldButton>
        <FieldButton onClick={() => setActionMode(actionMode === 'room' ? null : 'room')}>Assign Room</FieldButton>
        <FieldButton onClick={() => setActionMode(actionMode === 'escalate' ? null : 'escalate')}>Escalate</FieldButton>
        <FieldButton onClick={() => setActionMode(actionMode === 'discharge' ? null : 'discharge')}>Discharge</FieldButton>
      </div>
      {heartScoreOpen ? (
        <HEARTScore patientId={selectedPatient.id} onClose={() => setHeartScoreOpen(false)} />
      ) : null}
      {qsofaOpen ? (
        <QSOFA patientId={selectedPatient.id} onClose={() => setQsofaOpen(false)} />
      ) : null}
      {pediatricDrugCalcOpen ? (
        <PediatricDrugCalc patientId={selectedPatient.id} onClose={() => setPediatricDrugCalcOpen(false)} />
      ) : null}
    </aside>
  );
}

import { FormEvent, useMemo, useState } from 'react';
import {
  Note,
  Patient,
  PatientFlag,
  PatientState,
  Priority,
  Room,
  Staff,
  Vitals,
  WorkflowActionLog,
} from '../types/emergency';
import { useEmergencyStore, workflowLogFromJourneyEvent } from '../store/emergencyStore';
import { dispatchAlert, dispatchCriticalVitalsAlerts } from '../engine/alertEngine';
import { EMERGENCY_ACTIONS } from '../config/emergencyRolePermissions';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import { usePatientTimelineContext } from '../hooks/usePatientTimelineContext';
import { buildPatientTimeline } from '../utils/patientTimeline';
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

function workflowActor(log: WorkflowActionLog, staff: Staff[]): string {
  if (log.actorName) return log.actorName;
  if (log.actorStaffId) return staffName(staff, log.actorStaffId);
  return log.source;
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

function FieldButton({
  children,
  onClick,
  disabled = false,
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'transparent',
        border: '1px solid #374151',
        color: '#F9FAFB',
        borderRadius: 10,
        padding: '8px 10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  );
}

export default function PatientDetailPanel() {
  const emergencyRole = useEmergencyRolePermissions();
  const patients = useEmergencyStore((state) => state.patients);
  const staff = useEmergencyStore((state) => state.staff);
  const rooms = useEmergencyStore((state) => state.rooms);
  const alerts = useEmergencyStore((state) => state.alerts);
  const selectedPatientId = useEmergencyStore((state) => state.selectedPatientId);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const updatePatient = useEmergencyStore((state) => state.updatePatient);
  const movePatientToState = useEmergencyStore((state) => state.movePatientToState);
  const assignStaff = useEmergencyStore((state) => state.assignStaff);
  const assignRoom = useEmergencyStore((state) => state.assignRoom);
  const addFlag = useEmergencyStore((state) => state.addFlag);
  const removeFlag = useEmergencyStore((state) => state.removeFlag);
  const addVitals = useEmergencyStore((state) => state.addVitals);
  const addNote = useEmergencyStore((state) => state.addNote);
  const workflowLogs = useEmergencyStore((state) => state.workflowLogs);
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [vitalsForm, setVitalsForm] = useState<VitalsForm>(emptyVitalsForm);
  const [flagToAdd, setFlagToAdd] = useState<PatientFlag>(PatientFlag.ReassessmentDue);
  const [noteText, setNoteText] = useState('');
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [heartScoreOpen, setHeartScoreOpen] = useState(false);
  const [qsofaOpen, setQsofaOpen] = useState(false);
  const [pediatricDrugCalcOpen, setPediatricDrugCalcOpen] = useState(false);
  const canTransition = emergencyRole.can(EMERGENCY_ACTIONS.transitionPatient);
  const canWriteVitals = emergencyRole.can(EMERGENCY_ACTIONS.writeVitals);
  const canWriteNote = emergencyRole.can(EMERGENCY_ACTIONS.writeNote);
  const canManageFlags = emergencyRole.can(EMERGENCY_ACTIONS.manageFlags);
  const canAssignStaff = emergencyRole.can(EMERGENCY_ACTIONS.assignStaff);
  const canAssignRoom = emergencyRole.can(EMERGENCY_ACTIONS.assignRoom);
  const canEscalate = emergencyRole.can(EMERGENCY_ACTIONS.escalatePatient);
  const canDischarge = emergencyRole.can(EMERGENCY_ACTIONS.dischargePatient);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) || null,
    [patients, selectedPatientId],
  );
  const timelineContextState = usePatientTimelineContext(selectedPatientId);
  const patientWorkflowLogs = useMemo(() => {
    if (!selectedPatient) return [];
    const generatedLogs = selectedPatient.timeline.map((event) =>
      workflowLogFromJourneyEvent(event, selectedPatient, staff),
    );
    const byId = new Map<string, WorkflowActionLog>();
    [...workflowLogs.filter((log) => log.patientId === selectedPatient.id), ...generatedLogs].forEach((log) => {
      byId.set(log.id, log);
    });
    return [...byId.values()].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [selectedPatient, staff, workflowLogs]);
  const patientTimeline = useMemo(
    () =>
      selectedPatient
        ? buildPatientTimeline(selectedPatient, {
            ...timelineContextState.context,
            staff,
            alerts,
            workflowLogs: patientWorkflowLogs,
          })
        : [],
    [alerts, patientWorkflowLogs, selectedPatient, staff, timelineContextState.context],
  );

  if (!selectedPatient) return null;

  const currentStateIndex = patientStateOrder.indexOf(selectedPatient.state);
  const latestVitals = selectedPatient.vitals.at(-1);
  const actorStaffId = selectedPatient.assignedStaffId || staff[0]?.id || 'system';
  const sortedNotes = [...selectedPatient.notes].sort(
    (a, b) =>
      new Date(b.timestamp || b.createdAt || 0).getTime() -
      new Date(a.timestamp || a.createdAt || 0).getTime(),
  );

  const submitVitals = (event: FormEvent) => {
    event.preventDefault();
    if (!canWriteVitals) return;
    const vitals = parseVitals(vitalsForm, actorStaffId);
    addVitals(selectedPatient.id, vitals);
    dispatchCriticalVitalsAlerts({
      ...selectedPatient,
      vitals: [...selectedPatient.vitals, vitals],
    });
    setVitalsForm(emptyVitalsForm);
    setShowVitalsForm(false);
  };

  const submitNote = (event: FormEvent) => {
    event.preventDefault();
    if (!canWriteNote) return;
    const text = noteText.trim();
    if (!text) return;

    const note: Note = {
      id: createId('note'),
      text,
      authorId: actorStaffId,
      timestamp: new Date().toISOString(),
    };

    addNote(selectedPatient.id, note);
    setNoteText('');
  };

  const escalate = () => {
    if (!canEscalate) return;
    dispatchAlert({
      id: createId('alert'),
      severity: 'Critical',
      title: 'Patient escalated',
      message: `${selectedPatient.firstName} ${selectedPatient.lastName} was escalated for urgent review.`,
      patientId: selectedPatient.id,
      source: 'patient-detail-panel',
    });
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
            disabled={!canTransition}
            title={canTransition ? 'Move to the next patient state' : `${emergencyRole.roleLabel} cannot move patient state`}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: '1px solid #374151',
              color: '#F9FAFB',
              borderRadius: 10,
              padding: '8px 10px',
              cursor: canTransition ? 'pointer' : 'not-allowed',
              opacity: canTransition ? 1 : 0.55,
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

      <section style={{ padding: 16, borderBottom: '1px solid #1F2937' }} aria-labelledby="patient-timeline-heading">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h3 id="patient-timeline-heading" style={{ margin: 0, fontSize: 13, color: '#9CA3AF' }}>
              Patient Timeline
            </h3>
            <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: 11 }}>
              Intake, journey, triage, queue, reassessment, EMS, referral, boarding, discharge, AI, and provincial events.
            </p>
          </div>
          <span style={{ color: '#9CA3AF', fontSize: 11, whiteSpace: 'nowrap' }}>{patientTimeline.length} events</span>
        </div>

        {timelineContextState.loading ? (
          <div role="status" className="patient-timeline-status patient-timeline-status--loading">
            Loading timeline enrichment from Emergency OS modules...
          </div>
        ) : null}

        {timelineContextState.error ? (
          <div role="alert" className="patient-timeline-status patient-timeline-status--error">
            {timelineContextState.error}. Showing local patient timeline fallback.
          </div>
        ) : null}

        {patientTimeline.length ? (
          <ol className="patient-timeline-list" aria-label="Patient timeline events">
            {patientTimeline.map((item) => (
              <li key={`${item.id}-${item.category}`} className={`patient-timeline-item patient-timeline-item--${item.category}`}>
                <div className="patient-timeline-item__marker" aria-hidden />
                <div className="patient-timeline-item__body">
                  <div className="patient-timeline-item__header">
                    <span className="patient-timeline-item__category">{item.label}</span>
                    <time dateTime={item.timestamp}>{formatTime(item.timestamp)}</time>
                  </div>
                  <div className="patient-timeline-item__summary">{item.summary}</div>
                  <div className="patient-timeline-item__meta">
                    <span>{item.source}</span>
                    {item.actor ? <span>{item.actor}</span> : null}
                    {item.severity ? <span>{item.severity}</span> : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="patient-timeline-empty">No patient timeline events are available yet.</div>
        )}
      </section>

      <section style={{ padding: 16, borderBottom: '1px solid #1F2937' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#9CA3AF' }}>Workflow Actions</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {patientWorkflowLogs.length ? (
            patientWorkflowLogs.slice(0, 8).map((log) => (
              <article key={log.id} className="patient-detail-workflow-log">
                <div>
                  <strong>{log.title}</strong>
                  <p>{log.summary}</p>
                </div>
                <div>
                  <span>{workflowActor(log, staff)}</span>
                  <time dateTime={log.timestamp}>{formatTime(log.timestamp)}</time>
                </div>
              </article>
            ))
          ) : (
            <p style={{ margin: 0, color: '#9CA3AF', fontSize: 13 }}>
              No workflow action logs for this patient yet.
            </p>
          )}
        </div>
      </section>

      <section style={{ padding: 16, borderBottom: '1px solid #1F2937' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 13, color: '#9CA3AF' }}>Latest Vitals</h3>
          <FieldButton disabled={!canWriteVitals} onClick={() => setShowVitalsForm((open) => !open)}>Add Vitals</FieldButton>
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

        {showVitalsForm && canWriteVitals ? (
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
                onClick={() => {
                  if (canManageFlags) removeFlag(selectedPatient.id, flag);
                }}
                disabled={!canManageFlags}
                aria-label={`Remove ${flag}`}
                style={{ border: 0, background: 'transparent', color: '#9CA3AF', cursor: canManageFlags ? 'pointer' : 'not-allowed', opacity: canManageFlags ? 1 : 0.45 }}
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
            disabled={!canManageFlags}
            style={{ flex: 1, background: '#0B1120', color: '#F9FAFB', border: '1px solid #374151', borderRadius: 8, padding: 9 }}
          >
            {Object.values(PatientFlag).map((flag) => (
              <option key={flag} value={flag}>{flag}</option>
            ))}
          </select>
          <FieldButton disabled={!canManageFlags} onClick={() => addFlag(selectedPatient.id, flagToAdd)}>Add Flag</FieldButton>
        </div>
      </section>

      <section style={{ padding: 16, borderBottom: '1px solid #1F2937' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#9CA3AF' }}>Notes</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sortedNotes.map((note) => (
            <div key={note.id} style={{ background: '#0B1120', borderRadius: 10, padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9CA3AF', fontSize: 11 }}>
                <span>{initials(staffName(staff, note.authorId || note.authorStaffId || 'system'))}</span>
                <span>{formatTime(note.timestamp)}</span>
              </div>
              <div style={{ color: '#F9FAFB', fontSize: 13, marginTop: 6 }}>{note.text || note.body}</div>
            </div>
          ))}
        </div>
        <form onSubmit={submitNote} style={{ marginTop: 12 }}>
          <textarea
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
            disabled={!canWriteNote}
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
          <button type="submit" disabled={!canWriteNote} style={{ marginTop: 8, background: '#2563EB', border: 0, borderRadius: 10, color: '#F9FAFB', padding: '9px 12px', cursor: canWriteNote ? 'pointer' : 'not-allowed', opacity: canWriteNote ? 1 : 0.55 }}>
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
                if (!canAssignStaff) return;
                if (event.target.value) assignStaff(selectedPatient.id, event.target.value);
                setActionMode(null);
              }}
              disabled={!canAssignStaff}
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
                if (!canAssignRoom) return;
                if (event.target.value) assignRoom(selectedPatient.id, event.target.value);
                setActionMode(null);
              }}
              disabled={!canAssignRoom}
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
              <FieldButton disabled={!canEscalate} onClick={escalate}>Confirm Escalation</FieldButton>
            </div>
          ) : null}
          {actionMode === 'discharge' ? (
            <div>
              <p style={{ margin: '0 0 10px', color: '#F9FAFB' }}>Discharge this patient?</p>
              <FieldButton
                onClick={() => {
                  if (!canDischarge) return;
                  movePatientToState(selectedPatient.id, PatientState.Discharge, actorStaffId, 'Discharged from detail panel');
                  setActionMode(null);
                }}
                disabled={!canDischarge}
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
        <FieldButton disabled={!canAssignStaff} onClick={() => setActionMode(actionMode === 'staff' ? null : 'staff')}>Assign Staff</FieldButton>
        <FieldButton disabled={!canAssignRoom} onClick={() => setActionMode(actionMode === 'room' ? null : 'room')}>Assign Room</FieldButton>
        <FieldButton disabled={!canEscalate} onClick={() => setActionMode(actionMode === 'escalate' ? null : 'escalate')}>Escalate</FieldButton>
        <FieldButton disabled={!canDischarge} onClick={() => setActionMode(actionMode === 'discharge' ? null : 'discharge')}>Discharge</FieldButton>
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

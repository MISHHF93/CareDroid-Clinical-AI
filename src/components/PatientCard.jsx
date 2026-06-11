import React, { memo, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Ambulance,
  Bed,
  Clock3,
  DoorOpen,
  FilePlus2,
  ShieldAlert,
  UserRoundCheck,
  X,
} from 'lucide-react';
import { PatientState, Priority } from '../../types/emergency';
import { getPatientFlagType, hasPatientFlag, useEmergencyStore } from '../../store/emergencyStore';
import { buildStaffWorkloads, staffDisplayName, staffInitials } from '../utils/staffManagement';
import {
  getNextStates,
  movePatientToState as movePatientWithJourneyRules,
} from '../../engine/journeyEngine';
import JourneyTimeline from './JourneyTimeline';
import ClinicalScoreCalculator, {
  createClinicalScoreEvent,
  createClinicalScoreNote,
} from './ClinicalScoreCalculator';
import ProtocolSuggestion, {
  createProtocolLaunchEvent,
  getProtocolSuggestions,
} from './ProtocolSuggestion';
import './PatientCard.css';

const FLAG_ICONS = {
  ReassessmentDue: Clock3,
  DeteriorationRisk: Activity,
  LongWait: Clock3,
  HighRisk: ShieldAlert,
  PendingAdmission: Bed,
  EMSArrival: Ambulance,
  Isolation: AlertTriangle,
};

const ALL_FLAGS = [
  'ReassessmentDue',
  'DeteriorationRisk',
  'LongWait',
  'HighRisk',
  'PendingAdmission',
  'EMSArrival',
  'Isolation',
];

const ACTIVE_REFERRAL_TERMINAL_STATUSES = new Set(['Completed', 'Declined']);
const SCORE_OPTIONS = [
  { id: 'heart', label: 'HEART Score' },
  { id: 'qsofa', label: 'qSOFA' },
  { id: 'nihss', label: 'NIHSS' },
];

const CATEGORY_CLASS = {
  'Chest Pain': 'cardiac',
  Respiratory: 'respiratory',
  'Infectious Respiratory': 'respiratory',
  Neurologic: 'neuro',
  Orthopedic: 'ortho',
  Musculoskeletal: 'ortho',
  Trauma: 'ortho',
  'Abdominal Pain': 'abdominal',
  Allergy: 'allergy',
};

function waitMinutes(arrivalTime) {
  const arrivedAt = new Date(arrivalTime).getTime();
  if (!Number.isFinite(arrivedAt)) return 0;
  return Math.max(0, Math.round((Date.now() - arrivedAt) / 60000));
}

function formatWait(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function formatClock(timestamp) {
  if (!timestamp) return '--';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function patientName(patient) {
  return `${patient.firstName} ${patient.lastName}`;
}

function isEditableShortcutTarget(target) {
  return (
    target?.tagName === 'INPUT' ||
    target?.tagName === 'TEXTAREA' ||
    target?.tagName === 'SELECT' ||
    target?.isContentEditable
  );
}

function isActiveReferral(referral) {
  return referral && !ACTIVE_REFERRAL_TERMINAL_STATUSES.has(referral.status);
}

function categoryClass(category) {
  return CATEGORY_CLASS[category] || 'default';
}

function transitionErrorMessage(error) {
  return error instanceof Error ? error.message : 'Unable to move patient state.';
}

function vitalTone(label, value) {
  if (value === null || value === undefined) return 'muted';
  if (label === 'HR') {
    if (value < 45 || value >= 120) return 'critical';
    if (value < 55 || value >= 105) return 'warning';
  }
  if (label === 'BP') {
    if (value.systolic < 90 || value.systolic >= 180 || value.diastolic >= 120) return 'critical';
    if (value.systolic < 100 || value.systolic >= 160 || value.diastolic >= 100) return 'warning';
  }
  if (label === 'SpO2') {
    if (value < 92) return 'critical';
    if (value < 95) return 'warning';
  }
  if (label === 'Temp') {
    if (value >= 39 || value < 35.5) return 'critical';
    if (value >= 38 || value < 36) return 'warning';
  }
  return 'normal';
}

function trendArrow(current, previous) {
  if (typeof current !== 'number' || typeof previous !== 'number') return '→';
  if (current > previous) return '↑';
  if (current < previous) return '↓';
  return '→';
}

function latestPreviousVitals(patient) {
  const event = [...patient.timeline]
    .reverse()
    .find((item) => item.type === 'VitalsUpdated' && item.metadata);
  const metadata = event?.metadata || {};
  return {
    hr: typeof metadata.previousHr === 'number' ? metadata.previousHr : null,
    bpSystolic:
      typeof metadata.previousBpSystolic === 'number' ? metadata.previousBpSystolic : null,
    bpDiastolic:
      typeof metadata.previousBpDiastolic === 'number' ? metadata.previousBpDiastolic : null,
    spo2: typeof metadata.previousSpo2 === 'number' ? metadata.previousSpo2 : null,
    temp: typeof metadata.previousTemp === 'number' ? metadata.previousTemp : null,
  };
}

function savedScoreBadges(patient) {
  return [...(patient.timeline || [])]
    .filter((event) => event.type === 'ClinicalScoreSaved')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 3)
    .map((event) => ({
      id: event.id,
      label: event.metadata?.scoreLabel || event.metadata?.scoreId || 'Score',
      total: event.metadata?.scoreTotal,
      interpretation: event.metadata?.interpretation,
    }));
}

function vitalItems(vitals, previousVitals = {}) {
  return [
    {
      label: 'HR',
      value: vitals.hr,
      previous: previousVitals.hr,
      display: vitals.hr ?? '--',
      trendValue: vitals.hr,
    },
    {
      label: 'BP',
      value:
        vitals.bpSystolic !== null && vitals.bpDiastolic !== null
          ? { systolic: vitals.bpSystolic, diastolic: vitals.bpDiastolic }
          : null,
      previous: previousVitals.bpSystolic,
      display:
        vitals.bpSystolic !== null && vitals.bpDiastolic !== null
          ? `${vitals.bpSystolic}/${vitals.bpDiastolic}`
          : '--/--',
      trendValue: vitals.bpSystolic,
    },
    {
      label: 'SpO2',
      value: vitals.spo2,
      previous: previousVitals.spo2,
      display: vitals.spo2 === null ? '--' : `${vitals.spo2}%`,
      trendValue: vitals.spo2,
    },
    {
      label: 'Temp',
      value: vitals.temp,
      previous: previousVitals.temp,
      display: vitals.temp === null ? '--' : `${vitals.temp.toFixed(1)}`,
      trendValue: vitals.temp,
    },
  ];
}

function priorityTone(priority) {
  if (priority === Priority.P1) return 'p1';
  if (priority === Priority.P2) return 'p2';
  if (priority === Priority.P3) return 'p3';
  if (priority === Priority.P4) return 'p4';
  return 'p5';
}

function flagAddedAt(patient, flag) {
  if (flag && typeof flag === 'object') return flag.detectedAt;
  const event = [...patient.timeline]
    .reverse()
    .find((item) => item.type === 'FlagAdded' && item.summary.includes(flag));
  return event?.timestamp || patient.arrivalTime;
}

function buildVitalsForm(vitals) {
  return {
    hr: vitals.hr ?? '',
    bpSystolic: vitals.bpSystolic ?? '',
    bpDiastolic: vitals.bpDiastolic ?? '',
    spo2: vitals.spo2 ?? '',
    temp: vitals.temp ?? '',
    rr: vitals.rr ?? '',
    gcs: vitals.gcs ?? '',
    pain: vitals.pain ?? '',
  };
}

function parseOptionalNumber(value) {
  if (value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function StaffWorkloadIndicator({ member }) {
  return (
    <span
      className={`staff-selector__workload staff-selector__workload--${member.workloadTone}`}
      aria-label={`${member.assignedCount} assigned patients`}
    >
      <span style={{ width: `${Math.max(8, member.workloadPercent)}%` }} />
    </span>
  );
}

function StaffAssignmentSelector({ patient, workloads, onAssign, compact = false, onClose }) {
  return (
    <div className={`staff-selector${compact ? ' staff-selector--compact' : ''}`}>
      {workloads.map((member) => (
        <button
          key={member.id}
          type="button"
          className={[
            'staff-selector__option',
            patient.assignedStaffId === member.id ? 'staff-selector__option--selected' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={(event) => {
            event.stopPropagation();
            onAssign(patient.id, member.id);
            onClose?.();
          }}
        >
          <span className="staff-selector__avatar">{member.initials}</span>
          <span className="staff-selector__body">
            <strong>{member.displayName}</strong>
            <small>
              {member.roleLabel} · {member.assignedCount} patients
            </small>
            <StaffWorkloadIndicator member={member} />
          </span>
        </button>
      ))}
    </div>
  );
}

export function PatientDetailPanel() {
  const navigate = useNavigate();
  const selectedPatientId = useEmergencyStore((state) => state.selectedPatientId);
  const patients = useEmergencyStore((state) => state.patients);
  const queues = useEmergencyStore((state) => state.queues);
  const activeQueueFilter = useEmergencyStore((state) => state.activeQueueFilter);
  const whiteboardSearchQuery = useEmergencyStore((state) => state.whiteboardSearchQuery);
  const referrals = useEmergencyStore((state) => state.referrals);
  const patient = patients.find((candidate) => candidate.id === selectedPatientId);
  const staff = useEmergencyStore((state) => state.staff);
  const rooms = useEmergencyStore((state) => state.rooms);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const updatePatient = useEmergencyStore((state) => state.updatePatient);
  const addVitals = useEmergencyStore((state) => state.addVitals);
  const addFlag = useEmergencyStore((state) => state.addFlag);
  const removeFlag = useEmergencyStore((state) => state.removeFlag);
  const addNote = useEmergencyStore((state) => state.addNote);
  const assignStaff = useEmergencyStore((state) => state.assignStaff);
  const assignRoom = useEmergencyStore((state) => state.assignRoom);
  const [vitalsOpen, setVitalsOpen] = useState(false);
  const [vitalsForm, setVitalsForm] = useState(() => buildVitalsForm(patient?.vitals || {}));
  const [noteText, setNoteText] = useState('');
  const [selectedFlag, setSelectedFlag] = useState('ReassessmentDue');
  const [transitionError, setTransitionError] = useState('');
  const [staffSelectorOpen, setStaffSelectorOpen] = useState(false);
  const [scoreCalculatorId, setScoreCalculatorId] = useState('');
  const filteredPatientsForShortcuts = useMemo(() => {
    const query = whiteboardSearchQuery.trim().toLowerCase();
    const queue = activeQueueFilter
      ? queues.find((candidate) => candidate.type === activeQueueFilter)
      : null;
    return patients.filter((candidate) => {
      if (candidate.state === PatientState.Discharge || candidate.state === PatientState.Deceased) {
        return false;
      }
      if (queue && !queue.patientIds.includes(candidate.id)) return false;
      if (!query) return true;
      const name = `${candidate.firstName} ${candidate.lastName}`.toLowerCase();
      return (
        name.includes(query) ||
        candidate.mrn.toLowerCase().includes(query) ||
        candidate.chiefComplaint.toLowerCase().includes(query) ||
        candidate.complaintCategory.toLowerCase().includes(query)
      );
    });
  }, [activeQueueFilter, patients, queues, whiteboardSearchQuery]);

  useEffect(() => {
    setVitalsForm(buildVitalsForm(patient?.vitals || {}));
    setNoteText('');
    setVitalsOpen(false);
    setTransitionError('');
    setScoreCalculatorId('');
  }, [patient?.id, patient?.vitals]);

  useEffect(() => {
    if (!patient) return undefined;

    const handlePatientDetailShortcut = (event) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isEditableShortcutTarget(event.target)
      ) {
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const shortcutNextState = getNextStates(patient.state)[0];
        if (!shortcutNextState) return;
        try {
          movePatientWithJourneyRules(patient.id, shortcutNextState, {
            staffId: patient.assignedStaffId || activeShift.chargeStaffId,
            note: 'Moved via PatientDetailPanel keyboard shortcut.',
          });
          setTransitionError('');
        } catch (error) {
          setTransitionError(transitionErrorMessage(error));
        }
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        selectPatient(null);
        return;
      }

      if (event.key.toLowerCase() === 'a' && !event.shiftKey) {
        event.preventDefault();
        setStaffSelectorOpen((open) => !open);
        return;
      }

      if (event.key === 'Tab' && !event.shiftKey) {
        event.preventDefault();
        if (!filteredPatientsForShortcuts.length) return;
        const currentIndex = filteredPatientsForShortcuts.findIndex(
          (candidate) => candidate.id === patient.id
        );
        const nextIndex =
          currentIndex === -1 ? 0 : (currentIndex + 1) % filteredPatientsForShortcuts.length;
        selectPatient(filteredPatientsForShortcuts[nextIndex].id);
      }
    };

    window.addEventListener('keydown', handlePatientDetailShortcut);
    return () => window.removeEventListener('keydown', handlePatientDetailShortcut);
  }, [activeShift.chargeStaffId, filteredPatientsForShortcuts, patient, selectPatient]);

  if (!patient) return null;

  const previousVitals = latestPreviousVitals(patient);
  const nextStates = getNextStates(patient.state);
  const nextState = nextStates[0] || null;
  const protocolSuggestions = getProtocolSuggestions(patient.complaintCategory);
  const chronologicalNotes = [...patient.notes].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const activeReferrals = referrals
    .filter((referral) => referral.patientId === patient.id && isActiveReferral(referral))
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  const noteAuthorFallback =
    patient.assignedStaffId || activeShift.chargeStaffId || staff[0]?.id || 'system';
  const staffWorkloads = buildStaffWorkloads(staff, patients, activeShift);
  const assignedStaff = staff.find((member) => member.id === patient.assignedStaffId);

  const submitVitals = (event) => {
    event.preventDefault();
    addVitals(patient.id, {
      hr: parseOptionalNumber(vitalsForm.hr),
      bpSystolic: parseOptionalNumber(vitalsForm.bpSystolic),
      bpDiastolic: parseOptionalNumber(vitalsForm.bpDiastolic),
      spo2: parseOptionalNumber(vitalsForm.spo2),
      temp: parseOptionalNumber(vitalsForm.temp),
      rr: parseOptionalNumber(vitalsForm.rr),
      gcs: parseOptionalNumber(vitalsForm.gcs),
      pain: parseOptionalNumber(vitalsForm.pain),
      recordedAt: new Date().toISOString(),
    });
    setVitalsOpen(false);
  };

  const submitNote = (event) => {
    event.preventDefault();
    if (!noteText.trim()) return;
    addNote(patient.id, {
      id: `note-${patient.id}-${Date.now()}`,
      patientId: patient.id,
      authorStaffId: noteAuthorFallback,
      type: 'Clinical',
      body: noteText.trim(),
      createdAt: new Date().toISOString(),
    });
    setNoteText('');
  };

  const handleMoveToNextState = () => {
    if (!nextState) return;
    try {
      movePatientWithJourneyRules(patient.id, nextState, {
        staffId: patient.assignedStaffId || activeShift.chargeStaffId,
        note: 'Moved from PatientDetailPanel.',
      });
      setTransitionError('');
    } catch (error) {
      setTransitionError(transitionErrorMessage(error));
    }
  };

  const handleProtocolLaunch = (suggestion) => {
    const timestamp = new Date().toISOString();
    const currentPatient =
      useEmergencyStore.getState().patients.find((candidate) => candidate.id === patient.id) ||
      patient;
    updatePatient(patient.id, {
      timeline: [
        ...currentPatient.timeline,
        createProtocolLaunchEvent(patient.id, patient.complaintCategory, suggestion, timestamp),
      ],
    });
  };

  const handleScoreSave = (score) => {
    const timestamp = new Date().toISOString();
    const currentPatient =
      useEmergencyStore.getState().patients.find((candidate) => candidate.id === patient.id) ||
      patient;
    const authorStaffId =
      currentPatient.assignedStaffId || activeShift.chargeStaffId || staff[0]?.id || 'system';
    updatePatient(patient.id, {
      timeline: [
        ...currentPatient.timeline,
        createClinicalScoreEvent(patient.id, score, timestamp),
      ],
    });
    addNote(patient.id, createClinicalScoreNote(patient.id, score, authorStaffId, timestamp));
  };

  const handleNewReferral = () => {
    navigate(`/emergency/referrals?patientId=${encodeURIComponent(patient.id)}&new=1`);
  };

  return (
    <aside className="patient-detail" aria-label="Patient detail panel">
      <header className="patient-detail__header">
        <div className="patient-detail__identity">
          <span>{patient.mrn}</span>
          <h2>{patientName(patient)}</h2>
          <p>
            DOB {patient.dob} · {patient.age}/{patient.sex}
          </p>
        </div>
        <button
          type="button"
          onClick={() => selectPatient(null)}
          aria-label="Close patient details"
        >
          <X size={18} aria-hidden />
        </button>
      </header>

      <section className="patient-detail__priority-state">
        <label>
          Priority
          <select
            value={patient.priority}
            onChange={(event) => updatePatient(patient.id, { priority: event.target.value })}
          >
            {Object.values(Priority).map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span>Current state</span>
          <strong>{patient.state}</strong>
          <button type="button" onClick={handleMoveToNextState} disabled={!nextState}>
            Move to Next State
          </button>
          {transitionError ? (
            <small className="patient-detail__error">{transitionError}</small>
          ) : null}
        </div>
      </section>

      <section className="patient-detail__section patient-detail__staff-assignment">
        <div className="patient-detail__section-heading">
          <span>Assigned to</span>
          <button type="button" onClick={() => setStaffSelectorOpen((open) => !open)}>
            Edit
          </button>
        </div>
        <div className="patient-detail__assigned-staff">
          <span className="patient-card__staff-avatar">{staffInitials(assignedStaff)}</span>
          <strong>{staffDisplayName(assignedStaff)}</strong>
        </div>
        {staffSelectorOpen ? (
          <StaffAssignmentSelector
            patient={patient}
            workloads={staffWorkloads}
            onAssign={assignStaff}
            onClose={() => setStaffSelectorOpen(false)}
          />
        ) : null}
      </section>

      {protocolSuggestions.length ? (
        <section className="patient-detail__section">
          <div className="patient-detail__section-heading">
            <span>Complaint Protocols</span>
          </div>
          <ProtocolSuggestion
            complaintCategory={patient.complaintCategory}
            onLaunch={handleProtocolLaunch}
            onSaveScore={handleScoreSave}
            patient={patient}
            compact
          />
        </section>
      ) : null}

      <section className="patient-detail__section">
        <div className="patient-detail__section-heading">
          <span>Clinical Scores</span>
        </div>
        <div className="patient-detail__score-launcher">
          {SCORE_OPTIONS.map((score) => (
            <button key={score.id} type="button" onClick={() => setScoreCalculatorId(score.id)}>
              Launch {score.label}
            </button>
          ))}
        </div>
      </section>

      {scoreCalculatorId ? (
        <ClinicalScoreCalculator
          calculatorId={scoreCalculatorId}
          patient={patient}
          onClose={() => setScoreCalculatorId('')}
          onSaveScore={handleScoreSave}
        />
      ) : null}

      <section className="patient-detail__section">
        <div className="patient-detail__section-heading">
          <span>Journey Timeline</span>
        </div>
        <JourneyTimeline
          patient={patient}
          staffId={patient.assignedStaffId || activeShift.chargeStaffId}
          onTransitionError={setTransitionError}
        />
      </section>

      <section className="patient-detail__section">
        <div className="patient-detail__section-heading">
          <span>Vitals Panel</span>
          <button type="button" onClick={() => setVitalsOpen((open) => !open)}>
            Add Vitals
          </button>
        </div>
        <div className="patient-detail__vitals">
          {vitalItems(patient.vitals, previousVitals).map((item) => (
            <div
              key={item.label}
              className={`patient-detail__vital patient-detail__vital--${vitalTone(item.label, item.value)}`}
            >
              <span>{item.label}</span>
              <strong>
                {item.display} {trendArrow(item.trendValue, item.previous)}
              </strong>
            </div>
          ))}
        </div>
        {vitalsOpen ? (
          <form className="patient-detail__vitals-form" onSubmit={submitVitals}>
            {Object.entries(vitalsForm).map(([field, value]) => (
              <label key={field}>
                {field}
                <input
                  value={value}
                  inputMode="decimal"
                  onChange={(event) =>
                    setVitalsForm((current) => ({ ...current, [field]: event.target.value }))
                  }
                />
              </label>
            ))}
            <button type="submit">Save vitals</button>
          </form>
        ) : null}
      </section>

      <section className="patient-detail__section">
        <div className="patient-detail__section-heading">
          <span>Clinical Flags</span>
        </div>
        <div className="patient-detail__flags">
          {patient.flags.length ? (
            patient.flags.map((flag) => {
              const flagType = getPatientFlagType(flag);
              return (
                <button
                  key={`${flagType}-${flag.detectedAt}`}
                  type="button"
                  onClick={() => removeFlag(patient.id, flagType)}
                >
                  {flagType}
                  <small>
                    {flag.reason} · {flag.severity} · {formatClock(flagAddedAt(patient, flag))}
                  </small>
                </button>
              );
            })
          ) : (
            <p>No active flags</p>
          )}
        </div>
        <div className="patient-detail__inline-actions">
          <select value={selectedFlag} onChange={(event) => setSelectedFlag(event.target.value)}>
            {ALL_FLAGS.map((flag) => (
              <option key={flag} value={flag}>
                {flag}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => addFlag(patient.id, selectedFlag)}>
            Add flag
          </button>
        </div>
      </section>

      <section className="patient-detail__section">
        <div className="patient-detail__section-heading">
          <span>Clinical Notes</span>
        </div>
        <div className="patient-detail__notes">
          {chronologicalNotes.map((note) => {
            const author = staff.find((candidate) => candidate.id === note.authorStaffId);
            return (
              <article key={note.id}>
                <strong>{staffDisplayName(author)}</strong>
                <time>{formatClock(note.createdAt)}</time>
                <p>{note.body}</p>
              </article>
            );
          })}
          {!chronologicalNotes.length ? <p>No notes yet</p> : null}
        </div>
        <form className="patient-detail__note-form" onSubmit={submitNote}>
          <textarea
            value={noteText}
            placeholder="Add clinical note..."
            onChange={(event) => setNoteText(event.target.value)}
          />
          <button type="submit">Add note</button>
        </form>
      </section>

      <section className="patient-detail__section">
        <div className="patient-detail__section-heading">
          <span>Active Referrals</span>
          <button type="button" onClick={handleNewReferral}>
            <FilePlus2 size={13} aria-hidden />
            New Referral
          </button>
        </div>
        <div className="patient-detail__referral-list">
          {activeReferrals.length ? (
            activeReferrals.map((referral) => (
              <article key={referral.id} className="patient-detail__referral-card">
                <div>
                  <strong>{referral.targetDepartment}</strong>
                  <span>{referral.reason}</span>
                </div>
                <span
                  className={`patient-detail__referral-chip patient-detail__referral-chip--${referral.status.toLowerCase()}`}
                >
                  {referral.status === 'Acknowledged' || referral.status === 'Draft'
                    ? 'Pending'
                    : referral.status}
                </span>
                <dl className="patient-detail__referral">
                  <div>
                    <dt>Urgency</dt>
                    <dd>{referral.urgency}</dd>
                  </div>
                  <div>
                    <dt>Sent</dt>
                    <dd>{formatClock(referral.requestedAt)}</dd>
                  </div>
                  {referral.responseNote ? (
                    <div>
                      <dt>Response</dt>
                      <dd>{referral.responseNote}</dd>
                    </div>
                  ) : null}
                </dl>
              </article>
            ))
          ) : (
            <p>No active referrals</p>
          )}
        </div>
      </section>

      <div className="patient-detail__actions">
        <label>
          Assign Staff
          <select
            value={patient.assignedStaffId || ''}
            onChange={(event) => event.target.value && assignStaff(patient.id, event.target.value)}
          >
            <option value="">Unassigned</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {staffDisplayName(member)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Assign Room
          <select
            value={patient.roomId || ''}
            onChange={(event) => event.target.value && assignRoom(patient.id, event.target.value)}
          >
            <option value="">No room</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => addFlag(patient.id, selectedFlag)}>
          Add Flag
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              movePatientWithJourneyRules(patient.id, PatientState.Discharge, {
                staffId: patient.assignedStaffId || activeShift.chargeStaffId,
                note: 'Discharge requested from PatientDetailPanel.',
              });
              setTransitionError('');
            } catch (error) {
              setTransitionError(transitionErrorMessage(error));
            }
          }}
        >
          Discharge
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              movePatientWithJourneyRules(patient.id, PatientState.Admission, {
                staffId: patient.assignedStaffId || activeShift.chargeStaffId,
                note: 'Transfer to admission requested from PatientDetailPanel.',
              });
              setTransitionError('');
            } catch (error) {
              setTransitionError(transitionErrorMessage(error));
            }
          }}
        >
          Transfer
        </button>
      </div>
    </aside>
  );
}

function PatientCard({ patient, keyboardSelected = false, onKeyboardFocus }) {
  const [staffMenuOpen, setStaffMenuOpen] = useState(false);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const patients = useEmergencyStore((state) => state.patients);
  const referrals = useEmergencyStore((state) => state.referrals);
  const allStaff = useEmergencyStore((state) => state.staff);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const assignStaff = useEmergencyStore((state) => state.assignStaff);
  const staff = allStaff.find((candidate) => candidate.id === patient.assignedStaffId);
  const room = useEmergencyStore((state) =>
    state.rooms.find((candidate) => candidate.id === patient.roomId)
  );
  const staffWorkloads = buildStaffWorkloads(allStaff, patients, activeShift);
  const wait = waitMinutes(patient.arrivalTime);
  const isLongWait = wait > 60;
  const isWaitOverTarget = wait > 45;
  const priority = priorityTone(patient.priority);
  const hasReassessment = hasPatientFlag(patient, 'ReassessmentDue');
  const hasDeterioration = hasPatientFlag(patient, 'DeteriorationRisk');
  const hasEmsArrival = hasPatientFlag(patient, 'EMSArrival') || Boolean(patient.emsArrival);
  const activeReferralCount = referrals.filter(
    (referral) => referral.patientId === patient.id && isActiveReferral(referral)
  ).length;
  const scoreBadges = savedScoreBadges(patient);

  return (
    <article
      role="button"
      tabIndex={0}
      className={[
        'patient-card',
        `patient-card--${priority}`,
        keyboardSelected ? 'patient-card--keyboard-selected' : '',
        hasReassessment ? 'patient-card--reassessment' : '',
        hasDeterioration ? 'patient-card--deterioration' : '',
        hasEmsArrival ? 'patient-card--ems' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-patient-card-id={patient.id}
      onFocus={onKeyboardFocus}
      onClick={() => selectPatient(patient.id)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        selectPatient(patient.id);
      }}
      aria-label={`Open details for ${patientName(patient)}`}
    >
      <div className="patient-card__row patient-card__row--identity">
        <div className="patient-card__identity">
          <strong>{patientName(patient)}</strong>
          <span>{patient.mrn}</span>
        </div>
        <div className="patient-card__right-pills">
          <span className="patient-card__demographics">
            {patient.age}/{patient.sex[0] || 'U'}
          </span>
          {activeReferralCount ? (
            <span className="patient-card__referral-badge">
              {activeReferralCount} referral{activeReferralCount === 1 ? '' : 's'}
            </span>
          ) : null}
          {hasEmsArrival ? <span className="patient-card__ems-badge">EMS</span> : null}
        </div>
      </div>

      <div className="patient-card__row patient-card__row--badges">
        <span
          className={`patient-card__complaint patient-card__complaint--${categoryClass(patient.complaintCategory)}`}
          title={patient.chiefComplaint}
        >
          {patient.chiefComplaint}
        </span>
        <span className="patient-card__state">{patient.state}</span>
      </div>

      <div className="patient-card__row patient-card__vitals" aria-label="Vitals">
        {vitalItems(patient.vitals).map((item) => (
          <span
            key={item.label}
            className={`patient-card__vital patient-card__vital--${vitalTone(item.label, item.value)}`}
          >
            {item.label} {item.display}
          </span>
        ))}
      </div>

      <div className="patient-card__row patient-card__row--location">
        <span
          className={[
            'patient-card__wait',
            isWaitOverTarget ? 'patient-card__wait--elevated' : '',
            isLongWait ? 'patient-card__wait--long' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {formatWait(wait)} wait
        </span>
        <div className="patient-card__staff-control" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="patient-card__staff-avatar"
            title={staffDisplayName(staff)}
            aria-label={`Assign staff for ${patientName(patient)}`}
            aria-expanded={staffMenuOpen}
            onClick={() => setStaffMenuOpen((open) => !open)}
          >
            {staff ? staffInitials(staff) : <UserRoundCheck size={12} aria-hidden />}
          </button>
          {staffMenuOpen ? (
            <StaffAssignmentSelector
              patient={patient}
              workloads={staffWorkloads}
              onAssign={assignStaff}
              compact
              onClose={() => setStaffMenuOpen(false)}
            />
          ) : null}
        </div>
        <span className="patient-card__room">
          <DoorOpen size={12} aria-hidden />
          {room?.name || patient.roomId || 'No room'}
        </span>
      </div>

      <div className="patient-card__flags" aria-label="Patient flags">
        {scoreBadges.map((score) => (
          <span
            key={score.id}
            className="patient-card__score-badge"
            title={`${score.label}: ${score.total} (${score.interpretation || 'saved'})`}
          >
            {score.label} {score.total ?? ''}
          </span>
        ))}
        {patient.flags.map((flag) => {
          const flagType = getPatientFlagType(flag);
          const Icon = FLAG_ICONS[flagType] || AlertTriangle;
          return (
            <span key={`${flagType}-${flag.detectedAt}`} title={flag.reason} aria-label={flagType}>
              <Icon size={12} aria-hidden />
            </span>
          );
        })}
      </div>
    </article>
  );
}

export default memo(PatientCard);

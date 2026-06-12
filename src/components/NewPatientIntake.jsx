import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { PatientState, Priority } from '../../types/emergency';
import { useEmergencyStore } from '../../store/emergencyStore';
import { createClinicalScoreEvent, createClinicalScoreNote } from './ClinicalScoreCalculator';
import ProtocolSuggestion, { createProtocolLaunchEvent } from './ProtocolSuggestion';
import { getSuggestedToolsForComplaint } from '../utils/clinicalToolSuggestions';
import { sendClinicalChatMessage } from '../services/clinicalChatService';
import './NewPatientIntake.css';

const COMPLAINT_CATEGORIES = [
  'Chest Pain',
  'Shortness of Breath',
  'Stroke',
  'Sepsis',
  'Abdominal Pain',
  'Trauma',
  'Psychiatric',
  'Pediatric',
  'Other',
];

const SEX_OPTIONS = ['Female', 'Male', 'Intersex', 'Unknown', 'Unspecified'];

const CTAS_LABELS = {
  [Priority.P1]: 'CTAS 1 · Resuscitation',
  [Priority.P2]: 'CTAS 2 · Emergent',
  [Priority.P3]: 'CTAS 3 · Urgent',
  [Priority.P4]: 'CTAS 4 · Semi-Urgent',
  [Priority.P5]: 'CTAS 5 · Non-Urgent',
};

const INITIAL_IDENTITY = {
  firstName: '',
  lastName: '',
  dob: '',
  sex: 'Unknown',
};

const INITIAL_VITALS = {
  hr: '',
  bpSystolic: '',
  bpDiastolic: '',
  spo2: '',
  temp: '',
  rr: '',
  gcs: '',
  pain: '',
};

const STEPS = ['Identity', 'Chief Complaint', 'Vitals', 'Triage Priority', 'Confirm & Add'];

export function generateMrn() {
  return `ED-${Math.floor(100000 + Math.random() * 900000)}`;
}

export function calculateAge(dob) {
  if (!dob) return null;
  const birthDate = new Date(`${dob}T00:00:00`);
  if (!Number.isFinite(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return Math.max(0, age);
}

function parseNumber(value) {
  if (value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function vitalTone(field, value) {
  const numericValue = parseNumber(value);
  if (numericValue === null) return 'empty';

  if (field === 'hr') {
    if (numericValue < 50 || numericValue > 120) return 'abnormal';
  }
  if (field === 'bpSystolic') {
    if (numericValue < 90 || numericValue > 180) return 'abnormal';
  }
  if (field === 'bpDiastolic') {
    if (numericValue > 110 || numericValue < 50) return 'abnormal';
  }
  if (field === 'spo2') {
    if (numericValue < 94) return 'abnormal';
  }
  if (field === 'temp') {
    if (numericValue > 38.5 || numericValue < 35.5) return 'abnormal';
  }
  if (field === 'rr') {
    if (numericValue < 10 || numericValue > 24) return 'abnormal';
  }
  if (field === 'gcs') {
    if (numericValue < 15) return 'abnormal';
  }
  if (field === 'pain') {
    if (numericValue >= 8) return 'abnormal';
  }

  return 'normal';
}

export function suggestPriority(complaintCategory, vitals, complaintText = '') {
  const hr = parseNumber(vitals.hr);
  const spo2 = parseNumber(vitals.spo2);
  const sbp = parseNumber(vitals.bpSystolic);
  const dbp = parseNumber(vitals.bpDiastolic);
  const gcs = parseNumber(vitals.gcs);
  const temp = parseNumber(vitals.temp);
  const rr = parseNumber(vitals.rr);
  const pain = parseNumber(vitals.pain);
  const complaint = `${complaintCategory} ${complaintText}`.toLowerCase();
  const hasDiaphoresis = /\b(diaphoresis|diaphoretic|sweat|sweating|clammy)\b/.test(complaint);
  const hasSevereTrauma = /\b(major|severe|penetrating|unstable|ejected|fall|polytrauma)\b/.test(
    complaint
  );
  const hasSuicidalRisk = /\b(suicidal|suicide|self[-\s]?harm|overdose)\b/.test(complaint);

  if (
    (typeof spo2 === 'number' && spo2 < 90) ||
    (typeof hr === 'number' && (hr < 40 || hr > 150)) ||
    (typeof sbp === 'number' && sbp < 90) ||
    (typeof rr === 'number' && (rr < 8 || rr > 32)) ||
    (typeof gcs === 'number' && gcs <= 8)
  ) {
    return Priority.P1;
  }

  if (complaintCategory === 'Chest Pain' && hasDiaphoresis) return Priority.P2;
  if (complaintCategory === 'Stroke') return Priority.P2;
  if (complaintCategory === 'Trauma' && hasSevereTrauma) return Priority.P2;
  if (complaintCategory === 'Psychiatric' && hasSuicidalRisk) return Priority.P2;
  if (
    complaintCategory === 'Sepsis' &&
    ((typeof temp === 'number' && temp > 38.5) ||
      (typeof sbp === 'number' && sbp <= 100) ||
      (typeof rr === 'number' && rr >= 22) ||
      (typeof gcs === 'number' && gcs < 15))
  ) {
    return Priority.P2;
  }

  if (
    ['Chest Pain', 'Shortness of Breath', 'Sepsis'].includes(complaintCategory) ||
    (typeof spo2 === 'number' && spo2 < 94) ||
    (typeof hr === 'number' && hr > 120) ||
    (typeof sbp === 'number' && sbp > 180) ||
    (typeof dbp === 'number' && dbp > 120) ||
    (typeof temp === 'number' && temp > 38.5) ||
    (typeof rr === 'number' && rr > 24) ||
    (typeof gcs === 'number' && gcs < 15) ||
    (typeof pain === 'number' && pain >= 9)
  ) {
    return Priority.P2;
  }

  if (['Abdominal Pain', 'Trauma', 'Psychiatric', 'Pediatric'].includes(complaintCategory)) {
    return Priority.P3;
  }

  if (complaintCategory === 'Other') return Priority.P4;
  return Priority.P3;
}

function normalizeVitals(vitals, recordedAt) {
  return {
    hr: parseNumber(vitals.hr),
    bpSystolic: parseNumber(vitals.bpSystolic),
    bpDiastolic: parseNumber(vitals.bpDiastolic),
    spo2: parseNumber(vitals.spo2),
    temp: parseNumber(vitals.temp),
    rr: parseNumber(vitals.rr),
    gcs: parseNumber(vitals.gcs),
    pain: parseNumber(vitals.pain),
    recordedAt,
  };
}

function fieldLabel(field) {
  const labels = {
    hr: 'HR',
    bpSystolic: 'SBP',
    bpDiastolic: 'DBP',
    spo2: 'SpO2',
    temp: 'Temp (°C)',
    rr: 'RR',
    gcs: 'GCS',
    pain: 'Pain',
  };
  return labels[field] || field;
}

function canContinue(step, identity, age, complaintCategory, complaintText) {
  if (step === 0) {
    return Boolean(
      identity.firstName.trim() && identity.lastName.trim() && identity.dob && age !== null
    );
  }
  if (step === 1) {
    return Boolean(complaintCategory && complaintText.trim());
  }
  return true;
}

function parseAiChipLabels(text = '') {
  return String(text)
    .split(/\n|,/)
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 4);
}

export default function NewPatientIntake({ open, onClose }) {
  const addPatient = useEmergencyStore((state) => state.addPatient);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const setQueueFilter = useEmergencyStore((state) => state.setQueueFilter);
  const [step, setStep] = useState(0);
  const [identity, setIdentity] = useState(INITIAL_IDENTITY);
  const [mrn, setMrn] = useState(() => generateMrn());
  const [complaintCategory, setComplaintCategory] = useState('');
  const [complaintText, setComplaintText] = useState('');
  const [vitals, setVitals] = useState(INITIAL_VITALS);
  const [vitalsSkipped, setVitalsSkipped] = useState(false);
  const [priorityOverride, setPriorityOverride] = useState('');
  const [launchedProtocols, setLaunchedProtocols] = useState([]);
  const [savedScores, setSavedScores] = useState([]);
  const [aiIntakeChips, setAiIntakeChips] = useState([]);
  const [aiIntakeLoading, setAiIntakeLoading] = useState(false);

  const age = useMemo(() => calculateAge(identity.dob), [identity.dob]);
  const suggestedPriority = useMemo(
    () => suggestPriority(complaintCategory, vitals, complaintText),
    [complaintCategory, complaintText, vitals]
  );
  const selectedPriority = priorityOverride || suggestedPriority;
  const suggestedTools = useMemo(
    () => getSuggestedToolsForComplaint(complaintCategory),
    [complaintCategory]
  );
  const canAdvance = canContinue(step, identity, age, complaintCategory, complaintText);
  const draftPatient = useMemo(
    () => ({
      mrn,
      firstName: identity.firstName,
      lastName: identity.lastName,
      vitals: normalizeVitals(vitalsSkipped ? INITIAL_VITALS : vitals, new Date().toISOString()),
    }),
    [identity.firstName, identity.lastName, mrn, vitals, vitalsSkipped]
  );

  useEffect(() => {
    if (step !== 1 || !complaintCategory || complaintText.trim().length < 3) return undefined;
    let cancelled = false;
    setAiIntakeLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await sendClinicalChatMessage({
          message: `For intake complaint "${complaintText.trim()}" in category "${complaintCategory}", suggest protocol chips for human triage review. Keep it concise.`,
          requestType: 'INTAKE_SUGGESTION',
          workspaceContext: {
            workspaceId: 'emergency',
            workspaceKey: 'emergency',
            aiRequest: {
              requestType: 'INTAKE_SUGGESTION',
              complaint: complaintText.trim(),
              patientContext: pendingPatientForTools(),
            },
          },
        });
        if (cancelled || !response.ok) return;
        setAiIntakeChips(parseAiChipLabels(response.data.response));
      } finally {
        if (!cancelled) setAiIntakeLoading(false);
      }
    }, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [complaintCategory, complaintText, step]);

  if (!open) return null;

  const resetAndClose = () => {
    setStep(0);
    setIdentity(INITIAL_IDENTITY);
    setMrn(generateMrn());
    setComplaintCategory('');
    setComplaintText('');
    setVitals(INITIAL_VITALS);
    setVitalsSkipped(false);
    setPriorityOverride('');
    setLaunchedProtocols([]);
    setSavedScores([]);
    onClose();
  };

  const addToDepartment = () => {
    const now = new Date().toISOString();
    const patientId = `intake-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const protocolEvents = launchedProtocols.map((suggestion) =>
      createProtocolLaunchEvent(patientId, complaintCategory, suggestion, now)
    );
    const scoreEvents = savedScores.map((score) =>
      createClinicalScoreEvent(patientId, score, now, 'system-intake')
    );
    const scoreNotes = savedScores.map((score) =>
      createClinicalScoreNote(patientId, score, 'system-intake', now)
    );
    const patient = {
      id: patientId,
      mrn,
      firstName: identity.firstName.trim(),
      lastName: identity.lastName.trim(),
      dob: identity.dob,
      age: age ?? 0,
      sex: identity.sex,
      arrivalTime: now,
      triageTime: now,
      lastAssessedTime: vitalsSkipped ? null : now,
      chiefComplaint: complaintText.trim(),
      complaint: complaintText.trim(),
      complaintCategory,
      state: PatientState.Triage,
      priority: selectedPriority,
      vitals: normalizeVitals(vitalsSkipped ? INITIAL_VITALS : vitals, now),
      assignedStaffId: null,
      roomId: null,
      flags: [],
      timeline: [
        {
          id: `evt-${patientId}-arrival`,
          patientId,
          type: 'Arrival',
          timestamp: now,
          summary: 'Manual patient intake started from Emergency Whiteboard.',
        },
        {
          id: `evt-${patientId}-triage`,
          patientId,
          type: 'Triage',
          timestamp: now,
          summary: `Patient added to Triage with ${selectedPriority} priority.`,
          metadata: {
            suggestedPriority,
            priorityOverride: priorityOverride || null,
            vitalsSkipped,
          },
        },
        ...protocolEvents,
        ...scoreEvents,
      ],
      notes: scoreNotes,
    };

    addPatient(patient);
    setQueueFilter(null);
    selectPatient(patientId);
    resetAndClose();
  };

  const pendingPatientForTools = () => ({
    mrn,
    firstName: identity.firstName,
    lastName: identity.lastName,
    age: age ?? null,
    sex: identity.sex,
    complaintCategory,
    chiefComplaint: complaintText,
    vitals: normalizeVitals(vitalsSkipped ? INITIAL_VITALS : vitals, new Date().toISOString()),
  });

  const openComplaintTools = (toolId = '') => {
    const params = new URLSearchParams();
    if (complaintCategory) params.set('complaint', complaintCategory);
    if (toolId) params.set('tool', toolId);
    window.dispatchEvent(
      new CustomEvent('ed:open-clinical-tools', {
        detail: {
          search: params.toString(),
          pendingPatient: pendingPatientForTools(),
        },
      })
    );
    onClose?.();
  };

  const intakeDialog = (
    <div
      className="new-patient-intake"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-patient-title"
    >
      <div className="new-patient-intake__panel">
        <header className="new-patient-intake__header">
          <div>
            <span>Manual intake</span>
            <h2 id="new-patient-title">New Patient</h2>
          </div>
          <button type="button" onClick={resetAndClose} aria-label="Close new patient intake">
            <X size={18} aria-hidden />
          </button>
        </header>

        <nav className="new-patient-intake__steps" aria-label="New patient intake steps">
          {STEPS.map((label, index) => (
            <button
              key={label}
              type="button"
              className={[
                'new-patient-intake__step',
                step === index ? 'new-patient-intake__step--active' : '',
                step > index ? 'new-patient-intake__step--complete' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setStep(index)}
            >
              <span>{index + 1}</span>
              {label}
            </button>
          ))}
        </nav>

        <section className="new-patient-intake__content">
          {step === 0 ? (
            <section className="new-patient-intake__section">
              <h3>Identity</h3>
              <div className="new-patient-intake__grid">
                <label>
                  First name
                  <input
                    value={identity.firstName}
                    onChange={(event) =>
                      setIdentity((current) => ({ ...current, firstName: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Last name
                  <input
                    value={identity.lastName}
                    onChange={(event) =>
                      setIdentity((current) => ({ ...current, lastName: event.target.value }))
                    }
                  />
                </label>
                <label>
                  DOB
                  <input
                    type="date"
                    value={identity.dob}
                    onChange={(event) =>
                      setIdentity((current) => ({ ...current, dob: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Sex
                  <select
                    value={identity.sex}
                    onChange={(event) =>
                      setIdentity((current) => ({ ...current, sex: event.target.value }))
                    }
                  >
                    {SEX_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="new-patient-intake__identity-summary">
                <span>
                  Age <strong>{age ?? '--'}</strong>
                </span>
                <span>
                  MRN <strong>{mrn}</strong>
                </span>
              </div>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="new-patient-intake__section">
              <h3>Chief Complaint</h3>
              <div className="new-patient-intake__complaints">
                {COMPLAINT_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={
                      complaintCategory === category ? 'new-patient-intake__complaint--active' : ''
                    }
                    onClick={() => setComplaintCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="new-patient-intake__clinical-tools"
                onClick={() => openComplaintTools()}
              >
                Open Clinical Tools for {complaintCategory}
              </button>
              {complaintCategory ? (
                <div className="new-patient-intake__tool-banner">
                  <span>
                    {aiIntakeLoading ? 'AI reviewing intake...' : `Suggested tools for ${complaintCategory}:`}
                  </span>
                  <div>
                    {aiIntakeChips.map((label) => (
                      <button key={`ai-${label}`} type="button" onClick={() => openComplaintTools(label)}>
                        {label}
                      </button>
                    ))}
                    {suggestedTools.map((tool) => (
                      <button key={tool.id} type="button" onClick={() => openComplaintTools(tool.id)}>
                        {tool.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <ProtocolSuggestion
                complaintCategory={complaintCategory}
                patient={draftPatient}
                onLaunch={(suggestion) =>
                  setLaunchedProtocols((current) =>
                    current.some((item) => item.id === suggestion.id)
                      ? current
                      : [...current, suggestion]
                  )
                }
                onSaveScore={(score) =>
                  setSavedScores((current) => [
                    ...current.filter((item) => item.calculatorId !== score.calculatorId),
                    score,
                  ])
                }
              />
              <label className="new-patient-intake__wide-field">
                Specific complaint description
                <textarea
                  value={complaintText}
                  placeholder="Briefly describe onset, symptoms, mechanism, or presenting concern..."
                  onChange={(event) => setComplaintText(event.target.value)}
                />
              </label>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="new-patient-intake__section">
              <h3>Vitals</h3>
              <div className="new-patient-intake__vitals">
                {Object.entries(vitals).map(([field, value]) => {
                  const tone = vitalTone(field, value);
                  return (
                    <label
                      key={field}
                      className={`new-patient-intake__vital new-patient-intake__vital--${tone}`}
                    >
                      {fieldLabel(field)}
                      <input
                        value={value}
                        inputMode="decimal"
                        disabled={vitalsSkipped}
                        onChange={(event) => {
                          setVitalsSkipped(false);
                          setVitals((current) => ({ ...current, [field]: event.target.value }));
                        }}
                      />
                      <small>{tone === 'empty' ? 'Not entered' : tone}</small>
                    </label>
                  );
                })}
              </div>
              <button
                type="button"
                className="new-patient-intake__skip"
                onClick={() => {
                  setVitalsSkipped(true);
                  setVitals(INITIAL_VITALS);
                  setStep(3);
                }}
              >
                Skip vitals, not yet taken
              </button>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="new-patient-intake__section">
              <h3>Triage Priority</h3>
              <div className="new-patient-intake__priority-suggestion">
                <span>Suggested priority</span>
                <strong>{CTAS_LABELS[suggestedPriority]}</strong>
                <small>Based on complaint category and entered vitals.</small>
              </div>
              <div className="new-patient-intake__priority-options">
                {Object.values(Priority).map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    className={
                      selectedPriority === priority ? 'new-patient-intake__priority--active' : ''
                    }
                    onClick={() => setPriorityOverride(priority)}
                  >
                    <strong>{priority}</strong>
                    <span>{CTAS_LABELS[priority]}</span>
                  </button>
                ))}
              </div>
              {priorityOverride ? (
                <button
                  type="button"
                  className="new-patient-intake__clear-override"
                  onClick={() => setPriorityOverride('')}
                >
                  Use suggested priority instead
                </button>
              ) : null}
            </section>
          ) : null}

          {step === 4 ? (
            <section className="new-patient-intake__section">
              <h3>Confirm & Add</h3>
              <div className="new-patient-intake__summary">
                <div>
                  <span>Patient</span>
                  <strong>
                    {identity.firstName} {identity.lastName}
                  </strong>
                  <small>
                    {age ?? '--'} / {identity.sex} · {mrn}
                  </small>
                </div>
                <div>
                  <span>Complaint</span>
                  <strong>{complaintCategory}</strong>
                  <small>{complaintText}</small>
                </div>
                <div>
                  <span>Vitals</span>
                  <strong>{vitalsSkipped ? 'Skipped' : 'Entered'}</strong>
                  <small>
                    HR {vitals.hr || '--'} · BP {vitals.bpSystolic || '--'}/
                    {vitals.bpDiastolic || '--'} · SpO2 {vitals.spo2 || '--'}
                  </small>
                </div>
                <div>
                  <span>Priority</span>
                  <strong>{CTAS_LABELS[selectedPriority]}</strong>
                  <small>Patient will appear in Triage.</small>
                </div>
                <div>
                  <span>Launched Protocols</span>
                  <strong>{launchedProtocols.length || 'None'}</strong>
                  <small>
                    {launchedProtocols.length
                      ? launchedProtocols.map((protocol) => protocol.label).join(', ')
                      : 'No complaint protocol launched yet.'}
                  </small>
                </div>
                <div>
                  <span>Saved Scores</span>
                  <strong>{savedScores.length || 'None'}</strong>
                  <small>
                    {savedScores.length
                      ? savedScores.map((score) => `${score.label} ${score.total}`).join(', ')
                      : 'No score saved yet.'}
                  </small>
                </div>
              </div>
              <button type="button" className="new-patient-intake__add" onClick={addToDepartment}>
                <CheckCircle2 size={18} aria-hidden />
                Add to Department
              </button>
            </section>
          ) : null}
        </section>

        <footer className="new-patient-intake__footer">
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            disabled={step === 0}
          >
            <ChevronLeft size={16} aria-hidden />
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="new-patient-intake__next"
              onClick={() => setStep((current) => Math.min(STEPS.length - 1, current + 1))}
              disabled={!canAdvance}
            >
              Next
              <ChevronRight size={16} aria-hidden />
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(intakeDialog, document.body) : intakeDialog;
}

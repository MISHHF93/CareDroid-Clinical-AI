import React, { useEffect, useMemo, useRef, useState } from 'react';
/**
 * @deprecated Legacy whiteboard central intake modal. Production paths use
 * `QuickIntake` (reception/whiteboard) and embedded Smart Intake. Retained for
 * tests and optional whiteboard emergency create; always hands off via
 * `completeIntakeHandoff` with source `whiteboard-central-intake`.
 */
import { createPortal } from 'react-dom';
import { CheckCircle2, X } from 'lucide-react';
import { Priority } from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';
import { completeIntakeHandoff } from '../services/receptionHandoff';
import { formatApiRecoveryMessage } from '../config/errorRecoveryModel';
import { TriageSuggestionEngine } from '../engine/triageEngine';
import { buildSmartIntakeVerticalSlicePatient } from '../data/smartIntakeVerticalSlice';
import { runSmartIntakeVerticalSlice } from '../services/emergencyOsApi';
import './NewPatientIntake.css';

const COMPLAINT_CATEGORIES = [
  { value: 'Chest Pain', label: 'Chest pain', icon: '??' },
  { value: 'Breathing', label: 'Breathing', icon: '??' },
  { value: 'Neuro/Stroke', label: 'Neuro/Stroke', icon: '??' },
  { value: 'Sepsis', label: 'Sepsis', icon: '??' },
  { value: 'Trauma', label: 'Trauma', icon: '??' },
  { value: 'OB/Gyn', label: 'OB/Gyn', icon: '??' },
  { value: 'Pediatric', label: 'Pediatric', icon: '??' },
  { value: 'Other', label: 'Other', icon: '??' },
];

const SEX_OPTIONS = [
  { value: 'Male', label: 'M' },
  { value: 'Female', label: 'F' },
  { value: 'Unspecified', label: 'Other' },
];

const CTAS_LABELS = {
  [Priority.P1]: 'CTAS 1 � Resuscitation',
  [Priority.P2]: 'CTAS 2 � Emergent',
  [Priority.P3]: 'CTAS 3 � Urgent',
  [Priority.P4]: 'CTAS 4 � Semi-Urgent',
  [Priority.P5]: 'CTAS 5 � Non-Urgent',
};

const INITIAL_IDENTITY = {
  firstName: '',
  lastName: '',
  dob: '',
  sex: '',
};

const INITIAL_VITALS = {
  hr: '',
  bpSystolic: '',
  spo2: '',
  temp: '',
};

const noop = () => {};

export function generateMrn() {
  return `ED-${Math.floor(100000 + Math.random() * 900000)}`;
}

export function calculateAge(dob) {
  if (!dob) return null;
  const birthDate = new Date(`${dob}T00:00:00`);
  if (!Number.isFinite(birthDate.getTime())) return null;

  const today = new Date();
  if (birthDate > today) return null;
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

function parseNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function vitalTone(field, value) {
  const numericValue = parseNumber(value);
  if (numericValue === null) return 'empty';

  if (field === 'hr' && (numericValue < 50 || numericValue > 120)) return 'abnormal';
  if (field === 'bpSystolic' && (numericValue < 90 || numericValue > 180)) return 'abnormal';
  if (field === 'spo2' && numericValue < 94) return 'abnormal';
  if (field === 'temp' && (numericValue > 38.5 || numericValue < 35.5)) return 'abnormal';
  return 'normal';
}

export function suggestPriority(complaintCategory = 'Other', vitals: any = {}, complaintText = '') {
  return TriageSuggestionEngine.suggest({
    complaintCategory,
    complaintText,
    vitals,
  }).suggestedPriority;
}

function hasEnteredVitals(vitals) {
  return Object.values(vitals).some((value) => String(value).trim());
}

function fieldLabel(field) {
  const labels = {
    hr: 'HR',
    bpSystolic: 'SBP',
    spo2: 'SpO2',
    temp: 'Temp',
  };
  return labels[field] || field;
}

export default function NewPatientIntake({ open, onClose, onPatientAdded }) {
  const addPatient = useEmergencyStore((state) => state.addPatient);
  const setWhiteboardSearchQuery = useEmergencyStore(
    (state) => state.setWhiteboardSearchQuery || noop,
  );
  const complaintRef = useRef<any>(null);
  const [identity, setIdentity] = useState(INITIAL_IDENTITY);
  const [mrn, setMrn] = useState(() => generateMrn());
  const [complaintCategory, setComplaintCategory] = useState('Other');
  const [complaintText, setComplaintText] = useState('');
  const [vitals, setVitals] = useState(INITIAL_VITALS);
  const [priorityOverride, setPriorityOverride] = useState('');
  const [priorityPickerOpen, setPriorityPickerOpen] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const age = useMemo(() => calculateAge(identity.dob), [identity.dob]);
  const autoSuggestion = useMemo(
    () =>
      TriageSuggestionEngine.suggest({
        complaintCategory,
        complaintText,
        vitals,
      }),
    [complaintCategory, complaintText, vitals],
  );
  const triageSuggestion = useMemo(
    () =>
      TriageSuggestionEngine.suggest({
        complaintCategory,
        complaintText,
        vitals,
        overridePriority: (priorityOverride || null) as any,
      }),
    [complaintCategory, complaintText, priorityOverride, vitals],
  );
  const selectedPriority = triageSuggestion.suggestedPriority;
  const nameEntered = Boolean(identity.firstName.trim() || identity.lastName.trim());
  const complaintEntered = Boolean(complaintText.trim());
  const canSubmit = nameEntered && complaintEntered;
  const dirty = Boolean(
    nameEntered ||
    identity.dob ||
    identity.sex ||
    complaintText.trim() ||
    complaintCategory !== 'Other' ||
    priorityOverride ||
    hasEnteredVitals(vitals),
  );

  const resetDraft = () => {
    setIdentity(INITIAL_IDENTITY);
    setMrn(generateMrn());
    setComplaintCategory('Other');
    setComplaintText('');
    setVitals(INITIAL_VITALS);
    setPriorityOverride('');
    setPriorityPickerOpen(false);
    setSubmitAttempted(false);
  };

  useEffect(() => {
    if (!open) return undefined;
    const focusTimer = window.setTimeout(() => complaintRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [open]);

  if (!open) return null;

  const requestClose = () => {
    if (dirty && !window.confirm('Discard this quick intake draft?')) return;
    resetDraft();
    onClose?.();
  };

  const handleCategoryClick = (category) => {
    setComplaintCategory(category);
    complaintRef.current?.focus();
  };

  const handleSexKeyDown = (event, optionIndex) => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (optionIndex + direction + SEX_OPTIONS.length) % SEX_OPTIONS.length;
    setIdentity((current) => ({ ...current, sex: SEX_OPTIONS[nextIndex].value }));
    (document.querySelector(`[data-sex-option="${SEX_OPTIONS[nextIndex].value}"]`) as any)?.focus();
  };

  const handlePrioritySelect = (priority) => {
    setPriorityOverride(priority === autoSuggestion.suggestedPriority ? '' : priority);
    setPriorityPickerOpen(false);
  };

  const addToDepartment = async () => {
    if (isSubmitting) return;
    setSubmitAttempted(true);
    if (!canSubmit) {
      complaintRef.current?.focus();
      return;
    }

    const now = new Date().toISOString();
    const patientId = `intake-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const vitalsEntered = hasEnteredVitals(vitals);
    const patient = buildSmartIntakeVerticalSlicePatient({
      patientId,
      mrn,
      identity,
      age: age ?? 0,
      complaintCategory,
      complaintText,
      vitals: vitalsEntered ? vitals : INITIAL_VITALS,
      selectedPriority,
      autoSuggestion,
      triageSuggestion,
      timestamp: now,
      source: 'Quick intake',
    } as any);

    setIsSubmitting(true);
    setSubmitError('');
    let patientToAdd = patient;
    let syncedThroughVerticalSlice = false;
    try {
      const response = await runSmartIntakeVerticalSlice({
        patient,
        staffId: 'staff-smart-intake-rn',
      });
      if (response?.data?.patient?.id) {
        patientToAdd = {
          ...patient,
          ...response.data.patient,
          vitals: patient.vitals,
          flags: patient.flags,
          timeline: patient.timeline,
        };
        syncedThroughVerticalSlice = true;
      }
    } catch (error: any) {
      setSubmitError(formatApiRecoveryMessage(error, 'intake draft'));
      setIsSubmitting(false);
      return;
    }

    addPatient(patientToAdd as any, { syncToBackend: !syncedThroughVerticalSlice });
    completeIntakeHandoff(useEmergencyStore.getState(), {
      patientId: patientToAdd.id!,
      source: 'whiteboard-central-intake',
    });
    setWhiteboardSearchQuery('' as any);
    onPatientAdded?.(patientToAdd.id);
    resetDraft();
    onClose?.();
    setIsSubmitting(false);
  };

  const intakeDialog = (
    <div
      className="new-patient-intake"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-patient-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          requestClose();
        }
      }}
    >
      <form
        className="new-patient-intake__panel"
        onSubmit={(event) => {
          event.preventDefault();
          void addToDepartment();
        }}
      >
        <header className="new-patient-intake__header">
          <div>
            <span>Central intake</span>
            <h2 id="new-patient-title">Send walk-in input to Central Node</h2>
          </div>
          <button type="button" onClick={requestClose} aria-label="Close quick intake">
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="new-patient-intake__content">
          <section
            className="new-patient-intake__complaint-column"
            aria-labelledby="complaint-heading"
          >
            <div className="new-patient-intake__section-heading">
              <h3 id="complaint-heading">Complaint</h3>
              <span>Touch category, then type</span>
            </div>
            <div className="new-patient-intake__complaints" aria-label="Complaint categories">
              {COMPLAINT_CATEGORIES.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  className={
                    complaintCategory === category.value
                      ? 'new-patient-intake__complaint--active'
                      : ''
                  }
                  aria-pressed={complaintCategory === category.value}
                  onClick={() => handleCategoryClick(category.value)}
                >
                  <span aria-hidden>{category.icon}</span>
                  <strong>{category.label}</strong>
                </button>
              ))}
            </div>
            <label className="new-patient-intake__complaint-field">
              Free-text complaint <small>Required</small>
              <input
                ref={complaintRef}
                value={complaintText}
                placeholder="e.g. chest pressure, cough, ankle injury..."
                autoComplete="off"
                onChange={(event) => setComplaintText(event.target.value)}
                aria-invalid={submitAttempted && !complaintEntered}
              />
            </label>
          </section>

          <section
            className="new-patient-intake__identity-column"
            aria-labelledby="identity-heading"
          >
            <div className="new-patient-intake__section-heading">
              <h3 id="identity-heading">Identity</h3>
              <span>MRN auto-generated</span>
            </div>
            <div className="new-patient-intake__name-row">
              <label>
                First name <small>Required name</small>
                <input
                  value={identity.firstName}
                  autoComplete="given-name"
                  onChange={(event) =>
                    setIdentity((current) => ({ ...current, firstName: event.target.value }))
                  }
                  aria-invalid={submitAttempted && !nameEntered}
                />
              </label>
              <label>
                Last name
                <input
                  value={identity.lastName}
                  autoComplete="family-name"
                  onChange={(event) =>
                    setIdentity((current) => ({ ...current, lastName: event.target.value }))
                  }
                  aria-invalid={submitAttempted && !nameEntered}
                />
              </label>
            </div>
            <label className="new-patient-intake__dob-field">
              DOB <small>{age === null ? 'Age --' : `Age ${age}`}</small>
              <input
                type="date"
                value={identity.dob}
                onChange={(event) =>
                  setIdentity((current) => ({ ...current, dob: event.target.value }))
                }
              />
            </label>
            <div className="new-patient-intake__sex-group" role="group" aria-label="Sex">
              <span>Sex</span>
              <div>
                {SEX_OPTIONS.map((option, index) => {
                  const selected = identity.sex === option.value;
                  const tabbable = selected || (!identity.sex && index === 0);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      data-sex-option={option.value}
                      tabIndex={tabbable ? 0 : -1}
                      aria-pressed={selected}
                      className={selected ? 'new-patient-intake__sex--active' : ''}
                      onClick={() => setIdentity((current) => ({ ...current, sex: option.value }))}
                      onKeyDown={(event) => handleSexKeyDown(event, index)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="new-patient-intake__mrn" aria-label={`MRN ${mrn}`}>
              <span>MRN</span>
              <strong>{mrn}</strong>
              <small>Not editable</small>
            </div>
          </section>
        </div>

        <section className="new-patient-intake__vitals-strip" aria-label="Optional vitals">
          <div className="new-patient-intake__vitals-heading">
            <span>Vitals</span>
            <small>Optional</small>
          </div>
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
                  placeholder="Optional"
                  onChange={(event) =>
                    setVitals((current) => ({ ...current, [field]: event.target.value }))
                  }
                />
              </label>
            );
          })}
        </section>

        <footer className="new-patient-intake__footer">
          <div className="new-patient-intake__priority-panel">
            <button
              type="button"
              className={`new-patient-intake__ctas new-patient-intake__ctas--${selectedPriority.toLowerCase()}`}
              aria-expanded={priorityPickerOpen}
              onClick={() => setPriorityPickerOpen((current) => !current)}
            >
              <span>
                {triageSuggestion.override ? 'Staff CTAS context' : 'Central CTAS suggestion'}
              </span>
              <strong>{CTAS_LABELS[selectedPriority]}</strong>
              <small>{triageSuggestion.reason}</small>
            </button>
            {priorityPickerOpen ? (
              <div
                className="new-patient-intake__priority-options"
                aria-label="Override CTAS priority"
              >
                {Object.values(Priority).map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    className={[
                      priority === autoSuggestion.suggestedPriority
                        ? 'new-patient-intake__priority--suggested'
                        : '',
                      priority === selectedPriority ? 'new-patient-intake__priority--selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => handlePrioritySelect(priority)}
                  >
                    <strong>{priority}</strong>
                    <span>{CTAS_LABELS[priority]}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {submitError ? (
            <p className="new-patient-intake__error" role="alert">
              {submitError}
            </p>
          ) : null}
          <button
            type="submit"
            className="new-patient-intake__add"
            disabled={!canSubmit || isSubmitting}
          >
            <CheckCircle2 size={20} aria-hidden />
            {isSubmitting ? 'Sending...' : 'Send to Central Node'}
          </button>
        </footer>
      </form>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(intakeDialog, document.body) : intakeDialog;
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { PatientFlag, type Patient, type ArrivalMode, type QuickSafetyFlag, type HighRiskComplaintFlagId } from '../../types/emergency';
import { useEmergencyStore } from '../../store/emergencyStore';
import { EMERGENCY_ACTIONS } from '../../config/emergencyRolePermissions';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import { ERROR_RECOVERY_COPY, formatApiRecoveryMessage } from '../../config/errorRecoveryModel';
import {
  DUPLICATE_HIGH_CONFIDENCE_THRESHOLD,
  findDuplicateCandidates,
  type PatientDuplicateCandidate,
} from '../../utils/patientDuplicateDetection';
import {
  getPatientDisplayName,
  isPatientSearchQueryReady,
  rankPatientsBySearch,
} from '../../utils/patientSearch';
import DuplicateReviewAlert from '../verification/DuplicateReviewAlert';
import { RECEPTION_COPY } from './receptionCopy';
import {
  buildReceptionQuickIntakePatient,
  calculateAgeFromDob,
  persistReceptionQuickIntakePatient,
  splitPatientName,
} from '../../services/receptionQuickIntakeService';
import HighRiskComplaintFlagSelector from './HighRiskComplaintFlagSelector';
import './ReceptionQuickIntake.css';

type ReceptionQuickIntakeProps = {
  variant?: 'modal' | 'inline';
  onClose?: () => void;
  onCompleted: (patient: Patient) => void;
  onOpenVerification?: (patientId?: string) => void;
  onProvisionalIntake?: () => void;
  initialSearchQuery?: string;
};

const COMPLAINT_CHIPS = [
  'Chest pain',
  'Breathing difficulty',
  'Injury / trauma',
  'Abdominal pain',
  'Stroke symptoms',
  'Feeling unwell',
] as const;

const ARRIVAL_MODE_OPTIONS: Array<{ id: ArrivalMode; label: string }> = [
  { id: 'walk-in', label: 'Walk-in' },
  { id: 'EMS', label: 'EMS' },
  { id: 'referral', label: 'Referral' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'police', label: 'Police' },
];

const QUICK_SAFETY_OPTIONS: Array<{ id: QuickSafetyFlag; label: string }> = [
  { id: PatientFlag.HighRisk, label: 'High risk' },
  { id: PatientFlag.StrokeCode, label: 'Stroke' },
  { id: PatientFlag.SepsisAlert, label: 'Sepsis' },
  { id: PatientFlag.PsychAlert, label: 'Psych' },
  { id: PatientFlag.Isolation, label: 'Isolation' },
  { id: PatientFlag.DeterioratingNeuro, label: 'Neuro change' },
];

export default function ReceptionQuickIntake({
  variant = 'modal',
  onClose,
  onCompleted,
  onOpenVerification,
  onProvisionalIntake,
  initialSearchQuery = '',
}: ReceptionQuickIntakeProps) {
  const emergencyRole = useEmergencyRolePermissions();
  const patients = useEmergencyStore((state) => state.patients);
  const addPatient = useEmergencyStore((state) => state.addPatient);
  const updatePatient = useEmergencyStore((state) => state.updatePatient);
  const registerArrivalControlForPatient = useEmergencyStore((state) => state.registerArrivalControl);

  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [searchHighlight, setSearchHighlight] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientName, setPatientName] = useState('');
  const [dob, setDob] = useState('');
  const [healthCard, setHealthCard] = useState('');
  const [phone, setPhone] = useState('');
  const [complaint, setComplaint] = useState('');
  const [arrivalMode, setArrivalMode] = useState<ArrivalMode>('walk-in');
  const [quickSafetyFlags, setQuickSafetyFlags] = useState<QuickSafetyFlag[]>([]);
  const [selectedComplaintFlags, setSelectedComplaintFlags] = useState<HighRiskComplaintFlagId[]>([]);
  const [quickNotes, setQuickNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);

  const isInline = variant === 'inline';
  const createPatientPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.createPatient);
  const canCreatePatient = createPatientPresentation.enabled;
  const age = useMemo(() => calculateAgeFromDob(dob), [dob]);
  const parsedName = useMemo(() => splitPatientName(patientName), [patientName]);

  const searchResults = useMemo(() => {
    if (!isPatientSearchQueryReady(searchQuery)) return [];
    return rankPatientsBySearch(patients, searchQuery, 6);
  }, [patients, searchQuery]);

  const duplicateCandidates = useMemo<PatientDuplicateCandidate[]>(() => {
    if (selectedPatient) return [];
    const firstName = parsedName.firstName;
    const lastName = parsedName.lastName;
    if (!firstName && !lastName && !dob && !healthCard.trim()) return [];
    return findDuplicateCandidates(patients, {
      firstName,
      lastName,
      dateOfBirth: dob || undefined,
      healthCardNumber: healthCard.trim() || undefined,
      mrn: healthCard.trim() || undefined,
      phone: phone.trim() || undefined,
    });
  }, [dob, healthCard, parsedName.firstName, parsedName.lastName, patients, phone, selectedPatient]);

  const highConfidenceDuplicate = duplicateCandidates.find(
    (candidate) => candidate.matchScore >= DUPLICATE_HIGH_CONFIDENCE_THRESHOLD,
  );

  const resetForm = useCallback(() => {
    setSelectedPatient(null);
    setSearchQuery('');
    setSearchHighlight(0);
    setPatientName('');
    setDob('');
    setHealthCard('');
    setPhone('');
    setComplaint('');
    setArrivalMode('walk-in');
    setQuickSafetyFlags([]);
    setSelectedComplaintFlags([]);
    setQuickNotes('');
    setSubmitError('');
    setDuplicateAcknowledged(false);
  }, []);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    setSearchHighlight(0);
  }, [searchQuery, searchResults.length]);

  useEffect(() => {
    setDuplicateAcknowledged(false);
  }, [patientName, dob, healthCard, phone, selectedPatient]);

  const applySelectedPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientName(getPatientDisplayName(patient));
    setDob(patient.dob || '');
    setHealthCard(patient.healthCardNumber || patient.healthCard || patient.mrn || '');
    setPhone(patient.phone || patient.mobilePhone || '');
    setSearchQuery('');
    setSearchHighlight(0);
    setSubmitError('');
    window.setTimeout(() => nameRef.current?.focus(), 0);
  };

  const clearSelectedPatient = () => {
    setSelectedPatient(null);
    setPatientName('');
    setSubmitError('');
    searchRef.current?.focus();
  };

  const closeWithConfirm = () => {
    if (!onClose) return;
    const hasDraft = Boolean(
      selectedPatient ||
        searchQuery.trim() ||
        patientName.trim() ||
        dob ||
        healthCard.trim() ||
        phone.trim() ||
        complaint.trim() ||
        quickNotes.trim(),
    );
    if (!hasDraft || window.confirm('Discard this registration?')) onClose();
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (submitting || !canCreatePatient) return;

    const { firstName, lastName } = selectedPatient
      ? { firstName: selectedPatient.firstName || '', lastName: selectedPatient.lastName || '' }
      : splitPatientName(patientName);

    if (!firstName.trim() && !lastName.trim()) {
      setSubmitError('Enter patient name or select an existing chart.');
      return;
    }
    if (!complaint.trim()) {
      setSubmitError('Enter an arrival complaint.');
      return;
    }
    if (!selectedPatient && highConfidenceDuplicate && !duplicateAcknowledged) {
      setSubmitError(
        `Possible duplicate: ${highConfidenceDuplicate.displayName}. Open the existing chart or confirm before creating.`,
      );
      return;
    }

    const patient = buildReceptionQuickIntakePatient(
      {
        firstName,
        lastName,
        dob: dob || undefined,
        healthCard,
        phone,
        complaint,
        arrivalMode,
        quickSafetyFlags,
        selectedComplaintFlags,
        quickNotes,
        existingPatient: selectedPatient,
      },
      { actorId: emergencyRole.role },
    );

    setSubmitting(true);
    setSubmitError('');

    try {
      const { patient: persistedPatient } = await persistReceptionQuickIntakePatient(
        { patients, addPatient, updatePatient },
        patient,
        { isNew: !selectedPatient },
      );

      registerArrivalControlForPatient(persistedPatient.id, { source: 'reception-quick-intake' });

      onCompleted(persistedPatient);
      if (isInline) {
        resetForm();
        searchRef.current?.focus();
      } else {
        onClose?.();
      }
    } catch (error) {
      setSubmitError(
        `${formatApiRecoveryMessage(error, 'registration form')} ${ERROR_RECOVERY_COPY.intakeForm}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!searchResults.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSearchHighlight((current) => Math.min(current + 1, searchResults.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSearchHighlight((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === 'Enter' && searchResults[searchHighlight]) {
      event.preventDefault();
      applySelectedPatient(searchResults[searchHighlight].patient);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape' && onClose) {
      event.preventDefault();
      closeWithConfirm();
      return;
    }
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      event.target instanceof HTMLInputElement &&
      event.target.type !== 'textarea'
    ) {
      event.preventDefault();
      void submit();
    }
  };

  const copy = RECEPTION_COPY.quickIntake;

  const form = (
    <form
      className="reception-quick-intake"
      onSubmit={submit}
      onKeyDown={handleKeyDown}
      id="reception-quick-intake"
    >
      <header className="reception-quick-intake__header">
        <div>
          <h2 id="reception-quick-intake-title">{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        {!isInline && onClose ? (
          <button
            type="button"
            className="reception-quick-intake__close"
            onClick={closeWithConfirm}
            aria-label={copy.closeLabel}
          >
            ×
          </button>
        ) : null}
      </header>

      <div className="reception-quick-intake__body">
        <label className="reception-quick-intake__search">
          <span>{copy.searchLabel}</span>
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={copy.searchPlaceholder}
            autoComplete="off"
            disabled={submitting || Boolean(selectedPatient)}
          />
        </label>

        {selectedPatient ? (
          <div className="reception-quick-intake__selected">
            <span>
              Using chart: <strong>{getPatientDisplayName(selectedPatient)}</strong> ·{' '}
              {selectedPatient.mrn}
            </span>
            <button type="button" onClick={clearSelectedPatient}>
              New patient
            </button>
          </div>
        ) : searchResults.length ? (
          <ul className="reception-quick-intake__search-results" aria-label="Patient search results">
            {searchResults.map(({ patient }, index) => (
              <li key={patient.id}>
                <button
                  type="button"
                  className="reception-quick-intake__search-result"
                  aria-selected={index === searchHighlight}
                  onClick={() => applySelectedPatient(patient)}
                >
                  {getPatientDisplayName(patient)}
                  <small>
                    {patient.mrn} · DOB {patient.dob || '—'} · {patient.state}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {duplicateCandidates.length ? (
          <DuplicateReviewAlert
            candidates={duplicateCandidates}
            acknowledged={duplicateAcknowledged}
            onAcknowledge={() => {
              setDuplicateAcknowledged(true);
              setSubmitError('');
            }}
            onOpenPatient={(patientId: string) => onOpenVerification?.(patientId)}
            onOpenVerification={(patientId: string) => onOpenVerification?.(patientId)}
            onProvisionalIntake={onProvisionalIntake}
          />
        ) : null}

        {!selectedPatient ? (
          <label className="reception-quick-intake__field">
            <span>{copy.patientNameLabel}</span>
            <input
              ref={nameRef}
              value={patientName}
              onChange={(event) => setPatientName(event.target.value)}
              placeholder={copy.patientNamePlaceholder}
              autoComplete="name"
              disabled={submitting}
            />
          </label>
        ) : null}

        <fieldset className="reception-quick-intake__optional">
          <legend>{copy.optionalIdentity}</legend>
          <div className="reception-quick-intake__identity-row">
            <label className="reception-quick-intake__field">
              <span>DOB {dob ? `(age ${age})` : ''}</span>
              <input
                type="date"
                value={dob}
                onChange={(event) => setDob(event.target.value)}
                disabled={submitting}
              />
            </label>
            <label className="reception-quick-intake__field">
              <span>Health card / ID</span>
              <input
                value={healthCard}
                onChange={(event) => setHealthCard(event.target.value)}
                inputMode="numeric"
                autoComplete="off"
                placeholder="If available"
                disabled={submitting}
              />
            </label>
            <label className="reception-quick-intake__field">
              <span>Phone</span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="tel"
                inputMode="tel"
                placeholder="If available"
                disabled={submitting}
              />
            </label>
          </div>
        </fieldset>

        <div className="reception-quick-intake__field">
          <span>Arrival mode</span>
          <div className="reception-quick-intake__chips" role="group" aria-label="Arrival mode">
            {ARRIVAL_MODE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={[
                  'reception-quick-intake__chip',
                  arrivalMode === option.id ? 'reception-quick-intake__chip--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setArrivalMode(option.id)}
                disabled={submitting}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="reception-quick-intake__field">
          <span>Arrival complaint</span>
          <div className="reception-quick-intake__chips" role="group" aria-label="Common complaints">
            {COMPLAINT_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                className={[
                  'reception-quick-intake__chip',
                  complaint === chip ? 'reception-quick-intake__chip--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  setComplaint(chip);
                  setSubmitError('');
                }}
                disabled={submitting}
              >
                {chip}
              </button>
            ))}
          </div>
          <input
            value={complaint}
            onChange={(event) => setComplaint(event.target.value)}
            placeholder="Or type complaint"
            disabled={submitting}
          />
        </div>

        <label className="reception-quick-intake__field">
          <span>Quick notes</span>
          <input
            value={quickNotes}
            onChange={(event) => setQuickNotes(event.target.value)}
            placeholder={copy.quickNotesPlaceholder}
            disabled={submitting}
          />
        </label>

        <details className="reception-quick-intake__advanced">
          <summary>{copy.safetyDetails}</summary>
          <div className="reception-quick-intake__field">
            <span>{RECEPTION_COPY.arrivalControl.safetyFlags}</span>
            <div
              className="reception-quick-intake__chips"
              role="group"
              aria-label={RECEPTION_COPY.arrivalControl.safetyFlags}
            >
              {QUICK_SAFETY_OPTIONS.map((option) => {
                const active = quickSafetyFlags.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={[
                      'reception-quick-intake__chip',
                      active ? 'reception-quick-intake__chip--active' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      setQuickSafetyFlags((current) =>
                        active
                          ? current.filter((flag) => flag !== option.id)
                          : [...current, option.id],
                      );
                    }}
                    disabled={submitting}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <HighRiskComplaintFlagSelector
            complaint={complaint}
            complaintCategory="Other"
            selectedFlagIds={selectedComplaintFlags}
            onChange={setSelectedComplaintFlags}
            disabled={submitting}
          />
        </details>

        {submitError ? (
          <p className="reception-quick-intake__error" role="alert">
            {submitError}
          </p>
        ) : null}
      </div>

      <footer className="reception-quick-intake__footer">
        <button
          type="submit"
          className="reception-quick-intake__submit"
          disabled={submitting || !canCreatePatient}
        >
          {submitting ? copy.submitting : copy.submit}
        </button>
      </footer>
    </form>
  );

  if (isInline) {
    return (
      <div
        ref={rootRef}
        className="reception-quick-intake-inline"
        aria-labelledby="reception-quick-intake-title"
      >
        {form}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="reception-quick-intake-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reception-quick-intake-title"
    >
      {form}
    </div>
  );
}

export function focusReceptionQuickIntake() {
  const form = document.getElementById('reception-quick-intake');
  form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const search = form?.querySelector<HTMLInputElement>('.reception-quick-intake__search input');
  search?.focus();
}

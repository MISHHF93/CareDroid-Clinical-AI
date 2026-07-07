import React, { useMemo, useState } from 'react';
import { Ambulance, Clock3, Send } from 'lucide-react';
import {
  PRE_ARRIVAL_FRAMEWORK_LABELS,
  preArrivalNotificationCompletionPercent,
} from '../../services/preArrivalNotification';
import {
  PRE_ARRIVAL_ETA_PRESETS,
  emptyPreArrivalFormInput,
  submitPreArrivalIntake,
  validatePreArrivalForm,
  type PreArrivalFormInput,
  type PreArrivalIntakeResult,
  type PreArrivalIntakeStore,
} from '../../services/preArrivalMistModel';
import type { EMSSeverity, PreArrivalNotificationFramework, Sex } from '../../types/emergency';
import './PreArrivalForm.css';

type PreArrivalFormProps = {
  canSubmit?: boolean;
  actorName?: string;
  notificationSource?: PreArrivalFormInput['notificationSource'];
  store: PreArrivalIntakeStore;
  onSubmitted?: (result: PreArrivalIntakeResult) => void;
  className?: string;
};

const SEVERITY_OPTIONS: EMSSeverity[] = ['Critical', 'High', 'Moderate', 'Low'];
const SEX_OPTIONS: Sex[] = ['Unknown', 'Male', 'Female', 'Other'];

function TextField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
}) {
  return (
    <label className="pre-arrival-intake__field">
      <span>{label}</span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <small className="pre-arrival-intake__error">{error}</small> : null}
    </label>
  );
}

function NoteField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="pre-arrival-intake__field pre-arrival-intake__field--note">
      <span>{label}</span>
      <textarea
        rows={2}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default function PreArrivalForm({
  canSubmit = true,
  actorName = 'Staff',
  notificationSource = 'staff',
  store,
  onSubmitted,
  className = '',
}: PreArrivalFormProps) {
  const [form, setForm] = useState<PreArrivalFormInput>(() => ({
    ...emptyPreArrivalFormInput(),
    notificationSource,
  }));
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastPostedUnit, setLastPostedUnit] = useState('');

  const validation = useMemo(() => validatePreArrivalForm(form), [form]);
  const completion = preArrivalNotificationCompletionPercent({
    framework: form.framework,
    mist: form.mist,
    sbar: form.sbar,
  });

  const patchForm = (patch: Partial<PreArrivalFormInput>) => {
    setForm((current) => ({ ...current, ...patch }));
    setSubmitError('');
  };

  const switchFramework = (framework: PreArrivalNotificationFramework) => {
    patchForm({ framework });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || submitting) return;

    const nextValidation = validatePreArrivalForm(form);
    if (!nextValidation.ok) {
      setSubmitError(Object.values(nextValidation.errors).filter(Boolean).join(' '));
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const result = submitPreArrivalIntake(store, form, { staffName: actorName });
      setLastPostedUnit(result.arrival.unitId);
      setForm({
        ...emptyPreArrivalFormInput(),
        notificationSource,
      });
      onSubmitted?.(result);
    } catch (error: any) {
      setSubmitError(error instanceof Error ? error.message : 'Could not post pre-arrival');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className={['pre-arrival-intake', className].filter(Boolean).join(' ')}
      aria-label="Structured EMS pre-arrival form"
      onSubmit={handleSubmit}
    >
      <header className="pre-arrival-intake__header">
        <div>
          <p className="pre-arrival-intake__eyebrow">
            <Ambulance size={16} aria-hidden />
            EMS / call-in
          </p>
          <h3>Pre-arrival handoff</h3>
          <p>Structured MIST or SBAR entry posts a placeholder card to the whiteboard with ETA.</p>
        </div>
        <span className="pre-arrival-intake__completion">{completion}% complete</span>
      </header>

      <div className="pre-arrival-intake__dispatch">
        <TextField
          label="Unit"
          value={form.unitId}
          disabled={!canSubmit}
          placeholder="Medic 12"
          error={validation.errors.unitId}
          onChange={(value) => patchForm({ unitId: value, unitName: value })}
        />
        <label className="pre-arrival-intake__field">
          <span>
            <Clock3 size={13} aria-hidden /> ETA (min)
          </span>
          <input
            type="number"
            min={1}
            max={180}
            value={form.etaMinutes}
            disabled={!canSubmit}
            onChange={(event) => patchForm({ etaMinutes: Number(event.target.value) })}
          />
          {validation.errors.etaMinutes ? (
            <small className="pre-arrival-intake__error">{validation.errors.etaMinutes}</small>
          ) : null}
        </label>
        <label className="pre-arrival-intake__field">
          <span>Age</span>
          <input
            type="number"
            min={0}
            max={120}
            value={form.patientAge}
            disabled={!canSubmit}
            onChange={(event) => patchForm({ patientAge: Number(event.target.value) })}
          />
          {validation.errors.patientAge ? (
            <small className="pre-arrival-intake__error">{validation.errors.patientAge}</small>
          ) : null}
        </label>
        <label className="pre-arrival-intake__field">
          <span>Sex</span>
          <select
            value={form.patientSex}
            disabled={!canSubmit}
            onChange={(event) => patchForm({ patientSex: event.target.value as Sex })}
          >
            {SEX_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="pre-arrival-intake__field">
          <span>Acuity</span>
          <select
            value={form.severity}
            disabled={!canSubmit}
            onChange={(event) => patchForm({ severity: event.target.value as EMSSeverity })}
          >
            {SEVERITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="pre-arrival-intake__eta-presets" aria-label="Quick ETA presets">
        {PRE_ARRIVAL_ETA_PRESETS.map((minutes) => (
          <button
            key={minutes}
            type="button"
            className={form.etaMinutes === minutes ? 'is-active' : ''}
            disabled={!canSubmit}
            onClick={() => patchForm({ etaMinutes: minutes })}
          >
            {minutes}m
          </button>
        ))}
      </div>

      <div className="pre-arrival-intake__framework" role="tablist" aria-label="Notification framework">
        {Object.entries(PRE_ARRIVAL_FRAMEWORK_LABELS).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={form.framework === id}
            className={form.framework === id ? 'is-active' : ''}
            disabled={!canSubmit}
            onClick={() => switchFramework(id as PreArrivalNotificationFramework)}
          >
            {id.toUpperCase()}
          </button>
        ))}
      </div>
      <p className="pre-arrival-intake__framework-label">
        {PRE_ARRIVAL_FRAMEWORK_LABELS[form.framework]}
      </p>

      {form.framework === 'mist' ? (
        <div className="pre-arrival-intake__grid">
          <NoteField
            label="Mechanism"
            value={form.mist.mechanism}
            disabled={!canSubmit}
            placeholder="Fall from ladder"
            onChange={(value) => patchForm({ mist: { ...form.mist, mechanism: value } })}
          />
          <NoteField
            label="Injuries"
            value={form.mist.injuries}
            disabled={!canSubmit}
            placeholder="Open tibia fracture"
            onChange={(value) => patchForm({ mist: { ...form.mist, injuries: value } })}
          />
          <NoteField
            label="Signs"
            value={form.mist.signs}
            disabled={!canSubmit}
            placeholder="HR 118, BP 92/58, pale"
            onChange={(value) => patchForm({ mist: { ...form.mist, signs: value } })}
          />
          <NoteField
            label="Treatments"
            value={form.mist.treatments}
            disabled={!canSubmit}
            placeholder="IV access, analgesia, splint applied"
            onChange={(value) => patchForm({ mist: { ...form.mist, treatments: value } })}
          />
        </div>
      ) : (
        <div className="pre-arrival-intake__grid">
          <NoteField
            label="Situation"
            value={form.sbar.situation}
            disabled={!canSubmit}
            placeholder="62M chest pain, diaphoretic"
            onChange={(value) => patchForm({ sbar: { ...form.sbar, situation: value } })}
          />
          <NoteField
            label="Background"
            value={form.sbar.background}
            disabled={!canSubmit}
            placeholder="HTN, no prior cardiac history"
            onChange={(value) => patchForm({ sbar: { ...form.sbar, background: value } })}
          />
          <NoteField
            label="Assessment"
            value={form.sbar.assessment}
            disabled={!canSubmit}
            placeholder="Possible ACS, hypotensive"
            onChange={(value) => patchForm({ sbar: { ...form.sbar, assessment: value } })}
          />
          <NoteField
            label="Recommendation"
            value={form.sbar.recommendation}
            disabled={!canSubmit}
            placeholder="Prepare cardiac workup"
            onChange={(value) => patchForm({ sbar: { ...form.sbar, recommendation: value } })}
          />
        </div>
      )}

      {validation.errors.complaint ? (
        <p className="pre-arrival-intake__error pre-arrival-intake__error--banner" role="alert">
          {validation.errors.complaint}
        </p>
      ) : null}

      <footer className="pre-arrival-intake__footer">
        <div className="pre-arrival-intake__status">
          {lastPostedUnit ? (
            <span className="pre-arrival-intake__posted">
              Posted {lastPostedUnit} to whiteboard — visible to all staff.
            </span>
          ) : (
            <span>Placeholder card appears on the department whiteboard immediately.</span>
          )}
          {submitError ? (
            <span className="pre-arrival-intake__error" role="alert">
              {submitError}
            </span>
          ) : null}
        </div>
        <button
          type="submit"
          className="pre-arrival-intake__submit"
          disabled={!canSubmit || submitting || !validation.ok}
        >
          <Send size={15} aria-hidden />
          {submitting ? 'Posting…' : 'Post to whiteboard'}
        </button>
      </footer>
    </form>
  );
}
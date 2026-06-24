import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { suggestSelfArrivalTriage } from '../../engine/selfArrivalTriageEngine';
import { CARE_STREAMING_LANES } from '../../config/edOperationalStandards';
import type { Sex } from '../../types/emergency';
import {
  SELF_CHECKIN_ALLERGY_CHIPS,
  SELF_CHECKIN_COMPLAINT_CHIPS,
  SELF_CHECKIN_STEPS,
  buildSelfCheckinPatient,
  createEmptySelfCheckinForm,
  lookupProvincialHealthRecord,
  validateSelfCheckinStep,
  type SelfCheckinBuildResult,
  type SelfCheckinFormData,
  type SelfCheckinStep,
} from '../../services/selfCheckinService';
import type { IntakeHandoffResult } from '../../services/receptionHandoff';
import './SelfCheckin.css';

export type SelfCheckinProps = {
  kioskMode?: boolean;
  onComplete?: (result: SelfCheckinBuildResult) => void;
  onCancel?: () => void;
  handoff?: IntakeHandoffResult | null;
  showStaffHandoffLink?: boolean;
};

function navigateTo(path: string): void {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

const STEP_LABELS: Record<SelfCheckinStep, string> = {
  demographics: 'About you',
  visit: 'Reason for visit',
  allergies: 'Allergies',
  review: 'Review and check in',
};

const SEX_OPTIONS: Array<{ value: Sex; label: string }> = [
  { value: 'Female', label: 'Female' },
  { value: 'Male', label: 'Male' },
  { value: 'Other', label: 'Other' },
  { value: 'Unspecified', label: 'Prefer not to say' },
];

function stepIndex(step: SelfCheckinStep): number {
  return SELF_CHECKIN_STEPS.indexOf(step);
}

export default function SelfCheckin({
  kioskMode = true,
  onComplete,
  onCancel,
  handoff = null,
  showStaffHandoffLink = false,
}: SelfCheckinProps) {
  const [step, setStep] = useState<SelfCheckinStep>('demographics');
  const [form, setForm] = useState<SelfCheckinFormData>(createEmptySelfCheckinForm);
  const [error, setError] = useState('');
  const [integrationMessage, setIntegrationMessage] = useState('');
  const [submitted, setSubmitted] = useState<SelfCheckinBuildResult | null>(null);

  const currentStepIndex = stepIndex(step);
  const progressPercent = ((currentStepIndex + 1) / SELF_CHECKIN_STEPS.length) * 100;

  const triagePreview = useMemo(
    () =>
      suggestSelfArrivalTriage({
        firstName: form.firstName,
        lastName: form.lastName,
        dateOfBirth: form.dateOfBirth,
        phone: form.phone,
        complaintText: form.complaint,
        complaintCategory: 'Self-arrival',
      }),
    [form.complaint, form.dateOfBirth, form.firstName, form.lastName, form.phone],
  );

  const laneLabel =
    CARE_STREAMING_LANES.find((lane) => lane.id === triagePreview.streamingLane)?.label ||
    triagePreview.streamingLane;

  useEffect(() => {
    if (step !== 'demographics') return;
    if (!form.firstName.trim() && !form.lastName.trim() && !form.dateOfBirth) return;

    let cancelled = false;
    void lookupProvincialHealthRecord({
      firstName: form.firstName,
      lastName: form.lastName,
      dateOfBirth: form.dateOfBirth,
    }).then((result) => {
      if (!cancelled) setIntegrationMessage(result.message);
    });

    return () => {
      cancelled = true;
    };
  }, [form.dateOfBirth, form.firstName, form.lastName, step]);

  const patchForm = (patch: Partial<SelfCheckinFormData>) => {
    setForm((current) => ({ ...current, ...patch }));
    setError('');
  };

  const goNext = () => {
    const validationError = validateSelfCheckinStep(step, form);
    if (validationError) {
      setError(validationError);
      return;
    }

    const next = SELF_CHECKIN_STEPS[currentStepIndex + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
    const previous = SELF_CHECKIN_STEPS[currentStepIndex - 1];
    if (previous) {
      setStep(previous);
      setError('');
    } else {
      onCancel?.();
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateSelfCheckinStep('allergies', form);
    if (validationError) {
      setError(validationError);
      return;
    }

    const result = buildSelfCheckinPatient(form);
    setSubmitted(result);
    onComplete?.(result);
  };

  const rootClassName = kioskMode ? 'self-checkin self-checkin--kiosk' : 'self-checkin';

  if (submitted) {
    return (
      <main className={rootClassName} aria-labelledby="self-checkin-title">
        <section className="self-checkin__confirmation" role="status">
          <h2 id="self-checkin-title">You are checked in</h2>
          <p>
            Please take a seat in the waiting area. A nurse will review your information and call you
            for triage.
          </p>
          <dl className="self-checkin__review-list">
            <div>
              <dt>Name</dt>
              <dd>
                {submitted.patient.firstName} {submitted.patient.lastName}
              </dd>
            </div>
            <div>
              <dt>Reason for visit</dt>
              <dd>{submitted.patient.arrival?.chiefComplaint}</dd>
            </div>
            <div>
              <dt>Provisional acuity</dt>
              <dd>{submitted.triagePreview.esiLabel}</dd>
            </div>
            <div>
              <dt>Suggested care area</dt>
              <dd>{submitted.laneLabel}</dd>
            </div>
          </dl>
          <p className="self-checkin__disclaimer">{submitted.disclaimer}</p>
          {handoff ? (
            <p className="self-checkin__handoff-status" role="status">
              Your chart is now on the emergency department whiteboard with a waiting-for-triage
              status. A nurse will call you when triage is ready.
            </p>
          ) : null}
          {showStaffHandoffLink && handoff?.whiteboardPath ? (
            <button
              type="button"
              className="self-checkin__button self-checkin__button--primary self-checkin__handoff-link"
              onClick={() => navigateTo(handoff.whiteboardPath)}
            >
              Open department whiteboard
            </button>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className={rootClassName} aria-labelledby="self-checkin-title">
      <header className="self-checkin__hero">
        <span>CareDroid digital front door</span>
        <h1 id="self-checkin-title">Emergency self check-in</h1>
        <p>Four quick steps — usually under two minutes. A nurse confirms everything before triage.</p>
      </header>

      {integrationMessage ? (
        <div className="self-checkin__integration" role="note">
          <strong>Health record lookup:</strong>
          <span>{integrationMessage}</span>
        </div>
      ) : null}

      <div className="self-checkin__progress" aria-label="Check-in progress">
        <div className="self-checkin__progress-track">
          <div className="self-checkin__progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="self-checkin__progress-label">
          <span>
            Step {currentStepIndex + 1} of {SELF_CHECKIN_STEPS.length}
          </span>
          <span>{STEP_LABELS[step]}</span>
        </div>
      </div>

      <form
        className="self-checkin__panel"
        onSubmit={step === 'review' ? handleSubmit : (event) => event.preventDefault()}
      >
        {step === 'demographics' ? (
          <>
            <h2>Tell us who you are</h2>
            <p>Basic details help staff find your chart faster.</p>
            <div className="self-checkin__grid self-checkin__grid--two">
              <label className="self-checkin__field">
                First name
                <input
                  value={form.firstName}
                  onChange={(event) => patchForm({ firstName: event.target.value })}
                  autoComplete="given-name"
                  autoFocus
                />
              </label>
              <label className="self-checkin__field">
                Last name
                <input
                  value={form.lastName}
                  onChange={(event) => patchForm({ lastName: event.target.value })}
                  autoComplete="family-name"
                />
              </label>
            </div>
            <div className="self-checkin__grid self-checkin__grid--two">
              <label className="self-checkin__field">
                Date of birth
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(event) => patchForm({ dateOfBirth: event.target.value })}
                />
              </label>
              <label className="self-checkin__field">
                Sex
                <select
                  value={form.sex}
                  onChange={(event) => patchForm({ sex: event.target.value as Sex })}
                >
                  {SEX_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="self-checkin__field">
              Mobile phone (optional)
              <input
                value={form.phone}
                onChange={(event) => patchForm({ phone: event.target.value })}
                autoComplete="tel"
                inputMode="tel"
              />
            </label>
          </>
        ) : null}

        {step === 'visit' ? (
          <>
            <h2>What brings you in today?</h2>
            <p>Describe your main concern in your own words.</p>
            <div className="self-checkin__chips" role="group" aria-label="Common reasons for visit">
              {SELF_CHECKIN_COMPLAINT_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className={`self-checkin__chip${form.complaint === chip ? ' self-checkin__chip--active' : ''}`}
                  onClick={() => patchForm({ complaint: chip })}
                >
                  {chip}
                </button>
              ))}
            </div>
            <label className="self-checkin__field">
              Reason for visit
              <textarea
                rows={4}
                value={form.complaint}
                onChange={(event) => patchForm({ complaint: event.target.value })}
                placeholder="Example: chest pressure for 30 minutes, worse with exertion."
                required
              />
            </label>
            <section className="self-checkin__preview" aria-live="polite">
              <h3>Provisional routing (staff will confirm)</h3>
              <p>
                <strong>{triagePreview.esiLabel}</strong> · Suggested area: <strong>{laneLabel}</strong>
              </p>
              <p>{triagePreview.reason}</p>
            </section>
          </>
        ) : null}

        {step === 'allergies' ? (
          <>
            <h2>Any allergies?</h2>
            <p>This helps clinicians avoid medications that could harm you.</p>
            <div className="self-checkin__chips" role="group" aria-label="Allergy shortcuts">
              <button
                type="button"
                className={`self-checkin__chip${form.noKnownAllergies ? ' self-checkin__chip--active' : ''}`}
                onClick={() =>
                  patchForm({
                    noKnownAllergies: true,
                    allergyDetails: '',
                  })
                }
              >
                No known allergies
              </button>
              {SELF_CHECKIN_ALLERGY_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className={`self-checkin__chip${
                    form.allergyDetails.includes(chip) ? ' self-checkin__chip--active' : ''
                  }`}
                  onClick={() =>
                    patchForm({
                      noKnownAllergies: false,
                      allergyDetails: form.allergyDetails.includes(chip)
                        ? form.allergyDetails
                            .split(',')
                            .map((entry) => entry.trim())
                            .filter((entry) => entry && entry !== chip)
                            .join(', ')
                        : [form.allergyDetails, chip].filter(Boolean).join(', '),
                    })
                  }
                >
                  {chip}
                </button>
              ))}
            </div>
            <label className="self-checkin__field">
              Allergy details
              <textarea
                rows={3}
                value={form.allergyDetails}
                onChange={(event) =>
                  patchForm({
                    allergyDetails: event.target.value,
                    noKnownAllergies: false,
                  })
                }
                placeholder="Medication, food, or other allergies and reactions."
                disabled={form.noKnownAllergies}
              />
            </label>
          </>
        ) : null}

        {step === 'review' ? (
          <>
            <h2>Review and finish</h2>
            <p>Confirm your details, then check in to the triage queue.</p>
            <dl className="self-checkin__review-list">
              <div>
                <dt>Name</dt>
                <dd>
                  {form.firstName || '—'} {form.lastName || '—'}
                </dd>
              </div>
              <div>
                <dt>Date of birth</dt>
                <dd>{form.dateOfBirth || 'Not provided'}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{form.phone.trim() || 'Not provided'}</dd>
              </div>
              <div>
                <dt>Reason for visit</dt>
                <dd>{form.complaint.trim()}</dd>
              </div>
              <div>
                <dt>Allergies</dt>
                <dd>
                  {form.noKnownAllergies
                    ? 'No known allergies reported'
                    : form.allergyDetails.trim() || 'Not listed'}
                </dd>
              </div>
            </dl>
            <section className="self-checkin__preview" aria-live="polite">
              <h3>After check-in</h3>
              <p>
                Suggested acuity <strong>{triagePreview.esiLabel}</strong> · Care area{' '}
                <strong>{laneLabel}</strong>
              </p>
            </section>
            <p className="self-checkin__disclaimer">{triagePreview.envelope.rationale.join(' ')}</p>
          </>
        ) : null}

        {error ? (
          <p className="self-checkin__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="self-checkin__actions">
          <button type="button" className="self-checkin__button self-checkin__button--secondary" onClick={goBack}>
            {currentStepIndex === 0 ? 'Cancel' : 'Back'}
          </button>
          {step === 'review' ? (
            <button type="submit" className="self-checkin__button self-checkin__button--primary">
              Complete check-in
            </button>
          ) : (
            <button
              type="button"
              className="self-checkin__button self-checkin__button--primary"
              onClick={goNext}
            >
              Continue
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
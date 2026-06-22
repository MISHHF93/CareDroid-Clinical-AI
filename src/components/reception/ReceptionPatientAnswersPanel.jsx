import React, { useMemo } from 'react';
import {
  buildReceptionPatientAnswersSnapshot,
  formatReceptionCheckpointTime,
} from '../../services/receptionPatientAnswersModel';
import { RECEPTION_COPY } from './receptionCopy';
import './ReceptionPatientAnswersPanel.css';

export default function ReceptionPatientAnswersPanel({
  patients = [],
  capacity = null,
  referrals = [],
  staff = [],
  workflowLogs = [],
  settings = null,
  focusedPatientId = null,
  className = '',
  onSelectPatient,
}) {
  const snapshot = useMemo(
    () =>
      buildReceptionPatientAnswersSnapshot({
        patients,
        capacity,
        referrals,
        staff,
        workflowLogs,
        settings,
        focusedPatientId,
        updatedAt: capacity?.updatedAt ?? null,
      }),
    [capacity, focusedPatientId, patients, referrals, settings, staff, workflowLogs],
  );

  return (
    <section
      className={['reception-patient-answers', className].filter(Boolean).join(' ')}
      aria-label={RECEPTION_COPY.patientAnswers.title}
    >
      <header className="reception-patient-answers__header">
        <p className="reception-patient-answers__eyebrow">{RECEPTION_COPY.patientAnswers.eyebrow}</p>
        <h2>{RECEPTION_COPY.patientAnswers.title}</h2>
        <p className="reception-patient-answers__intro">{RECEPTION_COPY.patientAnswers.intro}</p>
      </header>

      <div className="reception-patient-answers__grid">
        <article className="reception-patient-answers__card" aria-label="Waiting room public display status">
          <h3>{RECEPTION_COPY.patientAnswers.publicDisplayTitle}</h3>
          <p className="reception-patient-answers__summary" role="status">
            {snapshot.department.publicStatusSummary}
          </p>
          <dl className="reception-patient-answers__metrics">
            <div>
              <dt>{RECEPTION_COPY.patientAnswers.crowdLevel}</dt>
              <dd>
                <strong>{snapshot.department.crowdLevelLabel}</strong>
                <span>{snapshot.department.crowdLevelDetail}</span>
              </dd>
            </div>
            <div>
              <dt>{snapshot.department.waitRangeLabel}</dt>
              <dd>
                <strong>{snapshot.department.waitRangeValue}</strong>
                <span>{snapshot.department.waitDisclaimer}</span>
              </dd>
            </div>
          </dl>
          {snapshot.department.statusLines.length ? (
            <ul className="reception-patient-answers__status-lines">
              {snapshot.department.statusLines.map((line) => (
                <li key={line.id}>
                  <span>{line.message}</span>
                  <strong aria-hidden="true">{line.count}</strong>
                </li>
              ))}
            </ul>
          ) : null}
        </article>

        <article className="reception-patient-answers__card" aria-label={RECEPTION_COPY.patientAnswers.whyWaitTitle}>
          <h3>{RECEPTION_COPY.patientAnswers.whyWaitTitle}</h3>
          <p className="reception-patient-answers__script">{snapshot.department.waitExplanation}</p>
        </article>

        <article className="reception-patient-answers__card reception-patient-answers__card--wide" aria-label={RECEPTION_COPY.patientAnswers.processTitle}>
          <h3>{RECEPTION_COPY.patientAnswers.processTitle}</h3>
          <ol className="reception-patient-answers__process-steps">
            {snapshot.processSteps.map((step) => (
              <li
                key={step.id}
                className={step.isCurrent ? 'reception-patient-answers__process-step--current' : ''}
              >
                <span className="reception-patient-answers__step-number" aria-hidden="true">
                  {step.order}
                </span>
                <div>
                  <strong>{step.label}</strong>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>
      </div>

      {snapshot.focusedPatient ? (
        <article
          className="reception-patient-answers__focused"
          aria-label={`Patient answers for ${snapshot.focusedPatient.displayName}`}
        >
          <header>
            <h3>{snapshot.focusedPatient.displayName}</h3>
            <p>{snapshot.focusedPatient.publicStatusMessage}</p>
          </header>

          <div className="reception-patient-answers__questions">
            <section>
              <h4>{RECEPTION_COPY.patientAnswers.whereAmI}</h4>
              <p>{snapshot.focusedPatient.shareable.whereInProcess}</p>
              <small>{snapshot.focusedPatient.processStageLabel}</small>
            </section>
            <section>
              <h4>{RECEPTION_COPY.patientAnswers.whatNext}</h4>
              <p>{snapshot.focusedPatient.shareable.whatHappensNext}</p>
            </section>
            <section>
              <h4>{RECEPTION_COPY.patientAnswers.nextCheckpoint}</h4>
              <p>
                <strong>{snapshot.focusedPatient.nextCheckpointLabel}</strong>
                {snapshot.focusedPatient.nextCheckpointAt
                  ? ` · ${formatReceptionCheckpointTime(snapshot.focusedPatient.nextCheckpointAt)}`
                  : null}
              </p>
              {snapshot.focusedPatient.nextCheckpointDetail ? (
                <small>{snapshot.focusedPatient.nextCheckpointDetail}</small>
              ) : null}
              {snapshot.focusedPatient.communicationOverdue ? (
                <p className="reception-patient-answers__overdue" role="status">
                  {RECEPTION_COPY.patientAnswers.contactOverdue}
                </p>
              ) : null}
            </section>
            <section>
              <h4>{RECEPTION_COPY.patientAnswers.whyWaitTitle}</h4>
              <p>{snapshot.focusedPatient.shareable.whyWaitLong}</p>
            </section>
          </div>

          {onSelectPatient ? (
            <button
              type="button"
              className="reception-patient-answers__open-patient"
              onClick={() => onSelectPatient(snapshot.focusedPatient.patientId)}
            >
              {RECEPTION_COPY.patientAnswers.openPatient}
            </button>
          ) : null}
        </article>
      ) : (
        <p className="reception-patient-answers__hint">{RECEPTION_COPY.patientAnswers.selectPatientHint}</p>
      )}
    </section>
  );
}

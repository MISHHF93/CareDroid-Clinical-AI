import React, { useMemo } from 'react';
import { resolvePatientQueueTiming } from '../../services/patientQueueTimingModel';
import './PatientQueueTimingBadge.css';

export default function PatientQueueTimingBadge({
  patient,
  settings = null,
  now = null,
  layout = 'inline',
  showScenario = false,
  showOnlineDot = true,
}) {
  const timing = useMemo(
    () =>
      resolvePatientQueueTiming(patient, {
        settings,
        now: now || undefined,
      }),
    [patient, settings, now],
  );

  if (!timing) return null;

  return (
    <span
      className={[
        'patient-queue-timing',
        layout === 'row' ? 'patient-queue-timing--row' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={timing.staffDetail}
      aria-label={`${timing.scenarioLabel}. ${timing.elapsedLabel} elapsed. ${timing.remainingLabel}.`}
    >
      {showOnlineDot && timing.isOnline ? (
        <span className="patient-queue-timing__online" data-tone={timing.tone} aria-hidden />
      ) : null}
      <span className="patient-queue-timing__elapsed">{timing.elapsedLabel}</span>
      <span className="patient-queue-timing__remaining" data-tone={timing.tone}>
        {timing.remainingLabel}
      </span>
      {showScenario ? (
        <span className="patient-queue-timing__scenario">{timing.scenarioLabel}</span>
      ) : null}
    </span>
  );
}

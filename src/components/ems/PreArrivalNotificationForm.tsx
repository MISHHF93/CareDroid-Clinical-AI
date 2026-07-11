import React, { useMemo, useState } from 'react';
import {
  PRE_ARRIVAL_FRAMEWORK_LABELS,
  emptyMISTNotification,
  emptySBARNotification,
  mergePreArrivalNotificationPatch,
  preArrivalNotificationCompletionPercent,
} from '../../services/preArrivalNotification';
import './PreArrivalNotificationForm.css';

function Field({ label, value, onChange, disabled, rows = 2 }) {
  return (
    <label className="pre-arrival-form__field">
      <span>{label}</span>
      <textarea
        rows={rows}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default function PreArrivalNotificationForm({
  notification,
  canEdit = true,
  actorName = 'Staff',
  onUpdate,
  className = '',
}) {
  const [framework, setFramework] = useState(notification?.framework || 'mist');
  const resolved = useMemo(
    () =>
      notification || {
        framework,
        mist: emptyMISTNotification(),
        sbar: emptySBARNotification(),
      },
    [framework, notification],
  );
  const completion = preArrivalNotificationCompletionPercent(resolved);

  const applyPatch = (patch) => {
    if (!canEdit || !onUpdate) return;
    onUpdate(
      mergePreArrivalNotificationPatch(resolved, patch, { staffName: actorName }),
    );
  };

  const switchFramework = (nextFramework) => {
    setFramework(nextFramework);
    applyPatch({ framework: nextFramework });
  };

  return (
    <section
      className={['pre-arrival-form', className].filter(Boolean).join(' ')}
      aria-label="Structured pre-arrival notification"
    >
      <header className="pre-arrival-form__header">
        <div>
          <h4>Pre-arrival notification</h4>
          <p>Structured EMS / call-in handoff — reduces transcription errors at arrival.</p>
        </div>
        <span className="pre-arrival-form__completion">{completion}% complete</span>
      </header>

      <div className="pre-arrival-form__framework" role="tablist" aria-label="Notification framework">
        {Object.entries(PRE_ARRIVAL_FRAMEWORK_LABELS).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            {...((framework === id) ? { 'aria-selected': 'true' as const } : { 'aria-selected': 'false' as const })}
            className={framework === id ? 'is-active' : ''}
            disabled={!canEdit}
            onClick={() => switchFramework(id)}
          >
            {id.toUpperCase()}
          </button>
        ))}
      </div>
      <p className="pre-arrival-form__framework-label">{PRE_ARRIVAL_FRAMEWORK_LABELS[framework]}</p>

      {framework === 'mist' ? (
        <div className="pre-arrival-form__grid">
          <Field
            label="Mechanism"
            value={resolved.mist?.mechanism || ''}
            disabled={!canEdit}
            onChange={(value) => applyPatch({ mist: { ...resolved.mist, mechanism: value } })}
          />
          <Field
            label="Injuries"
            value={resolved.mist?.injuries || ''}
            disabled={!canEdit}
            onChange={(value) => applyPatch({ mist: { ...resolved.mist, injuries: value } })}
          />
          <Field
            label="Signs"
            value={resolved.mist?.signs || ''}
            disabled={!canEdit}
            onChange={(value) => applyPatch({ mist: { ...resolved.mist, signs: value } })}
          />
          <Field
            label="Treatments"
            value={resolved.mist?.treatments || ''}
            disabled={!canEdit}
            onChange={(value) => applyPatch({ mist: { ...resolved.mist, treatments: value } })}
          />
        </div>
      ) : (
        <div className="pre-arrival-form__grid">
          <Field
            label="Situation"
            value={resolved.sbar?.situation || ''}
            disabled={!canEdit}
            onChange={(value) => applyPatch({ sbar: { ...resolved.sbar, situation: value } })}
          />
          <Field
            label="Background"
            value={resolved.sbar?.background || ''}
            disabled={!canEdit}
            onChange={(value) => applyPatch({ sbar: { ...resolved.sbar, background: value } })}
          />
          <Field
            label="Assessment"
            value={resolved.sbar?.assessment || ''}
            disabled={!canEdit}
            onChange={(value) => applyPatch({ sbar: { ...resolved.sbar, assessment: value } })}
          />
          <Field
            label="Recommendation"
            value={resolved.sbar?.recommendation || ''}
            disabled={!canEdit}
            onChange={(value) => applyPatch({ sbar: { ...resolved.sbar, recommendation: value } })}
          />
        </div>
      )}
    </section>
  );
}
import React, { useMemo, useState } from 'react';
import useRovingTabs from '../../hooks/useRovingTabs';
import {
  PRE_ARRIVAL_FRAMEWORK_LABELS,
  emptyMISTNotification,
  emptySBARNotification,
  mergePreArrivalNotificationPatch,
  preArrivalNotificationCompletionPercent,
} from '../../services/preArrivalNotification';
import './PreArrivalNotificationForm.css';

function Field({ label, value, onChange, disabled, rows = 2, disabledReason }) {
  return (
    <label className="pre-arrival-form__field">
      <span>{label}</span>
      <textarea
        rows={rows}
        value={value}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default function PreArrivalNotificationForm({
  notification,
  canEdit = true,
  disabledReason = 'Editing unavailable for this role',
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
    onUpdate(mergePreArrivalNotificationPatch(resolved, patch, { staffName: actorName }));
  };

  const switchFramework = (nextFramework) => {
    setFramework(nextFramework);
    applyPatch({ framework: nextFramework });
  };

  const { tabListRef, onKeyDown, tabIndexFor } = useRovingTabs({
    ids: Object.keys(PRE_ARRIVAL_FRAMEWORK_LABELS),
    activeId: framework,
    onSelect: switchFramework,
  });

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

      <div
        className="pre-arrival-form__framework"
        role="tablist"
        aria-label="Notification framework"
        ref={tabListRef}
      >
        {Object.entries(PRE_ARRIVAL_FRAMEWORK_LABELS).map(([id]) => (
          <button
            key={id}
            type="button"
            role="tab"
            tabIndex={tabIndexFor(id)}
            onKeyDown={onKeyDown}
            {...(framework === id
              ? { 'aria-selected': 'true' as const }
              : { 'aria-selected': 'false' as const })}
            className={framework === id ? 'is-active' : ''}
            onClick={() => switchFramework(id)}
          >
            {id.toUpperCase()}
          </button>
        ))}
      </div>
      <p className="pre-arrival-form__framework-label">{PRE_ARRIVAL_FRAMEWORK_LABELS[framework]}</p>
      {!canEdit ? (
        <p className="pre-arrival-form__role-notice" role="status">
          {disabledReason} — fields below are read-only, but you can still switch tabs to view
          either framework.
        </p>
      ) : null}

      {framework === 'mist' ? (
        <div className="pre-arrival-form__grid">
          <Field
            label="Mechanism"
            value={resolved.mist?.mechanism || ''}
            disabled={!canEdit}
            disabledReason={disabledReason}
            onChange={(value) => applyPatch({ mist: { ...resolved.mist, mechanism: value } })}
          />
          <Field
            label="Injuries"
            value={resolved.mist?.injuries || ''}
            disabled={!canEdit}
            disabledReason={disabledReason}
            onChange={(value) => applyPatch({ mist: { ...resolved.mist, injuries: value } })}
          />
          <Field
            label="Signs"
            value={resolved.mist?.signs || ''}
            disabled={!canEdit}
            disabledReason={disabledReason}
            onChange={(value) => applyPatch({ mist: { ...resolved.mist, signs: value } })}
          />
          <Field
            label="Treatments"
            value={resolved.mist?.treatments || ''}
            disabled={!canEdit}
            disabledReason={disabledReason}
            onChange={(value) => applyPatch({ mist: { ...resolved.mist, treatments: value } })}
          />
        </div>
      ) : (
        <div className="pre-arrival-form__grid">
          <Field
            label="Situation"
            value={resolved.sbar?.situation || ''}
            disabled={!canEdit}
            disabledReason={disabledReason}
            onChange={(value) => applyPatch({ sbar: { ...resolved.sbar, situation: value } })}
          />
          <Field
            label="Background"
            value={resolved.sbar?.background || ''}
            disabled={!canEdit}
            disabledReason={disabledReason}
            onChange={(value) => applyPatch({ sbar: { ...resolved.sbar, background: value } })}
          />
          <Field
            label="Assessment"
            value={resolved.sbar?.assessment || ''}
            disabled={!canEdit}
            disabledReason={disabledReason}
            onChange={(value) => applyPatch({ sbar: { ...resolved.sbar, assessment: value } })}
          />
          <Field
            label="Recommendation"
            value={resolved.sbar?.recommendation || ''}
            disabled={!canEdit}
            disabledReason={disabledReason}
            onChange={(value) => applyPatch({ sbar: { ...resolved.sbar, recommendation: value } })}
          />
        </div>
      )}
    </section>
  );
}

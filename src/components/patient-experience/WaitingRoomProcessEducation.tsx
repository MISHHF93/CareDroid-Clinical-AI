import React, { useMemo } from 'react';
import { buildWaitingRoomProcessEducationSnapshot } from '../../services/waitingRoomProcessEducation';
import './WaitingRoomProcessEducation.css';

export default function WaitingRoomProcessEducation({
  audience = 'patient',
  className = '',
  variant = 'default',
}) {
  const snapshot = useMemo(
    () => buildWaitingRoomProcessEducationSnapshot(audience as any),
    [audience],
  );

  return (
    <section
      className={[
        'waiting-room-process-education',
        variant === 'compact' ? 'waiting-room-process-education--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={snapshot.title}
    >
      <header className="waiting-room-process-education__header">
        <p className="waiting-room-process-education__eyebrow">
          {audience === 'staff' ? 'Patient education' : 'Your visit'}
        </p>
        <h3>{snapshot.title}</h3>
        <p className="waiting-room-process-education__intro">{snapshot.intro}</p>
      </header>

      <ol className="waiting-room-process-education__steps">
        {snapshot.steps.map((step) => (
          <li key={step.id} className="waiting-room-process-education__step">
            <span className="waiting-room-process-education__step-number" aria-hidden="true">
              {step.order}
            </span>
            <div className="waiting-room-process-education__step-copy">
              <strong>{step.label}</strong>
              <p>{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

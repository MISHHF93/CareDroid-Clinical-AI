import React from 'react';
import { resolveWhatHappensNext } from '../../services/whatHappensNextGuidance';
import WhatHappensNextBadge from './WhatHappensNextBadge';
import './WhatHappensNextBadge.css';

export default function WhatHappensNextPanel({
  patient,
  referrals = [],
  staff = [],
  className = '',
}) {
  const snapshot = patient ? resolveWhatHappensNext(patient, { referrals, staff }) : null;
  if (!snapshot) return null;

  return (
    <section
      className={['what-next-panel', className].filter(Boolean).join(' ')}
      aria-label="What happens next guidance"
    >
      <header className="what-next-panel__header">
        <div>
          <h4>What happens next</h4>
          <p>Operational guidance for staff — human review required.</p>
        </div>
        <WhatHappensNextBadge patient={patient} referrals={referrals} staff={staff} compact />
      </header>
      <p className="what-next-panel__guidance">{snapshot.guidance}</p>
      <p className="what-next-panel__detail">{snapshot.staffDetail}</p>
      {snapshot.secondarySteps.length ? (
        <div className="what-next-panel__secondary" aria-label="Secondary next steps">
          {snapshot.secondarySteps.map((step) => (
            <span key={step.stepId}>{step.label}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

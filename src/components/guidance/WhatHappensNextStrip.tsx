import React, { useMemo } from 'react';
import {
  WHAT_HAPPENS_NEXT_STEPS,
  resolveWhatHappensNext,
  summarizeWhatHappensNextBoard,
} from '../../services/whatHappensNextGuidance';
import WhatHappensNextBadge from './WhatHappensNextBadge';
import './WhatHappensNextBadge.css';

export default function WhatHappensNextStrip({
  patients = [] as any[],
  referrals = [] as any[],
  staff = [] as any[],
  className = '',
  now = undefined as number | undefined,
}) {
  // HEAL-183: without `now`, the reassessment-due bucket count only recomputes when
  // `patients`/`referrals`/`staff` change -- a patient can enter that bucket purely from time
  // passing and this strip would never notice until an unrelated mutation forced a re-render.
  const nowDate = useMemo(() => (now ? new Date(now) : undefined), [now]);
  const counts = useMemo(
    () => summarizeWhatHappensNextBoard(patients, { referrals, staff, now: nowDate }),
    [nowDate, patients, referrals, staff],
  );

  const visible = WHAT_HAPPENS_NEXT_STEPS.filter((step) => counts[step.id] > 0);
  if (!visible.length) return null;

  return (
    <section
      className={['what-next-strip', className].filter(Boolean).join(' ')}
      aria-label="What happens next summary"
    >
      <header className="what-next-strip__header">
        <div>
          <p className="what-next-strip__eyebrow">Operational guidance</p>
          <h3>What happens next</h3>
          <p className="what-next-strip__subtitle">
            Expected next steps across arrival and waiting flow patients.
          </p>
        </div>
      </header>
      <div className="what-next-strip__counts">
        {visible.map((step) => {
          const samplePatient = patients.find(
            (patient) =>
              resolveWhatHappensNext(patient, { referrals, staff, now: nowDate })?.stepId ===
              step.id,
          );
          return (
            <div key={step.id} className="what-next-strip__count">
              <strong>{counts[step.id]}</strong>
              {samplePatient ? (
                <WhatHappensNextBadge
                  patient={samplePatient}
                  referrals={referrals}
                  staff={staff}
                  compact
                />
              ) : (
                <span>{step.shortLabel}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

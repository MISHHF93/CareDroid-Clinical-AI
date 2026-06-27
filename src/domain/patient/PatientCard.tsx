import React from 'react';
import type { Patient } from '../../types/emergency';
import { AcuityBadge } from './AcuityBadge';
import { WaitTimer } from './WaitTimer';
import { PatientFlagStrip } from './PatientFlagStrip';
import { VitalsSnapshot } from './VitalsSnapshot';
import './patient.css';

type PatientCardProps = {
  patient: Patient;
  onClick?: (patient: Patient) => void;
  showVitals?: boolean;
  tabIndex?: number;
  className?: string;
};

export function PatientCard({ patient, onClick, showVitals = false, tabIndex = 0, className }: PatientCardProps) {
  const { firstName, lastName, mrn, age, sex, priority, arrivalTime, chiefComplaint, complaint, flags, vitals } = patient;
  const name = `${firstName} ${lastName}`;
  const latestVitals = vitals.length > 0 ? vitals[vitals.length - 1] : null;
  const p = String(priority).toUpperCase();

  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) { e.preventDefault(); onClick(patient); }
  };

  return (
    <article
      role="button"
      tabIndex={tabIndex}
      className={['cd-patient-card', `cd-patient-card--${p.toLowerCase()}`, className ?? ''].filter(Boolean).join(' ')}
      onClick={() => onClick?.(patient)}
      onKeyDown={handleKey}
      aria-label={`${name}, ${p}, ${chiefComplaint ?? complaint}`}
    >
      <div className="cd-patient-card__top">
        <div className="cd-patient-card__identity">
          <span className="cd-patient-card__name">{name}</span>
          <span className="cd-patient-card__meta">
            {age}y {sex} · MRN {mrn}
          </span>
        </div>
        <AcuityBadge priority={priority} />
      </div>

      <div className="cd-patient-card__mid">
        <span className="cd-patient-card__complaint">{chiefComplaint ?? complaint}</span>
        {flags.length > 0 && <PatientFlagStrip flags={flags} max={2} />}
      </div>

      {showVitals && latestVitals && (
        <VitalsSnapshot vitals={latestVitals} />
      )}

      <div className="cd-patient-card__bottom">
        <WaitTimer arrivalTime={arrivalTime} />
        <span className="cd-patient-card__meta" style={{ textTransform: 'capitalize' }}>
          {patient.state.toLowerCase()}
        </span>
      </div>
    </article>
  );
}

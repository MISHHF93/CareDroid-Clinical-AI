import React from 'react';
import type { Patient } from '../../types/emergency';
import { AcuityBadge } from './AcuityBadge';
import { DispositionChip } from './DispositionChip';
import { PatientFlagStrip } from './PatientFlagStrip';
import { WaitTimer } from './WaitTimer';
import { PatientJourneyTracker } from './PatientJourneyTracker';
import './patient.css';

type PatientHeaderProps = {
  patient: Patient;
  actions?: React.ReactNode;
  className?: string;
};

export function PatientHeader({ patient, actions, className }: PatientHeaderProps) {
  const name = `${patient.firstName} ${patient.lastName}`;
  return (
    <header className={['cd-patient-header', className ?? ''].filter(Boolean).join(' ')}>
      <AcuityBadge priority={patient.priority} size="lg" />
      <div className="cd-patient-header__main">
        <h1 className="cd-patient-header__name">{name}</h1>
        <div className="cd-patient-header__meta">
          <span className="cd-patient-header__meta-item">{patient.age}y {patient.sex}</span>
          <span className="cd-patient-header__meta-item">MRN {patient.mrn}</span>
          <DispositionChip state={patient.state} />
          <WaitTimer arrivalTime={patient.arrivalTime} />
          {patient.flags.length > 0 && <PatientFlagStrip flags={patient.flags} max={4} />}
        </div>
        <p style={{ margin: 0, fontSize: 'var(--cd-text-sm)', color: 'var(--cd-text-secondary)' }}>
          {patient.chiefComplaint ?? patient.complaint}
        </p>
        <PatientJourneyTracker patient={patient} />
      </div>
      {actions && <div className="cd-patient-header__actions">{actions}</div>}
    </header>
  );
}

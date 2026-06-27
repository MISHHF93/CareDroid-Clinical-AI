import React from 'react';
import type { Patient } from '../../types/emergency';
import { AcuityBadge } from '../patient/AcuityBadge';
import { WaitTimer } from '../patient/WaitTimer';
import { PatientFlagStrip } from '../patient/PatientFlagStrip';
import { PatientJourneyTracker } from '../patient/PatientJourneyTracker';
import './queue.css';

type QueueRowProps = {
  patient: Patient;
  rank?: number;
  onClick?: (patient: Patient) => void;
  className?: string;
};

export function QueueRow({ patient, rank, onClick, className }: QueueRowProps) {
  const name = `${patient.firstName} ${patient.lastName}`;

  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) { e.preventDefault(); onClick(patient); }
  };

  return (
    <div
      role="row"
      tabIndex={0}
      className={['cd-queue-row', className ?? ''].filter(Boolean).join(' ')}
      onClick={() => onClick?.(patient)}
      onKeyDown={handleKey}
      aria-label={`${name}, priority ${patient.priority}`}
    >
      <span role="cell" className="cd-queue-row__rank">{rank ?? '-'}</span>
      <span role="cell" className="cd-queue-row__acuity">
        <AcuityBadge priority={patient.priority} size="sm" />
      </span>
      <span role="cell" className="cd-queue-row__name">{name}</span>
      <span role="cell" className="cd-queue-row__meta">{patient.chiefComplaint ?? patient.complaint}</span>
      <span role="cell" className="cd-queue-row__journey">
        <PatientJourneyTracker patient={patient} variant="compact" />
      </span>
      <div role="cell" className="cd-queue-row__end">
        {patient.flags.length > 0 && <PatientFlagStrip flags={patient.flags} max={1} />}
        <WaitTimer arrivalTime={patient.arrivalTime} />
      </div>
    </div>
  );
}

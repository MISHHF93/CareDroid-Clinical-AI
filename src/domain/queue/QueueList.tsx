import React from 'react';
import type { Patient } from '../../types/emergency';
import { QueueRow } from './QueueRow';
import { EmptyState } from '../../components/data-display/EmptyState';

type QueueListProps = {
  patients: Patient[];
  onSelect?: (patient: Patient) => void;
  className?: string;
};

export function QueueList({ patients, onSelect, className }: QueueListProps) {
  if (patients.length === 0) {
    return <EmptyState title="Queue empty" description="No patients currently waiting." />;
  }

  return (
    <div
      role="table"
      aria-label="Patient queue"
      aria-rowcount={patients.length + 1}
      className={['cd-queue-list', className ?? ''].filter(Boolean).join(' ')}
    >
      <div role="rowgroup" className="cd-queue-list__head">
        <div role="row" className="cd-queue-list__header-row">
          <span role="columnheader">Rank</span>
          <span role="columnheader">Acuity</span>
          <span role="columnheader">Patient</span>
          <span role="columnheader">Complaint</span>
          <span role="columnheader">Journey</span>
          <span role="columnheader">Status</span>
        </div>
      </div>
      <div role="rowgroup">
        {patients.map((p, i) => (
          <QueueRow key={p.id} patient={p} rank={i + 1} onClick={onSelect} />
        ))}
      </div>
    </div>
  );
}

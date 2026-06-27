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
    <div role="table" aria-label="Patient queue" className={className}>
      {patients.map((p, i) => (
        <QueueRow key={p.id} patient={p} rank={i + 1} onClick={onSelect} />
      ))}
    </div>
  );
}

import React, { useState } from 'react';
import { useEmergencyStore } from '../../store/emergencyStore';
import { useTriageQueue } from './useTriageQueue';
import { QueueHeader } from '../../domain/queue/QueueHeader';
import { QueueList } from '../../domain/queue/QueueList';
import { BottleneckAlert } from '../../domain/queue/BottleneckAlert';
import type { Patient } from '../../types/emergency';

const FILTERS = [
  { label: 'All', value: null },
  { label: 'P1', value: 'P1' },
  { label: 'P2', value: 'P2' },
  { label: 'P3', value: 'P3' },
];

type TriageQueueFeatureProps = {
  onSelectPatient?: (patient: Patient) => void;
};

export function TriageQueueFeature({ onSelectPatient }: TriageQueueFeatureProps) {
  const [filter, setFilter] = useState<string | null>(null);
  const { patients, criticalCount, activeAlerts } = useTriageQueue(filter);
  const setSelected = useEmergencyStore((s) => s.selectPatient);

  function handleSelect(patient: Patient) {
    setSelected(patient.id);
    onSelectPatient?.(patient);
  }

  const bottleneck = activeAlerts.find((a) => a.type === 'Capacity' || a.type === 'Queue');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <QueueHeader name="Triage Queue" count={patients.length} criticalCount={criticalCount} />

      <div style={{ display: 'flex', gap: 'var(--cd-space-2)', padding: 'var(--cd-space-2) var(--cd-space-4)', borderBottom: '1px solid var(--cd-border-subtle)' }}>
        {FILTERS.map((f) => (
          <button
            key={String(f.value)}
            onClick={() => setFilter(f.value)}
            style={{
              padding: '2px var(--cd-space-3)',
              borderRadius: 'var(--cd-radius-full)',
              border: '1px solid',
              borderColor: filter === f.value ? 'var(--cd-brand-bg)' : 'var(--cd-border-subtle)',
              background: filter === f.value ? 'var(--cd-brand-bg-subtle)' : 'transparent',
              color: filter === f.value ? 'var(--cd-brand-fg)' : 'var(--cd-text-secondary)',
              fontSize: 'var(--cd-text-xs)',
              fontWeight: 'var(--cd-font-medium)',
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {bottleneck && (
        <div style={{ padding: 'var(--cd-space-2) var(--cd-space-4)' }}>
          <BottleneckAlert title={bottleneck.title} subtitle={bottleneck.message} severity={bottleneck.severity === 'Critical' ? 'critical' : 'warning'} />
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <QueueList patients={patients} onSelect={handleSelect} />
      </div>
    </div>
  );
}

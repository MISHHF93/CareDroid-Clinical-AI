import React from 'react';
import { useEmsModule } from './useEmsModule';
import { AmbulanceCard } from '../../domain/ems/AmbulanceCard';
import { EmptyState } from '../../components/data-display/EmptyState';
import type { EmsUnit } from '../../types/emergency';

type EmsModuleFeatureProps = {
  onSelectUnit?: (unit: EmsUnit) => void;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 'var(--cd-text-xs)', fontWeight: 'var(--cd-font-bold)', textTransform: 'uppercase', letterSpacing: 'var(--cd-tracking-wider)', color: 'var(--cd-text-secondary)', padding: 'var(--cd-space-3) var(--cd-space-4) var(--cd-space-1)' }}>
      {children}
    </div>
  );
}

export function EmsModuleFeature({ onSelectUnit }: EmsModuleFeatureProps) {
  const { inbound, arrived, available, patientName } = useEmsModule();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto' }}>
      <SectionLabel>Inbound ({inbound.length})</SectionLabel>
      {inbound.length === 0
        ? <EmptyState title="No inbound units" />
        : inbound.map((u) => (
          <div key={u.id} style={{ padding: 'var(--cd-space-2) var(--cd-space-4)' }}>
            <AmbulanceCard unit={u} patientName={patientName(u.patientId)} onClick={onSelectUnit} />
          </div>
        ))
      }

      <SectionLabel>On Scene / Arrived ({arrived.length})</SectionLabel>
      {arrived.length === 0
        ? <EmptyState title="None on scene" />
        : arrived.map((u) => (
          <div key={u.id} style={{ padding: 'var(--cd-space-2) var(--cd-space-4)' }}>
            <AmbulanceCard unit={u} patientName={patientName(u.patientId)} onClick={onSelectUnit} />
          </div>
        ))
      }

      {available.length > 0 && (
        <>
          <SectionLabel>Available ({available.length})</SectionLabel>
          {available.map((u) => (
            <div key={u.id} style={{ padding: 'var(--cd-space-2) var(--cd-space-4)' }}>
              <AmbulanceCard unit={u} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

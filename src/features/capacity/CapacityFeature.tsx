import React from 'react';
import { useCapacity } from './useCapacity';
import { KPIStrip } from '../../domain/staff/KPIStrip';
import { FlowCapacityBar } from '../../domain/queue/FlowCapacityBar';
import { AcuityBadge } from '../../domain/patient/AcuityBadge';

export function CapacityFeature() {
  const { capacity, byPriority, occupancyPct, totalRooms, kpis, queues } = useCapacity();

  const crisis = occupancyPct >= 90;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cd-space-5)', padding: 'var(--cd-space-4)' }}>
      {crisis && (
        <div role="alert" style={{ background: 'var(--cd-danger-bg-subtle)', border: '1px solid var(--cd-danger-border)', borderRadius: 'var(--cd-radius-lg)', padding: 'var(--cd-space-3) var(--cd-space-4)', color: 'var(--cd-danger-text)', fontWeight: 'var(--cd-font-semibold)', fontSize: 'var(--cd-text-sm)' }}>
          🚨 Capacity Crisis — {occupancyPct}% occupied · Activate surge protocol
        </div>
      )}

      <KPIStrip kpis={kpis} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cd-space-3)' }}>
        <FlowCapacityBar label="Room Occupancy" current={capacity.occupiedRooms} total={totalRooms} />
        {queues.slice(0, 4).map((q) => {
          const pids = (q as any).patientIds as unknown[];
          const count = Array.isArray(pids) ? pids.length : 0;
          return (
          <FlowCapacityBar
            key={q.id}
            label={q.name ?? String(q.type)}
            current={count}
            total={Math.max(count, Math.ceil(count * 1.5), 1)}
          />
          );
        })}
      </div>

      <div>
        <div style={{ fontSize: 'var(--cd-text-xs)', fontWeight: 'var(--cd-font-bold)', textTransform: 'uppercase', letterSpacing: 'var(--cd-tracking-wider)', color: 'var(--cd-text-secondary)', marginBottom: 'var(--cd-space-2)' }}>
          By Acuity
        </div>
        <div style={{ display: 'flex', gap: 'var(--cd-space-4)', flexWrap: 'wrap' }}>
          {(['P1', 'P2', 'P3', 'P4', 'P5'] as const).map((p) => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 'var(--cd-space-2)' }}>
              <AcuityBadge priority={p} />
              <span style={{ fontFamily: 'var(--cd-font-mono)', fontWeight: 'var(--cd-font-bold)', fontSize: 'var(--cd-text-md)' }}>
                {byPriority[p]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

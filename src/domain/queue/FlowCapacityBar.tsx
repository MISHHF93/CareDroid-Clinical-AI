import React from 'react';
import './queue.css';

type FlowCapacityBarProps = {
  label: string;
  current: number;
  total: number;
  className?: string;
};

export function FlowCapacityBar({ label, current, total, className }: FlowCapacityBarProps) {
  const pct = total > 0 ? Math.min(1, current / total) : 0;
  const pctDisplay = Math.round(pct * 100);
  const tone = pct >= 0.9 ? 'critical' : pct >= 0.75 ? 'warning' : '';

  return (
    <div className={['cd-capacity-bar', className ?? ''].filter(Boolean).join(' ')}>
      <div className="cd-capacity-bar__label">
        <span className="cd-capacity-bar__name">{label}</span>
        <span className="cd-capacity-bar__pct">{current}/{total} · {pctDisplay}%</span>
      </div>
      <div className="cd-capacity-bar__track" role="progressbar" aria-valuenow={pctDisplay} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={['cd-capacity-bar__fill', tone ? `cd-capacity-bar__fill--${tone}` : ''].filter(Boolean).join(' ')}
          style={{ width: `${pctDisplay}%` }}
        />
      </div>
    </div>
  );
}

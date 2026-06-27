import React from 'react';
import { Priority, PriorityLabel } from '../../types/emergency';
import './patient.css';

type AcuityBadgeProps = {
  priority: Priority | string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const PRIORITY_CLASS: Record<string, string> = {
  P1: 'cd-acuity--p1', P2: 'cd-acuity--p2',
  P3: 'cd-acuity--p3', P4: 'cd-acuity--p4', P5: 'cd-acuity--p5',
};

export function AcuityBadge({ priority, showLabel = false, size = 'md', className }: AcuityBadgeProps) {
  const p = String(priority).toUpperCase() as Priority;
  const label = PriorityLabel[p as Priority] ?? p;
  return (
    <span
      className={['cd-acuity', PRIORITY_CLASS[p] ?? 'cd-acuity--p5', `cd-acuity--${size}`, className ?? ''].filter(Boolean).join(' ')}
      aria-label={`Priority ${p}: ${label}`}
      title={label}
    >
      {p}
      {showLabel && <span className="cd-acuity__label">{label}</span>}
    </span>
  );
}

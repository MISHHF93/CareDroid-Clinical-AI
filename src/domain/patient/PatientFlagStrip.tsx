import React from 'react';
import type { PatientFlagRecord, PatientFlagType } from '../../types/emergency';
import { PatientFlagChip } from './PatientFlagChip';

type PatientFlagStripProps = {
  flags: Array<PatientFlagType | PatientFlagRecord>;
  max?: number;
  className?: string;
};

export function PatientFlagStrip({ flags, max = 3, className }: PatientFlagStripProps) {
  const visible = flags.slice(0, max);
  const overflow = flags.length - visible.length;

  return (
    <span className={['cd-flag-strip', className ?? ''].filter(Boolean).join(' ')}
      style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
      {visible.map((f, i) => (
        <PatientFlagChip key={i} flag={f} />
      ))}
      {overflow > 0 && (
        <span style={{ fontSize: 'var(--cd-text-xs)', color: 'var(--cd-text-secondary)' }}>
          +{overflow}
        </span>
      )}
    </span>
  );
}

import React from 'react';
import type { PatientState } from '../../types/emergency';
import './patient.css';

const DONE_STATES = new Set(['Discharge', 'Admission', 'Deceased']);
const ACTIVE_STATES = new Set(['Disposition', 'Orders', 'Results', 'Assessment']);

type DispositionChipProps = {
  state: PatientState | string;
  label?: string;
  className?: string;
};

export function DispositionChip({ state, label, className }: DispositionChipProps) {
  const tone = DONE_STATES.has(state) ? 'done' : ACTIVE_STATES.has(state) ? 'active' : '';
  return (
    <span className={['cd-disposition', tone ? `cd-disposition--${tone}` : '', className ?? ''].filter(Boolean).join(' ')}>
      {label ?? state}
    </span>
  );
}

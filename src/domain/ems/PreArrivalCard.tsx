import React from 'react';
import type { EmsUnit, Priority } from '../../types/emergency';
import { AcuityBadge } from '../patient/AcuityBadge';
import './ems.css';

type PreArrivalCardProps = {
  unit: EmsUnit;
  chiefComplaint?: string;
  age?: number;
  sex?: string;
  acuity?: Priority;
  className?: string;
};

export function PreArrivalCard({ unit, chiefComplaint, age, sex, acuity, className }: PreArrivalCardProps) {
  return (
    <div className={['cd-pre-arrival', className ?? ''].filter(Boolean).join(' ')}>
      <div className="cd-pre-arrival__head">
        <span className="cd-pre-arrival__label">Incoming · Unit {unit.unitNumber}</span>
        {unit.etaMinutes != null && (
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--cd-font-mono)', fontSize: 'var(--cd-text-sm)', fontWeight: 'var(--cd-font-bold)', color: 'var(--cd-info-text)' }}>
            ETA {unit.etaMinutes}m
          </span>
        )}
      </div>
      <div className="cd-pre-arrival__cc">{chiefComplaint ?? 'Unknown complaint'}</div>
      <div className="cd-pre-arrival__meta">
        {age != null && `${age}y`}{sex ? ` ${sex}` : ''}
      </div>
      {acuity && <AcuityBadge priority={acuity} showLabel />}
    </div>
  );
}

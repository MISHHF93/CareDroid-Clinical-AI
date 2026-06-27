import React from 'react';
import type { EmsUnit } from '../../types/emergency';
import { AcuityBadge } from '../patient/AcuityBadge';
import './ems.css';

type AmbulanceCardProps = {
  unit: EmsUnit;
  patientName?: string;
  onClick?: (unit: EmsUnit) => void;
  className?: string;
};

export function AmbulanceCard({ unit, patientName, onClick, className }: AmbulanceCardProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={['cd-ambulance-card', className ?? ''].filter(Boolean).join(' ')}
      onClick={() => onClick?.(unit)}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onClick) { e.preventDefault(); onClick(unit); }}}
    >
      <div className="cd-ambulance-card__top">
        <span className="cd-ambulance-card__unit">Unit {unit.unitNumber}</span>
        <span className={`cd-ambulance-card__status cd-ambulance-card__status--${unit.status}`}>{unit.status}</span>
        {unit.etaMinutes != null && (
          <span className="cd-ambulance-card__eta">ETA {unit.etaMinutes}m</span>
        )}
      </div>
      {patientName && <div className="cd-ambulance-card__patient">{patientName}</div>}
      {unit.acuity && <AcuityBadge priority={unit.acuity} showLabel size="sm" />}
    </div>
  );
}

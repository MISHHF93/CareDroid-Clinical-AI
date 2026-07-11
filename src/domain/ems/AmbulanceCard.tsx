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
  const classNames = ['cd-ambulance-card', className ?? ''].filter(Boolean).join(' ');
  const body = (
    <>
      <div className="cd-ambulance-card__top">
        <span className="cd-ambulance-card__unit">Unit {unit.unitNumber}</span>
        <span className={`cd-ambulance-card__status cd-ambulance-card__status--${unit.status}`}>{unit.status}</span>
        {unit.etaMinutes != null && (
          <span className="cd-ambulance-card__eta">ETA {unit.etaMinutes}m</span>
        )}
      </div>
      {patientName && <div className="cd-ambulance-card__patient">{patientName}</div>}
      {unit.acuity && <AcuityBadge priority={unit.acuity} showLabel size="sm" />}
    </>
  );

  // Static role only when interactive (Edge Tools rejects dynamic ARIA roles).
  if (onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        className={classNames}
        onClick={() => onClick(unit)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(unit);
          }
        }}
      >
        {body}
      </div>
    );
  }
  return <div className={classNames}>{body}</div>;
}

import { useMemo } from 'react';
import type { ActiveShift, Patient, Room, Staff } from '../../types/emergency';
import {
  buildDepartmentStaffBarSnapshot,
  type DepartmentStaffBarSnapshot,
} from '../../services/departmentStaffBarModel';
import './DepartmentStaffBar.css';

export type DepartmentStaffBarProps = {
  staff: Staff[];
  patients: Patient[];
  rooms?: Room[];
  activeShift?: ActiveShift | null;
  snapshot?: DepartmentStaffBarSnapshot;
  compact?: boolean;
  className?: string;
};

function StaffCard({ entry }: { entry: DepartmentStaffBarSnapshot['entries'][number] }) {
  return (
    <article
      className={`department-staff-bar__card${entry.isCharge ? ' department-staff-bar__card--charge' : ''}`}
      aria-label={`${entry.name}, ${entry.title}`}
    >
      <div className="department-staff-bar__card-head">
        <div>
          <h3 className="department-staff-bar__name">{entry.name}</h3>
          <p className="department-staff-bar__title">{entry.title}</p>
        </div>
        {entry.isCharge ? <span className="department-staff-bar__badge">Charge</span> : null}
      </div>
      <div
        className="department-staff-bar__responsibilities"
        aria-label="Assigned responsibilities"
      >
        {entry.responsibilities.map((responsibility) => (
          <span key={`${entry.staffId}-${responsibility}`} className="department-staff-bar__chip">
            {responsibility}
          </span>
        ))}
      </div>
    </article>
  );
}

export default function DepartmentStaffBar({
  staff,
  patients,
  rooms,
  activeShift,
  snapshot: snapshotProp,
  compact = false,
  className = '',
}: DepartmentStaffBarProps) {
  const snapshot = useMemo(
    () =>
      snapshotProp ||
      buildDepartmentStaffBarSnapshot({
        staff,
        patients,
        rooms,
        activeShift,
      }),
    [activeShift, patients, rooms, snapshotProp, staff],
  );

  return (
    <section
      className={['department-staff-bar', compact ? 'department-staff-bar--compact' : '', className]
        .filter(Boolean)
        .join(' ')}
      aria-label="On-duty departmental staff overview"
    >
      <div className="department-staff-bar__header">
        <p className="department-staff-bar__eyebrow">On-duty team</p>
        <span className="department-staff-bar__meta">
          {snapshot.shiftLabel} · {snapshot.onDutyCount} clinician
          {snapshot.onDutyCount === 1 ? '' : 's'} on shift
        </span>
      </div>

      {snapshot.entries.length ? (
        <div className="department-staff-bar__track" role="list">
          {snapshot.entries.map((entry) => (
            <div key={entry.staffId} role="listitem">
              <StaffCard entry={entry} />
            </div>
          ))}
        </div>
      ) : (
        <p className="department-staff-bar__empty" role="status">
          No on-duty clinicians are configured for this shift.
        </p>
      )}
    </section>
  );
}

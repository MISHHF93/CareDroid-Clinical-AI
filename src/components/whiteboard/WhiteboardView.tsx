import { useMemo, useState } from 'react';
import type { ActiveShift, Patient, Room, Staff } from '../../types/emergency';
import DepartmentStaffBar from './DepartmentStaffBar';
import PatientCard, { type PatientCardLayout } from '../PatientCard';
import {
  applyWhiteboardViewFilters,
  buildWhiteboardPhysicianOptions,
  buildWhiteboardRoomOptions,
  buildWhiteboardZoneOptions,
  DEFAULT_WHITEBOARD_VIEW_FILTERS,
  sortWhiteboardViewPatients,
  toggleWhiteboardSort,
  type WhiteboardSortColumn,
  type WhiteboardViewFilters,
  type WhiteboardZoneId,
} from '../../services/whiteboardViewModel';
import WhiteboardPatientRowHeader from './WhiteboardPatientRowHeader';
import './WhiteboardView.css';

type PatientCardWorkflowProfile = 'none' | 'charge' | 'physician';

export type WhiteboardViewProps = {
  patients: Patient[];
  rooms: Room[];
  staff: Staff[];
  activeShift?: ActiveShift | null;
  workflowProfile?: PatientCardWorkflowProfile;
  readOnlyDisplay?: boolean;
  layout?: PatientCardLayout;
  gridPadding?: number;
  boardTitle?: string;
};

export default function WhiteboardView({
  patients,
  rooms,
  staff,
  activeShift = null,
  workflowProfile = 'none',
  readOnlyDisplay = false,
  layout = 'row',
  gridPadding = 4,
  boardTitle = 'Emergency Department Whiteboard',
}: WhiteboardViewProps) {
  const [filters, setFilters] = useState<WhiteboardViewFilters>(DEFAULT_WHITEBOARD_VIEW_FILTERS);

  const zoneOptions = useMemo(
    () => buildWhiteboardZoneOptions(patients, rooms),
    [patients, rooms],
  );

  const roomOptions = useMemo(
    () => buildWhiteboardRoomOptions(patients, rooms, filters.zoneId),
    [filters.zoneId, patients, rooms],
  );

  const physicianOptions = useMemo(
    () => buildWhiteboardPhysicianOptions(patients, staff),
    [patients, staff],
  );

  const displayPatients = useMemo(() => {
    const filtered = applyWhiteboardViewFilters(patients, rooms, {
      ...filters,
      quickFilter: 'all',
    });
    return sortWhiteboardViewPatients(filtered, filters);
  }, [filters, patients, rooms]);

  const hasColumnFilters =
    filters.zoneId !== 'all' || filters.roomId !== 'all' || filters.physicianId !== 'all';

  const handleZoneChange = (zoneId: WhiteboardZoneId) => {
    setFilters((current) => ({
      ...current,
      zoneId,
      roomId: 'all',
    }));
  };

  const handleSortColumn = (column: WhiteboardSortColumn) => {
    setFilters((current) => ({
      ...current,
      ...toggleWhiteboardSort(current, column),
    }));
  };

  const clearColumnFilters = () => {
    setFilters((current) => ({
      ...current,
      zoneId: 'all',
      roomId: 'all',
      physicianId: 'all',
    }));
  };

  return (
    <section
      className="whiteboard-view"
      aria-label="Emergency department patient whiteboard"
      style={{ padding: gridPadding }}
    >
      <header className="whiteboard-view__frame-header">
        <div className="whiteboard-view__title-block">
          <h2 className="whiteboard-view__title">{boardTitle}</h2>
          <p className="whiteboard-view__subtitle">
            {displayPatients.length} of {patients.length} patients on board
          </p>
        </div>
        <div className="whiteboard-view__live-badge" role="status">
          Live board
        </div>
      </header>

      <DepartmentStaffBar
        staff={staff}
        patients={patients}
        rooms={rooms}
        activeShift={activeShift}
        compact
      />

      <div className="whiteboard-view__toolbar" aria-label="Whiteboard column filters">
        <label className="whiteboard-view__filter">
          <span className="whiteboard-view__filter-label">Zone</span>
          <select
            className="whiteboard-view__select"
            value={filters.zoneId}
            onChange={(event) => handleZoneChange(event.target.value as WhiteboardZoneId)}
            aria-label="Filter by zone"
          >
            {zoneOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({option.count})
              </option>
            ))}
          </select>
        </label>

        <label className="whiteboard-view__filter">
          <span className="whiteboard-view__filter-label">Room</span>
          <select
            className="whiteboard-view__select"
            value={filters.roomId}
            onChange={(event) =>
              setFilters((current) => ({ ...current, roomId: event.target.value }))
            }
            aria-label="Filter by room"
          >
            {roomOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({option.count})
              </option>
            ))}
          </select>
        </label>

        <label className="whiteboard-view__filter">
          <span className="whiteboard-view__filter-label">Attending</span>
          <select
            className="whiteboard-view__select"
            value={filters.physicianId}
            onChange={(event) =>
              setFilters((current) => ({ ...current, physicianId: event.target.value }))
            }
            aria-label="Filter by attending physician"
          >
            {physicianOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({option.count})
              </option>
            ))}
          </select>
        </label>

        {hasColumnFilters ? (
          <button
            type="button"
            className="whiteboard-view__clear-filters"
            onClick={clearColumnFilters}
          >
            Clear column filters
          </button>
        ) : null}
      </div>

      <div className="whiteboard-view__surface">
        <div className="whiteboard-view__patient-list emergency-whiteboard-page__patient-list">
          <WhiteboardPatientRowHeader
            sortColumn={filters.sortColumn}
            sortDirection={filters.sortDirection}
            onSortColumn={handleSortColumn}
          />
          {displayPatients.length > 0 ? (
            displayPatients.map((patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                layout={layout}
                workflowProfile={workflowProfile}
                readOnlyDisplay={readOnlyDisplay}
              />
            ))
          ) : (
            <div className="whiteboard-view__filtered-empty" role="status">
              No patients match the current zone, room, or attending filters.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
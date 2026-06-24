import type {
  WhiteboardSortColumn,
  WhiteboardSortDirection,
} from '../../services/whiteboardViewModel';
import './WhiteboardPatientRowHeader.css';

type SortableColumn = {
  id: WhiteboardSortColumn;
  label: string;
  className?: string;
};

const SORTABLE_COLUMNS: SortableColumn[] = [
  { id: 'triage', label: 'Triage', className: 'whiteboard-patient-row-header__cell--triage' },
  { id: 'patient', label: 'Patient' },
];

const STATIC_COLUMNS = ['Age / Sex', 'Arrival', 'Chief complaint', 'Wait', 'Reassess', 'State'] as const;

const SORTABLE_TAIL: SortableColumn[] = [
  { id: 'wait', label: 'Wait' },
  { id: 'reassess', label: 'Reassess' },
  { id: 'state', label: 'State' },
];

type WhiteboardPatientRowHeaderProps = {
  sortColumn?: WhiteboardSortColumn;
  sortDirection?: WhiteboardSortDirection;
  onSortColumn?: (column: WhiteboardSortColumn) => void;
};

function sortIndicator(
  column: WhiteboardSortColumn,
  activeColumn?: WhiteboardSortColumn,
  direction?: WhiteboardSortDirection,
): string {
  if (activeColumn !== column) return '↕';
  return direction === 'asc' ? '↑' : '↓';
}

function SortableHeaderCell({
  column,
  sortColumn,
  sortDirection,
  onSortColumn,
}: {
  column: SortableColumn;
  sortColumn?: WhiteboardSortColumn;
  sortDirection?: WhiteboardSortDirection;
  onSortColumn?: (column: WhiteboardSortColumn) => void;
}) {
  const active = sortColumn === column.id;

  if (!onSortColumn) {
    return (
      <span
        className={`whiteboard-patient-row-header__cell${column.className ? ` ${column.className}` : ''}`}
      >
        {column.label}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`whiteboard-patient-row-header__sort${column.className ? ` ${column.className}` : ''}${
        active ? ' whiteboard-patient-row-header__sort--active' : ''
      }`}
      onClick={() => onSortColumn(column.id)}
      aria-sort={active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span>{column.label}</span>
      <span className="whiteboard-patient-row-header__sort-indicator" aria-hidden>
        {sortIndicator(column.id, sortColumn, sortDirection)}
      </span>
    </button>
  );
}

export default function WhiteboardPatientRowHeader({
  sortColumn,
  sortDirection,
  onSortColumn,
}: WhiteboardPatientRowHeaderProps) {
  return (
    <div className="whiteboard-patient-row-header" role="row">
      {SORTABLE_COLUMNS.map((column) => (
        <SortableHeaderCell
          key={column.id}
          column={column}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSortColumn={onSortColumn}
        />
      ))}
      <span className="whiteboard-patient-row-header__cell">{STATIC_COLUMNS[0]}</span>
      <span className="whiteboard-patient-row-header__cell">{STATIC_COLUMNS[1]}</span>
      <span
        className="whiteboard-patient-row-header__cell whiteboard-patient-row-header__cell--complaint"
      >
        {STATIC_COLUMNS[2]}
      </span>
      {SORTABLE_TAIL.map((column) => (
        <SortableHeaderCell
          key={column.id}
          column={column}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSortColumn={onSortColumn}
        />
      ))}
    </div>
  );
}
import { useEffect, useMemo, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import type { Patient } from '../../types/emergency';
import {
  resolveReceptionQueueRowModel,
  type ReceptionQueueRowAction,
} from './receptionAttentionModel';
import ReceptionAttentionStrip from './ReceptionAttentionStrip';
import type { ReceptionAttentionRow, ReceptionAttentionSnapshot } from './receptionAttentionModel';

/** "578" -> "9h 38m" so long waits read as a duration, not a raw minute count. */
function formatWaitDisplay(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 60) return `${Math.max(0, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours >= 24) return '>24h';
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export type ReceptionOperationalRailProps = {
  queue: Patient[];
  attention: ReceptionAttentionSnapshot;
  selectedPatient: Patient | null;
  onSelectPatient: (patientId: string) => void;
  onAttentionSelect: (row: ReceptionAttentionRow) => void;
  onRowAction: (patientId: string, action: ReceptionQueueRowAction) => void;
  patientDisplayName: (patient: Patient) => string;
  queueStatus: (patient: Patient) => string;
  nextStep: (patient: Patient) => string;
  waitMinutes: (patient: Patient) => number;
  isHighRiskPatient: (patient: Patient) => boolean;
  activeQueueTab: string;
  emptyQueueMessage: string;
  queueTabs?: Array<{
    id: string;
    label: string;
    count?: number;
    active: boolean;
    onClick: () => void;
  }>;
};

type AcuityFilterKey = 'all' | 'high-risk' | 'triage-ready' | 'long-wait';

export default function ReceptionOperationalRail({
  queue,
  attention,
  selectedPatient,
  onSelectPatient,
  onAttentionSelect,
  onRowAction,
  patientDisplayName,
  queueStatus,
  nextStep,
  waitMinutes,
  isHighRiskPatient,
  activeQueueTab,
  emptyQueueMessage,
  queueTabs,
}: ReceptionOperationalRailProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [acuityFilter, setAcuityFilter] = useState<AcuityFilterKey>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Reset pagination when search query or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, acuityFilter, activeQueueTab]);

  const filteredQueue = useMemo(() => {
    let result = queue;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((p) => {
        const name = patientDisplayName(p).toLowerCase();
        const mrn = (p.mrn || '').toLowerCase();
        const complaint = (p.chiefComplaint || p.complaint || '').toLowerCase();
        return name.includes(q) || mrn.includes(q) || complaint.includes(q);
      });
    }
    if (acuityFilter === 'high-risk') {
      result = result.filter(isHighRiskPatient);
    } else if (acuityFilter === 'triage-ready') {
      result = result.filter((p) => p.registrationStatus !== 'provisional');
    } else if (acuityFilter === 'long-wait') {
      result = result.filter((p) => waitMinutes(p) >= 60);
    }
    return result;
  }, [queue, searchQuery, acuityFilter, patientDisplayName, isHighRiskPatient, waitMinutes]);

  const totalPages = Math.max(1, Math.ceil(filteredQueue.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);

  const paginatedPatients = useMemo(
    () => filteredQueue.slice((activePage - 1) * pageSize, activePage * pageSize),
    [filteredQueue, activePage, pageSize],
  );

  const rowModels = useMemo(
    () =>
      paginatedPatients.map((patient) => ({
        patient,
        model: resolveReceptionQueueRowModel({
          patientId: patient.id,
          isHighRisk: isHighRiskPatient(patient),
          registrationStatus: patient.registrationStatus,
          triagePending: patient.triagePending,
          state: patient.state,
        }),
      })),
    [paginatedPatients, isHighRiskPatient],
  );

  const telemetry = useMemo(() => {
    const total = queue.length;
    if (!total) {
      return { avgWait: '0m', highRisk: 0, triageReady: 0, shiftPace: 'Optimal' };
    }
    const highRisk = queue.filter(isHighRiskPatient).length;
    const triageReady = queue.filter((p) => p.registrationStatus !== 'provisional').length;
    // Clamp individual waits to a reasonable ED operating ceiling (e.g. 240 mins)
    // so stale mock timestamps in dev/demo datasets don't blow out the display.
    const totalWait = queue.reduce((acc, p) => acc + Math.min(240, waitMinutes(p)), 0);
    const avgMins = Math.round(totalWait / total);
    const shiftPace = total > 50 ? 'Surge Load' : total > 20 ? 'Active' : 'Optimal';
    return {
      avgWait: formatWaitDisplay(avgMins),
      highRisk,
      triageReady,
      shiftPace,
    };
  }, [queue, isHighRiskPatient, waitMinutes]);

  const highRiskCount = useMemo(
    () => queue.filter(isHighRiskPatient).length,
    [queue, isHighRiskPatient],
  );
  const triageReadyCount = useMemo(
    () => queue.filter((p) => p.registrationStatus !== 'provisional').length,
    [queue],
  );
  const longWaitCount = useMemo(
    () => queue.filter((p) => waitMinutes(p) >= 60).length,
    [queue, waitMinutes],
  );

  return (
    <aside
      data-testid="reception-operational-rail"
      className="reception-operational-rail"
      aria-label="Reception operations"
    >
      <ReceptionAttentionStrip snapshot={attention} onSelectRow={onAttentionSelect} />

      <section
        className="reception-command-panel reception-operational-rail__panel"
        aria-labelledby="queue-title"
      >
        <div className="reception-command-panel__header">
          <div className="reception-command-panel__title-group">
            <h2 id="queue-title">Waiting list</h2>
            <span className="reception-command-chip">{filteredQueue.length}</span>
            {filteredQueue.length !== queue.length && (
              <span className="reception-command-chip-sub">of {queue.length}</span>
            )}
          </div>
        </div>

        {queueTabs && queueTabs.length > 0 ? (
          <div className="reception-operational-rail__tabs" role="tablist">
            {queueTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={tab.active}
                className={`reception-operational-rail__tab${tab.active ? ' reception-operational-rail__tab--active' : ''}`}
                onClick={tab.onClick}
              >
                {tab.label}
                {tab.count !== undefined ? (
                  <span className="reception-operational-rail__tab-count">{tab.count}</span>
                ) : null}
              </button>
            ))}
          </div>
        ) : (
          <p className="reception-operational-rail__tab-label" role="status">
            Showing: {activeQueueTab}
          </p>
        )}

        {/* Quick Search Bar */}
        <div className="reception-operational-rail__search">
          <Search
            size={13}
            className="reception-operational-rail__search-icon"
            aria-hidden="true"
          />
          <input
            type="search"
            className="reception-operational-rail__search-input"
            placeholder="Search patient, MRN, complaint..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Filter waiting list"
          />
          {searchQuery ? (
            <button
              type="button"
              className="reception-operational-rail__search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <X size={12} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {/* Acuity Filter Chips */}
        <div
          className="reception-operational-rail__filters"
          role="toolbar"
          aria-label="Filter by patient acuity"
        >
          <button
            type="button"
            className={`reception-rail-filter-chip${acuityFilter === 'all' ? ' reception-rail-filter-chip--active' : ''}`}
            onClick={() => setAcuityFilter('all')}
          >
            All ({queue.length})
          </button>
          <button
            type="button"
            className={`reception-rail-filter-chip reception-rail-filter-chip--risk${acuityFilter === 'high-risk' ? ' reception-rail-filter-chip--active' : ''}`}
            onClick={() => setAcuityFilter(acuityFilter === 'high-risk' ? 'all' : 'high-risk')}
          >
            High Risk ({highRiskCount})
          </button>
          <button
            type="button"
            className={`reception-rail-filter-chip${acuityFilter === 'triage-ready' ? ' reception-rail-filter-chip--active' : ''}`}
            onClick={() =>
              setAcuityFilter(acuityFilter === 'triage-ready' ? 'all' : 'triage-ready')
            }
          >
            Ready ({triageReadyCount})
          </button>
          <button
            type="button"
            className={`reception-rail-filter-chip${acuityFilter === 'long-wait' ? ' reception-rail-filter-chip--active' : ''}`}
            onClick={() => setAcuityFilter(acuityFilter === 'long-wait' ? 'all' : 'long-wait')}
          >
            &gt;60m ({longWaitCount})
          </button>
        </div>

        {/* Paginated Queue Rows */}
        <div className="reception-command-queue reception-operational-rail__queue" role="list">
          {rowModels.length ? (
            rowModels.map(({ patient, model }) => {
              const selected = selectedPatient?.id === patient.id;
              return (
                <div
                  key={patient.id}
                  role="listitem"
                  className={[
                    'reception-command-queue-row',
                    'reception-queue-row',
                    model.riskTone === 'critical' ? 'reception-command-queue-row--risk' : '',
                    model.riskTone === 'warning' ? 'reception-queue-row--warning' : '',
                    selected ? 'reception-command-queue-row--selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <button
                    type="button"
                    className="reception-queue-row__select"
                    onClick={() => onSelectPatient(patient.id)}
                    aria-pressed={selected ? 'true' : 'false'}
                    aria-label={`${patientDisplayName(patient)}, ${queueStatus(patient)}, ${waitMinutes(patient)} minutes, next ${nextStep(patient)}`}
                  >
                    <span className="reception-queue-row__who">
                      <strong>{patientDisplayName(patient)}</strong>
                      <small
                        className="reception-queue-row__complaint"
                        title={patient.chiefComplaint || patient.complaint || 'Complaint pending'}
                      >
                        {patient.chiefComplaint || patient.complaint || 'Complaint pending'}
                      </small>
                    </span>
                    <span className="reception-queue-row__meta">
                      <span
                        className={`reception-queue-row__chip reception-queue-row__chip--${model.riskTone}`}
                        data-tone={model.riskTone === 'neutral' ? 'neutral' : model.riskTone}
                      >
                        {model.riskLabel}
                      </span>
                      <span className="reception-queue-row__status" title={queueStatus(patient)}>
                        {queueStatus(patient)}
                      </span>
                    </span>
                    <span className="reception-queue-row__wait">
                      Wait {formatWaitDisplay(waitMinutes(patient))}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`reception-queue-row__cta${
                      model.primaryAction === 'escalate'
                        ? ' reception-queue-row__cta--critical'
                        : ''
                    }`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRowAction(patient.id, model.primaryAction);
                    }}
                  >
                    {model.primaryLabel}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="reception-command-empty">
              {searchQuery || acuityFilter !== 'all'
                ? 'No matching patients found in this filter'
                : emptyQueueMessage}
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <nav
            className="reception-operational-rail__pagination"
            aria-label="Waiting list pagination"
          >
            <button
              type="button"
              className="reception-operational-rail__page-btn"
              disabled={activePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft size={13} aria-hidden="true" />
              <span>Prev</span>
            </button>
            <span className="reception-operational-rail__page-info">
              {activePage} / {totalPages}
              <span className="reception-operational-rail__page-count">
                ({(activePage - 1) * pageSize + 1}–
                {Math.min(activePage * pageSize, filteredQueue.length)} of {filteredQueue.length})
              </span>
            </span>
            <button
              type="button"
              className="reception-operational-rail__page-btn"
              disabled={activePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <span>Next</span>
              <ChevronRight size={13} aria-hidden="true" />
            </button>
          </nav>
        )}
      </section>

      {/* Station Handover & Queue Telemetry Summary */}
      <div className="reception-rail-telemetry">
        <div className="reception-rail-telemetry__header">
          <Activity size={13} className="reception-rail-telemetry__icon" aria-hidden="true" />
          <span>Queue Dynamics & Handover</span>
        </div>
        <div className="reception-rail-telemetry__grid">
          <div className="reception-rail-telemetry__stat">
            <span className="reception-rail-telemetry__stat-label">Avg Wait</span>
            <span className="reception-rail-telemetry__stat-value">{telemetry.avgWait}</span>
          </div>
          <div className="reception-rail-telemetry__stat">
            <span className="reception-rail-telemetry__stat-label">High Risk</span>
            <span className="reception-rail-telemetry__stat-value">{telemetry.highRisk}</span>
          </div>
          <div className="reception-rail-telemetry__stat">
            <span className="reception-rail-telemetry__stat-label">Triage Ready</span>
            <span className="reception-rail-telemetry__stat-value">{telemetry.triageReady}</span>
          </div>
          <div className="reception-rail-telemetry__stat">
            <span className="reception-rail-telemetry__stat-label">Shift Pace</span>
            <span
              className={`reception-rail-telemetry__stat-value${
                telemetry.shiftPace === 'Optimal'
                  ? ' reception-rail-telemetry__stat-value--ok'
                  : telemetry.shiftPace === 'Surge Load'
                    ? ' reception-rail-telemetry__stat-value--warning'
                    : ''
              }`}
            >
              {telemetry.shiftPace}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

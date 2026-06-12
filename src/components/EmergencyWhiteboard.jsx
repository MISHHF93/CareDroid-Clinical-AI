import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Grid3X3, List, Plus, Search } from 'lucide-react';
import {
  getPatientFlagType,
  selectActivePatients,
  selectFilteredPatients,
  selectWhiteboardFilterCounts,
  selectWhiteboardStats,
  useEmergencyStore,
} from '../../store/emergencyStore';
import PatientCard, { PatientDetailPanel } from './PatientCard';
import NewPatientIntake from './NewPatientIntake';
import QueueIntelligencePanel from './QueueIntelligencePanel';
import ClinicalScoreCalculator, {
  CALCULATOR_BY_SUGGESTION_ID,
  createClinicalScoreEvent,
  createClinicalScoreNote,
} from './ClinicalScoreCalculator';
import './EmergencyWhiteboard.css';

const FILTERS = [
  { label: 'All', id: 'All', type: null },
  { label: 'Waiting', id: 'Waiting', type: 'Waiting' },
  { label: 'Assessment', id: 'Assessment', type: 'Assessment' },
  { label: 'High Risk', id: 'HighRisk', type: 'HighRisk' },
  { label: 'EMS', id: 'EMS', type: 'EMS' },
  { label: 'Boarding', id: 'Boarding', type: 'Boarding' },
];

function waitMinutes(arrivalTime) {
  const arrivedAt = new Date(arrivalTime).getTime();
  if (!Number.isFinite(arrivedAt)) return 0;
  return Math.max(0, Math.round((Date.now() - arrivedAt) / 60000));
}

function formatWait(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function patientName(patient) {
  return `${patient.firstName} ${patient.lastName}`;
}

function staffName(staff) {
  return staff ? `${staff.firstName} ${staff.lastName}` : 'Unassigned';
}

const VIRTUALIZED_GRID_THRESHOLD = 50;
const VIRTUALIZED_CARD_ROW_HEIGHT = 132;

function isEditableShortcutTarget(target) {
  return (
    target?.tagName === 'INPUT' ||
    target?.tagName === 'TEXTAREA' ||
    target?.tagName === 'SELECT' ||
    target?.isContentEditable
  );
}

export default function EmergencyWhiteboard() {
  const patients = useEmergencyStore((state) => state.patients);
  const activePatients = useEmergencyStore(selectActivePatients);
  const filteredPatients = useEmergencyStore(selectFilteredPatients);
  const filterCounts = useEmergencyStore(selectWhiteboardFilterCounts);
  const stats = useEmergencyStore(selectWhiteboardStats);
  const staff = useEmergencyStore((state) => state.staff);
  const rooms = useEmergencyStore((state) => state.rooms);
  const activeQueueFilter = useEmergencyStore((state) => state.activeQueueFilter);
  const whiteboardSearchQuery = useEmergencyStore((state) => state.whiteboardSearchQuery);
  const selectedPatientId = useEmergencyStore((state) => state.selectedPatientId);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const setQueueFilter = useEmergencyStore((state) => state.setQueueFilter);
  const setWhiteboardSearchQuery = useEmergencyStore((state) => state.setWhiteboardSearchQuery);
  const patientBackendSearch = useEmergencyStore((state) => state.patientBackendSearch);
  const searchBackendPatients = useEmergencyStore((state) => state.searchBackendPatients);
  const realtimeConnection = useEmergencyStore((state) => state.realtimeConnection);
  const updatePatient = useEmergencyStore((state) => state.updatePatient);
  const addNote = useEmergencyStore((state) => state.addNote);
  const addFlag = useEmergencyStore((state) => state.addFlag);
  const [viewMode, setViewMode] = useState('grid');
  const [queuePanelCollapsed, setQueuePanelCollapsed] = useState(false);
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [calculatorLaunch, setCalculatorLaunch] = useState(null);
  const [keyboardPatientId, setKeyboardPatientId] = useState(null);
  const [isStoreInitializing, setIsStoreInitializing] = useState(true);
  const [gridScrollTop, setGridScrollTop] = useState(0);
  const [gridViewportHeight, setGridViewportHeight] = useState(720);
  const [gridColumnCount, setGridColumnCount] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth <= 1180 ? 2 : 3
  );
  const gridRef = useRef(null);

  const calculatorPatient = calculatorLaunch
    ? patients.find((patient) => patient.id === calculatorLaunch.patientId)
    : null;
  const shouldVirtualizeGrid =
    viewMode === 'grid' && filteredPatients.length > VIRTUALIZED_GRID_THRESHOLD;
  const virtualizedGrid = useMemo(() => {
    if (!shouldVirtualizeGrid) {
      return {
        patients: filteredPatients,
        paddingTop: 0,
        paddingBottom: 0,
      };
    }

    const totalRows = Math.ceil(filteredPatients.length / gridColumnCount);
    const startRow = Math.max(0, Math.floor(gridScrollTop / VIRTUALIZED_CARD_ROW_HEIGHT) - 3);
    const visibleRowCount = Math.ceil(gridViewportHeight / VIRTUALIZED_CARD_ROW_HEIGHT) + 6;
    const endRow = Math.min(totalRows, startRow + visibleRowCount);
    return {
      patients: filteredPatients.slice(startRow * gridColumnCount, endRow * gridColumnCount),
      paddingTop: startRow * VIRTUALIZED_CARD_ROW_HEIGHT,
      paddingBottom: Math.max(0, (totalRows - endRow) * VIRTUALIZED_CARD_ROW_HEIGHT),
    };
  }, [filteredPatients, gridColumnCount, gridScrollTop, gridViewportHeight, shouldVirtualizeGrid]);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsStoreInitializing(false), 180);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const updateGridMetrics = () => {
      setGridViewportHeight(gridRef.current?.clientHeight || 720);
      setGridColumnCount(window.innerWidth <= 1180 ? 2 : 3);
    };

    updateGridMetrics();
    window.addEventListener('resize', updateGridMetrics);
    return () => window.removeEventListener('resize', updateGridMetrics);
  }, []);

  useEffect(() => {
    if (!filteredPatients.length) {
      setKeyboardPatientId(null);
      return;
    }
    if (
      !keyboardPatientId ||
      !filteredPatients.some((patient) => patient.id === keyboardPatientId)
    ) {
      setKeyboardPatientId(selectedPatientId || filteredPatients[0].id);
    }
  }, [filteredPatients, keyboardPatientId, selectedPatientId]);

  useEffect(() => {
    const query = whiteboardSearchQuery.trim();
    if (query.length < 2) return;
    const timer = window.setTimeout(() => {
      void searchBackendPatients(query);
    }, 260);
    return () => window.clearTimeout(timer);
  }, [searchBackendPatients, whiteboardSearchQuery]);

  useEffect(() => {
    const handleOpenIntake = () => setNewPatientOpen(true);
    const handleCloseOverlays = () => {
      setNewPatientOpen(false);
      setCalculatorLaunch(null);
    };
    const handleOpenCalculator = (event) => {
      const rawCalculatorId =
        event.detail?.calculatorId || event.detail?.toolId || event.detail?.value || '';
      const calculatorId = CALCULATOR_BY_SUGGESTION_ID[rawCalculatorId] || rawCalculatorId;
      if (!['heart', 'qsofa', 'nihss'].includes(calculatorId)) return;

      const patientId = event.detail?.patientId || selectedPatientId;
      if (!patientId) return;
      setCalculatorLaunch({ calculatorId, patientId });
      selectPatient(patientId);
    };

    window.addEventListener('ed:open-intake', handleOpenIntake);
    window.addEventListener('ed:close-overlays', handleCloseOverlays);
    window.addEventListener('ed:open-calculator', handleOpenCalculator);
    return () => {
      window.removeEventListener('ed:open-intake', handleOpenIntake);
      window.removeEventListener('ed:close-overlays', handleCloseOverlays);
      window.removeEventListener('ed:open-calculator', handleOpenCalculator);
    };
  }, [selectPatient, selectedPatientId]);

  const moveKeyboardSelection = (direction) => {
    if (!filteredPatients.length) return;
    const currentIndex = Math.max(
      0,
      filteredPatients.findIndex((patient) => patient.id === keyboardPatientId)
    );
    const nextIndex =
      direction === 'next'
        ? Math.min(currentIndex + 1, filteredPatients.length - 1)
        : Math.max(currentIndex - 1, 0);
    const nextPatientId = filteredPatients[nextIndex].id;
    setKeyboardPatientId(nextPatientId);
    window.setTimeout(() => {
      document
        .querySelector(`[data-patient-card-id="${nextPatientId}"]`)
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 0);
  };

  const handleWhiteboardShortcut = (event) => {
    if (
      event.defaultPrevented ||
      newPatientOpen ||
      calculatorLaunch ||
      isEditableShortcutTarget(event.target) ||
      event.target?.closest?.('.patient-detail')
    ) {
      return;
    }

    const key = event.key.toLowerCase();
    if (/^[1-6]$/.test(event.key)) {
      event.preventDefault();
      const filter = FILTERS[Number(event.key) - 1];
      setQueueFilter(filter?.type || null);
      return;
    }

    if (key === 'g') {
      event.preventDefault();
      setViewMode('grid');
      return;
    }

    if (key === 'l') {
      event.preventDefault();
      setViewMode('list');
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveKeyboardSelection('next');
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveKeyboardSelection('previous');
      return;
    }

    if (event.key === 'Enter' && keyboardPatientId) {
      event.preventDefault();
      selectPatient(keyboardPatientId);
      return;
    }

    if (key === 'f' && keyboardPatientId) {
      event.preventDefault();
      addFlag(keyboardPatientId, 'ReassessmentDue');
    }
  };

  const saveCalculatorScore = (score) => {
    if (!calculatorPatient) return;
    const timestamp = new Date().toISOString();
    const currentPatient =
      useEmergencyStore
        .getState()
        .patients.find((patient) => patient.id === calculatorPatient.id) || calculatorPatient;
    const authorStaffId =
      currentPatient.assignedStaffId || activeShift.chargeStaffId || staff[0]?.id || 'system';
    updatePatient(currentPatient.id, {
      timeline: [
        ...currentPatient.timeline,
        createClinicalScoreEvent(currentPatient.id, score, timestamp, authorStaffId),
      ],
    });
    addNote(
      currentPatient.id,
      createClinicalScoreNote(currentPatient.id, score, authorStaffId, timestamp)
    );
  };

  return (
    <section
      className="ed-whiteboard"
      aria-labelledby="ed-whiteboard-title"
      tabIndex={0}
      onKeyDown={handleWhiteboardShortcut}
    >
      <header className="ed-whiteboard__topbar">
        <div className="ed-whiteboard__title">
          <h1 id="ed-whiteboard-title">Emergency Whiteboard</h1>
          <span>{activePatients.length} live patients</span>
        </div>
        <div className="ed-whiteboard__topbar-actions">
          <label className="ed-whiteboard__search" aria-label="Search patients">
            <Search size={14} aria-hidden />
            <input
              value={whiteboardSearchQuery}
              placeholder="Search backend patients..."
              onChange={(event) => setWhiteboardSearchQuery(event.target.value)}
            />
          </label>
          {whiteboardSearchQuery ? (
            <span className="ed-whiteboard__search-chip">
              {patientBackendSearch.status === 'loading'
                ? 'Backend lookup...'
                : patientBackendSearch.results?.length
                  ? `${patientBackendSearch.results.length} backend match${patientBackendSearch.results.length === 1 ? '' : 'es'}`
                  : `Search: ${whiteboardSearchQuery}`}
            </span>
          ) : null}
          <button
            type="button"
            className="ed-whiteboard__new-patient"
            onClick={() => setNewPatientOpen(true)}
          >
            <Plus size={15} aria-hidden />
            New Patient
          </button>
          <div className="ed-whiteboard__filters" aria-label="Whiteboard filters">
            {FILTERS.map((filter) => {
              const isActive = activeQueueFilter === filter.type;
              return (
                <button
                  key={filter.label}
                  type="button"
                  className={`ed-whiteboard__filter${isActive ? ' ed-whiteboard__filter--active' : ''}`}
                  onClick={() => setQueueFilter(filter.type)}
                >
                  <span>{filter.label}</span>
                  <strong>{filterCounts[filter.id]}</strong>
                </button>
              );
            })}
          </div>
          <div className="ed-whiteboard__view-toggle" aria-label="Whiteboard view">
            <button
              type="button"
              className={viewMode === 'grid' ? 'ed-whiteboard__view-toggle-button--active' : ''}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              <Grid3X3 size={15} aria-hidden />
              <span>Grid</span>
            </button>
            <button
              type="button"
              className={viewMode === 'list' ? 'ed-whiteboard__view-toggle-button--active' : ''}
              onClick={() => setViewMode('list')}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <List size={16} aria-hidden />
              <span>List</span>
            </button>
          </div>
        </div>
      </header>

      {realtimeConnection.status !== 'connected' ? (
        <div className="ed-whiteboard__live-banner" role="status" aria-live="polite">
          Live updates paused - reconnecting. Polling every 30 seconds.
        </div>
      ) : null}

      <NewPatientIntake open={newPatientOpen} onClose={() => setNewPatientOpen(false)} />
      {calculatorLaunch && calculatorPatient ? (
        <ClinicalScoreCalculator
          key={`${calculatorLaunch.patientId}-${calculatorLaunch.calculatorId}`}
          calculatorId={calculatorLaunch.calculatorId}
          patient={calculatorPatient}
          onClose={() => setCalculatorLaunch(null)}
          onSaveScore={saveCalculatorScore}
        />
      ) : null}

      <div className="ed-whiteboard__stats" aria-label="Emergency department stats">
        {stats.map((stat) => (
          <div key={stat.label} className="ed-whiteboard__stat-card">
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>

      <div
        className={[
          'ed-whiteboard__body',
          queuePanelCollapsed ? 'ed-whiteboard__body--queue-collapsed' : '',
          selectedPatientId ? 'ed-whiteboard__body--detail-open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <QueueIntelligencePanel
          collapsed={queuePanelCollapsed}
          onCollapsedChange={setQueuePanelCollapsed}
        />
        <div className="ed-whiteboard__content">
          {isStoreInitializing && viewMode === 'grid' ? (
            <div className="ed-whiteboard__grid" aria-label="Loading patient whiteboard">
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="ed-whiteboard__skeleton-card" />
              ))}
            </div>
          ) : null}
          {!isStoreInitializing && filteredPatients.length && viewMode === 'grid' ? (
            <div
              ref={gridRef}
              className={[
                'ed-whiteboard__grid',
                shouldVirtualizeGrid ? 'ed-whiteboard__grid--virtualized' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label="Patient whiteboard"
              onScroll={(event) => setGridScrollTop(event.currentTarget.scrollTop)}
            >
              {virtualizedGrid.paddingTop ? (
                <div
                  className="ed-whiteboard__virtual-spacer"
                  style={{ height: virtualizedGrid.paddingTop }}
                />
              ) : null}
              {virtualizedGrid.patients.map((patient) => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  keyboardSelected={patient.id === keyboardPatientId}
                  onKeyboardFocus={() => setKeyboardPatientId(patient.id)}
                />
              ))}
              {virtualizedGrid.paddingBottom ? (
                <div
                  className="ed-whiteboard__virtual-spacer"
                  style={{ height: virtualizedGrid.paddingBottom }}
                />
              ) : null}
            </div>
          ) : null}
          {!isStoreInitializing && filteredPatients.length && viewMode === 'list' ? (
            <div className="ed-whiteboard__list" aria-label="Patient whiteboard list">
              <table>
                <thead>
                  <tr>
                    <th>Priority</th>
                    <th>Name</th>
                    <th>Complaint</th>
                    <th>State</th>
                    <th>Wait</th>
                    <th>Staff</th>
                    <th>Room</th>
                    <th>Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((patient) => {
                    const assignedStaff = staff.find(
                      (candidate) => candidate.id === patient.assignedStaffId
                    );
                    const assignedRoom = rooms.find((candidate) => candidate.id === patient.roomId);
                    return (
                      <tr
                        key={patient.id}
                        data-patient-card-id={patient.id}
                        tabIndex={0}
                        className={
                          patient.id === keyboardPatientId
                            ? 'ed-whiteboard__row--keyboard-selected'
                            : ''
                        }
                        onFocus={() => setKeyboardPatientId(patient.id)}
                        onClick={() => selectPatient(patient.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            selectPatient(patient.id);
                          }
                        }}
                      >
                        <td>
                          <span
                            className={`ed-whiteboard__priority ed-whiteboard__priority--${patient.priority}`}
                          >
                            {patient.priority}
                          </span>
                        </td>
                        <td>
                          <strong>{patientName(patient)}</strong>
                          <small>{patient.mrn}</small>
                        </td>
                        <td>{patient.complaintCategory}</td>
                        <td>{patient.state}</td>
                        <td>{formatWait(waitMinutes(patient.arrivalTime))}</td>
                        <td>{staffName(assignedStaff)}</td>
                        <td>{assignedRoom?.name || patient.roomId || 'No room'}</td>
                        <td>
                          <span className="ed-whiteboard__flag-list">
                            {patient.flags.length
                              ? patient.flags.map(getPatientFlagType).join(', ')
                              : 'None'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
          {!isStoreInitializing && !filteredPatients.length ? (
            <div className="ed-whiteboard__empty" role="status">
              {whiteboardSearchQuery ? patientBackendSearch.message || 'No patients match this search.' : 'Department Clear'}
            </div>
          ) : null}
        </div>
        {selectedPatientId ? (
          <div className="ed-whiteboard__detail-overlay">
            <PatientDetailPanel />
          </div>
        ) : null}
      </div>
    </section>
  );
}

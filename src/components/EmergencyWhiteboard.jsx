import React, { useEffect, useMemo, useState } from 'react';
import { Grid3X3, List, Plus } from 'lucide-react';
import { PatientState, Priority } from '../../types/emergency';
import { getPatientFlagType, hasPatientFlag, useEmergencyStore } from '../../store/emergencyStore';
import PatientCard, { PatientDetailPanel } from './PatientCard';
import QueueIntelligencePanel from './QueueIntelligencePanel';
import NewPatientIntake from './NewPatientIntake';
import ClinicalScoreCalculator, {
  CALCULATOR_BY_SUGGESTION_ID,
  createClinicalScoreEvent,
  createClinicalScoreNote,
} from './ClinicalScoreCalculator';
import './EmergencyWhiteboard.css';

const ACTIVE_STATES = new Set(
  Object.values(PatientState).filter(
    (state) => state !== PatientState.Discharge && state !== PatientState.Deceased
  )
);

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

function averageWait(patients) {
  if (!patients.length) return 0;
  const total = patients.reduce((sum, patient) => sum + waitMinutes(patient.arrivalTime), 0);
  return Math.round(total / patients.length);
}

function isHighRisk(patient) {
  return (
    hasPatientFlag(patient, 'HighRisk') ||
    hasPatientFlag(patient, 'DeteriorationRisk') ||
    patient.priority === Priority.P1 ||
    patient.priority === Priority.P2
  );
}

function matchesFilter(patient, filterType) {
  if (!filterType) return true;
  if (filterType === 'Waiting') return patient.state === PatientState.Waiting;
  if (filterType === 'Triage') return patient.state === PatientState.Triage;
  if (filterType === 'Provider') {
    return patient.state === PatientState.Assessment || patient.state === PatientState.Orders;
  }
  if (filterType === 'Assessment') {
    return [PatientState.Assessment, PatientState.Orders, PatientState.Results].includes(
      patient.state
    );
  }
  if (filterType === 'Results') return patient.state === PatientState.Results;
  if (filterType === 'Referral') return Boolean(patient.referral);
  if (filterType === 'Admission') return patient.state === PatientState.Admission;
  if (filterType === 'Discharge') return patient.state === PatientState.Discharge;
  if (filterType === 'Reassessment') return hasPatientFlag(patient, 'ReassessmentDue');
  if (filterType === 'HighRisk') return isHighRisk(patient);
  if (filterType === 'EMS') return hasPatientFlag(patient, 'EMSArrival');
  if (filterType === 'Boarding') return hasPatientFlag(patient, 'PendingAdmission');
  return true;
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

export default function EmergencyWhiteboard() {
  const patients = useEmergencyStore((state) => state.patients);
  const staff = useEmergencyStore((state) => state.staff);
  const rooms = useEmergencyStore((state) => state.rooms);
  const capacity = useEmergencyStore((state) => state.capacity);
  const activeQueueFilter = useEmergencyStore((state) => state.activeQueueFilter);
  const selectedPatientId = useEmergencyStore((state) => state.selectedPatientId);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const setQueueFilter = useEmergencyStore((state) => state.setQueueFilter);
  const updatePatient = useEmergencyStore((state) => state.updatePatient);
  const addNote = useEmergencyStore((state) => state.addNote);
  const [viewMode, setViewMode] = useState('grid');
  const [queuePanelCollapsed, setQueuePanelCollapsed] = useState(false);
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [calculatorLaunch, setCalculatorLaunch] = useState(null);

  const activePatients = useMemo(
    () => patients.filter((patient) => ACTIVE_STATES.has(patient.state)),
    [patients]
  );

  const filteredPatients = useMemo(() => {
    const basePatients = activePatients.filter((patient) =>
      matchesFilter(patient, activeQueueFilter)
    );

    return [...basePatients].sort((a, b) => {
      const p1Delta = Number(b.priority === Priority.P1) - Number(a.priority === Priority.P1);
      if (p1Delta !== 0) return p1Delta;
      return waitMinutes(b.arrivalTime) - waitMinutes(a.arrivalTime);
    });
  }, [activePatients, activeQueueFilter]);

  const filterCounts = useMemo(
    () =>
      FILTERS.reduce(
        (counts, filter) => ({
          ...counts,
          [filter.id]: activePatients.filter((patient) => matchesFilter(patient, filter.type))
            .length,
        }),
        {}
      ),
    [activePatients]
  );

  const stats = useMemo(
    () => [
      { label: 'Total Active', value: activePatients.length },
      { label: 'Avg Wait', value: `${averageWait(activePatients)}m` },
      { label: 'High Risk', value: activePatients.filter(isHighRisk).length },
      {
        label: 'In Boarding',
        value: activePatients.filter((patient) => matchesFilter(patient, 'Boarding')).length,
      },
      { label: 'Capacity Score', value: capacity.score },
    ],
    [activePatients, capacity.score]
  );
  const calculatorPatient = calculatorLaunch
    ? patients.find((patient) => patient.id === calculatorLaunch.patientId)
    : null;

  useEffect(() => {
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

    window.addEventListener('ed:open-calculator', handleOpenCalculator);
    return () => window.removeEventListener('ed:open-calculator', handleOpenCalculator);
  }, [selectPatient, selectedPatientId]);

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
        createClinicalScoreEvent(currentPatient.id, score, timestamp),
      ],
    });
    addNote(
      currentPatient.id,
      createClinicalScoreNote(currentPatient.id, score, authorStaffId, timestamp)
    );
  };

  return (
    <section className="ed-whiteboard" aria-labelledby="ed-whiteboard-title">
      <header className="ed-whiteboard__topbar">
        <div className="ed-whiteboard__title">
          <h1 id="ed-whiteboard-title">Emergency Whiteboard</h1>
          <span>{activePatients.length} live patients</span>
        </div>
        <div className="ed-whiteboard__topbar-actions">
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
            </button>
            <button
              type="button"
              className={viewMode === 'list' ? 'ed-whiteboard__view-toggle-button--active' : ''}
              onClick={() => setViewMode('list')}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <List size={16} aria-hidden />
            </button>
          </div>
        </div>
      </header>

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
          selectedPatientId ? 'ed-whiteboard__body--detail-open' : '',
          queuePanelCollapsed ? 'ed-whiteboard__body--queue-collapsed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <QueueIntelligencePanel
          collapsed={queuePanelCollapsed}
          onCollapsedChange={setQueuePanelCollapsed}
        />
        <div className="ed-whiteboard__content">
          {filteredPatients.length && viewMode === 'grid' ? (
            <div className="ed-whiteboard__grid" aria-label="Patient whiteboard">
              {filteredPatients.map((patient) => (
                <PatientCard key={patient.id} patient={patient} />
              ))}
            </div>
          ) : null}
          {filteredPatients.length && viewMode === 'list' ? (
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
                        tabIndex={0}
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
          {!filteredPatients.length ? (
            <div className="ed-whiteboard__empty" role="status">
              Department Clear
            </div>
          ) : null}
        </div>
        <PatientDetailPanel />
      </div>
    </section>
  );
}

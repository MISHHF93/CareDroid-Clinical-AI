import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getQueueForPatientState, useEmergencyDepartment } from '../contexts/EmergencyDepartmentContext';
import { useConversation } from '../contexts/ConversationContext';
import CapacityIntelligence from '../services/CapacityIntelligence';
import PatientJourneyEngine from '../services/PatientJourneyEngine';
import { CapacityScore, PatientState, QueueType } from '../types';
import './EmergencyWhiteboard.css';

const LONG_WAIT_MINUTES = 60;
const ACTIVE_PATIENT_STATES = new Set(
  Object.values(PatientState).filter((state) => state !== PatientState.Discharge)
);
const CHIEF_COMPLAINT_OPTIONS = Object.freeze(['Chest Pain', 'Stroke', 'Sepsis', 'Trauma', 'Other']);
const CLINICAL_SCORE_BY_COMPLAINT = Object.freeze({
  'Chest Pain': 'HEART Score',
  Sepsis: 'qSOFA',
  Stroke: 'NIHSS',
});
const INITIAL_NEW_PATIENT_FORM = Object.freeze({
  complaint: '',
  vitals: Object.freeze({
    heartRate: '',
    bloodPressure: '',
    oxygenSaturation: '',
    temperature: '',
    respiratoryRate: '',
  }),
});

function numericVital(value) {
  if (typeof value === 'number') return value;
  const parsed = Number.parseFloat(String(value || '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function waitMinutes(arrivalTime) {
  const arrivedAt = new Date(arrivalTime).getTime();
  if (!Number.isFinite(arrivedAt)) return 0;
  return Math.max(0, Math.round((Date.now() - arrivedAt) / 60000));
}

function formatWait(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function isHighRisk(patient) {
  const priority = String(patient.priority || '').toLowerCase();
  const complaint = String(patient.complaint || '').toLowerCase();
  const vitals = patient.vitals || {};
  const heartRate = numericVital(vitals.heartRate);
  const respiratoryRate = numericVital(vitals.respiratoryRate);
  const temperature = numericVital(vitals.temperature);
  const oxygenSaturation = numericVital(vitals.oxygenSaturation ?? vitals.spo2);
  const painScore = numericVital(vitals.painScore);

  return (
    priority.includes('ctas 1') ||
    priority.includes('ctas 2') ||
    priority.includes('critical') ||
    (complaint.includes('chest') && heartRate !== null && heartRate >= 110) ||
    (complaint.includes('abdominal') && painScore !== null && painScore >= 8) ||
    (temperature !== null && temperature >= 39) ||
    (heartRate !== null && heartRate >= 120) ||
    (respiratoryRate !== null && respiratoryRate >= 24) ||
    (oxygenSaturation !== null && oxygenSaturation < 94)
  );
}

function patientStatus(patient, wait) {
  if (isHighRisk(patient)) {
    return {
      tone: 'red',
      label: 'High risk',
      helper: 'Clinician review priority',
    };
  }

  if (
    wait >= LONG_WAIT_MINUTES ||
    ([PatientState.Waiting, PatientState.Triage, PatientState.Registration].includes(patient.state) &&
      wait >= 45)
  ) {
    return {
      tone: 'yellow',
      label: 'Waiting too long',
      helper: 'Queue time over target',
    };
  }

  return {
    tone: 'green',
    label: 'Stable',
    helper: 'No immediate queue breach',
  };
}

function priorityClassName(priority) {
  return `emergency-whiteboard__priority emergency-whiteboard__priority--${String(priority || 'pending')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`;
}

function queueHealth(avgWait) {
  if (avgWait > 60) return 'red';
  if (avgWait > 30) return 'yellow';
  return 'green';
}

function CapacityBanner({ snapshot }) {
  return (
    <section
      className={`emergency-capacity-banner emergency-capacity-banner--${String(snapshot.score).toLowerCase()}`}
      aria-label="CapacityBanner"
    >
      <div>
        <p className="workspace-eyebrow">Capacity Intelligence</p>
        <h3>{snapshot.score} capacity</h3>
      </div>
      <dl>
        <div>
          <dt>Occupancy</dt>
          <dd>
            {snapshot.currentOccupancy}/{snapshot.maxCapacity} ({snapshot.occupancyPercent}%)
          </dd>
        </div>
        <div>
          <dt>Boarding</dt>
          <dd>{snapshot.boardingCount}</dd>
        </div>
        <div>
          <dt>Reassessment</dt>
          <dd>{snapshot.reassessmentQueueLength}</dd>
        </div>
      </dl>
    </section>
  );
}

function parseVitalNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function priorityForComplaint(complaint) {
  return ['Chest Pain', 'Stroke', 'Sepsis', 'Trauma'].includes(complaint) ? 'CTAS 2' : 'CTAS 4';
}

function buildNewPatient({ patientCount, complaint, vitals }) {
  const now = new Date().toISOString();

  return {
    id: `tor-uc-new-${Date.now()}`,
    name: `New ED Patient ${patientCount + 1}`,
    arrivalTime: now,
    complaint,
    state: PatientState.Triage,
    priority: priorityForComplaint(complaint),
    vitals: {
      heartRate: parseVitalNumber(vitals.heartRate),
      bloodPressure: vitals.bloodPressure,
      oxygenSaturation: parseVitalNumber(vitals.oxygenSaturation),
      temperature: parseVitalNumber(vitals.temperature),
      respiratoryRate: parseVitalNumber(vitals.respiratoryRate),
    },
    vitalsUpdatedAt: now,
    assignedTo: 'RN Olivia Thompson',
  };
}

function NewPatientChatPanel({
  step,
  form,
  scoreSuggestion,
  onSelectComplaint,
  onVitalsChange,
  onBack,
  onNext,
  onConfirm,
  onCancel,
}) {
  const vitalsComplete = Object.values(form.vitals).every((value) => String(value).trim());

  return (
    <section className="emergency-new-patient-chat" aria-label="New patient chat panel">
      <div className="emergency-new-patient-chat__header">
        <div>
          <p className="workspace-eyebrow">New Patient</p>
          <h3>Step {step} of 4</h3>
        </div>
        <button type="button" className="workspace-secondary-action" onClick={onCancel}>
          Close
        </button>
      </div>

      <div className="emergency-new-patient-chat__messages">
        <div className="emergency-new-patient-chat__bubble emergency-new-patient-chat__bubble--assistant">
          {step === 1 ? 'Select the chief complaint to start the ED intake flow.' : null}
          {step === 2 ? `Enter first-pass vitals for ${form.complaint}.` : null}
          {step === 3 ? 'Suggested clinical score based on chief complaint.' : null}
          {step === 4 ? 'Confirm the triage card before adding it to the whiteboard.' : null}
        </div>

        {step === 1 ? (
          <div className="emergency-new-patient-chat__options" aria-label="Chief complaint selection">
            {CHIEF_COMPLAINT_OPTIONS.map((complaint) => (
              <button
                key={complaint}
                type="button"
                className={`emergency-new-patient-chat__option${form.complaint === complaint ? ' emergency-new-patient-chat__option--active' : ''}`}
                onClick={() => onSelectComplaint(complaint)}
              >
                {complaint}
              </button>
            ))}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="emergency-new-patient-chat__vitals" aria-label="Vitals entry">
            <label>
              HR
              <input
                value={form.vitals.heartRate}
                inputMode="numeric"
                onChange={(event) => onVitalsChange('heartRate', event.target.value)}
              />
            </label>
            <label>
              BP
              <input
                value={form.vitals.bloodPressure}
                placeholder="120/80"
                onChange={(event) => onVitalsChange('bloodPressure', event.target.value)}
              />
            </label>
            <label>
              SpO2
              <input
                value={form.vitals.oxygenSaturation}
                inputMode="numeric"
                onChange={(event) => onVitalsChange('oxygenSaturation', event.target.value)}
              />
            </label>
            <label>
              Temp
              <input
                value={form.vitals.temperature}
                inputMode="decimal"
                onChange={(event) => onVitalsChange('temperature', event.target.value)}
              />
            </label>
            <label>
              RR
              <input
                value={form.vitals.respiratoryRate}
                inputMode="numeric"
                onChange={(event) => onVitalsChange('respiratoryRate', event.target.value)}
              />
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="emergency-new-patient-chat__suggestion">
            <span>Clinical score suggestion</span>
            <strong>{scoreSuggestion || 'No automatic score suggested'}</strong>
            <small>{form.complaint}</small>
          </div>
        ) : null}

        {step === 4 ? (
          <dl className="emergency-new-patient-chat__summary">
            <div>
              <dt>Complaint</dt>
              <dd>{form.complaint}</dd>
            </div>
            <div>
              <dt>Initial state</dt>
              <dd>{PatientState.Triage}</dd>
            </div>
            <div>
              <dt>Suggested score</dt>
              <dd>{scoreSuggestion || 'None'}</dd>
            </div>
            <div>
              <dt>Vitals</dt>
              <dd>
                HR {form.vitals.heartRate}, BP {form.vitals.bloodPressure}, SpO2 {form.vitals.oxygenSaturation},
                Temp {form.vitals.temperature}, RR {form.vitals.respiratoryRate}
              </dd>
            </div>
          </dl>
        ) : null}
      </div>

      <div className="emergency-new-patient-chat__actions">
        <button type="button" className="workspace-secondary-action" onClick={onBack} disabled={step === 1}>
          Back
        </button>
        {step < 4 ? (
          <button
            type="button"
            className="workspace-primary-action"
            onClick={onNext}
            disabled={(step === 1 && !form.complaint) || (step === 2 && !vitalsComplete)}
          >
            Continue
          </button>
        ) : (
          <button type="button" className="workspace-primary-action" onClick={onConfirm}>
            Confirm and add patient
          </button>
        )}
      </div>
    </section>
  );
}

function QueuePanel({ queues, selectedQueue, collapsed, onCollapsedChange, onSelectQueue }) {
  return (
    <aside className={`emergency-queue-panel${collapsed ? ' emergency-queue-panel--collapsed' : ''}`} aria-label="Emergency queue panel">
      <div className="emergency-queue-panel__header">
        <div>
          <p className="workspace-eyebrow">Queues</p>
          <h3>Queue Panel</h3>
        </div>
        <button
          type="button"
          className="workspace-secondary-action emergency-queue-panel__collapse"
          onClick={() => onCollapsedChange(!collapsed)}
          aria-expanded={!collapsed}
        >
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>

      {!collapsed ? (
        <>
          <button
            type="button"
            className={`emergency-queue-panel__queue emergency-queue-panel__queue--all${selectedQueue ? '' : ' emergency-queue-panel__queue--active'}`}
            onClick={() => onSelectQueue(null)}
          >
            <span>All active patients</span>
            <strong>Clear filter</strong>
          </button>
          <div className="emergency-queue-panel__list">
            {queues.map((queue) => (
              <button
                key={queue.queueType}
                type="button"
                className={`emergency-queue-panel__queue emergency-queue-panel__queue--${queue.health}${selectedQueue === queue.queueType ? ' emergency-queue-panel__queue--active' : ''}`}
                onClick={() => onSelectQueue(queue.queueType)}
                aria-pressed={selectedQueue === queue.queueType}
              >
                <span className="emergency-queue-panel__queue-name">{queue.queueType}</span>
                <strong>{queue.count} patients</strong>
                <small>{formatWait(queue.averageWait)} avg wait</small>
                <i aria-label={`${queue.health} health`} />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </aside>
  );
}

function StaffAssignmentPanel({ staffMembers, workloads, patients, onAssignPatient }) {
  const activePatients = patients.filter((patient) => ACTIVE_PATIENT_STATES.has(patient.state));
  const workloadByName = new Map(workloads.map((workload) => [workload.name, workload]));

  return (
    <section className="emergency-staff-panel" aria-label="Staff Assignment panel">
      <div className="emergency-staff-panel__header">
        <div>
          <p className="workspace-eyebrow">Team of 5</p>
          <h3>Staff Assignment</h3>
        </div>
        <span>{activePatients.length} active</span>
      </div>

      <div className="emergency-staff-panel__workloads" aria-label="Staff workload per person">
        {staffMembers.map((staffMember) => {
          const workload = workloadByName.get(staffMember.name);
          return (
            <div key={staffMember.id} className="emergency-staff-panel__workload">
              <span>
                <strong>{staffMember.name}</strong>
                <small>{staffMember.role}</small>
              </span>
              <b>{workload?.activePatients || 0}</b>
            </div>
          );
        })}
      </div>

      <div className="emergency-staff-panel__assignments" aria-label="Assign patients to staff">
        {activePatients.map((patient) => (
          <label key={patient.id} className="emergency-staff-panel__assignment">
            <span>
              {patient.location || patient.state}
              <small>{patient.state}</small>
            </span>
            <select
              value={patient.assignedTo || ''}
              aria-label={`Assign ${patient.name}`}
              onChange={(event) => onAssignPatient(patient.id, event.target.value)}
            >
              <option value="" disabled>
                Assign to
              </option>
              {staffMembers.map((staffMember) => (
                <option key={staffMember.id} value={staffMember.name}>
                  {staffMember.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}

function ShiftSummaryView({ summary }) {
  return (
    <section className="emergency-shift-summary" aria-label="Shift Summary view">
      <div>
        <p className="workspace-eyebrow">Shift Summary</p>
        <h3>Current urgent care shift</h3>
      </div>
      <dl>
        <div>
          <dt>Patients seen</dt>
          <dd>{summary.patientsSeen}</dd>
        </div>
        <div>
          <dt>Avg wait</dt>
          <dd>{formatWait(summary.averageWaitMinutes)}</dd>
        </div>
        <div>
          <dt>Dispositions</dt>
          <dd>
            {summary.dispositions[PatientState.Disposition] || 0} pending · {summary.dispositions[PatientState.Admission] || 0} admit · {summary.dispositions[PatientState.Discharge] || 0} discharge
          </dd>
        </div>
        <div>
          <dt>Flagged events</dt>
          <dd>{summary.flaggedEvents}</dd>
        </div>
      </dl>
    </section>
  );
}

function EmergencyWhiteboardPatientCard({ patient, auditEvents = [], onMoveToNextState }) {
  const nextState = PatientJourneyEngine.getNextPatientState(patient.state);
  const latestAuditEvent = auditEvents[auditEvents.length - 1];
  const lastMovedLabel = latestAuditEvent
    ? new Date(latestAuditEvent.transitionedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <article
      key={patient.id}
      className={`emergency-whiteboard__patient emergency-whiteboard__patient--${patient.status.tone}`}
    >
      <div className="emergency-whiteboard__patient-header">
        <div>
          <span className="emergency-whiteboard__status">{patient.status.label}</span>
          <h3>{patient.name}</h3>
        </div>
        <span className={priorityClassName(patient.priority)}>{patient.priority}</span>
      </div>

      <dl className="emergency-whiteboard__details">
        <div>
          <dt>Complaint</dt>
          <dd>{patient.complaint}</dd>
        </div>
        <div>
          <dt>Current state</dt>
          <dd>{patient.state}</dd>
        </div>
        <div>
          <dt>Wait time</dt>
          <dd>{formatWait(patient.wait)}</dd>
        </div>
      </dl>

      <div className="emergency-whiteboard__actions">
        <button
          type="button"
          className="workspace-secondary-action emergency-whiteboard__move-button"
          disabled={!nextState}
          onClick={() => onMoveToNextState(patient.id)}
        >
          Move to Next State
        </button>
        <span>
          {nextState ? `Next: ${nextState}` : 'Journey complete'}
          {lastMovedLabel ? ` · Last moved ${lastMovedLabel}` : ''}
        </span>
      </div>
    </article>
  );
}

export default function EmergencyWhiteboard() {
  const { addMessage } = useConversation();
  const lastCapacityAlertScoreRef = useRef(null);
  const [queuePanelCollapsed, setQueuePanelCollapsed] = useState(false);
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [newPatientStep, setNewPatientStep] = useState(1);
  const [newPatientForm, setNewPatientForm] = useState(() => ({
    ...INITIAL_NEW_PATIENT_FORM,
    vitals: { ...INITIAL_NEW_PATIENT_FORM.vitals },
  }));
  const {
    patients,
    journeyAuditTrail,
    whiteboardFilter,
    reassessmentQueue,
    queueCounts,
    capacitySnapshot,
    capacityScore,
    staffMembers,
    staffWorkloads,
    shiftSummary,
    dailyVolume,
    addPatient,
    setWhiteboardFilter,
    clearWhiteboardFilter,
    assignPatientToStaff,
    movePatientToNextState,
  } = useEmergencyDepartment();
  const selectedQueue = whiteboardFilter?.queue || null;
  const selectedComplaint = whiteboardFilter?.complaint || null;

  const patientCards = useMemo(
    () =>
      patients
        .map((patient) => {
          const wait = waitMinutes(patient.arrivalTime);
          const queue = getQueueForPatientState(patient.state);
          return {
            ...patient,
            queue,
            wait,
            status: patientStatus(patient, wait),
          };
        })
        .sort((a, b) => {
          const toneOrder = { red: 0, yellow: 1, green: 2 };
          return toneOrder[a.status.tone] - toneOrder[b.status.tone] || b.wait - a.wait;
        }),
    [patients]
  );

  const activePatientCards = useMemo(
    () => patientCards.filter((patient) => ACTIVE_PATIENT_STATES.has(patient.state)),
    [patientCards]
  );

  const filteredPatientCards = useMemo(
    () => {
      const baseCards = selectedQueue
        ? patientCards.filter((patient) => patient.queue === selectedQueue)
        : activePatientCards;

      if (!selectedComplaint) return baseCards;

      const normalizedComplaint = String(selectedComplaint).toLowerCase();
      return baseCards.filter((patient) =>
        String(patient.complaint || '').toLowerCase().includes(normalizedComplaint)
      );
    },
    [activePatientCards, patientCards, selectedComplaint, selectedQueue]
  );

  const queueEntries = useMemo(
    () =>
      Object.values(QueueType).map((queueType) => {
        const queuedPatients = patientCards.filter((patient) => patient.queue === queueType);
        const totalWait = queuedPatients.reduce((sum, patient) => sum + patient.wait, 0);
        const averageWait = queuedPatients.length ? Math.round(totalWait / queuedPatients.length) : 0;

        return {
          queueType,
          count: queueCounts[queueType] || 0,
          averageWait,
          health: queueHealth(averageWait),
        };
      }),
    [patientCards, queueCounts]
  );
  const scoreSuggestion = CLINICAL_SCORE_BY_COMPLAINT[newPatientForm.complaint] || '';

  useEffect(() => {
    const alertMessage = CapacityIntelligence.getCapacityAlertMessage(capacitySnapshot);
    const shouldAlert = [CapacityScore.Orange, CapacityScore.Red].includes(capacitySnapshot.score);

    if (!shouldAlert) {
      lastCapacityAlertScoreRef.current = null;
      return;
    }

    if (lastCapacityAlertScoreRef.current === capacitySnapshot.score) return;

    lastCapacityAlertScoreRef.current = capacitySnapshot.score;
    addMessage({
      role: 'assistant',
      content: alertMessage,
      metadata: {
        source: 'CapacityIntelligence',
        capacitySnapshot,
      },
    });
  }, [addMessage, capacitySnapshot]);

  const resetNewPatientFlow = () => {
    setNewPatientStep(1);
    setNewPatientForm({
      ...INITIAL_NEW_PATIENT_FORM,
      vitals: { ...INITIAL_NEW_PATIENT_FORM.vitals },
    });
  };

  const closeNewPatientFlow = () => {
    setNewPatientOpen(false);
    resetNewPatientFlow();
  };

  const confirmNewPatient = () => {
    const patient = buildNewPatient({
      patientCount: patients.length,
      complaint: newPatientForm.complaint,
      vitals: newPatientForm.vitals,
    });

    addPatient(patient);
    setWhiteboardFilter({ queue: QueueType.Triage, complaint: null });
    closeNewPatientFlow();
  };

  return (
    <section className="workspace-panel emergency-whiteboard-panel emergency-whiteboard" aria-labelledby="emergency-whiteboard-title">
      <div className="workspace-panel__header emergency-whiteboard__header">
        <div>
          <p className="workspace-eyebrow">Primary workspace screen · Journey controls</p>
          <h2 id="emergency-whiteboard-title">Emergency Whiteboard</h2>
          <p>
            One main panel for a Toronto urgent care flow handling about {dailyVolume} patients/day across chest pain,
            fever, laceration, and abdominal pain presentations.
          </p>
        </div>
        <div className="emergency-whiteboard__header-actions">
          <button
            type="button"
            className="workspace-primary-action emergency-whiteboard__new-patient-button"
            onClick={() => setNewPatientOpen(true)}
          >
            New Patient
          </button>
          <div
            className={`emergency-whiteboard__reassessment-badge${reassessmentQueue.length ? ' emergency-whiteboard__reassessment-badge--active' : ''}`}
            aria-label={`${reassessmentQueue.length} patients in ReassessmentQueue`}
          >
            <span aria-hidden />
            <strong>{reassessmentQueue.length}</strong>
            <small>ReassessmentQueue</small>
          </div>
        </div>
      </div>

      {newPatientOpen ? (
        <NewPatientChatPanel
          step={newPatientStep}
          form={newPatientForm}
          scoreSuggestion={scoreSuggestion}
          onSelectComplaint={(complaint) =>
            setNewPatientForm((currentForm) => ({
              ...currentForm,
              complaint,
            }))
          }
          onVitalsChange={(field, value) =>
            setNewPatientForm((currentForm) => ({
              ...currentForm,
              vitals: {
                ...currentForm.vitals,
                [field]: value,
              },
            }))
          }
          onBack={() => setNewPatientStep((currentStep) => Math.max(1, currentStep - 1))}
          onNext={() => setNewPatientStep((currentStep) => Math.min(4, currentStep + 1))}
          onConfirm={confirmNewPatient}
          onCancel={closeNewPatientFlow}
        />
      ) : null}

      <CapacityBanner snapshot={capacitySnapshot} />

      <ShiftSummaryView summary={shiftSummary} />

      <div className="emergency-whiteboard__topbar" aria-label="Emergency whiteboard summary">
        <div className="emergency-whiteboard__metric">
          <span>Total patients</span>
          <strong>{patients.length}</strong>
          <small>{activePatientCards.length} active patients</small>
        </div>
        <div className={`emergency-whiteboard__metric emergency-whiteboard__metric--${String(capacityScore).toLowerCase()}`}>
          <span>Capacity score</span>
          <strong>{capacityScore}</strong>
          <small>Derived from active load and queue pressure</small>
        </div>
        <div className="emergency-whiteboard__queues" aria-label="Queue counts">
          {queueEntries.map(({ queueType, count }) => (
            <span key={queueType}>
              <strong>{count}</strong> {queueType}
            </span>
          ))}
        </div>
      </div>

      <div className="emergency-whiteboard__filter-summary" aria-live="polite">
        {selectedQueue || selectedComplaint ? (
          <span>
            Showing {filteredPatientCards.length}
            {selectedQueue ? ` ${selectedQueue} queue` : ''}
            {selectedComplaint ? ` ${selectedComplaint}` : ''} patient
            {filteredPatientCards.length === 1 ? '' : 's'}
          </span>
        ) : (
          <span>Showing all active whiteboard patients</span>
        )}
      </div>

      <div className="emergency-whiteboard__legend" aria-label="Whiteboard color legend">
        <span className="emergency-whiteboard__legend-item emergency-whiteboard__legend-item--red">Red = high risk</span>
        <span className="emergency-whiteboard__legend-item emergency-whiteboard__legend-item--yellow">Yellow = waiting too long</span>
        <span className="emergency-whiteboard__legend-item emergency-whiteboard__legend-item--green">Green = stable</span>
      </div>

      <div className="emergency-whiteboard__body">
        <div className="emergency-whiteboard__side-panels">
          <QueuePanel
            queues={queueEntries}
            selectedQueue={selectedQueue}
            collapsed={queuePanelCollapsed}
            onCollapsedChange={setQueuePanelCollapsed}
            onSelectQueue={(queue) => (queue ? setWhiteboardFilter({ queue }) : clearWhiteboardFilter())}
          />
          <StaffAssignmentPanel
            staffMembers={staffMembers}
            workloads={staffWorkloads}
            patients={patients}
            onAssignPatient={assignPatientToStaff}
          />
        </div>
        <div className="emergency-whiteboard__grid" aria-label="Active patient cards">
          {filteredPatientCards.map((patient) => (
            <EmergencyWhiteboardPatientCard
              key={patient.id}
              patient={patient}
              auditEvents={journeyAuditTrail[patient.id]}
              onMoveToNextState={movePatientToNextState}
            />
          ))}
          {!filteredPatientCards.length ? (
            <p className="emergency-whiteboard__empty">No patients currently match this queue filter.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

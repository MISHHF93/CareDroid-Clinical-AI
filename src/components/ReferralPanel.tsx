import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, FilePlus2, Search, Send, XCircle } from 'lucide-react';
import { PatientState } from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { EMERGENCY_ACTIONS } from '../config/emergencyRolePermissions';
import useProfileNavigate from '../hooks/useProfileNavigate';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import { useReferrals } from '../hooks/useEmergencyOs';
import {
  persistEmergencyReferral,
  updateEmergencyTransferWorkflow,
} from '../services/emergencyTransportApi';
import { summarizeReferralAwareness } from './whiteboard/referralAwarenessModel';
import { OPERATIONAL_AUDIT_DOMAIN } from '../config/operationalAuditModel';
import OperationalHistoryPanel from './audit/OperationalHistoryPanel';
import EdDataSourceBanner from './emergency/EdDataSourceBanner';
import ToolApiErrorBanner from './ToolApiErrorBanner';
import { EmergencyRoutePage } from '../pages/emergency/emergencyRouteShared';
import './ReferralPanel.css';

const ACTIVE_STATES = new Set(
  Object.values(PatientState).filter(
    (state) => state !== PatientState.Discharge && state !== PatientState.Deceased
  )
);

const REFERRAL_STATUSES = [
  'Draft',
  'Sent',
  'Acknowledged',
  'InfoRequested',
  'Accepted',
  'TransferRequested',
  'TransportArranged',
  'PatientDeparted',
  'Declined',
  'Completed',
];

const TARGET_DEPARTMENTS = [
  'Cardiology',
  'Neurology',
  'Psychiatry',
  'Internal Medicine',
  'Surgery',
  'ICU',
  'Radiology',
  'Other',
];

const URGENCIES = ['Routine', 'Urgent', 'Emergent'];

const INITIAL_FORM = {
  patientId: '',
  targetDepartment: 'Cardiology',
  urgency: 'Routine',
  reason: '',
  clinicalSummary: '',
  workflow: 'Referral',
};

const STATUS_LABEL = {
  InfoRequested: 'Info Requested',
  TransferRequested: 'Transfer Requested',
  TransportArranged: 'Transport Arranged',
  PatientDeparted: 'Patient Departed',
};

function patientName(patient) {
  return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown patient';
}

function patientSearchText(patient) {
  return [patient.firstName, patient.lastName, patient.mrn, patient.chiefComplaint, patient.complaintCategory]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function latestVitals(vitals) {
  if (Array.isArray(vitals)) return vitals.at(-1) || null;
  return vitals || null;
}

function vitalValue(vitals, ...keys) {
  for (const key of keys) {
    const value = vitals?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function vitalsSummary(vitals) {
  const latest = latestVitals(vitals);
  if (!latest) return 'Vitals unavailable';
  const hr = vitalValue(latest, 'hr', 'heartRate');
  const sbp = vitalValue(latest, 'sbp', 'bpSystolic');
  const dbp = vitalValue(latest, 'dbp', 'bpDiastolic');
  const spo2 = vitalValue(latest, 'spo2', 'oxygenSaturation');
  const rr = vitalValue(latest, 'rr');
  const temp = vitalValue(latest, 'temp', 'temperature');
  const gcs = vitalValue(latest, 'gcs');
  const pain = vitalValue(latest, 'pain', 'painScore');
  return [
    `HR ${hr ?? '--'}`,
    `BP ${sbp ?? '--'}/${dbp ?? '--'}`,
    `SpO2 ${spo2 ?? '--'}${spo2 === undefined ? '' : '%'}`,
    `RR ${rr ?? '--'}`,
    `Temp ${temp ?? '--'}`,
    `GCS ${gcs ?? '--'}`,
    `Pain ${pain ?? '--'}`,
  ].join(', ');
}

function buildClinicalSummary(patient) {
  if (!patient) return '';
  return `${patientName(patient)}, ${patient.age}${patient.sex ? ` ${patient.sex}` : ''}, presenting with ${patient.chiefComplaint}. Current state: ${patient.state}; priority ${patient.priority}; ${vitalsSummary(patient.vitals)}.`;
}

function elapsedMinutes(timestamp, now) {
  const startedAt = new Date(timestamp).getTime();
  if (!Number.isFinite(startedAt)) return 0;
  return Math.max(0, Math.round((now.getTime() - startedAt) / 60000));
}

function formatElapsed(minutes) {
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function urgencyTone(urgency) {
  if (urgency === 'Emergent') return 'critical';
  if (urgency === 'Urgent') return 'warning';
  return 'routine';
}

function statusLabel(status) {
  return STATUS_LABEL[status] || status;
}

function ReferralRow({ referral, patient, now, note, onNoteChange, onStatusChange, onSelectPatient, canUpdateWorkflow, statusChangePending }) {
  const elapsed = formatElapsed(elapsedMinutes(referral.requestedAt, now));
  const needsResponseNote = referral.status === 'Sent';

  return (
    <article className={`referral-row referral-row--${urgencyTone(referral.urgency)}`}>
      <div className="referral-row__patient">
        <strong>{patientName(patient)}</strong>
        <span>{patient?.mrn || 'MRN pending'}</span>
      </div>

      <div className="referral-row__department">
        <strong>{referral.targetDepartment}</strong>
        <span>{referral.reason}</span>
      </div>

      <span className={`referral-row__urgency referral-row__urgency--${urgencyTone(referral.urgency)}`}>
        {referral.urgency}
      </span>

      <time className="referral-row__elapsed" dateTime={referral.requestedAt}>
        <Clock3 size={14} aria-hidden />
        {elapsed}
      </time>

      <span className={`referral-row__status referral-row__status--${referral.status.toLowerCase()}`}>
        {statusLabel(referral.status)}
      </span>

      <div className="referral-row__view">
        <button
          type="button"
          onClick={() => onSelectPatient(patient?.id)}
          disabled={!patient?.id}
          title={patient?.id ? 'Open patient detail' : 'Patient record unavailable'}
        >
          View
        </button>
      </div>

      <p className="referral-row__summary">{referral.clinicalSummary}</p>

      {referral.status === 'Declined' && referral.responseNote ? (
        <p className="referral-row__response">
          <strong>Decline reason:</strong> {referral.responseNote}
        </p>
      ) : null}

      {canUpdateWorkflow && referral.status !== 'Completed' && referral.status !== 'Declined' ? (
        <div className="referral-row__actions">
          {needsResponseNote ? (
            <label className="referral-row__note">
              Response note
              <input
                type="text"
                value={note}
                placeholder="Required for decline, optional for acknowledgement"
                onChange={(event) => onNoteChange(referral.id, event.target.value)}
              />
            </label>
          ) : null}

          {referral.status === 'Draft' ? (
            <button type="button" onClick={() => onStatusChange(referral.id, 'Sent')} disabled={statusChangePending}>
              <Send size={14} aria-hidden />
              Send
            </button>
          ) : null}

          {referral.status === 'Sent' ? (
            <>
              <button
                type="button"
                onClick={() => onStatusChange(referral.id, 'Acknowledged', note)}
                disabled={statusChangePending}
              >
                <CheckCircle2 size={14} aria-hidden />
                Acknowledge
              </button>
              <button
                type="button"
                className="referral-row__decline"
                onClick={() => onStatusChange(referral.id, 'Declined', note)}
                disabled={statusChangePending || !note.trim()}
              >
                <XCircle size={14} aria-hidden />
                Decline
              </button>
            </>
          ) : null}

          {referral.status === 'Acknowledged' ? (
            <button type="button" onClick={() => onStatusChange(referral.id, 'Accepted')} disabled={statusChangePending}>
              <CheckCircle2 size={14} aria-hidden />
              Accept
            </button>
          ) : null}

          {referral.status === 'Accepted' ? (
            <>
              {referral.workflow === 'Transfer' ? (
                <button
                  type="button"
                  onClick={() => onStatusChange(referral.id, 'TransportArranged')}
                  disabled={statusChangePending}
                >
                  Arrange Transport
                </button>
              ) : null}
              {referral.workflow !== 'Transfer' ? (
                <button
                  type="button"
                  onClick={() => onStatusChange(referral.id, 'Completed')}
                  disabled={statusChangePending}
                >
                  <CheckCircle2 size={14} aria-hidden />
                  Complete
                </button>
              ) : null}
            </>
          ) : null}

          {referral.status === 'TransferRequested' ? (
            <button
              type="button"
              onClick={() => onStatusChange(referral.id, 'Accepted')}
              disabled={statusChangePending}
            >
              <CheckCircle2 size={14} aria-hidden />
              Accept Transfer
            </button>
          ) : null}

          {referral.status === 'TransportArranged' ? (
            <button
              type="button"
              onClick={() => onStatusChange(referral.id, 'PatientDeparted')}
              disabled={statusChangePending}
            >
              Patient Departed
            </button>
          ) : null}

          {referral.status === 'PatientDeparted' ? (
            <button
              type="button"
              onClick={() => onStatusChange(referral.id, 'Completed')}
              disabled={statusChangePending}
            >
              <CheckCircle2 size={14} aria-hidden />
              Complete
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export default function ReferralPanel() {
  const emergencyRole = useEmergencyRolePermissions();
  const { profileNavigate } = useProfileNavigate();
  const [searchParams] = useSearchParams();
  const referralsModule = useReferrals();
  const referrals = useEmergencyStore((state) => state.referrals);
  const activeScenarioId = useEmergencyStore((state) => state.activeScenarioId);
  const patients = useEmergencyStore((state) => state.patients);
  const workflowLogs = useEmergencyStore((state) => state.workflowLogs);
  const staff = useEmergencyStore((state) => state.staff);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const createReferral = useEmergencyStore((state) => state.createReferral);
  const updateReferralStatus = useEmergencyStore((state) => state.updateReferralStatus);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const dispatchWebSocketEvent = useEmergencyStore((state) => state.dispatchWebSocketEvent);
  const [now, setNow] = useState(() => new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [patientQuery, setPatientQuery] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);
  const [responseNotes, setResponseNotes] = useState<any>({});
  const [formError, setFormError] = useState('');
  const [backendStatus, setBackendStatus] = useState('');
  const [backendPending, setBackendPending] = useState(false);
  const submitReferralInFlightRef = useRef(false);
  const statusChangeInFlightRef = useRef(false);
  const referralPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.manageReferral);
  const transferPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.manageTransfer);
  const canManageReferral = referralPresentation.enabled;
  const canManageTransfer = transferPresentation.enabled;
  const canUpdateWorkflow =
    (referralPresentation.visible && referralPresentation.enabled) ||
    (transferPresentation.visible && transferPresentation.enabled);
  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const activePatients = useMemo(
    () =>
      patients
        .filter((patient) => ACTIVE_STATES.has(patient.state as any))
        .sort((a, b) => patientName(a).localeCompare(patientName(b))),
    [patients]
  );

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === form.patientId),
    [form.patientId, patients]
  );

  const filteredPatients = useMemo(() => {
    const query = patientQuery.trim().toLowerCase();
    if (!query) return activePatients.slice(0, 6);
    return activePatients.filter((patient) => patientSearchText(patient).includes(query)).slice(0, 8);
  }, [activePatients, patientQuery]);

  const groupedReferrals = useMemo(
    () =>
      REFERRAL_STATUSES.map((status) => ({
        status,
        referrals: referrals
          .filter((referral) => referral.status === status)
          .sort((a, b) => new Date((b as any).requestedAt).getTime() - new Date((a as any).requestedAt).getTime()),
      })),
    [referrals]
  );

  const awareness = useMemo(() => summarizeReferralAwareness(referrals), [referrals]);
  const statusFilter = (searchParams.get('status') || '').toLowerCase();

  const metrics = useMemo(
    () => ({
      active: referrals.filter((referral) => !['Completed', 'Declined'].includes(referral.status))
        .length,
      emergent: referrals.filter(
        (referral) =>
          referral.urgency === 'Emergent' && !['Completed', 'Declined'].includes(referral.status),
      ).length,
      pending: awareness.buckets.pending,
      delayed: awareness.buckets.delayed,
    }),
    [awareness.buckets.delayed, awareness.buckets.pending, referrals],
  );

  const selectFormPatient = (patient) => {
    setForm((current) => ({
      ...current,
      patientId: patient.id,
      clinicalSummary: buildClinicalSummary(patient),
    }));
    setPatientQuery(patientName(patient));
    setFormError('');
  };

  useEffect(() => {
    const patientId = searchParams.get('patientId');
    const patientSearch = searchParams.get('patientSearch');
    const shouldOpenForm = searchParams.get('new') === '1';

    if (!patientId) {
      if (patientSearch) setPatientQuery(patientSearch);
      if (shouldOpenForm && canManageReferral) setFormOpen(true);
      return;
    }

    const patient = patients.find((candidate) => candidate.id === patientId);
    if (!patient) return;

    selectFormPatient(patient);
    setFormOpen(Boolean(shouldOpenForm && canManageReferral));
  }, [canManageReferral, patients, searchParams]);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setPatientQuery('');
    setFormError('');
  };

  const submitReferral = (status) => {
    const isTransfer = form.workflow === 'Transfer' || status === 'TransferRequested';
    if ((isTransfer && !canManageTransfer) || (!isTransfer && !canManageReferral)) {
      setFormError(`${emergencyRole.roleLabel} cannot create this workflow.`);
      return;
    }
    if (!selectedPatient) {
      setFormError('Select an active patient before creating a referral.');
      return;
    }
    if (!form.reason.trim() || !form.clinicalSummary.trim()) {
      setFormError('Add a reason and clinical summary before saving.');
      return;
    }
    if (submitReferralInFlightRef.current) return;
    submitReferralInFlightRef.current = true;

    const payload = {
      patientId: selectedPatient.id,
      requestingStaffId:
        selectedPatient.assignedStaffId || activeShift.chargeStaffId || staff[0]?.id || 'system-referrals',
      targetDepartment: form.targetDepartment,
      urgency: form.urgency,
      reason: form.reason.trim(),
      clinicalSummary: form.clinicalSummary.trim(),
      status,
      workflow: form.workflow,
    };

    const localReferral = createReferral(payload);
    const persistedPayload = {
      ...payload,
      id: localReferral.id,
      requestedAt: localReferral.requestedAt,
      createdAt: localReferral.createdAt,
    };
    setBackendPending(true);
    persistEmergencyReferral(persistedPayload)
      .then((result) => {
        if (result.ok) {
          dispatchWebSocketEvent({ type: 'referrals_updated', payload: result.data });
        }
        setBackendStatus(
          result.ok
            ? 'Referral saved to CareDroid.'
            : 'Referral saved for this shift. Live sync is pending.'
        );
      })
      .catch(() => {
        setBackendStatus('Referral saved for this shift. Live sync is pending.');
      })
      .finally(() => {
        setBackendPending(false);
        submitReferralInFlightRef.current = false;
      });
    resetForm();
    setFormOpen(false);
  };

  const handleStatusChange = (referralId, status, responseNote = '') => {
    // HEAL-265: submitReferral (above) guards against a double-click firing
    // its network call twice with both a synchronous ref check (avoiding
    // the gap before React re-renders the disabled state) and a
    // backendPending-derived `disabled` prop on its own buttons. This
    // sibling handler -- which every ReferralRow status-change button
    // (Accept Transfer, Complete, Arrange Transport, etc.) calls -- had
    // neither: a double-click or double-tap could fire the transfer/
    // referral status sync twice with zero protection.
    if (statusChangeInFlightRef.current) return;
    statusChangeInFlightRef.current = true;
    const referral = referrals.find((item) => item.id === referralId);
    const isTransfer = referral?.workflow === 'Transfer' || ['TransferRequested', 'TransportArranged', 'PatientDeparted'].includes(status);
    if ((isTransfer && !canManageTransfer) || (!isTransfer && !canManageReferral)) {
      setBackendStatus(`${emergencyRole.roleLabel} cannot update this workflow.`);
      statusChangeInFlightRef.current = false;
      return;
    }
    updateReferralStatus(referralId, status, responseNote);
    // Was gated to only the 3 transfer-specific statuses, so a general
    // referral's status change (Sent -> Accepted/Declined, etc.) never
    // reached the backend at all -- the backend route (PATCH
    // emergency/transfers/:id/status -> ReferralService.updateReferralStatus)
    // is workflow-agnostic and already accepts any referral id/status; the
    // frontend's own restriction here was incomplete, not intentional. A
    // synthetic patient-derived referral (never created via a real POST) will
    // 404 gracefully via guardedJson's existing ok:false handling below --
    // same degrade-quietly behavior the transfer case already relied on.
    setBackendPending(true);
    updateEmergencyTransferWorkflow(referralId, status, responseNote)
      .then((result) => {
        setBackendStatus(
          result.ok
            ? `${isTransfer ? 'Transfer workflow' : 'Referral status'} synced to CareDroid.`
            : `${isTransfer ? 'Transfer' : 'Referral'} updated for this shift. Live sync is pending.`
        );
      })
      .catch(() => {
        setBackendStatus(
          `${isTransfer ? 'Transfer' : 'Referral'} updated for this shift. Live sync is pending.`
        );
      })
      .finally(() => {
        setBackendPending(false);
        statusChangeInFlightRef.current = false;
      });
    setResponseNotes((current) => ({ ...current, [referralId]: '' }));
  };

  const handleSelectPatient = (patientId) => {
    if (!patientId) {
      setBackendStatus('Patient record is unavailable for this referral.');
      return;
    }

    selectPatient(patientId);
    profileNavigate(
      `${CANONICAL_ROUTES.emergencyPatients}?patientId=${encodeURIComponent(patientId)}`,
    );
  };

  // Memoized: this element is passed to EmergencyRoutePage's chrome
  // registration, whose effect re-fires whenever the actions identity changes —
  // a fresh element every render re-registered the route chrome every render
  // (HEAL-053's investigation found this churn; harmless under the current
  // chrome model, but wasteful and a hazard for any future registration model).
  const headerActions = useMemo(
    () => (
    <>
      {referralPresentation.visible ? (
        <button
          type="button"
          className="referral-panel__action-btn"
          disabled={!canManageReferral}
          title={
            canManageReferral
              ? 'Create a new referral'
              : `${emergencyRole.roleLabel} cannot create referrals`
          }
          onClick={() => {
            if (!canManageReferral) return;
            setForm((current) => ({ ...current, workflow: 'Referral' }));
            setFormOpen((open) => !open);
          }}
        >
          <FilePlus2 size={16} aria-hidden />
          New Referral
        </button>
      ) : null}
      {transferPresentation.visible ? (
        <button
          type="button"
          className="referral-panel__action-btn"
          disabled={!canManageTransfer}
          title={
            canManageTransfer
              ? 'Create a new transfer request'
              : `${emergencyRole.roleLabel} cannot create transfers`
          }
          onClick={() => {
            if (!canManageTransfer) return;
            setForm((current) => ({
              ...current,
              workflow: 'Transfer',
              targetDepartment: 'Other',
              urgency: 'Urgent',
            }));
            setFormOpen(true);
          }}
        >
          New Transfer
        </button>
      ) : null}
    </>
    ),
    // setForm/setFormOpen are stable useState setters, deliberately omitted.
    [
      referralPresentation.visible,
      transferPresentation.visible,
      canManageReferral,
      canManageTransfer,
      emergencyRole.roleLabel,
    ],
  );

  return (
    <EmergencyRoutePage
      eyebrow="Flow coordination"
      title="Referrals"
      maturity="demo"
      description="Specialty requests, transfer workflows, and delay signals."
      actions={headerActions}
    >
      <div className="referral-panel__content">
      <EdDataSourceBanner
        envelope={referralsModule.data}
        loading={referralsModule.loading}
        error={referralsModule.error}
        activeScenarioId={activeScenarioId}
        compact
      />

      {referralsModule.loading && !referrals.length ? (
        <p className="referral-panel__backend-status" role="status">
          Loading CareDroid referrals...
        </p>
      ) : null}
      {referralsModule.error ? (
        // HEAL-274: this banner previously had no retry affordance at all --
        // unlike the whiteboard page's onRetry/retryLabel="Refresh board"
        // pattern (index.tsx), a slow/failed referral fetch left staff with
        // no way to re-trigger it short of a full page reload.
        <ToolApiErrorBanner
          message={`${referralsModule.error.replace(/\.+\s*$/, '')}. Showing the last local referral queue; confirm live referral status before external handoff.`}
          onRetry={() => void referralsModule.refresh()}
          retryLabel="Retry referral sync"
        />
      ) : null}
      <div className="referral-panel__metrics" aria-label="Referral metrics">
        <div>
          <span>Active</span>
          <strong>{metrics.active}</strong>
        </div>
        <div>
          <span>Pending</span>
          <strong>{metrics.pending}</strong>
        </div>
        <div>
          <span>Delayed</span>
          <strong>{metrics.delayed}</strong>
        </div>
        <div>
          <span>Emergent</span>
          <strong>{metrics.emergent}</strong>
        </div>
      </div>

      <OperationalHistoryPanel
        logs={workflowLogs}
        title="Referral history"
        description="Referral creation and status changes from workflow audit data."
        domains={[OPERATIONAL_AUDIT_DOMAIN.REFERRAL]}
        limit={8}
      />

      {statusFilter ? (
        <p className="referral-panel__backend-status" role="status">
          Showing {statusFilter} referrals from whiteboard awareness.
        </p>
      ) : null}

      {backendStatus || backendPending ? (
        backendStatus?.includes('failed') ? (
          <p className="referral-panel__backend-status" role="alert">
            {backendPending ? 'Syncing referral workflow with backend...' : backendStatus}
          </p>
        ) : (
          <p className="referral-panel__backend-status" role="status">
            {backendPending ? 'Syncing referral workflow with backend...' : backendStatus}
          </p>
        )
      ) : null}

      {formOpen ? (
        <form className="referral-form" onSubmit={(event) => event.preventDefault()}>
          <div className="referral-form__header">
            <div>
              <span>{form.workflow === 'Transfer' ? 'New Transfer' : 'New Referral'}</span>
              <h2>{form.workflow === 'Transfer' ? 'Inter-Facility Transfer' : 'Consult Request'}</h2>
            </div>
            <button type="button" onClick={() => setFormOpen(false)}>
              Close
            </button>
          </div>

          <label className="referral-form__search">
            Patient selector
            <div>
              <Search size={15} aria-hidden />
              <input
                type="search"
                value={patientQuery}
                placeholder="Search active patients by name, MRN, complaint..."
                onChange={(event) => setPatientQuery(event.target.value)}
              />
            </div>
          </label>

          <div className="referral-form__patient-results" aria-label="Active patient search results">
            {filteredPatients.length ? (
              filteredPatients.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  className={patient.id === form.patientId ? 'referral-form__patient--selected' : ''}
                  onClick={() => selectFormPatient(patient)}
                >
                  <strong>{patientName(patient)}</strong>
                  <span>
                    {patient.mrn} · {patient.chiefComplaint}
                  </span>
                </button>
              ))
            ) : (
              <p className="referral-form__empty">No active patients match this search.</p>
            )}
          </div>

          <div className="referral-form__grid">
            <label>
              Target department
              <select
                value={form.targetDepartment}
                onChange={(event) =>
                  setForm((current) => ({ ...current, targetDepartment: event.target.value }))
                }
              >
                {TARGET_DEPARTMENTS.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Urgency
              <select
                value={form.urgency}
                onChange={(event) => setForm((current) => ({ ...current, urgency: event.target.value }))}
              >
                {URGENCIES.map((urgency) => (
                  <option key={urgency} value={urgency}>
                    {urgency}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Reason
            <input
              type="text"
              value={form.reason}
              placeholder="Clinical reason for referral"
              onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
            />
          </label>

          <label>
            Clinical summary
            <textarea
              value={form.clinicalSummary}
              placeholder="Select a patient to auto-populate from complaint and vitals."
              onChange={(event) =>
                setForm((current) => ({ ...current, clinicalSummary: event.target.value }))
              }
            />
          </label>

          <div className="referral-form__actions">
            {formError ? <p role="alert">{formError}</p> : null}
            <button
              type="button"
              onClick={() => {
                if (!canUpdateWorkflow) {
                  setFormError(`${emergencyRole.roleLabel} cannot update referral forms.`);
                  return;
                }
                if (!selectedPatient) {
                  setFormError('Select a patient to auto-fill a clinical summary.');
                  return;
                }
                setFormError('');
                setForm((current) => ({ ...current, clinicalSummary: buildClinicalSummary(selectedPatient) }));
              }}
            >
              Auto-fill summary
            </button>
            {form.workflow === 'Referral' ? (
              <button type="button" onClick={() => submitReferral('Draft')} disabled={backendPending || !canManageReferral}>
                Save Draft
              </button>
            ) : null}
            {form.workflow === 'Transfer' ? (
              <button type="button" className="referral-form__send" onClick={() => submitReferral('TransferRequested')} disabled={backendPending || !canManageTransfer}>
                Request Transfer
              </button>
            ) : (
              <button type="button" className="referral-form__send" onClick={() => submitReferral('Sent')} disabled={backendPending || !canManageReferral}>
                <Send size={14} aria-hidden />
                {backendPending ? 'Sending...' : 'Send Referral'}
              </button>
            )}
          </div>
        </form>
      ) : null}

      <div className="referral-panel__groups">
        {!referrals.length ? (
          <p className="referral-group__empty">No active referrals in the current CareDroid workflow state.</p>
        ) : statusFilter && awareness.grouped[statusFilter]?.length ? (
          <section className="referral-group" aria-labelledby={`referrals-filter-${statusFilter}`}>
            <div className="referral-group__heading">
              <h2 id={`referrals-filter-${statusFilter}`}>{statusLabel(statusFilter)} referrals</h2>
              <span>{awareness.grouped[statusFilter].length}</span>
            </div>
            <div className="referral-group__rows">
              {awareness.grouped[statusFilter].map((referral) => (
                <ReferralRow
                  key={referral.id}
                  referral={referral}
                  patient={patients.find((patient) => patient.id === referral.patientId)}
                  now={now}
                  note={responseNotes[referral.id] || ''}
                  onNoteChange={(referralId, value) =>
                    setResponseNotes((current) => ({ ...current, [referralId]: value }))
                  }
                  onStatusChange={handleStatusChange}
                  onSelectPatient={handleSelectPatient}
                  canUpdateWorkflow={canUpdateWorkflow}
                  statusChangePending={backendPending}
                />
              ))}
            </div>
          </section>
        ) : groupedReferrals.map((group) => (
          <section key={group.status} className="referral-group" aria-labelledby={`referrals-${group.status}`}>
            <div className="referral-group__heading">
              <h2 id={`referrals-${group.status}`}>{statusLabel(group.status)}</h2>
              <span>{group.referrals.length}</span>
            </div>

            <div className="referral-group__rows">
              {group.referrals.length ? (
                group.referrals.map((referral) => (
                  <ReferralRow
                    key={referral.id}
                    referral={referral}
                    patient={patients.find((patient) => patient.id === referral.patientId)}
                    now={now}
                    note={responseNotes[referral.id] || ''}
                    onNoteChange={(referralId, value) =>
                      setResponseNotes((current) => ({ ...current, [referralId]: value }))
                    }
                    onStatusChange={handleStatusChange}
                    onSelectPatient={handleSelectPatient}
                    canUpdateWorkflow={canUpdateWorkflow}
                    statusChangePending={backendPending}
                  />
                ))
              ) : (
                <p className="referral-group__empty">No {group.status.toLowerCase()} referrals.</p>
              )}
            </div>
          </section>
        ))}
      </div>
      </div>
    </EmergencyRoutePage>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, FilePlus2, Search, Send, XCircle } from 'lucide-react';
import { PatientState } from '../../types/emergency';
import { useEmergencyStore } from '../../store/emergencyStore';
import './ReferralPanel.css';

const ACTIVE_STATES = new Set(
  Object.values(PatientState).filter(
    (state) => state !== PatientState.Discharge && state !== PatientState.Deceased
  )
);

const REFERRAL_STATUSES = ['Draft', 'Sent', 'Acknowledged', 'Accepted', 'Declined', 'Completed'];

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

function vitalsSummary(vitals) {
  if (!vitals) return 'Vitals unavailable';
  return [
    `HR ${vitals.hr ?? '--'}`,
    `BP ${vitals.bpSystolic ?? '--'}/${vitals.bpDiastolic ?? '--'}`,
    `SpO2 ${vitals.spo2 ?? '--'}${vitals.spo2 === null || vitals.spo2 === undefined ? '' : '%'}`,
    `RR ${vitals.rr ?? '--'}`,
    `Temp ${vitals.temp ?? '--'}`,
    `GCS ${vitals.gcs ?? '--'}`,
    `Pain ${vitals.pain ?? '--'}`,
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

function ReferralRow({ referral, patient, now, note, onNoteChange, onStatusChange, onSelectPatient }) {
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
        {referral.status}
      </span>

      <div className="referral-row__view">
        <button type="button" onClick={() => onSelectPatient(patient?.id)}>
          View
        </button>
      </div>

      <p className="referral-row__summary">{referral.clinicalSummary}</p>

      {referral.status === 'Declined' && referral.responseNote ? (
        <p className="referral-row__response">
          <strong>Decline reason:</strong> {referral.responseNote}
        </p>
      ) : null}

      {referral.status !== 'Completed' && referral.status !== 'Declined' ? (
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
            <button type="button" onClick={() => onStatusChange(referral.id, 'Sent')}>
              <Send size={14} aria-hidden />
              Send
            </button>
          ) : null}

          {referral.status === 'Sent' ? (
            <>
              <button type="button" onClick={() => onStatusChange(referral.id, 'Acknowledged', note)}>
                <CheckCircle2 size={14} aria-hidden />
                Acknowledge
              </button>
              <button
                type="button"
                className="referral-row__decline"
                onClick={() => onStatusChange(referral.id, 'Declined', note)}
                disabled={!note.trim()}
              >
                <XCircle size={14} aria-hidden />
                Decline
              </button>
            </>
          ) : null}

          {referral.status === 'Acknowledged' ? (
            <button type="button" onClick={() => onStatusChange(referral.id, 'Accepted')}>
              <CheckCircle2 size={14} aria-hidden />
              Accept
            </button>
          ) : null}

          {referral.status === 'Accepted' ? (
            <button type="button" onClick={() => onStatusChange(referral.id, 'Completed')}>
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
  const [searchParams] = useSearchParams();
  const referrals = useEmergencyStore((state) => state.referrals);
  const patients = useEmergencyStore((state) => state.patients);
  const staff = useEmergencyStore((state) => state.staff);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const createReferral = useEmergencyStore((state) => state.createReferral);
  const updateReferralStatus = useEmergencyStore((state) => state.updateReferralStatus);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const [now, setNow] = useState(() => new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [patientQuery, setPatientQuery] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);
  const [responseNotes, setResponseNotes] = useState({});
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const activePatients = useMemo(
    () =>
      patients
        .filter((patient) => ACTIVE_STATES.has(patient.state))
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
          .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()),
      })),
    [referrals]
  );

  const metrics = useMemo(
    () => ({
      active: referrals.filter((referral) => !['Completed', 'Declined'].includes(referral.status))
        .length,
      emergent: referrals.filter(
        (referral) => referral.urgency === 'Emergent' && !['Completed', 'Declined'].includes(referral.status)
      ).length,
      awaitingResponse: referrals.filter((referral) => referral.status === 'Sent').length,
      accepted: referrals.filter((referral) => referral.status === 'Accepted').length,
    }),
    [referrals]
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
      if (shouldOpenForm) setFormOpen(true);
      return;
    }

    const patient = patients.find((candidate) => candidate.id === patientId);
    if (!patient) return;

    selectFormPatient(patient);
    setFormOpen(shouldOpenForm);
  }, [patients, searchParams]);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setPatientQuery('');
    setFormError('');
  };

  const submitReferral = (status) => {
    if (!selectedPatient) {
      setFormError('Select an active patient before creating a referral.');
      return;
    }
    if (!form.reason.trim() || !form.clinicalSummary.trim()) {
      setFormError('Add a reason and clinical summary before saving.');
      return;
    }

    createReferral({
      patientId: selectedPatient.id,
      requestingStaffId:
        selectedPatient.assignedStaffId || activeShift.chargeStaffId || staff[0]?.id || 'system-referrals',
      targetDepartment: form.targetDepartment,
      urgency: form.urgency,
      reason: form.reason.trim(),
      clinicalSummary: form.clinicalSummary.trim(),
      status,
    });
    resetForm();
    setFormOpen(false);
  };

  const handleStatusChange = (referralId, status, responseNote = '') => {
    updateReferralStatus(referralId, status, responseNote);
    setResponseNotes((current) => ({ ...current, [referralId]: '' }));
  };

  const handleSelectPatient = (patientId) => {
    if (patientId) selectPatient(patientId);
  };

  return (
    <section className="referral-panel" aria-labelledby="referral-panel-title">
      <header className="referral-panel__header">
        <div>
          <span>Referral Intelligence</span>
          <h1 id="referral-panel-title">Referrals</h1>
        </div>
        <div className="referral-panel__header-actions">
          <strong aria-label={`${metrics.active} active referrals`}>{metrics.active}</strong>
          <button type="button" onClick={() => setFormOpen((open) => !open)}>
            <FilePlus2 size={16} aria-hidden />
            New Referral
          </button>
        </div>
      </header>

      <div className="referral-panel__metrics" aria-label="Referral metrics">
        <div>
          <span>Active</span>
          <strong>{metrics.active}</strong>
        </div>
        <div>
          <span>Awaiting Response</span>
          <strong>{metrics.awaitingResponse}</strong>
        </div>
        <div>
          <span>Emergent</span>
          <strong>{metrics.emergent}</strong>
        </div>
        <div>
          <span>Accepted</span>
          <strong>{metrics.accepted}</strong>
        </div>
      </div>

      {formOpen ? (
        <form className="referral-form" onSubmit={(event) => event.preventDefault()}>
          <div className="referral-form__header">
            <div>
              <span>New Referral</span>
              <h2>Consult Request</h2>
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
            {filteredPatients.map((patient) => (
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
            ))}
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
            <button type="button" onClick={() => setForm((current) => ({ ...current, clinicalSummary: buildClinicalSummary(selectedPatient) }))}>
              Auto-fill summary
            </button>
            <button type="button" onClick={() => submitReferral('Draft')}>
              Save Draft
            </button>
            <button type="button" className="referral-form__send" onClick={() => submitReferral('Sent')}>
              <Send size={14} aria-hidden />
              Send Referral
            </button>
          </div>
        </form>
      ) : null}

      <div className="referral-panel__groups">
        {groupedReferrals.map((group) => (
          <section key={group.status} className="referral-group" aria-labelledby={`referrals-${group.status}`}>
            <div className="referral-group__heading">
              <h2 id={`referrals-${group.status}`}>{group.status}</h2>
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
                  />
                ))
              ) : (
                <p className="referral-group__empty">No {group.status.toLowerCase()} referrals.</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

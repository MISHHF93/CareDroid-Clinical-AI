import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, FileScan, Link2, UserPlus, UserRoundX } from 'lucide-react';
import { useEmergencyStore } from '../../../store/emergencyStore';
import { EMERGENCY_ACTIONS } from '../../config/emergencyRolePermissions';
import { SMART_INTAKE_DEMO } from '../../data/smartIntakeFixtures';
import { buildSmartIntakeVerticalSlicePatient } from '../../data/smartIntakeVerticalSlice';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import SmartIntakeApi from '../../services/smartIntakeApi';
import './SmartIntake.css';

const STATUS_LABEL = {
  verified: 'Verified',
  unverified: 'Unverified',
  conflicting: 'Conflict',
  missing: 'Missing',
  overridden: 'Staff override',
};

function fieldTone(status) {
  if (status === 'verified') return 'verified';
  if (status === 'conflicting') return 'conflicting';
  if (status === 'missing') return 'missing';
  if (status === 'overridden') return 'overridden';
  return 'unverified';
}

function extractedFieldValue(fieldName, fallback = '') {
  return (
    SMART_INTAKE_DEMO.extractedFields.find((field) => field.field === fieldName)?.extracted ||
    fallback
  );
}

function ageFromDob(dob) {
  const date = new Date(`${dob}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDelta = today.getMonth() - date.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < date.getDate())) age -= 1;
  return Math.max(0, age);
}

function buildSmartIntakePatient(sessionId, label = 'Smart Intake patient') {
  const now = new Date().toISOString();
  const dob = extractedFieldValue('dateOfBirth', '');
  const firstName =
    label === 'Unknown Patient' ? 'Unknown' : extractedFieldValue('firstName', 'Smart');
  const lastName =
    label === 'Unknown Patient' ? 'Patient' : extractedFieldValue('lastName', 'Intake');
  return buildSmartIntakeVerticalSlicePatient({
    patientId: `smart-intake-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    mrn: extractedFieldValue('healthCardNumber', `SI-${Date.now()}`),
    identity: {
      firstName,
      lastName,
      dob,
      sex: extractedFieldValue('sex', 'Unspecified'),
    },
    age: ageFromDob(dob),
    sessionId,
    timestamp: now,
    source: label,
    complaintCategory: 'Other',
    complaintText: 'Smart Intake identity review',
  });
}

export default function SmartIntake() {
  const emergencyRole = useEmergencyRolePermissions();
  const navigate = useNavigate();
  const addPatient = useEmergencyStore((state) => state.addPatient);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedCandidateId, setSelectedCandidateId] = useState(
    SMART_INTAKE_DEMO.candidates[0]?.patientId || null,
  );
  const [sessionId, setSessionId] = useState(SMART_INTAKE_DEMO.sessionId);
  const [statusMessage, setStatusMessage] = useState(
    'Demo review loaded. Backend API is used when Mongoose Emergency OS runtime is enabled.',
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [pendingAction, setPendingAction] = useState('');
  const [fieldDecisions, setFieldDecisions] = useState(() =>
    Object.fromEntries(
      SMART_INTAKE_DEMO.extractedFields.map((field) => [field.field, field.status]),
    ),
  );
  const canVerifyIntake = emergencyRole.can(EMERGENCY_ACTIONS.verifyIntake);
  const canCreatePatient = emergencyRole.can(EMERGENCY_ACTIONS.createPatient);

  const verificationComplete = useMemo(
    () =>
      Object.values(fieldDecisions).every((status) => ['verified', 'overridden'].includes(status)),
    [fieldDecisions],
  );

  const startBackendSession = async () => {
    if (!canVerifyIntake) {
      setErrorMessage(`${emergencyRole.roleLabel} cannot start Smart Intake review.`);
      return;
    }
    setIsStarting(true);
    setErrorMessage('');
    try {
      const result = await SmartIntakeApi.createSession('Smart Intake RN');
      setSessionId(result.sessionId || result.session?._id || SMART_INTAKE_DEMO.sessionId);
      setStatusMessage('Backend Smart Intake session created.');
      setActiveStep(1);
    } catch (error) {
      setErrorMessage(`Backend Smart Intake unavailable: ${error.message}`);
      setStatusMessage(`Using local demo workflow: ${error.message}`);
      setActiveStep(1);
    } finally {
      setIsStarting(false);
    }
  };

  const updateDecision = (field, decision) => {
    if (!canVerifyIntake) return;
    setFieldDecisions((current) => ({
      ...current,
      [field]:
        decision === 'edited' ? 'overridden' : decision === 'approved' ? 'verified' : 'missing',
    }));
  };

  const addSmartIntakePatientToWhiteboard = (label) => {
    if (!canCreatePatient) return null;
    const patient = buildSmartIntakePatient(sessionId, label);
    const timeline = patient.timeline.map((event) => ({ ...event, patientId: patient.id }));
    addPatient(
      {
        ...patient,
        vitals: Array.isArray(patient.vitals) ? patient.vitals : [patient.vitals],
        timeline,
      },
      { syncToBackend: false },
    );
    selectPatient(patient.id);
    navigate('/emergency/patients');
    return patient;
  };

  const completeFinalAction = async (actionLabel, backendAction, localCompletion) => {
    if (!canCreatePatient) {
      setErrorMessage(
        `${emergencyRole.roleLabel} cannot create or link patients from Smart Intake.`,
      );
      return;
    }
    setPendingAction(actionLabel);
    setErrorMessage('');
    try {
      const result = await backendAction();
      localCompletion?.(result);
      setStatusMessage(
        `${actionLabel} confirmed for session ${result.sessionId || sessionId}. Identity audit trail updated for human review.`,
      );
    } catch (error) {
      localCompletion?.(null);
      setErrorMessage(`Backend confirmation failed: ${error.message}`);
      setStatusMessage(
        `${actionLabel} recorded locally for session ${sessionId}. Backend confirmation is pending human review.`,
      );
    } finally {
      setActiveStep(SMART_INTAKE_DEMO.steps.length - 1);
      setPendingAction('');
    }
  };

  const selectedCandidate = SMART_INTAKE_DEMO.candidates.find(
    (candidate) => candidate.patientId === selectedCandidateId,
  );

  return (
    <section className="smart-intake" aria-labelledby="smart-intake-title">
      <header className="smart-intake__hero">
        <div>
          <span>Emergency OS</span>
          <h1 id="smart-intake-title">Smart Intake Identity Review</h1>
          <p>
            Verify extracted identity, medication, allergy, EMS, and referral evidence before
            creating, linking, or continuing as an unknown patient.
          </p>
        </div>
        <button
          type="button"
          onClick={startBackendSession}
          disabled={isStarting || !canVerifyIntake}
        >
          <FileScan size={18} aria-hidden />
          {isStarting ? 'Starting...' : 'Start Intake'}
        </button>
      </header>

      <ol className="smart-intake__steps" aria-label="Smart Intake steps">
        {SMART_INTAKE_DEMO.steps.map((step, index) => (
          <li key={step} className={index <= activeStep ? 'smart-intake__step--active' : ''}>
            <button
              type="button"
              onClick={() => setActiveStep(index)}
              aria-current={index === activeStep ? 'step' : undefined}
            >
              <span>{index + 1}</span>
              {step}
            </button>
          </li>
        ))}
      </ol>

      <div className="smart-intake__status" role="status">
        <strong>Session:</strong> {sessionId} · {statusMessage}
      </div>
      {errorMessage ? (
        <div className="smart-intake__status smart-intake__status--error" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <div className="smart-intake__grid">
        <section className="smart-intake__panel" aria-labelledby="extracted-title">
          <header>
            <h2 id="extracted-title">Extracted vs Existing Data</h2>
            <p>Critical fields must be approved, rejected, or edited before the final action.</p>
          </header>
          <div className="smart-intake__field-list">
            {SMART_INTAKE_DEMO.extractedFields.map((field) => {
              const tone = fieldTone(fieldDecisions[field.field]);
              return (
                <article
                  key={field.field}
                  className={`smart-intake__field smart-intake__field--${tone}`}
                >
                  <div>
                    <strong>{field.field}</strong>
                    <span>{field.source}</span>
                  </div>
                  <dl>
                    <div>
                      <dt>Extracted</dt>
                      <dd>{field.extracted || 'Missing'}</dd>
                    </div>
                    <div>
                      <dt>Existing</dt>
                      <dd>{field.existing || 'No existing value'}</dd>
                    </div>
                  </dl>
                  <footer>
                    <span>{STATUS_LABEL[tone]}</span>
                    <button
                      type="button"
                      onClick={() => updateDecision(field.field, 'approved')}
                      disabled={!canVerifyIntake}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDecision(field.field, 'edited')}
                      disabled={!canVerifyIntake}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDecision(field.field, 'rejected')}
                      disabled={!canVerifyIntake}
                    >
                      Reject
                    </button>
                  </footer>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="smart-intake__panel" aria-labelledby="match-title">
          <header>
            <h2 id="match-title">Patient Match Candidates</h2>
            <p>Ranked candidates only. The system never auto-links without staff confirmation.</p>
          </header>
          <div className="smart-intake__candidate-list">
            {SMART_INTAKE_DEMO.candidates.map((candidate) => (
              <button
                key={candidate.patientId}
                type="button"
                className={
                  candidate.patientId === selectedCandidateId
                    ? 'smart-intake__candidate--selected'
                    : ''
                }
                onClick={() => setSelectedCandidateId(candidate.patientId)}
              >
                <strong>{candidate.displayName}</strong>
                <span>{candidate.matchScore}% match</span>
                <small>Matched: {candidate.matchedFields.join(', ')}</small>
                <small>Conflicts: {candidate.conflictingFields.join(', ') || 'none'}</small>
              </button>
            ))}
          </div>

          {selectedCandidate ? (
            <div className="smart-intake__match-explanation">
              <AlertTriangle size={18} aria-hidden />
              <p>
                {selectedCandidate.displayName} is recommended for{' '}
                <strong>{selectedCandidate.recommendedAction.replace(/_/g, ' ')}</strong>. Staff
                must confirm before linking or creating a duplicate record.
              </p>
            </div>
          ) : null}

          <div className="smart-intake__warnings">
            {SMART_INTAKE_DEMO.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        </aside>
      </div>

      <section className="smart-intake__actions" aria-label="Final Smart Intake actions">
        <button
          type="button"
          disabled={
            !verificationComplete ||
            !selectedCandidate ||
            Boolean(pendingAction) ||
            !canCreatePatient
          }
          onClick={() =>
            completeFinalAction(
              `Linked ${selectedCandidate?.displayName || 'selected patient'}`,
              () =>
                SmartIntakeApi.linkPatient(
                  sessionId,
                  selectedCandidate.patientId,
                  'Smart Intake RN',
                ),
              () => {
                selectPatient(selectedCandidate.patientId);
                navigate('/emergency/patients');
              },
            )
          }
        >
          <Link2 size={17} aria-hidden />
          {pendingAction.startsWith('Linked') ? 'Linking...' : 'Link to Existing Patient'}
        </button>
        <button
          type="button"
          disabled={!verificationComplete || Boolean(pendingAction) || !canCreatePatient}
          onClick={() =>
            completeFinalAction(
              'Create-new-patient intake',
              () => SmartIntakeApi.createPatient(sessionId, 'Smart Intake RN'),
              () => addSmartIntakePatientToWhiteboard('Smart Intake patient'),
            )
          }
        >
          <UserPlus size={17} aria-hidden />
          {pendingAction === 'Create-new-patient intake' ? 'Sending...' : 'Send New Patient Input'}
        </button>
        <button
          type="button"
          disabled={Boolean(pendingAction) || !canCreatePatient}
          onClick={() =>
            completeFinalAction(
              'Unknown-patient intake',
              () => SmartIntakeApi.continueUnknown(sessionId, 'Unknown Patient', 'Smart Intake RN'),
              () => addSmartIntakePatientToWhiteboard('Unknown Patient'),
            )
          }
        >
          <UserRoundX size={17} aria-hidden />
          {pendingAction === 'Unknown-patient intake'
            ? 'Recording...'
            : 'Continue as Unknown Patient'}
        </button>
        <button
          type="button"
          disabled={!verificationComplete || Boolean(pendingAction)}
          onClick={() =>
            completeFinalAction(
              'Sent-to-triage intake',
              () => SmartIntakeApi.createPatient(sessionId, 'Smart Intake RN'),
              () => addSmartIntakePatientToWhiteboard('Smart Intake triage patient'),
            )
          }
        >
          <CheckCircle2 size={17} aria-hidden />
          {pendingAction === 'Sent-to-triage intake' ? 'Sending...' : 'Send to Triage'}
        </button>
      </section>

      <section className="smart-intake__audit" aria-label="Patient identity audit log">
        <h2>Identity Audit Log</h2>
        {SMART_INTAKE_DEMO.auditLog.map((entry) => (
          <span key={entry}>{entry}</span>
        ))}
      </section>
    </section>
  );
}

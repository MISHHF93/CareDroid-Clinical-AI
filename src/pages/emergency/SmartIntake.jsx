import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, FileScan, Link2, UserPlus, UserRoundX } from 'lucide-react';
import { useEmergencyStore } from '../../store/emergencyStore';
import { EMERGENCY_ACTIONS, prefersReceptionForPatientCreate } from '../../config/emergencyRolePermissions';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { isBackendCapabilityEnabled } from '../../config/backendApiCapabilities';
import { SMART_INTAKE_DEMO } from '../../data/smartIntakeFixtures';
import { buildSmartIntakeVerticalSlicePatient } from '../../data/smartIntakeVerticalSlice';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import { fetchSmartIntake, runSmartIntakeVerticalSlice } from '../../services/emergencyOsApi';
import SmartIntakeApi from '../../services/smartIntakeApi';
import { completeReceptionHandoff } from '../../services/receptionHandoff';
import { findDuplicateCandidates, mergeDuplicateCandidates } from '../../utils/patientDuplicateDetection';
import './SmartIntake.css';

const STEP_INDEX_BY_QUERY = Object.freeze({
  capture: 1,
  ocr: 2,
  match: 3,
  verify: 4,
  finalize: 5,
});

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
  const [searchParams] = useSearchParams();
  const store = useEmergencyStore();
  const addPatient = useEmergencyStore((state) => state.addPatient);
  const hydrateFromApi = useEmergencyStore((state) => state.hydrateFromApi);
  const patients = useEmergencyStore((state) => state.patients);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const fromReception = searchParams.get('from') === 'reception';
  const contextPatientId = searchParams.get('patientId') || '';
  const [activeStep, setActiveStep] = useState(() => {
    const stepParam = searchParams.get('step');
    return STEP_INDEX_BY_QUERY[stepParam] ?? 0;
  });
  const [selectedCandidateId, setSelectedCandidateId] = useState(
    () => SMART_INTAKE_DEMO.candidates[0]?.patientId || null,
  );
  const [sessionId, setSessionId] = useState(SMART_INTAKE_DEMO.sessionId);
  const [statusMessage, setStatusMessage] = useState(
    'Identity evidence is ready for staff verification.',
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [pendingAction, setPendingAction] = useState('');
  const [remoteMatchCandidates, setRemoteMatchCandidates] = useState([]);
  const [fieldDecisions, setFieldDecisions] = useState(() =>
    Object.fromEntries(
      SMART_INTAKE_DEMO.extractedFields.map((field) => [field.field, field.status]),
    ),
  );
  const canVerifyIntake = emergencyRole.can(EMERGENCY_ACTIONS.verifyIntake);
  const canCreatePatient = emergencyRole.can(EMERGENCY_ACTIONS.createPatient);

  const intakeDemographics = useMemo(
    () => ({
      firstName: extractedFieldValue('firstName'),
      lastName: extractedFieldValue('lastName'),
      dateOfBirth: extractedFieldValue('dateOfBirth'),
      sex: extractedFieldValue('sex'),
      phone: extractedFieldValue('phone'),
      healthCardNumber: extractedFieldValue('healthCardNumber'),
      address: extractedFieldValue('address'),
    }),
    [],
  );

  const matchCandidates = useMemo(() => {
    const localCandidates = findDuplicateCandidates(patients, intakeDemographics);
    const merged = mergeDuplicateCandidates(localCandidates, remoteMatchCandidates);
    return merged.length ? merged : [...SMART_INTAKE_DEMO.candidates];
  }, [patients, intakeDemographics, remoteMatchCandidates]);

  useEffect(() => {
    if (!sessionReady || !canVerifyIntake) return;
    if (!isBackendCapabilityEnabled('emergencySmartIntakeIdentitySession')) return;
    void SmartIntakeApi.matchPatient(sessionId, emergencyRole.roleLabel)
      .then((result) => {
        const apiCandidates = result?.candidates || result?.data?.candidates || [];
        setRemoteMatchCandidates(Array.isArray(apiCandidates) ? apiCandidates : []);
      })
      .catch(() => setRemoteMatchCandidates([]));
  }, [sessionReady, sessionId, canVerifyIntake, emergencyRole.roleLabel]);

  useEffect(() => {
    if (contextPatientId) return;
    const topCandidate = matchCandidates[0];
    if (!topCandidate) return;
    setSelectedCandidateId((current) =>
      matchCandidates.some((candidate) => candidate.patientId === current)
        ? current
        : topCandidate.patientId,
    );
  }, [contextPatientId, matchCandidates]);

  useEffect(() => {
    if (!fromReception && prefersReceptionForPatientCreate(emergencyRole.role)) {
      navigate(CANONICAL_ROUTES.emergencyReception, { replace: true });
    }
  }, [emergencyRole.role, fromReception, navigate]);

  useEffect(() => {
    if (!contextPatientId) return;
    selectPatient(contextPatientId);
    const boardPatient = patients.find((candidate) => candidate.id === contextPatientId);
    if (boardPatient) {
      setSelectedCandidateId(contextPatientId);
      setFieldDecisions((current) => ({
        ...current,
        firstName: boardPatient.firstName ? 'verified' : current.firstName,
        lastName: boardPatient.lastName ? 'verified' : current.lastName,
        dateOfBirth: boardPatient.dob ? 'verified' : current.dateOfBirth,
        healthCardNumber: boardPatient.mrn ? 'verified' : current.healthCardNumber,
        sex: boardPatient.sex ? 'verified' : current.sex,
      }));
      setStatusMessage(
        `Verifying ${[boardPatient.firstName, boardPatient.lastName].filter(Boolean).join(' ') || boardPatient.mrn || 'selected patient'} from reception queue.`,
      );
      return;
    }
    const matchedCandidate = matchCandidates.find(
      (candidate) => candidate.patientId === contextPatientId,
    );
    if (matchedCandidate) setSelectedCandidateId(matchedCandidate.patientId);
  }, [contextPatientId, matchCandidates, patients, selectPatient]);

  useEffect(() => {
    if (!fromReception || searchParams.get('mode') !== 'unknown') return;
    setActiveStep(STEP_INDEX_BY_QUERY.finalize);
    setStatusMessage('Unknown patient arrival — staff must confirm before creating a record.');
  }, [fromReception, searchParams]);

  useEffect(() => {
    if (!fromReception || searchParams.get('mode') !== 'ems-prearrival') return;
    const emsArrivalId = searchParams.get('emsArrivalId');
    setActiveStep(STEP_INDEX_BY_QUERY.capture);
    setStatusMessage(
      emsArrivalId
        ? `Preparing registration for inbound EMS unit ${emsArrivalId} before arrival.`
        : 'Preparing registration for inbound EMS unit before arrival.',
    );
  }, [fromReception, searchParams]);

  const sessionBootstrapped = useRef(false);
  useEffect(() => {
    if (!fromReception || !canVerifyIntake || sessionBootstrapped.current) return;
    const mode = searchParams.get('mode');
    const stepParam = searchParams.get('step');
    if (mode === 'unknown' || stepParam === 'finalize') return;
    sessionBootstrapped.current = true;
    void startBackendSession();
  }, [fromReception, canVerifyIntake, searchParams]);

  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam && STEP_INDEX_BY_QUERY[stepParam] !== undefined) {
      setActiveStep(STEP_INDEX_BY_QUERY[stepParam]);
    }
  }, [searchParams]);

  const resolveSessionStartStep = () => {
    const stepParam = searchParams.get('step');
    return stepParam && STEP_INDEX_BY_QUERY[stepParam] !== undefined
      ? STEP_INDEX_BY_QUERY[stepParam]
      : 1;
  };

  const finishIntakeNavigation = (patientId) => {
    if (!patientId) return;
    if (fromReception) {
      const handoff = completeReceptionHandoff(store, {
        patientId,
        source: 'smart-intake',
      });
      navigate(handoff.receptionPath);
      return;
    }
    navigate(CANONICAL_ROUTES.emergencyPatients);
  };

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
      if (isBackendCapabilityEnabled('emergencySmartIntakeIdentitySession')) {
        const result = await SmartIntakeApi.createSession(emergencyRole.roleLabel);
        setSessionId(result?.sessionId || result?.data?.sessionId || SMART_INTAKE_DEMO.sessionId);
        setStatusMessage('Identity session started with backend OCR and match pipeline.');
      } else {
        const result = await fetchSmartIntake();
        setSessionId(result.data?.sessionId || result.generatedAt || SMART_INTAKE_DEMO.sessionId);
        setStatusMessage('Backend Smart Intake contract loaded for staff review.');
      }
      setActiveStep(resolveSessionStartStep());
    } catch (error) {
      setErrorMessage(
        `${error?.message || 'Backend Smart Intake contract is not reachable.'} Continue verification in safeguarded review mode.`,
      );
      setStatusMessage('Safeguarded identity review is active for this session.');
      setActiveStep(resolveSessionStartStep());
    } finally {
      setIsStarting(false);
      setSessionReady(true);
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
    const timeline = (Array.isArray(patient.timeline) ? patient.timeline : []).map((event) => ({
      ...event,
      patientId: patient.id,
    }));
    addPatient(
      {
        ...patient,
        vitals: Array.isArray(patient.vitals) ? patient.vitals : [patient.vitals],
        timeline,
      },
      { syncToBackend: false },
    );
    selectPatient(patient.id);
    finishIntakeNavigation(patient.id);
    return patient;
  };

  const hydrateSmartIntakeResult = (result, fallbackPatient) => {
    const data = result?.data || {};
    const whiteboard = data.whiteboard || {};
    const capacity = data.capacity?.capacity || data.capacity;
    const patient = data.patient || fallbackPatient;
    hydrateFromApi({
      patients: whiteboard.patients || (patient ? [patient] : undefined),
      rooms: whiteboard.rooms,
      staff: whiteboard.staff,
      alerts: whiteboard.alerts,
      capacity: whiteboard.capacity || capacity,
    });
    if (patient?.id) {
      selectPatient(patient.id);
      finishIntakeNavigation(patient.id);
    }
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
    } catch {
      localCompletion?.(null);
      setErrorMessage('Live confirmation is pending. Staff review remains required before downstream record changes.');
      setStatusMessage(
        `${actionLabel} recorded for session ${sessionId}. Confirmation is pending human review.`,
      );
    } finally {
      setActiveStep(SMART_INTAKE_DEMO.steps.length - 1);
      setPendingAction('');
    }
  };

  const selectedCandidate = matchCandidates.find(
    (candidate) => candidate.patientId === selectedCandidateId,
  );
  const selectedCandidateOnBoard = Boolean(
    selectedCandidate && patients.some((patient) => patient.id === selectedCandidate.patientId),
  );

  return (
    <section className="smart-intake" aria-labelledby="smart-intake-title">
      <header className="smart-intake__hero">
        <div>
          <span>Emergency OS{fromReception ? ' · Reception workflow' : ''}</span>
          <h1 id="smart-intake-title">Smart Intake Identity Review</h1>
          <p>
            Verify extracted identity, medication, allergy, EMS, and referral evidence before
            creating, linking, or continuing as an unknown patient.
          </p>
        </div>
        <button
          type="button"
          onClick={startBackendSession}
          disabled={isStarting || !canVerifyIntake || sessionReady}
        >
          <FileScan size={18} aria-hidden />
          {isStarting ? 'Starting...' : sessionReady ? 'Session active' : 'Start Intake'}
        </button>
        {fromReception ? (
          <button type="button" onClick={() => navigate(CANONICAL_ROUTES.emergencyReception)}>
            Back to Reception
          </button>
        ) : null}
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
      <div className="smart-intake__disclosure" role="note">
        This screen starts with a deterministic walkthrough dataset for product evaluation. Staff
        confirmation is required before any patient identity, medication, allergy, or referral fact is
        treated as operational.
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
                      Mark Edited
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
            {matchCandidates.map((candidate) => (
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
            !selectedCandidateOnBoard ||
            Boolean(pendingAction) ||
            !canCreatePatient
          }
          title={
            selectedCandidateOnBoard
              ? 'Link this intake review to the selected active patient'
              : 'Selected match is not on the active board. Create a new intake record or continue as unknown.'
          }
          onClick={() =>
            completeFinalAction(
              `Linked ${selectedCandidate?.displayName || 'selected patient'}`,
              () =>
                Promise.resolve({
                  sessionId,
                  status: 'manual-link-review',
                  patientId: selectedCandidate.patientId,
                }),
              () => {
                selectPatient(selectedCandidate.patientId);
                if (fromReception) {
                  const handoff = completeReceptionHandoff(store, {
                    patientId: selectedCandidate.patientId,
                    source: 'smart-intake',
                  });
                  navigate(handoff.receptionPath);
                  return;
                }
                navigate(CANONICAL_ROUTES.emergencyPatients);
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
          onClick={() => {
            const patient = buildSmartIntakePatient(sessionId, 'Smart Intake patient');
            completeFinalAction(
              'Create-and-triage intake',
              () => runSmartIntakeVerticalSlice({ patient, staffId: 'smart-intake-rn' }),
              (result) =>
                result
                  ? hydrateSmartIntakeResult(result, patient)
                  : addSmartIntakePatientToWhiteboard('Smart Intake patient'),
            );
          }}
        >
          <UserPlus size={17} aria-hidden />
          {pendingAction === 'Create-and-triage intake'
            ? 'Sending...'
            : 'Create and Send to Triage'}
        </button>
        <button
          type="button"
          disabled={Boolean(pendingAction) || !canCreatePatient}
          onClick={() => {
            const patient = buildSmartIntakePatient(sessionId, 'Unknown Patient');
            completeFinalAction(
              'Unknown-patient intake',
              () => runSmartIntakeVerticalSlice({ patient, staffId: 'smart-intake-rn' }),
              (result) =>
                result
                  ? hydrateSmartIntakeResult(result, patient)
                  : addSmartIntakePatientToWhiteboard('Unknown Patient'),
            );
          }}
        >
          <UserRoundX size={17} aria-hidden />
          {pendingAction === 'Unknown-patient intake'
            ? 'Recording...'
            : 'Continue as Unknown Patient'}
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

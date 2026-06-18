import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileScan } from 'lucide-react';
import { useEmergencyStore } from '../../store/emergencyStore';
import { EMERGENCY_ACTIONS, prefersReceptionForPatientCreate } from '../../config/emergencyRolePermissions';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { isBackendCapabilityEnabled } from '../../config/backendApiCapabilities';
import { SMART_INTAKE_DEMO } from '../../data/smartIntakeFixtures';
import { buildSmartIntakeVerticalSlicePatient } from '../../data/smartIntakeVerticalSlice';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import { fetchSmartIntake, runSmartIntakeVerticalSlice } from '../../services/emergencyOsApi';
import SmartIntakeApi from '../../services/smartIntakeApi';
import { completeIntakeHandoff } from '../../services/receptionHandoff';
import { applyIntakeArrivalContext } from '../../services/intakeEncounterChain';
import {
  completeProvisionalIntake,
  PROVISIONAL_IDENTITY_PROFILES,
  provisionalKindFromIntakeMode,
} from '../../services/provisionalIdentityIntake';
import { getReceptionEmbeddedIntakePath } from '../../config/emergencyRolePermissions';
import { findDuplicateCandidates, mergeDuplicateCandidates } from '../../utils/patientDuplicateDetection';
import PatientVerificationExperience from '../../components/verification/PatientVerificationExperience';
import {
  VERIFICATION_STEP_QUERY_INDEX,
  isVerificationComplete,
  mapFieldReviewDecision,
  verificationStepFromQuery,
} from '../../utils/verificationWorkflow';
import { callAI } from '../../lib/ai/client';
import { getAIPrompt } from '../../lib/ai/promptRegistry';
import { HUMAN_REVIEW_DISCLAIMER } from '../../lib/ai/safety/policy';

const STEP_INDEX_BY_QUERY = VERIFICATION_STEP_QUERY_INDEX;

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

export default function SmartIntake({
  embedded = false,
  intakeOptions = null,
  onClose,
  onHandoffComplete,
}) {
  const emergencyRole = useEmergencyRolePermissions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const store = useEmergencyStore();
  const addPatient = useEmergencyStore((state) => state.addPatient);
  const hydrateFromApi = useEmergencyStore((state) => state.hydrateFromApi);
  const patients = useEmergencyStore((state) => state.patients);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);

  const intakeParam = (key) => {
    if (intakeOptions && intakeOptions[key] != null && intakeOptions[key] !== '') {
      return String(intakeOptions[key]);
    }
    return searchParams.get(key) || '';
  };

  const fromReception = embedded || searchParams.get('from') === 'reception';
  const contextPatientId = intakeParam('patientId');
  const intakeMode = intakeParam('mode');
  const intakeStep = intakeParam('step');
  const intakeEmsArrivalId = intakeParam('emsArrivalId');
  const intakeAutostart = intakeParam('autostart');

  const [activeStep, setActiveStep] = useState(() => verificationStepFromQuery(intakeStep));
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
  const [ocrUploadStatus, setOcrUploadStatus] = useState('');
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [fieldDecisions, setFieldDecisions] = useState(() =>
    Object.fromEntries(
      SMART_INTAKE_DEMO.extractedFields.map((field) => [field.field, field.status]),
    ),
  );
  const [aiVerificationHint, setAiVerificationHint] = useState('');
  const [aiHintLoading, setAiHintLoading] = useState(false);
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
    if (embedded || fromReception) return;
    if (prefersReceptionForPatientCreate(emergencyRole.role)) {
      navigate(
        getReceptionEmbeddedIntakePath({
          step: searchParams.get('step') || undefined,
          mode: searchParams.get('mode') || undefined,
          patientId: searchParams.get('patientId') || undefined,
          emsArrivalId: searchParams.get('emsArrivalId') || undefined,
        }),
        { replace: true },
      );
    }
  }, [embedded, emergencyRole.role, fromReception, navigate, searchParams]);

  useEffect(() => {
    if (embedded || !fromReception) return;
    if (searchParams.get('from') !== 'reception') return;
    navigate(
      getReceptionEmbeddedIntakePath({
        step: searchParams.get('step') || undefined,
        mode: searchParams.get('mode') || undefined,
        patientId: searchParams.get('patientId') || undefined,
        emsArrivalId: searchParams.get('emsArrivalId') || undefined,
      }),
      { replace: true },
    );
  }, [embedded, fromReception, navigate, searchParams]);

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
    const provisionalKind = provisionalKindFromIntakeMode(intakeMode);
    if (!fromReception || !provisionalKind) return;
    setActiveStep(0);
    setStatusMessage(
      `${PROVISIONAL_IDENTITY_PROFILES[provisionalKind].label} — send to triage without waiting for full verification.`,
    );
  }, [fromReception, intakeMode]);

  useEffect(() => {
    if (!fromReception || intakeMode !== 'ems-prearrival') return;
    setActiveStep(STEP_INDEX_BY_QUERY.capture);
    setStatusMessage(
      intakeEmsArrivalId
        ? `Preparing registration for inbound EMS unit ${intakeEmsArrivalId} before arrival.`
        : 'Preparing registration for inbound EMS unit before arrival.',
    );
    if (
      isBackendCapabilityEnabled('emergencySmartIntakeIdentitySession') &&
      sessionReady &&
      intakeEmsArrivalId
    ) {
      void SmartIntakeApi.addEmsEvidence(
        sessionId,
        { emsArrivalId: intakeEmsArrivalId },
        emergencyRole.roleLabel,
      ).catch(() => undefined);
    }
  }, [fromReception, intakeMode, intakeEmsArrivalId, sessionReady, sessionId, emergencyRole.roleLabel]);

  const sessionBootstrapped = useRef(false);
  const shouldAutostartSession =
    fromReception &&
    canVerifyIntake &&
    intakeAutostart !== '0' &&
    (intakeAutostart === '1' || intakeOptions?.autostart === true || !intakeAutostart);

  useEffect(() => {
    if (!shouldAutostartSession || sessionBootstrapped.current) return;
    if (provisionalKindFromIntakeMode(intakeMode) || intakeStep === 'finalize') return;
    sessionBootstrapped.current = true;
    void startBackendSession();
  }, [shouldAutostartSession, intakeMode, intakeStep]);

  useEffect(() => {
    if (intakeStep && STEP_INDEX_BY_QUERY[intakeStep] !== undefined) {
      setActiveStep(STEP_INDEX_BY_QUERY[intakeStep]);
    }
  }, [intakeStep]);

  const resolveSessionStartStep = () => {
    return intakeStep && STEP_INDEX_BY_QUERY[intakeStep] !== undefined
      ? STEP_INDEX_BY_QUERY[intakeStep]
      : 1;
  };

  const finishIntakeNavigation = (patientId) => {
    if (!patientId) return;
    const handoff = completeIntakeHandoff(store, {
      patientId,
      source: 'smart-intake',
      sessionId,
    });
    if (fromReception) {
      if (embedded && onHandoffComplete) {
        onHandoffComplete(handoff);
        return;
      }
      navigate(handoff.receptionPath);
      return;
    }
    navigate(handoff.whiteboardPath);
  };

  const verificationComplete = useMemo(
    () => isVerificationComplete(fieldDecisions),
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
    const nextStatus = mapFieldReviewDecision(decision);
    setFieldDecisions((current) => ({
      ...current,
      [field]: nextStatus,
    }));
    if (isBackendCapabilityEnabled('emergencySmartIntakeIdentitySession') && sessionReady) {
      const apiDecision =
        decision === 'edited' ? 'edited' : decision === 'approved' ? 'approved' : 'rejected';
      void SmartIntakeApi.verifyField(
        sessionId,
        field,
        apiDecision,
        undefined,
        emergencyRole.roleLabel,
      ).catch(() => undefined);
    }
  };

  const handleDocumentUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !canVerifyIntake) return;
    setIsUploadingDocument(true);
    setOcrUploadStatus('');
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      if (isBackendCapabilityEnabled('emergencySmartIntakeIdentitySession')) {
        await SmartIntakeApi.uploadDocument(
          sessionId,
          {
            filename: file.name,
            mimeType: file.type || 'application/octet-stream',
            content: dataUrl,
          },
          emergencyRole.roleLabel,
        );
        setOcrUploadStatus(`Document "${file.name}" uploaded for OCR extraction.`);
        setActiveStep(STEP_INDEX_BY_QUERY.ocr);
      } else {
        setOcrUploadStatus(
          `Document "${file.name}" captured locally. Continue with safeguarded review fields.`,
        );
        setActiveStep(STEP_INDEX_BY_QUERY.ocr);
      }
    } catch {
      setOcrUploadStatus('Document upload failed. Continue with manual field verification.');
    } finally {
      setIsUploadingDocument(false);
      event.target.value = '';
    }
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

  const resolveIntakeArrivalReason = () => {
    const complaint = extractedFieldValue('chiefComplaint', '');
    if (complaint.trim()) {
      return { arrivalReason: complaint.trim(), complaintCategory: 'Other' };
    }
    const built = buildSmartIntakePatient(sessionId, 'Smart Intake patient');
    return {
      arrivalReason: built.chiefComplaint,
      complaintCategory: built.complaintCategory,
    };
  };

  const handleProvisionalIntake = (kind) => {
    if (!canCreatePatient) return;
    setPendingAction(`Provisional-${kind}`);
    const result = completeProvisionalIntake(store, kind, { sessionId });
    setPendingAction('');
    finishIntakeNavigation(result.patient.id);
  };

  const selectedCandidate = matchCandidates.find(
    (candidate) => candidate.patientId === selectedCandidateId,
  );
  const selectedCandidateOnBoard = Boolean(
    selectedCandidate && patients.some((patient) => patient.id === selectedCandidate.patientId),
  );

  const requestVerificationHint = async () => {
    if (!canVerifyIntake || aiHintLoading) return;
    setAiHintLoading(true);
    setErrorMessage('');
    try {
      const missingFields = SMART_INTAKE_DEMO.extractedFields
        .filter((field) => field.status !== 'verified')
        .map((field) => field.field)
        .join(', ');
      const response = await callAI({
        requestType: 'INTAKE_SUGGESTION',
        systemPrompt: `${getAIPrompt('smart-intake-assistant').prompt}\n${HUMAN_REVIEW_DISCLAIMER}`,
        message: [
          `Smart Intake session ${sessionId}.`,
          'Provide verification hints only — do not suggest triage priority or clinical disposition.',
          missingFields ? `Fields needing review: ${missingFields}.` : 'All demo fields appear captured.',
          'List 2-3 concise next verification steps for front-desk staff.',
        ].join(' '),
        context: {
          smartIntake: {
            sessionId,
            step: activeStep,
            verificationOnly: true,
          },
        },
      });
      const hint =
        (typeof response?.content === 'string' && response.content) ||
        (typeof response?.data?.response === 'string' && response.data.response) ||
        'Review highlighted fields and confirm identity before handoff.';
      setAiVerificationHint(`${hint}\n\n${HUMAN_REVIEW_DISCLAIMER}`);
    } catch {
      setAiVerificationHint(
        `Verify name, date of birth, and health card against the document source before handoff.\n\n${HUMAN_REVIEW_DISCLAIMER}`,
      );
    } finally {
      setAiHintLoading(false);
    }
  };

  return (
    <section
      className={`smart-intake${embedded ? ' smart-intake--embedded' : ''}`}
      aria-labelledby="smart-intake-title"
    >
      <header className="smart-intake__hero">
        <div>
          <span>Emergency OS{fromReception ? ' · Reception workflow' : ''}</span>
          <h1 id="smart-intake-title">Patient Verification</h1>
          <p>
            One workflow for identity, OCR, duplicate detection, and manual review before
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
        {embedded ? (
          <button type="button" onClick={onClose}>
            Close
          </button>
        ) : fromReception ? (
          <button type="button" onClick={() => navigate(CANONICAL_ROUTES.emergencyReception)}>
            Back to Reception
          </button>
        ) : null}
      </header>

      <div className="smart-intake__status" role="status">
        <strong>Session:</strong> {sessionId} · {statusMessage}
      </div>
      {canVerifyIntake ? (
        <div className="smart-intake__ai-hint" data-testid="smart-intake-ai-hint">
          <button type="button" onClick={() => void requestVerificationHint()} disabled={aiHintLoading}>
            {aiHintLoading ? 'AI help…' : 'AI verification help'}
          </button>
          {aiVerificationHint ? <p>{aiVerificationHint}</p> : null}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="smart-intake__status smart-intake__status--error" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <PatientVerificationExperience
        activeStep={activeStep}
        onStepChange={setActiveStep}
        extractedFields={SMART_INTAKE_DEMO.extractedFields}
        fieldDecisions={fieldDecisions}
        canVerifyIntake={canVerifyIntake}
        canCreatePatient={canCreatePatient}
        onFieldDecision={updateDecision}
        matchCandidates={matchCandidates}
        selectedCandidateId={selectedCandidateId}
        onSelectCandidate={setSelectedCandidateId}
        onOpenPatient={(patientId) => {
          selectPatient(patientId);
          setSelectedCandidateId(patientId);
          setActiveStep(STEP_INDEX_BY_QUERY.verify);
        }}
        ocrUploadStatus={ocrUploadStatus}
        isUploadingDocument={isUploadingDocument}
        onDocumentUpload={(event) => void handleDocumentUpload(event)}
        verificationComplete={verificationComplete}
        selectedCandidateOnBoard={selectedCandidateOnBoard}
        pendingAction={pendingAction}
        warnings={SMART_INTAKE_DEMO.warnings}
        auditLog={SMART_INTAKE_DEMO.auditLog}
        highlightProvisional={Boolean(provisionalKindFromIntakeMode(intakeMode))}
        onProvisionalIntake={handleProvisionalIntake}
        onLinkPatient={() =>
          completeFinalAction(
            `Linked ${selectedCandidate?.displayName || 'selected patient'}`,
            () =>
              isBackendCapabilityEnabled('emergencySmartIntakeIdentitySession')
                ? SmartIntakeApi.linkPatient(
                    sessionId,
                    selectedCandidate.patientId,
                    emergencyRole.roleLabel,
                  )
                : Promise.resolve({
                    sessionId,
                    status: 'manual-link-review',
                    patientId: selectedCandidate.patientId,
                  }),
            () => {
              applyIntakeArrivalContext(
                store,
                selectedCandidate.patientId,
                resolveIntakeArrivalReason(),
              );
              selectPatient(selectedCandidate.patientId);
              finishIntakeNavigation(selectedCandidate.patientId);
            },
          )
        }
        onCreatePatient={() => {
          const patient = buildSmartIntakePatient(sessionId, 'Smart Intake patient');
          completeFinalAction(
            'Create-and-triage intake',
            () =>
              isBackendCapabilityEnabled('emergencySmartIntakeIdentitySession')
                ? SmartIntakeApi.createPatient(sessionId, emergencyRole.roleLabel)
                : runSmartIntakeVerticalSlice({ patient, staffId: 'smart-intake-rn' }),
            (result) =>
              result
                ? hydrateSmartIntakeResult(result, patient)
                : addSmartIntakePatientToWhiteboard('Smart Intake patient'),
          );
        }}
      />
    </section>
  );
}

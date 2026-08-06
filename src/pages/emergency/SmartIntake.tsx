import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProfileNavigate } from '../../hooks/useProfileNavigate';
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
import { ERROR_RECOVERY_COPY, formatApiRecoveryMessage } from '../../config/errorRecoveryModel';
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
import { invokeUnifiedAiConversational } from '../../services/careDroidUnifiedAiNode';
import { getAIPrompt } from '../../lib/ai/promptRegistry';
import { HUMAN_REVIEW_DISCLAIMER } from '../../lib/ai/safety/policy';
import { RECEPTION_COPY } from '../../components/reception/receptionCopy';
import { EmergencyRoutePage } from './emergencyRouteShared';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import { RECEPTION_FIRST_UX } from '../../config/receptionFirstUx.config';
import './emergency-route.css';
import './SmartIntake.css';
import {
  SMART_INTAKE_STEP_INDEX,
  SMART_INTAKE_STREAMLINED_STEPS,
  buildAutoApprovedFieldDecisions,
  canContinueSmartIntakeStep,
  countBulkApprovableFields,
  mapInternalStepToStreamlined,
  resolveSmartIntakeContinueStep,
  resolveSmartIntakeStartStep,
} from '../../config/smartIntakeFlowModel';
import {
  recordSmartIntakeClick,
  recordSmartIntakeTransition,
  startSmartIntakeTelemetry,
} from '../../utils/smartIntakeTelemetry';
import { captureIntakeArtifact } from '../../services/intakeArtifactCapture';
import OcrIntakeApi from '../../services/ocrIntakeApi';
import useFeature from '../../hooks/useFeature';
import { buildClientTriageAssist } from '../../services/triageAssist';
import { routeSmartIntakeThroughOrchestrator } from '../../services/receptionIntakeOrchestrator';
import { mergeExtractedFieldRows } from '../../utils/intakeArtifactFields';
import {
  getIntakeArtifact,
  listReceptionArtifacts,
  resolveArtifactId,
} from '../../config/intakeArtifactRegistry';

const STEP_INDEX_BY_QUERY = VERIFICATION_STEP_QUERY_INDEX;

function extractedFieldValue(fieldName, fields = [] as any[], fallback = '') {
  return fields.find((field) => field.field === fieldName)?.extracted || fallback;
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

function buildSmartIntakePatient(sessionId, label = 'Smart Intake patient', fields = [] as any[]) {
  const now = new Date().toISOString();
  const dob = extractedFieldValue('dateOfBirth', fields, '');
  const firstName =
    label === 'Unknown Patient' ? 'Unknown' : extractedFieldValue('firstName', fields, 'Smart');
  const lastName =
    label === 'Unknown Patient' ? 'Patient' : extractedFieldValue('lastName', fields, 'Intake');
  return buildSmartIntakeVerticalSlicePatient({
    patientId: `smart-intake-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    mrn: extractedFieldValue('healthCardNumber', fields, `SI-${Date.now()}`),
    identity: {
      firstName,
      lastName,
      dob,
      sex: extractedFieldValue('sex', fields, 'Unspecified'),
    },
    age: ageFromDob(dob),
    sessionId,
    timestamp: now,
    source: label,
    complaintCategory: 'Other',
    complaintText: 'Smart Intake identity review',
  } as any);
}

export default function SmartIntake({
  embedded = false,
  intakeOptions = null,
  onClose,
  onHandoffComplete,
}) {
  const emergencyRole = useEmergencyRolePermissions();
  const { profileNavigate } = useProfileNavigate();
  const [searchParams] = useSearchParams();
  const addPatient = useEmergencyStore((state) => state.addPatient);
  const registerArrivalControl = useEmergencyStore((state) => state.registerArrivalControl);
  const hydrateFromApi = useEmergencyStore((state) => state.hydrateFromApi);
  const patients = useEmergencyStore((state) => state.patients);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const extractAndAttachDocumentArtifacts = useEmergencyStore(
    (state) => state.extractAndAttachDocumentArtifacts,
  );
  const { enabled: documentArtifactsEnabled } = useFeature('patient_document_artifacts');
  const { enabled: nlpTriageExpertEnabled } = useFeature('nlp_triage_expert_system');

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
  const intakeArtifactId = intakeParam('artifactId');

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
  const [remoteMatchCandidates, setRemoteMatchCandidates] = useState<any[]>([]);
  const [matchError, setMatchError] = useState('');
  const [ocrUploadStatus, setOcrUploadStatus] = useState('');
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [extractedFields, setExtractedFields] = useState(() => [...SMART_INTAKE_DEMO.extractedFields]);
  const [fieldDecisions, setFieldDecisions] = useState(() =>
    buildAutoApprovedFieldDecisions(SMART_INTAKE_DEMO.extractedFields as any[]),
  );
  const [documentCaptured, setDocumentCaptured] = useState(false);
  const [ocrJobId, setOcrJobId] = useState('');
  const [ocrJobStatus, setOcrJobStatus] = useState('');
  const [ocrWarnings, setOcrWarnings] = useState<string[]>([]);
  const [capturePreviewDataUrl, setCapturePreviewDataUrl] = useState('');
  const [supplementalCaptureText, setSupplementalCaptureText] = useState('');
  const [identityAuditLog, setIdentityAuditLog] = useState(() => [...SMART_INTAKE_DEMO.auditLog]);
  const [selectedArtifactId, setSelectedArtifactId] = useState(() =>
    resolveArtifactId(intakeArtifactId),
  );
  const captureArtifactOptions = useMemo(() => listReceptionArtifacts(), []);
  const selectedArtifact = useMemo(
    () => getIntakeArtifact(selectedArtifactId),
    [selectedArtifactId],
  );
  const [aiVerificationHint, setAiVerificationHint] = useState('');
  const [aiHintLoading, setAiHintLoading] = useState(false);
  const verifyIntakePresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.verifyIntake);
  const createPatientPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.createPatient);
  const canVerifyIntake = verifyIntakePresentation.enabled;
  const canCreatePatient = createPatientPresentation.enabled;

  const boardPatient = useMemo(
    () => (contextPatientId ? patients.find((candidate) => candidate.id === contextPatientId) || null : null),
    [contextPatientId, patients],
  );

  useEffect(() => {
    startSmartIntakeTelemetry({
      embedded,
      fromReception,
      intakeStep,
      contextPatientId,
    });
  }, [embedded, fromReception, intakeStep, contextPatientId]);

  const setActiveStepTracked = (nextStep, reason = 'manual') => {
    setActiveStep((current) => {
      if (current !== nextStep) recordSmartIntakeTransition(current, nextStep, reason);
      return nextStep;
    });
  };

  const intakeDemographics = useMemo(
    () => ({
      firstName: extractedFieldValue('firstName', extractedFields),
      lastName: extractedFieldValue('lastName', extractedFields),
      dateOfBirth: extractedFieldValue('dateOfBirth', extractedFields),
      sex: extractedFieldValue('sex', extractedFields),
      phone: extractedFieldValue('phone', extractedFields),
      healthCardNumber: extractedFieldValue('healthCardNumber', extractedFields),
      address: extractedFieldValue('address', extractedFields),
    }),
    [extractedFields],
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
        setMatchError('');
      })
      .catch((error) => {
        setMatchError(`${formatApiRecoveryMessage(error, 'duplicate search')} ${ERROR_RECOVERY_COPY.matchFailed}`);
      });
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
    if (
      RECEPTION_FIRST_UX.redirectStandaloneIntake &&
      prefersReceptionForPatientCreate(emergencyRole.role)
    ) {
      profileNavigate(
        getReceptionEmbeddedIntakePath({
          step: searchParams.get('step') || undefined,
          mode: searchParams.get('mode') || undefined,
          patientId: searchParams.get('patientId') || undefined,
          emsArrivalId: searchParams.get('emsArrivalId') || undefined,
        }),
        { replace: true },
      );
    }
  }, [embedded, emergencyRole.role, fromReception, profileNavigate, searchParams]);

  useEffect(() => {
    if (embedded || !fromReception) return;
    if (searchParams.get('from') !== 'reception') return;
    profileNavigate(
      getReceptionEmbeddedIntakePath({
        step: searchParams.get('step') || undefined,
        mode: searchParams.get('mode') || undefined,
        patientId: searchParams.get('patientId') || undefined,
        emsArrivalId: searchParams.get('emsArrivalId') || undefined,
      }),
      { replace: true },
    );
  }, [embedded, fromReception, profileNavigate, searchParams]);

  useEffect(() => {
    if (!contextPatientId) return;
    selectPatient(contextPatientId);
    const boardPatient = patients.find((candidate) => candidate.id === contextPatientId);
    if (boardPatient) {
      setSelectedCandidateId(contextPatientId);
      setExtractedFields((current) => {
        const nextFields = current.map((field) => ({
          ...field,
          existing:
            field.field === 'firstName'
              ? boardPatient.firstName || field.existing
              : field.field === 'lastName'
                ? boardPatient.lastName || field.existing
                : field.field === 'dateOfBirth'
                  ? boardPatient.dob || field.existing
                  : field.field === 'sex'
                    ? boardPatient.sex || field.existing
                    : field.field === 'phone'
                      ? boardPatient.phone || field.existing
                      : field.field === 'healthCardNumber'
                        ? boardPatient.healthCardNumber || boardPatient.mrn || field.existing
                        : field.existing,
        }));
        setFieldDecisions(buildAutoApprovedFieldDecisions(nextFields, boardPatient as any));
        return nextFields;
      });
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
    (intakeAutostart === '1' || (intakeOptions as any)?.autostart === true || !intakeAutostart);

  useEffect(() => {
    if (!shouldAutostartSession || sessionBootstrapped.current) return;
    if (provisionalKindFromIntakeMode(intakeMode) || intakeStep === 'finalize') return;
    sessionBootstrapped.current = true;
    void startBackendSession();
  }, [shouldAutostartSession, intakeMode, intakeStep]);

  useEffect(() => {
    if (intakeStep && STEP_INDEX_BY_QUERY[intakeStep] !== undefined) {
      setActiveStepTracked(STEP_INDEX_BY_QUERY[intakeStep], 'query-step');
    }
  }, [intakeStep]);

  useEffect(() => {
    if (!intakeArtifactId) return;
    setSelectedArtifactId(resolveArtifactId(intakeArtifactId));
  }, [intakeArtifactId]);

  const resolveSessionStartStep = () =>
    resolveSmartIntakeStartStep({
      intakeStep,
      contextPatientId,
      autostart: shouldAutostartSession,
      hasBoardPatient: Boolean(boardPatient),
    });

  const finishIntakeNavigation = (patientId) => {
    if (!patientId) return;
    const handoff = completeIntakeHandoff(useEmergencyStore.getState(), {
      patientId,
      source: 'smart-intake',
      sessionId,
    });
    if (fromReception) {
      if (embedded && onHandoffComplete) {
        onHandoffComplete(handoff);
        return;
      }
      profileNavigate(handoff.receptionPath);
      return;
    }
    profileNavigate(handoff.whiteboardPath);
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
      setActiveStepTracked(resolveSessionStartStep(), 'session-start');
    } catch (error: any) {
      setErrorMessage(
        `${formatApiRecoveryMessage(error, 'Smart Intake session')} Continue verification in safeguarded review mode.`,
      );
      setStatusMessage('Safeguarded identity review is active for this session.');
      setActiveStepTracked(resolveSessionStartStep(), 'session-start-fallback');
    } finally {
      setIsStarting(false);
      setSessionReady(true);
    }
  };

  const updateDecision = (field, decision) => {
    if (!canVerifyIntake) return;
    recordSmartIntakeClick('field-decision', { field, decision });
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

    if (ocrJobId && isBackendCapabilityEnabled('emergencyOcrIntake')) {
      const ocrDecision = decision === 'edited' ? 'edited' : decision === 'approved' ? 'accepted' : 'rejected';
      void OcrIntakeApi.reviewField(ocrJobId, field, ocrDecision, undefined, emergencyRole.roleLabel).catch(
        () => undefined,
      );
    }
  };

  const handleDocumentUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !canVerifyIntake) return;
    setIsUploadingDocument(true);
    setOcrUploadStatus('');
    try {
      const captured = await captureIntakeArtifact({
        file,
        artifactId: selectedArtifactId,
        sessionId,
        staff: emergencyRole.roleLabel,
        supplementalText: supplementalCaptureText,
        boardPatient: boardPatient as any,
        seedFields: extractedFields as any,
      });

      setCapturePreviewDataUrl(captured.dataUrl);
      const nextFields = mergeExtractedFieldRows(extractedFields as any, captured.extractedFields as any);
      setExtractedFields(nextFields);
      setFieldDecisions(buildAutoApprovedFieldDecisions(nextFields, boardPatient as any));
      setOcrUploadStatus(captured.auditNote);
      setOcrJobId(captured.ocrJobId || '');
      setOcrJobStatus(captured.ocrJobStatus || '');
      setOcrWarnings(captured.ocrWarnings || []);
      setIdentityAuditLog((current) => [
        ...current,
        `${captured.artifactLabel} uploaded: ${captured.filename}`,
        captured.auditNote,
        ...(captured.ocrWarnings || []),
      ]);
      if (captured.artifactId !== selectedArtifactId) {
        setSelectedArtifactId(captured.artifactId);
      }
      setDocumentCaptured(true);
      setActiveStepTracked(SMART_INTAKE_STEP_INDEX.match, 'document-upload');

      const targetPatientId = boardPatient?.id || contextPatientId;
      if (documentArtifactsEnabled && targetPatientId) {
        const captureText = [captured.rawText, supplementalCaptureText].filter(Boolean).join('\n');
        void extractAndAttachDocumentArtifacts({
          patientId: targetPatientId,
          documentType: captured.documentType || captured.artifactLabel,
          sourceType:
            (captured.artifactId as any) === 'referral'
              ? 'referral_note'
              : (captured.artifactId as any) === 'allergy'
                ? 'scanned_note'
                : (captured.artifactId as any) === 'medication'
                  ? 'scanned_note'
                  : 'uploaded_document',
          rawText: captureText,
          filename: captured.filename,
          parser: selectedArtifact?.parser,
          sourceState: 'extracted',
          isAiDerived: captured.source === 'ai_assist' || captured.source === 'text_parser',
        }).catch(() => undefined);
      }
    } catch {
      setOcrUploadStatus('Document upload failed. Continue with manual field verification.');
    } finally {
      setIsUploadingDocument(false);
      event.target.value = '';
    }
  };

  const addSmartIntakePatientToWhiteboard = async (label) => {
    if (!canCreatePatient) return null;
    const arrivalContext = resolveIntakeArrivalReason();
    try {
      const routeResult = await routeSmartIntakeThroughOrchestrator(extractedFields, {
        sessionId,
        complaint: arrivalContext.arrivalReason,
        actorName: emergencyRole.roleLabel || 'Smart Intake',
        actorStaffId: emergencyRole.canonicalProfile?.employeeId || emergencyRole.canonicalProfile?.id,
      });
      applyIntakeArrivalContext(useEmergencyStore.getState(), routeResult.patientId as any, arrivalContext);
      registerArrivalControl(routeResult.patientId as any, { source: 'smart-intake' });
      selectPatient(routeResult.patientId as any);
      if (documentArtifactsEnabled && supplementalCaptureText.trim()) {
        void extractAndAttachDocumentArtifacts({
          patientId: routeResult.patientId as any,
          documentType: selectedArtifact?.label || 'Intake document',
          sourceType: 'staff_paste',
          rawText: supplementalCaptureText,
          sourceState: 'staff_entered',
          isAiDerived: false,
        }).catch(() => undefined);
      }
      if (routeResult.backendSyncStatus === 'failed') {
        setOcrUploadStatus(
          routeResult.backendSyncError ||
            'Patient created locally. Backend sync is pending — retry when connectivity returns.',
        );
      }
      finishIntakeNavigation(routeResult.patientId);
      return routeResult.patient;
    } catch {
      const patient = buildSmartIntakePatient(sessionId, label, extractedFields);
      const timeline = (Array.isArray(patient.timeline) ? patient.timeline : []).map((event) => ({
        ...event,
        patientId: patient.id,
      }));
      const patientRecord = {
        ...patient,
        vitals: Array.isArray(patient.vitals) ? patient.vitals : [patient.vitals],
        timeline,
      };
      if (nlpTriageExpertEnabled) {
        const triageAssist = buildClientTriageAssist(patientRecord as any, patients, {
          handoffSource: 'smart-intake',
          arrivalReason: patientRecord.chiefComplaint,
          complaintCategory: patientRecord.complaintCategory,
        });
        patientRecord.triageAssist = triageAssist;
        patientRecord.triageAssistGeneratedAt = triageAssist.generatedAt;
        patientRecord.triagePending = true;
      }
      addPatient(patientRecord as any, { syncToBackend: false });
      applyIntakeArrivalContext(useEmergencyStore.getState(), patient.id as any, arrivalContext);
      registerArrivalControl(patient.id as any, { source: 'smart-intake' });
      selectPatient(patient.id as any);
      finishIntakeNavigation(patient.id);
      return patient;
    }
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
      applyIntakeArrivalContext(useEmergencyStore.getState(), patient.id, resolveIntakeArrivalReason());
      registerArrivalControl(patient.id, { source: 'smart-intake' });
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
        `${actionLabel} confirmed for session ${result?.sessionId || sessionId}. Identity audit trail updated for human review.`,
      );
      setActiveStepTracked(SMART_INTAKE_DEMO.steps.length - 1, 'finalize-complete');
    } catch (error: any) {
      if (localCompletion) {
        localCompletion(null);
        setStatusMessage(`${actionLabel} saved locally. ${ERROR_RECOVERY_COPY.handoffPending}`);
        setActiveStepTracked(SMART_INTAKE_DEMO.steps.length - 1, 'finalize-local-fallback');
      } else {
        setErrorMessage(formatApiRecoveryMessage(error, 'intake confirmation'));
        setStatusMessage(`${actionLabel} not confirmed — review the error and retry.`);
      }
    } finally {
      setPendingAction('');
    }
  };

  const resolveIntakeArrivalReason = () => {
    const complaint = extractedFieldValue('chiefComplaint', extractedFields, '');
    if (complaint.trim()) {
      return { arrivalReason: complaint.trim(), complaintCategory: 'Other' };
    }
    const built = buildSmartIntakePatient(sessionId, 'Smart Intake patient', extractedFields);
    return {
      arrivalReason: built.chiefComplaint,
      complaintCategory: built.complaintCategory,
    };
  };

  const handleProvisionalIntake = (kind) => {
    if (!canCreatePatient) return;
    setPendingAction(`Provisional-${kind}`);
    const result = completeProvisionalIntake(useEmergencyStore.getState(), kind, { sessionId });
    setPendingAction('');
    finishIntakeNavigation(result.patient.id);
  };

  const bulkApprovableCount = useMemo(
    () => countBulkApprovableFields(extractedFields, fieldDecisions),
    [extractedFields, fieldDecisions],
  );

  const extractedCapturePreview = useMemo(
    () => extractedFields.filter((field) => String(field.extracted || '').trim()).slice(0, 8),
    [extractedFields],
  );

  const approveMatchingFields = () => {
    if (!canVerifyIntake) return;
    recordSmartIntakeClick('approve-matching-fields', { count: bulkApprovableCount });
    setFieldDecisions((current) => {
      const next = { ...current };
      extractedFields.forEach((field) => {
        const extracted = String(field.extracted || '').trim();
        const existing = String(field.existing || '').trim();
        if (
          extracted &&
          existing &&
          extracted.toLowerCase() === existing.toLowerCase() &&
          !['verified', 'overridden'].includes(next[field.field])
        ) {
          next[field.field] = 'verified';
        }
      });
      return next;
    });
  };

  const intakeCanContinue = canContinueSmartIntakeStep(activeStep, {
    sessionReady,
    selectedCandidateId,
    verificationComplete,
    documentCaptured,
  });

  const handleContinue = () => {
    recordSmartIntakeClick('continue', { fromStep: activeStep });
    const nextStep = resolveSmartIntakeContinueStep(activeStep, { verificationComplete });
    setActiveStepTracked(nextStep, 'continue');
  };

  const mapDisplayStepToInternal = (displayIndex) => {
    if (displayIndex <= 0) return SMART_INTAKE_STEP_INDEX.capture;
    if (displayIndex === 1) return SMART_INTAKE_STEP_INDEX.match;
    if (displayIndex === 2) return SMART_INTAKE_STEP_INDEX.verify;
    return SMART_INTAKE_STEP_INDEX.finalize;
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
      const missingFields = extractedFields
        .filter((field) => field.status !== 'verified')
        .map((field) => field.field)
        .join(', ');
      const response = await invokeUnifiedAiConversational({
        capabilityId: 'smartIntakeVerification',
        platformServiceId: 'smartIntakeVerification',
        requestType: 'INTAKE_SUGGESTION',
        domain: 'intake',
        sourceScreen: 'smart_intake',
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

  const isStandaloneRoute = !embedded && !fromReception;
  const surfaces = usePractitionerSurfaceVisibility();
  const showIntakeHeroDescription = surfaces.intake.showHeroDescription;

  const sessionStartButton = (
    <button
      type="button"
      onClick={() => {
        recordSmartIntakeClick('start-session');
        void startBackendSession();
      }}
      disabled={isStarting || !canVerifyIntake || sessionReady}
    >
      <FileScan size={18} aria-hidden />
      {isStarting
        ? fromReception || embedded
          ? RECEPTION_COPY.identityCheck.starting
          : 'Starting...'
        : sessionReady
          ? fromReception || embedded
            ? RECEPTION_COPY.identityCheck.sessionActive
            : 'Session active'
          : fromReception || embedded
            ? RECEPTION_COPY.identityCheck.begin
            : 'Start Intake'}
    </button>
  );

  const intakeBody = (
    <>
      {!embedded && !fromReception ? (
      <div className="smart-intake__status" role="status">
        <strong>Session:</strong> {sessionId} · {statusMessage}
      </div>
      ) : statusMessage ? (
        <div className="smart-intake__status" role="status">
          {statusMessage}
        </div>
      ) : null}
      {verifyIntakePresentation.visible ? (
        <div className="smart-intake__ai-hint" data-testid="smart-intake-ai-hint">
          <button type="button" onClick={() => void requestVerificationHint()} disabled={aiHintLoading}>
            {aiHintLoading
              ? fromReception || embedded
                ? RECEPTION_COPY.identityCheck.aiHelpLoading
                : 'AI help…'
              : fromReception || embedded
                ? RECEPTION_COPY.identityCheck.aiHelp
                : 'AI verification help'}
          </button>
          {aiVerificationHint ? <p>{aiVerificationHint}</p> : null}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="smart-intake__status smart-intake__status--error" role="alert">
          {errorMessage}
        </div>
      ) : null}
      {matchError ? (
        <div className="smart-intake__status smart-intake__status--error" role="alert">
          {matchError}
        </div>
      ) : null}

      <PatientVerificationExperience
        activeStep={activeStep}
        onStepChange={(stepIndex) => {
          recordSmartIntakeClick('step-nav', { stepIndex });
          if (fromReception || embedded) {
            setActiveStepTracked(mapDisplayStepToInternal(stepIndex), 'step-nav');
            return;
          }
          setActiveStepTracked(stepIndex, 'step-nav');
        }}
        extractedFields={extractedFields}
        fieldDecisions={fieldDecisions}
        canVerifyIntake={canVerifyIntake}
        canCreatePatient={canCreatePatient}
        onFieldDecision={updateDecision}
        onApproveMatching={approveMatchingFields}
        bulkApprovableCount={bulkApprovableCount}
        matchCandidates={matchCandidates}
        selectedCandidateId={selectedCandidateId as any}
        onSelectCandidate={(patientId) => {
          recordSmartIntakeClick('select-candidate', { patientId });
          setSelectedCandidateId(patientId);
        }}
        onOpenPatient={(patientId) => {
          selectPatient(patientId);
          setSelectedCandidateId(patientId);
          setActiveStepTracked(SMART_INTAKE_STEP_INDEX.verify, 'open-patient');
        }}
        ocrUploadStatus={ocrUploadStatus}
        ocrJobStatus={ocrJobStatus}
        ocrWarnings={ocrWarnings}
        isUploadingDocument={isUploadingDocument}
        onDocumentUpload={(event) => void handleDocumentUpload(event)}
        capturePreviewDataUrl={capturePreviewDataUrl}
        supplementalCaptureText={supplementalCaptureText}
        onSupplementalCaptureTextChange={setSupplementalCaptureText}
        extractedCapturePreview={extractedCapturePreview}
        captureArtifactOptions={captureArtifactOptions}
        selectedCaptureArtifactId={selectedArtifactId}
        onCaptureArtifactChange={setSelectedArtifactId}
        selectedCaptureArtifactLabel={selectedArtifact.label}
        verificationComplete={verificationComplete}
        selectedCandidateOnBoard={selectedCandidateOnBoard}
        pendingAction={pendingAction}
        warnings={SMART_INTAKE_DEMO.warnings as any}
        auditLog={identityAuditLog}
        showWarningsExpanded={surfaces.intake.showVerificationWarnings}
        showAuditExpanded={surfaces.intake.showVerificationAuditLog}
        highlightProvisional={Boolean(provisionalKindFromIntakeMode(intakeMode))}
        steps={fromReception || embedded ? RECEPTION_COPY.identityCheck.steps : undefined}
        displaySteps={(fromReception || embedded ? SMART_INTAKE_STREAMLINED_STEPS : null) as any}
        mapDisplayStep={(fromReception || embedded ? mapInternalStepToStreamlined : null) as any}
        introTitle={fromReception || embedded ? RECEPTION_COPY.identityCheck.title : undefined}
        introDescription={fromReception || embedded ? RECEPTION_COPY.identityCheck.description : undefined}
        onContinue={handleContinue}
        canContinue={intakeCanContinue}
        continueLabel={
          activeStep >= SMART_INTAKE_STEP_INDEX.verify && verificationComplete
            ? 'Review finish'
            : 'Continue'
        }
        onProvisionalIntake={handleProvisionalIntake}
        onLinkPatient={() =>
          completeFinalAction(
            `Linked ${selectedCandidate?.displayName || 'selected patient'}`,
            () =>
              isBackendCapabilityEnabled('emergencySmartIntakeIdentitySession')
                ? SmartIntakeApi.linkPatient(
                    sessionId,
                    selectedCandidate!.patientId,
                    emergencyRole.roleLabel,
                  )
                : Promise.resolve({
                    sessionId,
                    status: 'manual-link-review',
                    patientId: selectedCandidate!.patientId,
                  }),
            () => {
              applyIntakeArrivalContext(
                useEmergencyStore.getState(),
                selectedCandidate!.patientId,
                resolveIntakeArrivalReason(),
              );
              selectPatient(selectedCandidate!.patientId);
              finishIntakeNavigation(selectedCandidate!.patientId);
            },
          )
        }
        onCreatePatient={() => {
          const patient = buildSmartIntakePatient(sessionId, 'Smart Intake patient', extractedFields);
          completeFinalAction(
            'Create-and-triage intake',
            () =>
              isBackendCapabilityEnabled('emergencySmartIntakeIdentitySession')
                ? SmartIntakeApi.createPatient(sessionId, emergencyRole.roleLabel)
                : runSmartIntakeVerticalSlice({
                    patient,
                    staffId: 'smart-intake-rn',
                    // Staff already reviewed matchCandidates and explicitly chose
                    // "Create patient" over "Link patient" above.
                    confirmDuplicateOverride: true,
                  }),
            (result) =>
              result
                ? hydrateSmartIntakeResult(result, patient)
                : addSmartIntakePatientToWhiteboard('Smart Intake patient'),
          );
        }}
      />
    </>
  );

  if (isStandaloneRoute) {
    return (
      <EmergencyRoutePage
        eyebrow={RECEPTION_COPY.workspace.eyebrow}
        title={RECEPTION_COPY.identityCheck.title}
        titleId="smart-intake-title"
        description={
          showIntakeHeroDescription ? RECEPTION_COPY.identityCheck.description : undefined
        }
        actions={sessionStartButton}
      >
        <section className="smart-intake smart-intake--standalone">{intakeBody}</section>
      </EmergencyRoutePage>
    );
  }

  return (
    <section
      className={`smart-intake${embedded ? ' smart-intake--embedded' : ''}`}
      aria-labelledby="smart-intake-title"
    >
      <header className="smart-intake__hero">
        <div>
          <span>{fromReception || embedded ? 'Reception' : RECEPTION_COPY.workspace.eyebrow}</span>
          <h1 id="smart-intake-title">{RECEPTION_COPY.identityCheck.title}</h1>
          {showIntakeHeroDescription ? <p>{RECEPTION_COPY.identityCheck.description}</p> : null}
        </div>
        {sessionStartButton}
        {embedded ? (
          <button type="button" onClick={onClose}>
            {RECEPTION_COPY.identityCheck.close}
          </button>
        ) : fromReception ? (
          <button type="button" onClick={() => profileNavigate(CANONICAL_ROUTES.emergencyReception)}>
            {RECEPTION_COPY.identityCheck.backToReception}
          </button>
        ) : null}
      </header>
      {intakeBody}
    </section>
  );
}

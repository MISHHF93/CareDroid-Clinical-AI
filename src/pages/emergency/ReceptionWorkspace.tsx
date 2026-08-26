import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FolderOpen, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import ReceptionEscalationPanel from '../../components/reception/ReceptionEscalationPanel';
import ReceptionEscalationQuickActions from '../../components/reception/ReceptionEscalationQuickActions';
import ReceptionOperationalRail from '../../components/reception/ReceptionOperationalRail';
import ReceptionSmartIntakeOverlay from '../../components/reception/ReceptionSmartIntakeOverlay';
import PreparePatientChooser from '../../components/reception/PreparePatientChooser';
import UnifiedIntakePanel from '../../components/reception/UnifiedIntakePanel';
import ReceptionPatientTaskSheet from '../../components/reception/ReceptionPatientTaskSheet';
import ReceptionPatientLookup from '../../components/reception/ReceptionPatientLookup';
import ReceptionSkillStrip from '../../components/reception/ReceptionSkillStrip';
import ReceptionDuplicateConfirm from '../../components/reception/ReceptionDuplicateConfirm';
import ReceptionShiftClearance from '../../components/reception/ReceptionShiftClearance';
import EmsCriticalArrivalPrep from '../../components/reception/EmsCriticalArrivalPrep';
import { resolveReceptionNextBestAction } from '../../config/receptionSkillModel';
import { DUPLICATE_HIGH_CONFIDENCE_THRESHOLD } from '../../utils/patientDuplicateDetection';
import {
  buildReceptionEscalationTargetsLabel,
  resolveReceptionEscalationReason,
} from '../../services/receptionEscalationWorkflow';
import {
  buildReceptionAttentionSnapshot,
  type ReceptionAttentionRow,
  type ReceptionQueueRowAction,
} from '../../components/reception/receptionAttentionModel';
import { RECEPTION_COPY } from '../../components/reception/receptionCopy';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';
import { EMERGENCY_ACTIONS } from '../../config/emergencyRolePermissions';
import { resolveReceptionScreenCapabilities } from '../../config/receptionScreenModel';
import { useUser } from '../../contexts/UserContext';
import useProfileNavigate from '../../hooks/useProfileNavigate';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import useRouteScreenMode from '../../hooks/useRouteScreenMode';
import useReceptionDeskUi from '../../hooks/useReceptionDeskUi';
import useReceptionPinnedActions from '../../hooks/useReceptionPinnedActions';
import { useEmergencyStore } from '../../store/emergencyStore';
import { PatientFlag, PatientState, Priority, type Patient } from '../../types/emergency';
import {
  assertReceptionMutationAllowed,
  createPatientAndRouteFromReception,
  detectReceptionRedFlags,
  runReceptionAiIntakeAssist,
  scanReceptionDraftDuplicates,
  syncReceptionPatientToBackend,
  validateReceptionMinimumCriticalData,
  type ReceptionAiIntakeAssist,
  type ReceptionIntakeDraft,
  type ReceptionRouteResult,
} from '../../services/receptionIntakeOrchestrator';
import { completeProvisionalIntake } from '../../services/provisionalIdentityIntake';
import { completeIntakeHandoff } from '../../services/receptionHandoff';
import type {
  ReceptionEscalationInput,
  ReceptionEscalationReasonId,
} from '../../services/receptionEscalationWorkflow';
import { ReceptionFlowGraphic } from '../../components/graphics/CdlGraphicKit';
import ContextualGuidance from '../../components/ui/ContextualGuidance';
import { showActionError, showActionSuccess } from '../../services/careDroidInteractionFeedback';
import { STANDARD_ACTION_FEEDBACK } from '../../config/careDroidInteractionModel';
import { notifyWorkflowHandoffComplete } from '../../services/workflowNavigationFeedback';
import ReceptionHeader, { ReceptionHeaderActionButton } from '../../components/reception/ReceptionHeader';
import ReceptionPageLayout, {
  ReceptionContentSection,
  ReceptionCard,
} from '../../components/reception/ReceptionPageLayout';
import { InteractiveAIWorkspace } from '../../components/interactive-ai/InteractiveAIWorkspace';
import './ReceptionWorkspace.css';
import './emergency-route.css';
import '../../styles/reception-desk-theme.css';

const EMPTY_DRAFT: ReceptionIntakeDraft = {
  arrivalType: 'walk-in',
  chiefComplaint: '',
  estimatedAge: '',
  dob: '',
  sex: '',
  consciousnessStatus: 'unknown',
  breathingStatus: 'unknown',
  visibleDistress: 'unknown',
  painLevel: '',
  redFlagSymptoms: [],
  allergiesKnown: 'unknown',
  allergies: '',
  medicationsKnown: 'unknown',
  medications: '',
  firstName: '',
  lastName: '',
  contactCallback: '',
  insuranceStatus: 'unknown',
  consentStatus: 'unknown',
  documentStatus: 'unknown',
  notes: '',
  preferredLanguage: '',
  interpreterNeeded: 'unknown',
  nextOfKinName: '',
  nextOfKinPhone: '',
};

type SmartIntakeSession = {
  step?: string;
  patientId?: string;
  mode?: string;
  artifactId?: string;
  autostart?: boolean;
};

type QueueTabId = 'ems' | 'verification' | 'pretriage';

function patientDisplayName(patient: Patient): string {
  return [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() || patient.name || patient.mrn;
}

function isReceptionQueuePatient(patient: Patient): boolean {
  return [PatientState.Arrival, PatientState.Registration, PatientState.Triage, PatientState.Waiting].includes(
    patient.state,
  );
}

function isHighRiskPatient(patient: Patient): boolean {
  return (
    patient.priority === Priority.P1 ||
    patient.priority === Priority.P2 ||
    patient.flags.includes(PatientFlag.HighRisk) ||
    patient.flags.includes(PatientFlag.DeteriorationRisk) ||
    patient.flags.includes(PatientFlag.SepsisAlert) ||
    patient.flags.includes(PatientFlag.StrokeCode)
  );
}

function waitMinutes(patient: Patient): number {
  const time = new Date(patient.arrival?.arrivalTimestamp || patient.arrivalTime || '').getTime();
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.round((Date.now() - time) / 60000));
}

function queueStatus(patient: Patient): string {
  if (patient.registrationStatus === 'provisional') return 'Temporary identity';
  if (patient.registrationStatus === 'in-progress') return 'Incomplete registration';
  if (patient.state === PatientState.Triage || patient.triagePending) return 'Waiting for triage';
  if (patient.state === PatientState.Waiting) return 'Waiting room';
  return patient.state;
}

function nextStep(patient: Patient): string {
  if (isHighRiskPatient(patient)) return 'Priority triage review';
  if (patient.registrationStatus === 'provisional') return 'Demographics follow-up';
  if (patient.state === PatientState.Triage || patient.triagePending) return 'Triage nurse';
  return 'Standard queue';
}

function ownerRole(patient: Patient): string {
  if (isHighRiskPatient(patient)) return 'Triage nurse / charge nurse';
  if (patient.registrationStatus === 'provisional' || patient.state === PatientState.Registration) {
    return 'Registration clerk';
  }
  return 'Triage nurse';
}

function mapQueueParamToTab(queueParam: string): QueueTabId {
  const normalized = queueParam.trim().toLowerCase();
  if (normalized === 'ems' || normalized.includes('ambulance')) return 'ems';
  if (normalized === 'verification' || normalized.includes('verify')) return 'verification';
  return 'pretriage';
}

function filterQueueByTab(patients: Patient[], tab: QueueTabId): Patient[] {
  if (tab === 'ems') {
    return patients.filter(
      (patient) =>
        patient.flags.includes(PatientFlag.EMSArrival) ||
        patient.arrival?.arrivalMode === 'EMS' ||
        patient.state === PatientState.Arrival,
    );
  }
  if (tab === 'verification') {
    return patients.filter(
      (patient) =>
        patient.registrationStatus === 'provisional' ||
        patient.registrationStatus === 'in-progress' ||
        patient.flags.includes(PatientFlag.IdentityPending),
    );
  }
  return patients.filter(
    (patient) =>
      patient.triagePending ||
      patient.state === PatientState.Triage ||
      patient.state === PatientState.Waiting,
  );
}

function Stepper({
  draft,
  aiAssist,
  result,
}: {
  draft: ReceptionIntakeDraft;
  aiAssist: ReceptionAiIntakeAssist | null;
  result: ReceptionRouteResult | null;
}) {
  const criticalStarted = Boolean(result?.criticalAlertId || result?.responseTimerId);
  const steps = [
    { id: 'arrival', label: 'Arrival', complete: Boolean(draft.arrivalType) },
    {
      id: 'critical',
      label: 'Life-critical info',
      complete: validateReceptionMinimumCriticalData(draft).length === 0 || detectReceptionRedFlags(draft).length > 0,
    },
    { id: 'ai', label: 'AI assist', complete: Boolean(aiAssist) },
    { id: 'route', label: 'Route to nurse', complete: Boolean(result) },
  ];

  return (
    <div className="reception-command-stepper-shell">
      <ReceptionFlowGraphic steps={steps} className="reception-command-stepper-shell__graphic" />
    <ol className="reception-command-stepper" aria-label="Reception intake progress">
      {steps.map((step) => (
        <li
          key={step.id}
          className={`reception-command-stepper__item${step.complete ? ' reception-command-stepper__item--complete' : ''}`}
        >
          <span>{step.label}</span>
        </li>
      ))}
      {criticalStarted ? (
        <li className="reception-command-stepper__item reception-command-stepper__item--critical">
          <span>3-minute response active</span>
        </li>
      ) : null}
    </ol>
    </div>
  );
}

export default function ReceptionWorkspace() {
  const { user } = useUser();
  const { profileNavigate } = useProfileNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const emergencyRole = useEmergencyRolePermissions();
  const screenMode = useRouteScreenMode();
  const receptionDesk = useReceptionDeskUi();
  const { pinnedQueueTab } = useReceptionPinnedActions();
  const patients = useEmergencyStore((state) => state.patients);
  const alerts = useEmergencyStore((state) => state.alerts);
  const selectedPatientId = useEmergencyStore((state) => state.selectedPatientId);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const lookupInputRef = useRef<HTMLInputElement | null>(null);

  const [draft, setDraft] = useState<ReceptionIntakeDraft>(EMPTY_DRAFT);
  const [aiAssist, setAiAssist] = useState<ReceptionAiIntakeAssist | null>(null);
  const [result, setResult] = useState<ReceptionRouteResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [provisionalUnknownSubmitting, setProvisionalUnknownSubmitting] = useState(false);
  const provisionalUnknownInFlightRef = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  const [activeQueueTab, setActiveQueueTab] = useState<QueueTabId>(() =>
    mapQueueParamToTab(pinnedQueueTab || 'pretriage'),
  );
  const [showChooser, setShowChooser] = useState(false);
  const [smartIntakeSession, setSmartIntakeSession] = useState<SmartIntakeSession | null>(null);
  const [escalationDialogOpen, setEscalationDialogOpen] = useState(false);
  const [escalationReasonId, setEscalationReasonId] = useState<ReceptionEscalationReasonId | null>(null);
  const [patientDetailOpen, setPatientDetailOpen] = useState(false);
  const [assistOpen, setAssistOpen] = useState(false);
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false);
  const [pendingRouteOptions, setPendingRouteOptions] = useState<{ aiUnavailable?: boolean } | null>(null);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [shiftClearanceOpen, setShiftClearanceOpen] = useState(false);

  const clearIntakeQueryParams = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    ['intake', 'autostart', 'step', 'mode', 'artifactId', 'express', 'quickCreate'].forEach((key) =>
      next.delete(key),
    );
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const resetForNextPatient = useCallback(() => {
    setDraft({ ...EMPTY_DRAFT });
    setAiAssist(null);
    setResult(null);
    setSmartIntakeSession(null);
    setShowChooser(false);
    // Focus chief complaint for keyboard-first registration speed.
    window.requestAnimationFrame(() => {
      const field = document.querySelector<HTMLTextAreaElement>(
        '.reception-front-door textarea, .unified-intake-grid textarea',
      );
      field?.focus();
    });
  }, []);

  const updateDraft = useCallback((patch: Partial<ReceptionIntakeDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setResult(null);
  }, []);

  const saveDraft = useCallback(() => {
    const storedDraft = { ...draft, id: draft.id || `draft-${Date.now()}`, savedAt: new Date().toISOString() };
    window.sessionStorage?.setItem('caredroid:reception-draft', JSON.stringify(storedDraft));
    setDraft(storedDraft);
    setHasSavedDraft(true);
    showActionSuccess(STANDARD_ACTION_FEEDBACK.draftSaved);
  }, [draft]);

  const focusQueueTab = useCallback((tab: QueueTabId) => {
    setActiveQueueTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set('queue', tab === 'ems' ? 'ems' : tab === 'verification' ? 'verification' : 'pretriage');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const receptionCapabilities = useMemo(
    () =>
      resolveReceptionScreenCapabilities({
        screenMode: screenMode || CARE_DROID_SCREEN_MODES.reception,
        can: emergencyRole.can,
        presentAction: emergencyRole.presentAction,
        role: emergencyRole.role,
        roleLabel: emergencyRole.roleLabel,
      }),
    [emergencyRole],
  );

  const currentUserName =
    emergencyRole.canonicalProfile?.preferredName ||
    emergencyRole.canonicalProfile?.fullName ||
    user?.name ||
    user?.email ||
    'Reception Desk';
  const canCreatePatient = emergencyRole.canMutate(EMERGENCY_ACTIONS.createPatient);
  const clinicalOverride = assertReceptionMutationAllowed(emergencyRole.role, EMERGENCY_ACTIONS.triage);
  const missingCriticalFields = validateReceptionMinimumCriticalData(draft);
  const liveRedFlags = detectReceptionRedFlags(draft);
  const duplicateCandidates = useMemo(
    () => scanReceptionDraftDuplicates(draft, patients),
    [draft.firstName, draft.lastName, draft.dob, draft.contactCallback, draft.sex, patients],
  );
  const duplicateWarnings = useMemo(
    () =>
      duplicateCandidates
        .filter((candidate) => candidate.matchScore >= 65)
        .map(
          (candidate) =>
            `${candidate.displayName} (${candidate.matchScore}% — ${candidate.recommendedAction.replace(/_/g, ' ')})`,
        ),
    [duplicateCandidates],
  );
  const criticalNeeded = useMemo(
    () =>
      aiAssist?.urgencySuggestion === 'critical' ||
      runReceptionAiIntakeAssist(draft).urgencySuggestion === 'critical',
    [
      aiAssist?.urgencySuggestion,
      draft.chiefComplaint,
      draft.redFlagSymptoms,
      draft.consciousnessStatus,
      draft.breathingStatus,
      draft.visibleDistress,
      draft.painLevel,
      draft.arrivalType,
    ],
  );

  const receptionQueueAll = useMemo(
    () =>
      patients
        .filter(isReceptionQueuePatient)
        .sort((left, right) => {
          const riskDelta = Number(isHighRiskPatient(right)) - Number(isHighRiskPatient(left));
          if (riskDelta) return riskDelta;
          return waitMinutes(right) - waitMinutes(left);
        }),
    [patients],
  );

  const receptionQueue = useMemo(
    () => filterQueueByTab(receptionQueueAll, activeQueueTab),
    [activeQueueTab, receptionQueueAll],
  );

  const attention = useMemo(
    () =>
      buildReceptionAttentionSnapshot(alerts, {
        roleId: emergencyRole.role,
        limit: 3,
        now,
      }),
    [alerts, emergencyRole.role, now],
  );

  const selectedPatient = useMemo(
    () => (selectedPatientId ? patients.find((patient) => patient.id === selectedPatientId) || null : null),
    [patients, selectedPatientId],
  );

  const emptyQueueMessage = RECEPTION_COPY.queues.empty[activeQueueTab] || 'No patients in this list.';

  const openSmartIntake = useCallback(
    (session: SmartIntakeSession = { autostart: true }) => {
      if (!receptionCapabilities.canOpenSmartIntake) return;
      setSmartIntakeSession(session);
      setShowChooser(false);
    },
    [receptionCapabilities.canOpenSmartIntake],
  );

  const openEscalationDialog = useCallback((reasonId: ReceptionEscalationReasonId | null = null) => {
    setEscalationReasonId(reasonId);
    setEscalationDialogOpen(true);
  }, []);

  const openPatientTask = useCallback(
    (patientId: string) => {
      selectPatient(patientId);
      setPatientDetailOpen(true);
    },
    [selectPatient],
  );

  const handleAttentionSelect = useCallback(
    (row: ReceptionAttentionRow) => {
      if (row.patientId) {
        openPatientTask(row.patientId);
        return;
      }
      if (row.primaryAction === 'escalate' && receptionCapabilities.canEscalateToNurse) {
        openEscalationDialog(null);
      }
    },
    [openEscalationDialog, openPatientTask, receptionCapabilities.canEscalateToNurse],
  );

  const handleQueueRowAction = useCallback(
    (patientId: string, action: ReceptionQueueRowAction) => {
      selectPatient(patientId);
      if (action === 'complete_id') {
        openSmartIntake({ step: 'capture', patientId, autostart: true });
        return;
      }
      if (action === 'escalate') {
        setPatientDetailOpen(true);
        openEscalationDialog('urgent-triage-attention');
        return;
      }
      if (action === 'handoff') {
        // Ensure intake handoff is applied, then keep clerk on reception (route matrix
        // does not include whiteboard for registration_clerk).
        try {
          completeIntakeHandoff(useEmergencyStore.getState(), {
            patientId,
            source: 'reception',
            actorName: currentUserName,
          });
          showActionSuccess(RECEPTION_COPY.workspace.sentToTriage);
          focusQueueTab('pretriage');
          setPatientDetailOpen(true);
        } catch (error) {
          showActionError(
            'Handoff failed',
            error instanceof Error ? error.message : 'Unable to hand off patient.',
          );
        }
        return;
      }
      setPatientDetailOpen(true);
    },
    [currentUserName, focusQueueTab, openEscalationDialog, openSmartIntake, selectPatient],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;
      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (canCreatePatient) resetForNextPatient();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDraft();
      }
      if (e.key === 'Escape') {
        if (duplicateConfirmOpen) { setDuplicateConfirmOpen(false); setPendingRouteOptions(null); return; }
        if (shiftClearanceOpen) { setShiftClearanceOpen(false); return; }
        if (smartIntakeSession) { setSmartIntakeSession(null); clearIntakeQueryParams(); return; }
        if (showChooser) { setShowChooser(false); return; }
        if (escalationDialogOpen) { setEscalationDialogOpen(false); setEscalationReasonId(null); return; }
        if (patientDetailOpen) { setPatientDetailOpen(false); return; }
      }
      if (e.key === '1' && !e.ctrlKey && !e.metaKey) { focusQueueTab('ems'); }
      if (e.key === '2' && !e.ctrlKey && !e.metaKey) { focusQueueTab('verification'); }
      if (e.key === '3' && !e.ctrlKey && !e.metaKey) { focusQueueTab('pretriage'); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    canCreatePatient,
    smartIntakeSession,
    showChooser,
    escalationDialogOpen,
    patientDetailOpen,
    duplicateConfirmOpen,
    shiftClearanceOpen,
    resetForNextPatient,
    clearIntakeQueryParams,
    focusQueueTab,
    saveDraft,
  ]);

  useEffect(() => {
    try {
      const saved = window.sessionStorage?.getItem('caredroid:reception-draft');
      if (saved) {
        const parsed = JSON.parse(saved) as ReceptionIntakeDraft;
        if (parsed && typeof parsed === 'object') {
          setDraft((current) => ({ ...current, ...parsed }));
          setHasSavedDraft(true);
        }
      }
    } catch {
      // ignore corrupt draft
    }
  }, []);

  const nextBestAction = useMemo(() => {
    const emsCount = filterQueueByTab(receptionQueueAll, 'ems').length;
    const verificationCount = filterQueueByTab(receptionQueueAll, 'verification').length;
    const pretriageCount = filterQueueByTab(receptionQueueAll, 'pretriage').length;
    const urgency =
      aiAssist?.urgencySuggestion ||
      (draft.chiefComplaint || liveRedFlags.length
        ? runReceptionAiIntakeAssist(draft).urgencySuggestion
        : null);
    return resolveReceptionNextBestAction({
      hasDraftComplaint: Boolean(String(draft.chiefComplaint || '').trim()),
      hasDraftIdentity: Boolean(String(draft.firstName || '').trim() || String(draft.lastName || '').trim() || draft.dob),
      hasSavedDraft,
      redFlagCount: liveRedFlags.length,
      urgency,
      duplicateHighConfidenceCount: duplicateCandidates.filter(
        (c) => c.matchScore >= DUPLICATE_HIGH_CONFIDENCE_THRESHOLD,
      ).length,
      duplicateReviewCount: duplicateWarnings.length,
      verificationQueueCount: verificationCount,
      pretriageQueueCount: pretriageCount,
      emsQueueCount: emsCount,
      lookupQueryEmpty: true,
      lookupResultsCount: 0,
      canCreatePatient: canCreatePatient && receptionDesk.canUseRegistrationSkills,
      skillIds: receptionDesk.staffProfile.skillIds,
    });
  }, [
    aiAssist?.urgencySuggestion,
    canCreatePatient,
    draft,
    duplicateCandidates,
    duplicateWarnings.length,
    hasSavedDraft,
    liveRedFlags.length,
    receptionDesk.canUseRegistrationSkills,
    receptionDesk.staffProfile.skillIds,
    receptionQueueAll,
  ]);

  useEffect(() => {
    const patientId = searchParams.get('patientId') || searchParams.get('patient') || searchParams.get('arrived');
    if (patientId) selectPatient(patientId);
    const queueParam = searchParams.get('queue') || searchParams.get('filter');
    if (queueParam) setActiveQueueTab(mapQueueParamToTab(queueParam));
    if (searchParams.get('intake') === '1') {
      openSmartIntake({
        step: searchParams.get('step') || undefined,
        patientId: searchParams.get('patientId') || undefined,
        mode: searchParams.get('mode') || undefined,
        artifactId: searchParams.get('artifactId') || undefined,
        autostart: searchParams.get('autostart') !== '0',
      });
    }
    if (searchParams.get('express') === '1' || searchParams.get('quickCreate') === '1') {
      resetForNextPatient();
      updateDraft({ arrivalType: 'walk-in' });
    }
  }, [openSmartIntake, resetForNextPatient, searchParams, selectPatient, updateDraft]);

  useEffect(() => {
    const onSmartIntake = (event: Event) => {
      const detail = (event as CustomEvent<SmartIntakeSession>).detail || {};
      openSmartIntake({ autostart: true, ...detail });
    };
    const onOpenIntake = () => {
      resetForNextPatient();
      setShowChooser(false);
      setSmartIntakeSession(null);
    };
    const onLookup = () => {
      lookupInputRef.current?.focus();
      lookupInputRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    };
    const onShiftClearance = () => {
      setShiftClearanceOpen(true);
    };
    document.addEventListener('open-reception-smart-intake', onSmartIntake as EventListener);
    document.addEventListener('open-reception-intake', onOpenIntake);
    document.addEventListener('open-reception-lookup', onLookup);
    document.addEventListener('open-reception-shift-clearance', onShiftClearance);
    return () => {
      document.removeEventListener('open-reception-smart-intake', onSmartIntake as EventListener);
      document.removeEventListener('open-reception-intake', onOpenIntake);
      document.removeEventListener('open-reception-lookup', onLookup);
      document.removeEventListener('open-reception-shift-clearance', onShiftClearance);
    };
  }, [openSmartIntake, resetForNextPatient]);

  const executeCreateAndRoute = async (
    options: { aiUnavailable?: boolean; confirmDuplicateOverride?: boolean } = {},
  ) => {
    if (!canCreatePatient) {
      showActionError('Reception action failed', 'Your profile cannot create patients.');
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      const routeResult = await createPatientAndRouteFromReception(draft, {
        actorName: currentUserName,
        actorStaffId: emergencyRole.canonicalProfile?.employeeId || emergencyRole.canonicalProfile?.id,
        aiUnavailable: options.aiUnavailable,
        confirmDuplicateOverride: Boolean(options.confirmDuplicateOverride),
      });
      setAiAssist(routeResult.aiAssist);
      setResult(routeResult);
      const routedMessage = routeResult.criticalAlertId
        ? 'Critical alert sent. 3-minute response timer started.'
        : RECEPTION_COPY.workspace.sentToTriage;
      selectPatient(routeResult.patientId);

      const isProvisional =
        routeResult.patient.registrationStatus === 'provisional' ||
        routeResult.patient.flags?.includes?.(PatientFlag.IdentityPending);
      focusQueueTab(isProvisional ? 'verification' : 'pretriage');

      if (routeResult.backendSyncStatus === 'failed') {
        showActionError(
          'Patient created locally — backend sync pending',
          routeResult.backendSyncError ||
            'Local workflow saved. Backend sync is pending — retry when ready.',
        );
      } else if (routeResult.backendSyncStatus === 'synced') {
        showActionSuccess(`${routedMessage} Backend record saved.`);
      } else {
        showActionSuccess(routedMessage);
      }

      // Keep registration clerks on the reception desk after create — their route
      // matrix often omits triage queues / whiteboard. Navigation is optional.
      // 'emergency_receptionist' is a normalizeEmergencyRole() INPUT alias for
      // registration_clerk (config/emergencyRolePermissions.ts ROLE_ALIASES), never
      // an OUTPUT of it -- emergencyRole.role can only be a canonical EmergencyRole
      // id, so that second comparison could never match.
      const clerkStaysOnDesk = emergencyRole.role === 'registration_clerk';
      notifyWorkflowHandoffComplete({
        patientName: patientDisplayName(routeResult.patient),
        description:
          routeResult.backendSyncStatus === 'failed'
            ? `${routedMessage} (server sync pending)`
            : routedMessage,
        nextRoute: clerkStaysOnDesk
          ? `${CANONICAL_ROUTES.emergencyReception}?arrived=${encodeURIComponent(routeResult.patientId)}`
          : routeResult.nextRoute,
        onNavigate: clerkStaysOnDesk ? undefined : profileNavigate,
      });
      window.sessionStorage?.removeItem('caredroid:reception-draft');
      setHasSavedDraft(false);
      setDuplicateConfirmOpen(false);
      setPendingRouteOptions(null);
    } catch (routeError) {
      showActionError(
        'Reception action failed',
        routeError instanceof Error ? routeError.message : 'Unable to route patient.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const createAndRoute = async (options: { aiUnavailable?: boolean } = {}) => {
    if (!canCreatePatient) {
      showActionError('Reception action failed', 'Your profile cannot create patients.');
      return;
    }
    if (submitting) return;

    // High-confidence duplicate gate — skill: duplicate_resolution
    const highConfidenceDupes = scanReceptionDraftDuplicates(draft, patients).filter(
      (candidate) => candidate.matchScore >= DUPLICATE_HIGH_CONFIDENCE_THRESHOLD,
    );
    if (highConfidenceDupes.length > 0) {
      setPendingRouteOptions(options);
      setDuplicateConfirmOpen(true);
      return;
    }

    await executeCreateAndRoute(options);
  };

  const handleProvisionalUnknown = async () => {
    if (!canCreatePatient) return;
    // Synchronous ref guard, not just the submitting state: completeProvisionalIntake
    // below creates a patient record synchronously (no await before it), so a plain
    // double-click -- the realistic usage pattern for a "crash pathway" button under
    // time pressure -- would otherwise reliably create two duplicate unknown-patient
    // records before React re-renders to disable the button.
    if (provisionalUnknownInFlightRef.current) return;
    provisionalUnknownInFlightRef.current = true;
    setProvisionalUnknownSubmitting(true);
    try {
      const provisional = completeProvisionalIntake(useEmergencyStore.getState(), 'unknown', {
        actorName: currentUserName,
      });
      setShowChooser(false);
      selectPatient(provisional.patient.id);
      focusQueueTab('verification');
      setResult(null);
      const sync = await syncReceptionPatientToBackend(provisional.patient);
      if (sync.status === 'failed') {
        showActionError(
          'Unknown patient registered locally — backend sync pending',
          sync.error || 'Local workflow saved. Backend sync is pending.',
        );
      } else {
        showActionSuccess(
          `${RECEPTION_COPY.chooser.unknown} — ${RECEPTION_COPY.workspace.sentToTriage}${
            sync.status === 'synced' ? ' Backend record saved.' : ''
          }`,
        );
      }
    } finally {
      provisionalUnknownInFlightRef.current = false;
      setProvisionalUnknownSubmitting(false);
    }
  };

  /**
   * Every skill-strip CTA must execute a real desk action (no decorative buttons).
   * Intentionally NOT memoized so handlers always close over the latest draft / queues.
   */
  const handleSkillCta = (
    cta: NonNullable<ReturnType<typeof resolveReceptionNextBestAction>['primaryCta']>,
  ) => {
    if (cta === 'lookup') {
      const input = lookupInputRef.current;
      if (input) {
        input.focus();
        input.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        // Lookup hidden (profile) — still start a clean walk-in.
        resetForNextPatient();
        showActionSuccess('Started new walk-in — search was not available on this profile.');
      }
      return;
    }
    if (cta === 'route') {
      void createAndRoute();
      return;
    }
    if (cta === 'crash') {
      // Prefer routing the current draft when complaint exists; else unknown/provisional.
      if (String(draft.chiefComplaint || '').trim() && canCreatePatient) {
        void createAndRoute();
        return;
      }
      void handleProvisionalUnknown();
      return;
    }
    if (cta === 'resolve_duplicate') {
      const candidates = scanReceptionDraftDuplicates(draft, patients).filter((c) => c.matchScore >= 65);
      if (candidates.length === 0) {
        showActionSuccess('No strong matches — search by name or health card, then create if needed.');
        lookupInputRef.current?.focus();
        return;
      }
      setDuplicateConfirmOpen(true);
      return;
    }
    if (cta === 'ems') {
      focusQueueTab('ems');
      window.requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>('.reception-operational-rail, [data-testid="reception-operational-rail"]')
          ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
      return;
    }
    if (cta === 'resume_draft') {
      window.requestAnimationFrame(() => {
        const field = document.querySelector<HTMLTextAreaElement>(
          '.reception-front-door textarea, .unified-intake-grid textarea',
        );
        field?.focus();
        field?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
      return;
    }
    if (cta === 'clear_shift') {
      setShiftClearanceOpen(true);
    }
  };

  const handleSmartIntakeHandoff = (handoff: {
    patientId?: string;
    receptionPath?: string;
    nextRoute?: string;
    queuesPath?: string;
  }) => {
    setSmartIntakeSession(null);
    clearIntakeQueryParams();
    if (handoff?.patientId) selectPatient(handoff.patientId);
    const nextRoute = handoff?.nextRoute || handoff?.queuesPath;
    notifyWorkflowHandoffComplete({
      description: RECEPTION_COPY.workspace.sentToTriage,
      nextRoute,
      onNavigate: profileNavigate,
    });
    if (nextRoute) {
      profileNavigate(nextRoute);
    }
  };

  const submitEscalation = useCallback((input: ReceptionEscalationInput) => {
    const record = useEmergencyStore.getState().submitReceptionEscalation(input);
    if (record) {
      const reason = resolveReceptionEscalationReason(record.reasonId);
      const targets = buildReceptionEscalationTargetsLabel(
        record.notifyTargets || reason?.notifyTargets || [],
      );
      showActionSuccess(
        `Escalation sent · Notified: ${targets || 'Triage nurse · Charge nurse'}`,
      );
    } else {
      showActionError('Escalation failed', 'Could not raise the reception escalation alert.');
    }
    return record;
  }, []);

  const situationTone =
    attention.criticalCount || criticalNeeded
      ? 'critical'
      : liveRedFlags.length || missingCriticalFields.length || attention.count
        ? 'warning'
        : 'neutral';

  return (
    <div className="reception-front-door reception-workspace">
    <ReceptionPageLayout
      header={
        <ReceptionHeader
          metrics={[
            {
              label: RECEPTION_COPY.metrics.queueSize,
              value: receptionQueueAll.length,
              tone: 'neutral',
            },
            {
              label: 'Draft flags',
              value: liveRedFlags.length + missingCriticalFields.length,
              tone:
                liveRedFlags.length || missingCriticalFields.length ? 'warning' : 'neutral',
            },
          ]}
          situation={{
            status: `${receptionQueueAll.length} patient${receptionQueueAll.length === 1 ? '' : 's'} in reception`,
            attention:
              attention.count
                ? `${attention.count} item${attention.count === 1 ? '' : 's'} need attention`
                : liveRedFlags.length
                  ? `${liveRedFlags.length} red flag${liveRedFlags.length === 1 ? '' : 's'} in draft`
                  : 'No critical arrivals flagged',
            owner: `${currentUserName} · ${emergencyRole.roleLabel || 'Registration Clerk'}`,
            nextAction:
              result
                ? RECEPTION_COPY.workspace.registerNext
                : smartIntakeSession
                  ? 'Complete identity check, then confirm routing'
                  : criticalNeeded
                    ? 'Complete critical fields and route — 3-minute response if needed'
                    : draft.chiefComplaint
                      ? missingCriticalFields.length
                        ? `Complete ${missingCriticalFields.length} required field${missingCriticalFields.length === 1 ? '' : 's'}`
                        : 'Route patient to triage queue'
                      : RECEPTION_COPY.workspace.registerWalkIn,
            tone: situationTone,
          }}
          primaryActions={
            receptionDesk.enabled ? (
              <>
                <ReceptionHeaderActionButton
                  primary
                  onClick={resetForNextPatient}
                  title="Start a new walk-in intake (Ctrl+N). Complete fields, then Create & route."
                >
                  New walk-in
                </ReceptionHeaderActionButton>
                {(criticalNeeded || liveRedFlags.length >= 2) && canCreatePatient ? (
                  <ReceptionHeaderActionButton
                    onClick={() => void handleProvisionalUnknown()}
                    disabled={provisionalUnknownSubmitting}
                    title="Crash / unknown pathway — send to nurse without full identity"
                  >
                    Send unknown / crash
                  </ReceptionHeaderActionButton>
                ) : null}
                <ReceptionHeaderActionButton
                  onClick={() => openSmartIntake({ step: 'capture', autostart: true })}
                >
                  Check Identity
                </ReceptionHeaderActionButton>
                <ReceptionHeaderActionButton
                  onClick={() => setShowChooser(true)}
                >
                  Other Arrivals
                </ReceptionHeaderActionButton>
                {receptionDesk.canUseRegistrationSkills ? (
                  <ReceptionHeaderActionButton
                    onClick={() => setShiftClearanceOpen(true)}
                    title="Review EMS, ID-check, and waiting-for-nurse lists before you leave"
                  >
                    Shift clearance
                  </ReceptionHeaderActionButton>
                ) : null}
                {receptionCapabilities.canEscalateToNurse && (
                  <ReceptionHeaderActionButton
                    onClick={() => openEscalationDialog(null)}
                  >
                    Escalate to Nurse
                  </ReceptionHeaderActionButton>
                )}
                {!receptionDesk.showInlineCopilot && receptionDesk.canUseRegistrationSkills ? (
                  <ReceptionHeaderActionButton
                    onClick={() => setAssistOpen(true)}
                    title="Open reception assist — prompts can open pages and tools"
                  >
                    Desk assist
                  </ReceptionHeaderActionButton>
                ) : null}
              </>
            ) : null
          }
          queueTabs={[
            {
              id: 'ems',
              label: 'EMS',
              count: filterQueueByTab(receptionQueueAll, 'ems').length,
              active: activeQueueTab === 'ems',
              onClick: () => focusQueueTab('ems'),
            },
            {
              id: 'verification',
              label: 'Verification',
              count: filterQueueByTab(receptionQueueAll, 'verification').length,
              active: activeQueueTab === 'verification',
              onClick: () => focusQueueTab('verification'),
            },
            {
              id: 'pretriage',
              label: 'Pre-Triage',
              count: filterQueueByTab(receptionQueueAll, 'pretriage').length,
              active: activeQueueTab === 'pretriage',
              onClick: () => focusQueueTab('pretriage'),
            },
          ]}
        />
      }
      mainContent={
        <>
          <EmsCriticalArrivalPrep />
          <ReceptionContentSection>
            <Stepper draft={draft} aiAssist={aiAssist} result={result} />

            {hasSavedDraft && !String(draft.chiefComplaint || '').trim() && !result ? (
              <div className="reception-command-missing" role="status">
                <span>
                  Interrupted registration draft restored.{' '}
                  <button
                    type="button"
                    className="reception-linkish"
                    onClick={() =>
                      document.querySelector<HTMLTextAreaElement>('.reception-front-door textarea')?.focus()
                    }
                  >
                    Resume intake
                  </button>
                </span>
              </div>
            ) : null}

            {!clinicalOverride.allowed ? (
              <div className="reception-command-guardrail" role="note">
                <ShieldCheck size={18} aria-hidden="true" />
                <span>{clinicalOverride.reason}</span>
              </div>
            ) : null}

            {receptionDesk.canUseRegistrationSkills ? (
              <ReceptionSkillStrip action={nextBestAction} onPrimary={handleSkillCta} />
            ) : null}

            {receptionDesk.lookupBeforeCreateDefault && receptionDesk.canUseRegistrationSkills ? (
              <ReceptionPatientLookup
                patients={patients}
                inputRef={lookupInputRef}
                disabled={submitting}
                onSelectExisting={(patientId) => {
                  selectPatient(patientId);
                  setPatientDetailOpen(true);
                  showActionSuccess('Existing chart selected — complete ID or hand off from the task sheet.');
                }}
                onCreateNew={resetForNextPatient}
              />
            ) : null}

            <ReceptionCard padding="normal">
              <UnifiedIntakePanel
                draft={draft}
                onDraftChange={updateDraft}
                aiAssist={aiAssist}
                onAiAssistChange={setAiAssist}
                result={result}
                canCreatePatient={canCreatePatient && receptionDesk.canUseRegistrationSkills}
                submitting={submitting}
                onSaveDraft={saveDraft}
                onRoute={createAndRoute}
                onReset={resetForNextPatient}
                showQueueRail={false}
                actorName={currentUserName}
                patientId={selectedPatientId || undefined}
                duplicateWarnings={duplicateWarnings}
                assistTitle={
                  receptionDesk.labelAssistAsDeskNotAi
                    ? 'Desk assist (rules)'
                    : RECEPTION_COPY.copilot?.title || 'Desk assist'
                }
              />
            </ReceptionCard>

            {!result ? (
              <ContextualGuidance
                id="reception-workspace-intake-hint"
                title="One-step intake routing"
                detail="Capture complaint and identity, then route — triage assist, encounter, and queue placement sync automatically."
                tone="info"
                helpTopicId="reception"
              />
            ) : null}
          </ReceptionContentSection>

          {/* Nested escalation strip removed — single attention surface lives in sidebar.
              Optional non-slim: compact quick flags only (no second attention list). */}
          {receptionCapabilities.canEscalateToNurse &&
          receptionDesk.showNestedEscalationQuickActions ? (
            <ReceptionContentSection>
              <ReceptionEscalationQuickActions
                defaultPatientId={selectedPatientId}
                actorStaffId={emergencyRole.canonicalProfile?.employeeId || emergencyRole.canonicalProfile?.id}
                actorName={currentUserName}
                onSubmit={submitEscalation}
                onOpenDetail={(reasonId: ReceptionEscalationReasonId | null) => openEscalationDialog(reasonId)}
                className="reception-front-door__escalation-quick-actions"
              />
            </ReceptionContentSection>
          ) : null}
        </>
      }
      sidebar={
        <>
          <ReceptionOperationalRail
            queue={receptionQueue}
            attention={attention}
            selectedPatient={selectedPatient}
            onSelectPatient={openPatientTask}
            onAttentionSelect={handleAttentionSelect}
            onRowAction={handleQueueRowAction}
            patientDisplayName={patientDisplayName}
            queueStatus={queueStatus}
            nextStep={nextStep}
            waitMinutes={waitMinutes}
            isHighRiskPatient={isHighRiskPatient}
            activeQueueTab={RECEPTION_COPY.queues.tabs[activeQueueTab]}
            emptyQueueMessage={emptyQueueMessage}
          />
          {receptionDesk.showInlineCopilot || assistOpen ? (
            <div className="reception-interactive-ai">
              <InteractiveAIWorkspace
                role={emergencyRole.role || 'registration_clerk'}
                userId={emergencyRole.canonicalProfile?.id}
                organizationId={emergencyRole.canonicalProfile?.organizationId}
                patientId={selectedPatient?.id}
                pageId="reception_workspace"
                channel="reception"
                purpose="reception_interactive_assist"
                title="Reception Copilot"
                permissions={['use_ai_chat', 'view_phi', 'view_operations']}
                seedTriggers={[
                  {
                    kind: 'incomplete_registration',
                    summary: 'Check missing registration fields before triage handoff.',
                    urgency: 'attention',
                  },
                  {
                    kind: 'new_ocr_document',
                    summary: 'Review OCR confidence before committing document fields.',
                    urgency: 'info',
                  },
                ]}
              />
            </div>
          ) : (
            <button
              type="button"
              className="reception-assist-toggle"
              onClick={() => setAssistOpen(true)}
            >
              Open assist
            </button>
          )}
        </>
      }
      footer={
        result ? (
          <div className="reception-command-selected reception-command-selected--floating" role="status">
            <strong>Routed: {patientDisplayName(result.patient)}</strong>
            <button
              type="button"
              className="reception-command-selected__primary"
              onClick={() => profileNavigate(result.nextRoute)}
            >
              Continue to triage
            </button>
            <button type="button" onClick={() => profileNavigate(result.profileRoute)}>
              <FolderOpen size={16} aria-hidden="true" />
              {RECEPTION_COPY.workspace.openPatientCard}
            </button>
            <button type="button" onClick={resetForNextPatient}>
              {RECEPTION_COPY.workspace.registerNext}
            </button>
          </div>
        ) : null
      }
    >
      {showChooser ? (
        <PreparePatientChooser
          onClose={() => setShowChooser(false)}
          onManual={() => {
            setShowChooser(false);
            resetForNextPatient();
          }}
          onScan={() => openSmartIntake({ step: 'capture', autostart: true })}
          onSmartIntake={() => openSmartIntake({ autostart: true })}
          onQuickCreate={() => {
            setShowChooser(false);
            resetForNextPatient();
            updateDraft({ arrivalType: 'walk-in', chiefComplaint: '' });
          }}
          onUnknown={() => void handleProvisionalUnknown()}
        />
      ) : null}

      <ReceptionDuplicateConfirm
        open={duplicateConfirmOpen}
        candidates={scanReceptionDraftDuplicates(draft, patients).filter(
          (c) => c.matchScore >= 65,
        )}
        onCancel={() => {
          setDuplicateConfirmOpen(false);
          setPendingRouteOptions(null);
        }}
        onUseExisting={(patientId) => {
          setDuplicateConfirmOpen(false);
          setPendingRouteOptions(null);
          selectPatient(patientId);
          setPatientDetailOpen(true);
          showActionSuccess('Using existing chart — no new patient created.');
        }}
        onCreateAnyway={() => {
          setDuplicateConfirmOpen(false);
          void executeCreateAndRoute({ ...(pendingRouteOptions || {}), confirmDuplicateOverride: true });
        }}
      />

      <ReceptionShiftClearance
        open={shiftClearanceOpen}
        emsCount={filterQueueByTab(receptionQueueAll, 'ems').length}
        verificationCount={filterQueueByTab(receptionQueueAll, 'verification').length}
        pretriageCount={filterQueueByTab(receptionQueueAll, 'pretriage').length}
        verificationPatients={filterQueueByTab(receptionQueueAll, 'verification')}
        patientDisplayName={patientDisplayName}
        onClose={() => setShiftClearanceOpen(false)}
        onJumpTab={(tab) => {
          setShiftClearanceOpen(false);
          focusQueueTab(tab);
        }}
        onOpenPatient={(patientId) => {
          setShiftClearanceOpen(false);
          openPatientTask(patientId);
        }}
        onRecordShiftNote={() => {
          useEmergencyStore.getState().recordWorkflowAction({
            type: 'integration_event_received',
            title: 'Reception shift handoff',
            summary: `${currentUserName} recorded end-of-shift clearance: EMS ${filterQueueByTab(receptionQueueAll, 'ems').length}, ID-check ${filterQueueByTab(receptionQueueAll, 'verification').length}, waiting-for-nurse ${filterQueueByTab(receptionQueueAll, 'pretriage').length}.`,
            actorName: currentUserName,
            source: 'reception-shift-clearance',
            severity: 'Info',
            metadata: {
              ems: filterQueueByTab(receptionQueueAll, 'ems').length,
              verification: filterQueueByTab(receptionQueueAll, 'verification').length,
              pretriage: filterQueueByTab(receptionQueueAll, 'pretriage').length,
            },
          });
          setShiftClearanceOpen(false);
          showActionSuccess('Shift handoff note recorded for the next clerk.');
        }}
      />

      <ReceptionSmartIntakeOverlay
        session={smartIntakeSession}
        onClose={() => {
          setSmartIntakeSession(null);
          clearIntakeQueryParams();
        }}
        onHandoffComplete={handleSmartIntakeHandoff}
      />

      <ReceptionEscalationPanel
        open={escalationDialogOpen}
        patients={receptionQueueAll}
        defaultPatientId={selectedPatientId}
        initialReasonId={escalationReasonId}
        actorStaffId={emergencyRole.canonicalProfile?.employeeId || emergencyRole.canonicalProfile?.id}
        actorName={currentUserName}
        onClose={() => {
          setEscalationDialogOpen(false);
          setEscalationReasonId(null);
        }}
        onSubmit={submitEscalation}
      />

      {patientDetailOpen && selectedPatient ? (
        <ReceptionPatientTaskSheet
          patient={selectedPatient}
          displayName={patientDisplayName(selectedPatient)}
          statusLabel={queueStatus(selectedPatient)}
          nextStepLabel={nextStep(selectedPatient)}
          ownerLabel={ownerRole(selectedPatient)}
          waitMinutes={waitMinutes(selectedPatient)}
          isHighRisk={isHighRiskPatient(selectedPatient)}
          canEscalate={receptionCapabilities.canEscalateToNurse}
          canSmartIntake={receptionCapabilities.canOpenSmartIntake}
          onClose={() => setPatientDetailOpen(false)}
          onCompleteId={() => {
            openSmartIntake({
              step: 'capture',
              patientId: selectedPatient.id,
              autostart: true,
            });
          }}
          onEscalate={() => openEscalationDialog('urgent-triage-attention')}
          onHandoff={() => {
            try {
              completeIntakeHandoff(useEmergencyStore.getState(), {
                patientId: selectedPatient.id,
                source: 'reception',
                actorName: currentUserName,
              });
              showActionSuccess(RECEPTION_COPY.workspace.sentToTriage);
              focusQueueTab('pretriage');
              setPatientDetailOpen(false);
            } catch (error) {
              showActionError(
                'Handoff failed',
                error instanceof Error ? error.message : 'Unable to hand off patient.',
              );
            }
          }}
          onOpenFullRecord={() =>
            profileNavigate(
              `${CANONICAL_ROUTES.emergencyPatients}?patientId=${encodeURIComponent(selectedPatient.id)}`,
            )
          }
        />
      ) : null}
    </ReceptionPageLayout>
    </div>
  );
}
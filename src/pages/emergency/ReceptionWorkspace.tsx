import { useCallback, useEffect, useMemo, useState } from 'react';
import { FolderOpen, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import ArrivalControlSummaryStrip from '../../components/reception/ArrivalControlSummaryStrip';
import ReceptionDeskToolbar from '../../components/reception/ReceptionDeskToolbar';
import ReceptionEscalationAttentionStrip from '../../components/reception/ReceptionEscalationAttentionStrip';
import ReceptionOperationalRail from '../../components/reception/ReceptionOperationalRail';
import ReceptionSmartIntakeOverlay from '../../components/reception/ReceptionSmartIntakeOverlay';
import PreparePatientChooser from '../../components/reception/PreparePatientChooser';
import UnifiedIntakePanel from '../../components/reception/UnifiedIntakePanel';
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
import { useEmergencyStore } from '../../store/emergencyStore';
import { PatientFlag, PatientState, Priority, type Alert, type Patient } from '../../types/emergency';
import {
  assertReceptionMutationAllowed,
  createPatientAndRouteFromReception,
  detectReceptionRedFlags,
  runReceptionAiIntakeAssist,
  validateReceptionMinimumCriticalData,
  type ReceptionAiIntakeAssist,
  type ReceptionArrivalType,
  type ReceptionIntakeDraft,
  type ReceptionRouteResult,
} from '../../services/receptionIntakeOrchestrator';
import { completeProvisionalIntake } from '../../services/provisionalIdentityIntake';
import { ReceptionFlowGraphic } from '../../components/graphics/CdlGraphicKit';
import { EmergencyRoutePage } from './emergencyRouteShared';
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

function isReceptionCriticalAlert(alert: Alert): boolean {
  return (
    alert.severity === 'Critical' &&
    !alert.dismissed &&
    !alert.acknowledged &&
    ['reception-critical-intake', 'reception-escalation-workflow', 'three-minute-timer-engine'].includes(
      String(alert.source || ''),
    )
  );
}

function formatTimer(alert: Alert, now: number): string {
  const startedAt = String(alert.metadata?.responseStartedAt || alert.createdAt || '');
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started)) return '3:00';
  const remaining = Math.max(0, 180 - Math.floor((now - started) / 1000));
  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function isTimerBreached(alert: Alert, now: number): boolean {
  const startedAt = String(alert.metadata?.responseStartedAt || alert.createdAt || '');
  const started = new Date(startedAt).getTime();
  return Number.isFinite(started) && now - started >= 180000;
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
  const patients = useEmergencyStore((state) => state.patients);
  const alerts = useEmergencyStore((state) => state.alerts);
  const capacity = useEmergencyStore((state) => state.capacity);
  const selectedPatientId = useEmergencyStore((state) => state.selectedPatientId);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);

  const [draft, setDraft] = useState<ReceptionIntakeDraft>(EMPTY_DRAFT);
  const [aiAssist, setAiAssist] = useState<ReceptionAiIntakeAssist | null>(null);
  const [result, setResult] = useState<ReceptionRouteResult | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [activeQueueTab, setActiveQueueTab] = useState<QueueTabId>('pretriage');
  const [showChooser, setShowChooser] = useState(false);
  const [smartIntakeSession, setSmartIntakeSession] = useState<SmartIntakeSession | null>(null);

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
  const hospitalSite =
    emergencyRole.canonicalProfile?.hospitalSite ||
    (capacity as { siteName?: string }).siteName ||
    'Virtual City Hospital';
  const shiftStatus = emergencyRole.canonicalProfile?.shiftStatus || 'On shift';
  const canCreatePatient = emergencyRole.canMutate(EMERGENCY_ACTIONS.createPatient);
  const clinicalOverride = assertReceptionMutationAllowed(emergencyRole.role, EMERGENCY_ACTIONS.triage);
  const missingCriticalFields = validateReceptionMinimumCriticalData(draft);
  const liveRedFlags = detectReceptionRedFlags(draft);
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

  const criticalAlerts = useMemo(() => alerts.filter(isReceptionCriticalAlert), [alerts]);
  const selectedPatient = useMemo(
    () => (selectedPatientId ? patients.find((patient) => patient.id === selectedPatientId) || null : null),
    [patients, selectedPatientId],
  );

  const emptyQueueMessage = RECEPTION_COPY.queues.empty[activeQueueTab] || 'No patients in this list.';

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
    setError('');
    setStatus('');
  }, []);

  const updateDraft = useCallback((patch: Partial<ReceptionIntakeDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setError('');
    setStatus('');
    setResult(null);
  }, []);

  const openSmartIntake = useCallback(
    (session: SmartIntakeSession = { autostart: true }) => {
      if (!receptionCapabilities.canOpenSmartIntake) return;
      setSmartIntakeSession(session);
      setShowChooser(false);
    },
    [receptionCapabilities.canOpenSmartIntake],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const saved = window.sessionStorage?.getItem('caredroid:reception-draft');
      if (saved) {
        const parsed = JSON.parse(saved) as ReceptionIntakeDraft;
        if (parsed && typeof parsed === 'object') setDraft((current) => ({ ...current, ...parsed }));
      }
    } catch {
      // ignore corrupt draft
    }
  }, []);

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
    document.addEventListener('open-reception-smart-intake', onSmartIntake as EventListener);
    document.addEventListener('open-reception-intake', onOpenIntake);
    return () => {
      document.removeEventListener('open-reception-smart-intake', onSmartIntake as EventListener);
      document.removeEventListener('open-reception-intake', onOpenIntake);
    };
  }, [openSmartIntake, resetForNextPatient]);

  const saveDraft = () => {
    const storedDraft = { ...draft, id: draft.id || `draft-${Date.now()}`, savedAt: new Date().toISOString() };
    window.sessionStorage?.setItem('caredroid:reception-draft', JSON.stringify(storedDraft));
    setDraft(storedDraft);
    setStatus('Draft saved locally.');
  };

  const createAndRoute = async (options: { aiUnavailable?: boolean } = {}) => {
    if (!canCreatePatient) {
      setError('Your profile cannot create patients.');
      return;
    }

    setSubmitting(true);
    setError('');
    setStatus('');
    try {
      const routeResult = await createPatientAndRouteFromReception(draft, {
        actorName: currentUserName,
        actorStaffId: emergencyRole.canonicalProfile?.employeeId || emergencyRole.canonicalProfile?.id,
        aiUnavailable: options.aiUnavailable,
      });
      setAiAssist(routeResult.aiAssist);
      setResult(routeResult);
      setStatus(
        routeResult.criticalAlertId
          ? 'Critical alert sent. 3-minute response timer started.'
          : RECEPTION_COPY.workspace.sentToTriage,
      );
      selectPatient(routeResult.patientId);
      window.sessionStorage?.removeItem('caredroid:reception-draft');
    } catch (routeError) {
      setError(routeError instanceof Error ? routeError.message : 'Unable to route patient.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProvisionalUnknown = () => {
    if (!canCreatePatient) return;
    const provisional = completeProvisionalIntake(useEmergencyStore.getState(), 'unknown', {
      actorName: currentUserName,
    });
    setShowChooser(false);
    setStatus(`${RECEPTION_COPY.chooser.unknown} — ${RECEPTION_COPY.workspace.sentToTriage}`);
    selectPatient(provisional.patient.id);
    setResult(null);
  };

  const handleSmartIntakeHandoff = (handoff: { patientId?: string; receptionPath?: string }) => {
    setSmartIntakeSession(null);
    clearIntakeQueryParams();
    if (handoff?.patientId) selectPatient(handoff.patientId);
    setStatus(RECEPTION_COPY.workspace.sentToTriage);
  };

  const focusQueueTab = (tab: QueueTabId) => {
    setActiveQueueTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set('queue', tab === 'ems' ? 'ems' : tab === 'verification' ? 'verification' : 'pretriage');
    setSearchParams(next, { replace: true });
  };

  const situationTone =
    criticalAlerts.length || criticalNeeded
      ? 'critical'
      : liveRedFlags.length || missingCriticalFields.length
        ? 'warning'
        : 'neutral';

  return (
    <EmergencyRoutePage
      surfaceClassName="reception-workspace reception-command reception-front-door"
      titleId="reception-command-title"
      eyebrow={RECEPTION_COPY.workspace.eyebrow}
      title={RECEPTION_COPY.workspace.title}
      description={RECEPTION_COPY.workspace.deskDescription}
      situationBrief={{
        status: `${receptionQueueAll.length} patient${receptionQueueAll.length === 1 ? '' : 's'} in reception`,
        attention:
          criticalAlerts.length
            ? `${criticalAlerts.length} critical alert${criticalAlerts.length === 1 ? '' : 's'}`
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
      actions={
        <div className="reception-command-header__metrics" aria-label="Reception queue metrics">
          <div>
            <strong>{receptionQueueAll.length}</strong>
            <span>{RECEPTION_COPY.metrics.queueSize}</span>
          </div>
          <div className={criticalAlerts.length ? 'reception-command-metric--critical' : ''}>
            <strong>{criticalAlerts.length}</strong>
            <span>Critical</span>
          </div>
        </div>
      }
      operationalSummaryExtra={
        <>
          <div className="reception-command-header__meta">
            <span>{currentUserName}</span>
            <span className="reception-command-badge">{emergencyRole.roleLabel || 'Registration Clerk'}</span>
            <span>{shiftStatus}</span>
            <span>{hospitalSite}</span>
          </div>
          <ReceptionEscalationAttentionStrip
            alerts={alerts}
            roleId={emergencyRole.role}
            onSelectPatient={selectPatient}
            className="reception-front-door__escalation-strip"
          />
        </>
      }
      primaryActions={
        receptionDesk.enabled ? (
        <>
          <ReceptionDeskToolbar
            canCreatePatient={receptionCapabilities.canCreatePatient}
            canVerifyIntake={receptionCapabilities.canVerifyIdentity}
            canEscalateToNurse={receptionCapabilities.canEscalateToNurse}
            canOpenPrepareChooser={receptionCapabilities.canCaptureArrivalReason}
            canOpenSmartIntake={receptionCapabilities.canOpenSmartIntake}
            activeQueueTab={activeQueueTab}
            onRegisterWalkIn={resetForNextPatient}
            onCheckIdentity={() => openSmartIntake({ step: 'capture', autostart: true })}
            onOtherArrivals={() => setShowChooser(true)}
            onEscalate={() => profileNavigate(`${CANONICAL_ROUTES.emergencyQueues}?queue=pretriage`)}
            onFocusEms={() => focusQueueTab('ems')}
            onFocusVerification={() => focusQueueTab('verification')}
            onFocusPretriage={() => focusQueueTab('pretriage')}
          />
          <ArrivalControlSummaryStrip
            patients={receptionQueueAll}
            onMetricSelect={({ queueTab }) => {
              if (queueTab === 'verification' || queueTab === 'pretriage') {
                focusQueueTab(queueTab);
              }
            }}
            className="reception-front-door__arrival-summary"
          />
        </>
        ) : null
      }
      supportingContext={
        <ReceptionOperationalRail
          queue={receptionQueue}
          criticalAlerts={criticalAlerts}
          selectedPatient={selectedPatient}
          now={now}
          onSelectPatient={selectPatient}
          onOpenProfile={(patientId) =>
            profileNavigate(`${CANONICAL_ROUTES.emergencyPatients}?patientId=${encodeURIComponent(patientId)}`)
          }
          patientDisplayName={patientDisplayName}
          queueStatus={queueStatus}
          nextStep={nextStep}
          ownerRole={ownerRole}
          waitMinutes={waitMinutes}
          isHighRiskPatient={isHighRiskPatient}
          formatTimer={formatTimer}
          isTimerBreached={isTimerBreached}
          activeQueueTab={RECEPTION_COPY.queues.tabs[activeQueueTab]}
          emptyQueueMessage={emptyQueueMessage}
        />
      }
    >
      <Stepper draft={draft} aiAssist={aiAssist} result={result} />

      {!clinicalOverride.allowed ? (
        <div className="reception-command-guardrail" role="note">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>{clinicalOverride.reason}</span>
        </div>
      ) : null}

      <div className="reception-front-door__main">
        <UnifiedIntakePanel
          draft={draft}
          onDraftChange={updateDraft}
          aiAssist={aiAssist}
          onAiAssistChange={setAiAssist}
          result={result}
          canCreatePatient={canCreatePatient}
          submitting={submitting}
          onSaveDraft={saveDraft}
          onRoute={createAndRoute}
          onReset={resetForNextPatient}
          showQueueRail={false}
        />
      </div>

      {status || error ? (
        <div
          className={`reception-command-toast ${error ? 'reception-command-toast--error' : ''}`}
          role={error ? 'alert' : 'status'}
        >
          {error || status}
        </div>
      ) : null}

      {result ? (
        <div className="reception-command-selected reception-command-selected--floating" role="status">
          <strong>Routed: {patientDisplayName(result.patient)}</strong>
          <button type="button" onClick={() => profileNavigate(result.profileRoute)}>
            <FolderOpen size={16} aria-hidden="true" />
            {RECEPTION_COPY.workspace.openPatientCard}
          </button>
          <button type="button" onClick={resetForNextPatient}>
            {RECEPTION_COPY.workspace.registerNext}
          </button>
        </div>
      ) : null}

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
          onUnknown={handleProvisionalUnknown}
        />
      ) : null}

      <ReceptionSmartIntakeOverlay
        session={smartIntakeSession}
        onClose={() => {
          setSmartIntakeSession(null);
          clearIntakeQueryParams();
        }}
        onHandoffComplete={handleSmartIntakeHandoff}
      />
    </EmergencyRoutePage>
  );
}
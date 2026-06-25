import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useProfileNavigate from '../../hooks/useProfileNavigate';
import ReceptionQuickIntake, { focusReceptionQuickIntake } from '../../components/reception/ReceptionQuickIntake';
import QuickIntake from '../../components/QuickIntake';
import ArrivalDashboard from '../../components/reception/ArrivalDashboard';
import ReceptionOperationalStrip from '../../components/reception/ReceptionOperationalStrip';
import TriageOperationalStrip from '../../components/triage/TriageOperationalStrip';
import ReceptionAlertRail from '../../components/reception/ReceptionAlertRail';
import PreparePatientChooser from '../../components/reception/PreparePatientChooser';
import IntakeArtifactPicker from '../../components/reception/IntakeArtifactPicker';
import DuplicatePatientBanner from '../../components/reception/DuplicatePatientBanner';
import ReceptionSearchHint from '../../components/reception/ReceptionSearchHint';
import {
  filterPatientsByQuery,
  patientLabel,
  selectEmsInboundCount,
} from '../../components/reception/receptionQueueModel';
import { isRegistrationClerkRole } from '../../config/emergencyRolePermissions';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import useReceptionScreen from '../../hooks/useReceptionScreen';
import useTriageScreen from '../../hooks/useTriageScreen';
import {
  resolveReceptionStripMetricIds,
  resolveTriageStripMetricIds,
} from '../../config/emergencyScreenKpiPolicy';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';
import { useReceptionSnapshotPolling } from '../../hooks/useEmergencyOs';
import { useEmergencyStore } from '../../store/emergencyStore';
import { completeReceptionHandoff, refreshIntakeHandoffSurfaces } from '../../services/receptionHandoff';
import { completeProvisionalIntake } from '../../services/provisionalIdentityIntake';
import {
  buildReceptionIntakeSession,
  convertEmsArrivalForReception,
  RECEPTION_INTAKE_URL_KEYS,
} from '../../services/receptionIntakeBridge';
import { registerEmsPreArrivalPlaceholder } from '../../services/preArrivalWorkflow';
import { useIntegrationPreArrivalSync } from '../../hooks/useIntegrationPreArrivalSync';
import ReceptionSmartIntakeOverlay from '../../components/reception/ReceptionSmartIntakeOverlay';
import ReceptionEscalationPanel from '../../components/reception/ReceptionEscalationPanel';
import ReceptionEscalationQuickActions from '../../components/reception/ReceptionEscalationQuickActions';
import ReceptionThroughputAttentionCluster from '../../components/reception/ReceptionThroughputAttentionCluster';
import OperationalPresentationFrame from '../../components/emergency/OperationalPresentationFrame';
import EdDataSourceBanner from '../../components/emergency/EdDataSourceBanner';
import WaitingRoomStatusMessagingStrip from '../../components/patient-experience/WaitingRoomStatusMessagingStrip';
import WaitingRoomProcessEducation from '../../components/patient-experience/WaitingRoomProcessEducation';
import PatientCommunicationStatusPanel from '../../components/waiting-room/PatientCommunicationStatusPanel';
import ReceptionPatientAnswersPanel from '../../components/reception/ReceptionPatientAnswersPanel';
import ArrivalControlBadge from '../../components/reception/ArrivalControlBadge';
import WhatHappensNextBadge from '../../components/guidance/WhatHappensNextBadge';
import { PatientState } from '../../types/emergency';
import { findDuplicateCandidatesFromQuery } from '../../utils/patientDuplicateDetection';
import ToolApiErrorBanner from '../../components/ToolApiErrorBanner';
import { ERROR_RECOVERY_COPY } from '../../config/errorRecoveryModel';
import { OPERATIONAL_AUDIT_DOMAIN } from '../../config/operationalAuditModel';
import OperationalHistoryPanel from '../../components/audit/OperationalHistoryPanel';
import { buildDataQualitySnapshot } from '../../services/dataQualityDiscovery';
import { buildQueueAuditSnapshot } from '../../services/queueAuditDiscovery';
import { RECEPTION_COPY } from '../../components/reception/receptionCopy';
import {
  RECEPTION_PIPELINE_STAGE,
  resolvePipelineStageFromSearchParams,
} from '../../config/emergencyPipelineModel';
import { isReceptionFirstUxEnabled, RECEPTION_FIRST_UX } from '../../config/receptionFirstUx.config';
import { RECEPTION_DESK_UI } from '../../config/receptionDeskUi.config';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import useReceptionDeskUi from '../../hooks/useReceptionDeskUi';
import ReceptionPipelineShell from './ReceptionPipelineShell';
import ReceptionEmbeddedCalculator from '../../components/reception/ReceptionEmbeddedCalculator';
import { shouldEmbedToolsOnReception } from '../../services/unifiedClinicalToolsBridge';
import TriageRuleBuilder from '../../components/reception/TriageRuleBuilder';
import VoiceInterviewKiosk from '../../components/reception/VoiceInterviewKiosk';
import useFeature from '../../hooks/useFeature';
import { logNativeAiDashboardAudit } from '../../services/nativeAiAudit';
import { buildClientTriageAssist } from '../../services/triageAssist';
import {
  applyPatientRouteIntent,
  clearPatientRouteParam,
  PATIENT_ROUTE_PARAM_KEYS,
  readPatientRouteContext,
} from '../../utils/receptionQueryParams';
import { buildPostHandoffNavigationPaths } from '../../services/receptionHandoff';
import './ReceptionWorkspace.css';
import './emergency-route.css';

export default function ReceptionWorkspace() {
  const surfaces = usePractitionerSurfaceVisibility();
  const { profileNavigate } = useProfileNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const emergencyRole = useEmergencyRolePermissions();
  const reception = useReceptionScreen();
  const triage = useTriageScreen();
  const deskUi = useReceptionDeskUi();
  const {
    data: receptionSnapshot,
    loading: receptionLoading,
    error: receptionError,
    refresh: refreshReceptionSnapshot,
  } = useReceptionSnapshotPolling(15000);
  const backendAvailable = useEmergencyStore((state) => state.backendAvailable);
  const activeScenarioId = useEmergencyStore((state) => state.activeScenarioId);
  const [handoffSyncWarning, setHandoffSyncWarning] = useState('');
  const patients = useEmergencyStore((state) => state.patients);
  const workflowLogs = useEmergencyStore((state) => state.workflowLogs);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const alerts = useEmergencyStore((state) => state.alerts);
  const emergencySettings = useEmergencyStore((state) => state.emergencySettings);
  const staff = useEmergencyStore((state) => state.staff);
  const referrals = useEmergencyStore((state) => state.referrals);
  const capacity = useEmergencyStore((state) => state.capacity);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const addPatient = useEmergencyStore((state) => state.addPatient);
  const submitReceptionEscalation = useEmergencyStore((state) => state.submitReceptionEscalation);
  const store = useEmergencyStore();
  const { enabled: nlpTriageExpertEnabled } = useFeature('nlp_triage_expert_system');
  const { enabled: voiceInterviewEnabled } = useFeature('voice_interview_assistant');

  const query = searchParams.get('q') || '';
  const embeddedCalculatorId =
    searchParams.get('calc') || searchParams.get('open') || null;
  const showEmbeddedCalculators =
    Boolean(embeddedCalculatorId) || searchParams.get('tools') === 'calculators';
  const canOpenEmbeddedCalculators =
    reception.showWidget('patient-search') ||
    shouldEmbedToolsOnReception({
      emergencyRoleId: emergencyRole.role,
      canAccessToolsRoute: emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyTools),
      kind: 'reception-embed',
    });
  const {
    arrivedPatientId,
    contextPatientId,
    queuePatientId,
    focusPatientId: routeFocusPatientId,
  } = readPatientRouteContext(searchParams);
  const queueParam = searchParams.get('queue') || '';
  const activeQueueTab = ['ems', 'verification', 'pretriage'].includes(queueParam) ? queueParam : 'ems';
  const [expandedPretriagePatientId, setExpandedPretriagePatientId] = useState(queuePatientId);

  useEffect(() => {
    if (queuePatientId) setExpandedPretriagePatientId(queuePatientId);
  }, [queuePatientId]);
  const [showReceptionQuickIntake, setShowReceptionQuickIntake] = useState(false);
  const [showQuickIntake, setShowQuickIntake] = useState(false);
  const [showPrepareChooser, setShowPrepareChooser] = useState(false);
  const [showEscalationPanel, setShowEscalationPanel] = useState(false);
  const [escalationReasonId, setEscalationReasonId] = useState(null);
  const [smartIntakeSession, setSmartIntakeSession] = useState(null);
  const [showArtifactPicker, setShowArtifactPicker] = useState(false);

  const canEscalateToNurse = reception.canEscalateToNurse;
  const canCreatePatient = reception.canCreatePatient;
  const useInlineQuickIntake =
    reception.showWidget('patient-creation') && canCreatePatient && deskUi.inlineQuickIntake;
  const openQuickIntake = useCallback(() => {
    if (useInlineQuickIntake) {
      focusReceptionQuickIntake();
      return;
    }
    setShowReceptionQuickIntake(true);
  }, [useInlineQuickIntake]);
  const canVerifyIntake = reception.canVerifyIdentity;
  const canConvertEmsArrival = reception.canConvertEmsArrival;
  const canOpenSmartIntake = reception.canOpenSmartIntake;
  useIntegrationPreArrivalSync(canVerifyIntake);

  const emsInbound = useEmergencyStore(selectEmsInboundCount);

  const filteredPatients = useMemo(
    () => filterPatientsByQuery(patients, query),
    [patients, query],
  );

  const duplicateCandidates = useMemo(
    () => (query.trim().length >= 2 ? findDuplicateCandidatesFromQuery(patients, query) : []),
    [patients, query],
  );

  const dataQualitySnapshot = useMemo(() => buildDataQualitySnapshot(patients), [patients]);
  const queueAuditSnapshot = useMemo(
    () => buildQueueAuditSnapshot({ patients, emsInbound, referrals: store.referrals }),
    [emsInbound, patients, store.referrals],
  );

  const arrivedPatient = useMemo(
    () => (arrivedPatientId ? patients.find((patient) => patient.id === arrivedPatientId) || null : null),
    [arrivedPatientId, patients],
  );

  const pendingHandoffSync = useMemo(
    () => patients.some((patient) => patient.handoffSyncPending),
    [patients],
  );

  const openSmartIntake = useCallback((step, patientId, extraParams = {}) => {
    setShowArtifactPicker(false);
    setSmartIntakeSession(
      buildReceptionIntakeSession({
        step,
        patientId,
        mode: extraParams.mode,
        emsArrivalId: extraParams.emsArrivalId,
        artifactId: extraParams.artifactId,
      }),
    );
  }, []);

  const openArtifactCapture = useCallback(() => {
    if (!canOpenSmartIntake) return;
    setShowArtifactPicker(true);
  }, [canOpenSmartIntake]);

  const closeSmartIntake = useCallback(() => {
    setSmartIntakeSession(null);
  }, []);

  const handleProvisionalIntake = useCallback(
    (kind) => {
      setShowPrepareChooser(false);
      setShowReceptionQuickIntake(false);
      setShowQuickIntake(false);
      setSmartIntakeSession(null);
      const handoff = completeProvisionalIntake(store, kind);
      profileNavigate(handoff.receptionPath);
    },
    [profileNavigate, store],
  );

  const openVerificationFromDuplicate = useCallback(
    (patientId) => {
      setShowReceptionQuickIntake(false);
      setShowQuickIntake(false);
      openSmartIntake('verify', patientId);
    },
    [openSmartIntake],
  );

  const handleSmartIntakeHandoff = useCallback(
    (handoff) => {
      refreshIntakeHandoffSurfaces(store);
      void refreshReceptionSnapshot();
      setSmartIntakeSession(null);
      profileNavigate(handoff.receptionPath);
    },
    [profileNavigate, refreshReceptionSnapshot, store],
  );

  useEffect(() => {
    const openPrimaryIntake = () => {
      openQuickIntake();
    };
    const openPrepareChooser = () => setShowPrepareChooser(true);
    const openSmartIntakeFromEvent = (event) => {
      const detail = event?.detail || {};
      openSmartIntake(detail.step, detail.patientId, detail);
    };
    document.addEventListener('open-reception-intake', openPrimaryIntake);
    document.addEventListener('open-reception-smart-intake', openSmartIntakeFromEvent);
    document.addEventListener('open-reception-prepare', openPrepareChooser);
    const openQuickCreate = () => openQuickIntake();
    document.addEventListener('open-reception-quick-create', openQuickCreate);
    return () => {
      document.removeEventListener('open-reception-intake', openPrimaryIntake);
      document.removeEventListener('open-reception-smart-intake', openSmartIntakeFromEvent);
      document.removeEventListener('open-reception-prepare', openPrepareChooser);
      document.removeEventListener('open-reception-quick-create', openQuickCreate);
    };
  }, [emergencyRole.role, openQuickIntake, openSmartIntake]);

  useEffect(() => {
    if (searchParams.get('intake') === '1' && canCreatePatient) {
      setSmartIntakeSession(
        buildReceptionIntakeSession({
          autostart: searchParams.get('autostart') !== '0',
          step: searchParams.get('step') || null,
          patientId: searchParams.get('patientId') || null,
          mode: searchParams.get('mode') || null,
          emsArrivalId: searchParams.get('emsArrivalId') || null,
          artifactId: searchParams.get('artifactId') || null,
        }),
      );
      const nextParams = new URLSearchParams(searchParams);
      for (const key of RECEPTION_INTAKE_URL_KEYS) nextParams.delete(key);
      setSearchParams(nextParams, { replace: true });
    }
  }, [canCreatePatient, searchParams, setSearchParams]);

  useEffect(() => {
    if (searchParams.get('express') === '1' && canCreatePatient) {
      openQuickIntake();
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('express');
      setSearchParams(nextParams, { replace: true });
    }
  }, [canCreatePatient, openQuickIntake, searchParams, setSearchParams]);

  useEffect(() => {
    if (
      (searchParams.get('quickCreate') === '1' || searchParams.get('quickIntake') === '1') &&
      canCreatePatient
    ) {
      openQuickIntake();
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('quickCreate');
      nextParams.delete('quickIntake');
      setSearchParams(nextParams, { replace: true });
    }
  }, [canCreatePatient, openQuickIntake, searchParams, setSearchParams]);

  const handlePatientSelect = (patientId) => {
    const patient = patients.find((entry) => entry.id === patientId);
    if (patient?.state === PatientState.Registration && canVerifyIntake) {
      openSmartIntake('verify', patientId);
      return;
    }
    if (patient?.state === PatientState.Triage) {
      setExpandedPretriagePatientId(patientId);
    }
    selectPatient(patientId);
  };

  const focusedPatientId = expandedPretriagePatientId || routeFocusPatientId || null;

  const showPatientAnswersDesk =
    surfaces.reception.showPatientAnswersPanel &&
    reception.showWidget('patient-answers') &&
    !triage.isTriageScreen;

  useEffect(() => {
    if (!contextPatientId) return;
    handlePatientSelect(contextPatientId);
    setSearchParams(
      clearPatientRouteParam(searchParams, PATIENT_ROUTE_PARAM_KEYS.context),
      { replace: true },
    );
  }, [contextPatientId]);

  useEffect(() => {
    if (!arrivedPatientId) return undefined;
    const timer = window.setTimeout(() => {
      if (searchParams.get(PATIENT_ROUTE_PARAM_KEYS.handoff) !== arrivedPatientId) return;
      setSearchParams(
        clearPatientRouteParam(searchParams, PATIENT_ROUTE_PARAM_KEYS.handoff),
        { replace: true },
      );
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [arrivedPatientId, searchParams, setSearchParams]);

  const handleReceptionQuickIntakeCompleted = (patient) => {
    const handoff = completeReceptionHandoff(store, {
      patientId: patient.id,
      source: 'reception-quick-intake',
    });
    if (handoff.syncPending) {
      setHandoffSyncWarning(ERROR_RECOVERY_COPY.handoffPending);
    }
    refreshIntakeHandoffSurfaces(store);
    void refreshReceptionSnapshot();
    if (!useInlineQuickIntake) {
      setShowReceptionQuickIntake(false);
    }
    profileNavigate(handoff.receptionPath);
  };

  const handleQuickIntakeAdded = (patient) => {
    const handoff = completeReceptionHandoff(store, {
      patientId: patient.id,
      source: 'quick-intake',
    });
    if (handoff.syncPending) {
      setHandoffSyncWarning(ERROR_RECOVERY_COPY.handoffPending);
    }
    refreshIntakeHandoffSurfaces(store);
    void refreshReceptionSnapshot();
    setShowQuickIntake(false);
    profileNavigate(handoff.receptionPath);
  };

  const handleVoicePreTriageReady = useCallback(
    ({ patient, suggestedPriority, transcript }) => {
      const now = new Date().toISOString();
      const triageAssist = buildClientTriageAssist(
        { ...patient, priority: suggestedPriority, chiefComplaint: patient.chiefComplaint },
        patients,
        { handoffSource: 'voice-interview', arrivalReason: patient.chiefComplaint },
      );
      const enrichedPatient = {
        ...patient,
        priority: suggestedPriority,
        source: 'voice-interview',
        triageAssist,
        triageAssistGeneratedAt: triageAssist.generatedAt,
        notes: [
          ...(patient.notes || []),
          {
            id: `voice-note-${Date.now()}`,
            text: transcript,
            type: 'Clinical',
            createdAt: now,
            metadata: { source: 'voice-interview-assistant' },
          },
        ],
        arrival: patient.arrival
          ? {
              ...patient.arrival,
              triageAcuity: suggestedPriority,
              chiefComplaint: patient.chiefComplaint,
              triagePending: true,
            }
          : undefined,
      };
      addPatient(enrichedPatient);
      logNativeAiDashboardAudit({
        action: 'voice_pre_triage_created',
        patientId: enrichedPatient.id,
        details: {
          suggestedPriority,
          transcriptPreview: transcript.slice(0, 160),
        },
      });
      setSearchParams(
        applyPatientRouteIntent(searchParams, enrichedPatient.id, 'queue'),
        { replace: true },
      );
      setExpandedPretriagePatientId(enrichedPatient.id);
      selectPatient(enrichedPatient.id);
    },
    [addPatient, searchParams, selectPatient, setSearchParams],
  );

  const handlePrepareEmsRegistration = (arrival) => {
    const placeholder = registerEmsPreArrivalPlaceholder(arrival.id);
    openSmartIntake('capture', placeholder.patientId || arrival.patientId, {
      emsArrivalId: arrival.id,
      mode: 'ems-prearrival',
    });
  };

  const preArrivalStore = useMemo(
    () => ({
      addEMSArrival: store.addEMSArrival,
    }),
    [store.addEMSArrival],
  );

  const handlePreArrivalSubmitted = (result) => {
    refreshIntakeHandoffSurfaces(store);
    void refreshReceptionSnapshot();
    if (result?.patient?.id) {
      selectPatient(result.patient.id);
    }
  };

  const handleConvertEmsArrival = (arrival) => {
    const result = convertEmsArrivalForReception(arrival.id, { actorName: emergencyRole.roleLabel });
    if (!result.ok) {
      void refreshReceptionSnapshot();
      return;
    }
    if (canVerifyIntake) {
      openSmartIntake('verify', result.patientId, {
        emsArrivalId: arrival.id,
        source: 'ems-convert',
      });
      return;
    }
    void refreshReceptionSnapshot();
  };

  const activePipelineStage = useMemo(
    () => resolvePipelineStageFromSearchParams(searchParams),
    [searchParams],
  );

  const handlePipelineStageChange = useCallback(
    (stageId) => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('express');
      nextParams.delete('intake');
      nextParams.delete('quickCreate');
      nextParams.delete('autostart');
      if (stageId === RECEPTION_PIPELINE_STAGE.ARRIVAL) {
        nextParams.delete('queue');
      } else if (stageId === RECEPTION_PIPELINE_STAGE.REGISTER) {
        nextParams.delete('queue');
        nextParams.set('express', '1');
      } else if (stageId === RECEPTION_PIPELINE_STAGE.VERIFY) {
        nextParams.set('queue', 'verification');
      } else if (stageId === RECEPTION_PIPELINE_STAGE.HANDOFF) {
        nextParams.set('queue', 'pretriage');
      }
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleMetricSelect = (metric) => {
    if (!metric.queueTab) return;
    const nextParams = new URLSearchParams(searchParams);
    if (metric.queueTab === 'ems') nextParams.delete('queue');
    else nextParams.set('queue', metric.queueTab);
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <OperationalPresentationFrame
      screenMode={triage.isTriageScreen ? triage.screenMode : reception.screenMode}
      as="section"
      className={[
        'reception-workspace',
        deskUi.slim ? 'reception-workspace--desk-slim' : '',
        reception.isReceptionScreen ? 'reception-workspace--screen-mode' : '',
        surfaces.compactLayout ? 'reception-workspace--practitioner-compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-labelledby="reception-workspace-title"
      data-reception-focus={reception.defaultFocus}
    >
      <header className="reception-workspace__intro emergency-route-page__hero">
        <div className="reception-workspace__intro-copy">
          {surfaces.chrome.showPageEyebrow ? (
            <span className="emergency-route-page__eyebrow">{RECEPTION_COPY.workspace.eyebrow}</span>
          ) : null}
          <h1 className="emergency-route-page__title" id="reception-workspace-title">
            {RECEPTION_COPY.workspace.title}
          </h1>
          {surfaces.reception.showIntroDescription ? (
            <p className="emergency-route-page__description">
              {deskUi.slim
                ? RECEPTION_COPY.workspace.deskDescription
                : RECEPTION_COPY.workspace.description}
            </p>
          ) : null}
        </div>
        <EdDataSourceBanner
          compact={surfaces.compactLayout}
          className="reception-workspace__data-source"
          envelope={receptionSnapshot}
          loading={receptionLoading}
          error={receptionError}
          activeScenarioId={activeScenarioId}
          backendAvailable={backendAvailable}
        />
      </header>

      {triage.isTriageScreen ? (
        <>
          <TriageOperationalStrip
            patients={patients}
            emsArrivals={emsArrivals}
            settings={emergencySettings}
            onMetricSelect={handleMetricSelect}
            stripMetricIds={
              resolveTriageStripMetricIds(CARE_DROID_SCREEN_MODES.triage)
            }
          />
          {surfaces.reception.showAlertRail ? (
            <ReceptionAlertRail
              patients={patients}
              alerts={alerts}
              referrals={referrals}
              staff={staff}
              workflowLogs={workflowLogs}
              emsArrivals={emsArrivals}
              rooms={store.rooms}
              settings={emergencySettings}
              roleId={emergencyRole.role}
              features={{
                showTriageBreach: triage.showTriageBreach,
                showSafetyEscalation: triage.showWaitingRoomSafetyEscalation,
              }}
              onSelectPatient={handlePatientSelect}
              className="reception-workspace__alert-rail"
            />
          ) : null}
        </>
      ) : reception.showWidget('operational-strip') ? (
      <ReceptionOperationalStrip
        patients={patients}
        emsInbound={emsInbound}
        capacity={capacity}
        settings={emergencySettings}
        emsArrivals={emsArrivals}
        onMetricSelect={handleMetricSelect}
        stripMetricIds={
          deskUi.stripMetricIds ||
          resolveReceptionStripMetricIds(CARE_DROID_SCREEN_MODES.reception)
        }
        showShiftLink={deskUi.show(RECEPTION_DESK_UI.surfaces.shiftStripLink)}
        shiftSummaryPath={
          emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyShift)
            ? CANONICAL_ROUTES.emergencyShift
            : null
        }
      />
      ) : null}

      {showPatientAnswersDesk ? (
        <ReceptionPatientAnswersPanel
          patients={patients}
          capacity={capacity}
          referrals={referrals}
          staff={staff}
          workflowLogs={workflowLogs}
          settings={emergencySettings}
          focusedPatientId={focusedPatientId}
          onSelectPatient={handlePatientSelect}
          className="reception-workspace__patient-answers"
        />
      ) : null}

      {surfaces.reception.showProcessEducation &&
      reception.showWidget('process-education') && !showPatientAnswersDesk && !triage.isTriageScreen ? (
        <WaitingRoomProcessEducation
          audience="staff"
          variant="compact"
          className="reception-workspace__process-education"
        />
      ) : null}

      {surfaces.reception.showStatusMessagingStrip &&
      reception.showWidget('operational-strip') && !showPatientAnswersDesk && !triage.isTriageScreen ? (
        <WaitingRoomStatusMessagingStrip
          patients={patients}
          referrals={referrals}
          capacity={capacity}
          audience="staff"
          className="reception-workspace__status-messaging"
        />
      ) : null}

      {surfaces.reception.showCommunicationPanel &&
      (reception.showWidget('communication-status') || triage.showWidget('communication-status')) ? (
        <PatientCommunicationStatusPanel
          patients={patients}
          workflowLogs={workflowLogs}
          staff={staff}
          referrals={referrals}
          settings={emergencySettings}
          onSelectPatient={handlePatientSelect}
          compact={deskUi.slim}
          className="reception-workspace__communication-status"
        />
      ) : null}

      {showEmbeddedCalculators ? (
        <ReceptionEmbeddedCalculator
          calculatorId={embeddedCalculatorId}
          patientId={contextPatientId || queuePatientId || arrivedPatientId || null}
        />
      ) : null}

      {!showEmbeddedCalculators && canOpenEmbeddedCalculators && reception.isReceptionScreen ? (
        <div className="reception-workspace__tools-access">
          <button
            type="button"
            className="reception-workspace__tools-access-btn"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.set('tools', 'calculators');
              next.set('source', 'reception-desk');
              setSearchParams(next, { replace: true });
            }}
          >
            Open calculators
          </button>
        </div>
      ) : null}

      {reception.showWidget('patient-search') && (deskUi.show(RECEPTION_DESK_UI.surfaces.searchHint) || query.trim()) ? (
        <ReceptionSearchHint query={query} />
      ) : null}

      {receptionError ? (
        <ToolApiErrorBanner
          message={`${receptionError}. ${ERROR_RECOVERY_COPY.syncStale}`}
          onRetry={() => void refreshReceptionSnapshot()}
          retryLabel="Refresh reception feed"
        />
      ) : null}

      {handoffSyncWarning || pendingHandoffSync ? (
        <ToolApiErrorBanner
          message={handoffSyncWarning || ERROR_RECOVERY_COPY.handoffPending}
          onRetry={() => {
            setHandoffSyncWarning('');
            void refreshReceptionSnapshot();
          }}
          retryLabel="Retry sync"
        />
      ) : null}

      {reception.showWidget('urgent-triage-escalation') && canEscalateToNurse ? (
        <>
          <ReceptionEscalationQuickActions
            defaultPatientId={queuePatientId || contextPatientId || null}
            actorStaffId={emergencyRole.staffId || null}
            actorName={emergencyRole.roleLabel || 'Reception'}
            onSubmit={(input) => submitReceptionEscalation(input)}
            onOpenDetail={(reasonId) => {
              setEscalationReasonId(reasonId);
              setShowEscalationPanel(true);
            }}
            className="reception-workspace__escalation-quick-actions"
          />
        </>
      ) : null}

      {surfaces.reception.showThroughputCluster &&
      reception.showWidget('operational-strip') && !triage.isTriageScreen ? (
        <ReceptionThroughputAttentionCluster
          patients={patients}
          emsArrivals={emsArrivals}
          referrals={referrals}
          staff={staff}
          rooms={store.rooms}
          workflowLogs={workflowLogs}
          emergencySettings={emergencySettings}
          alerts={alerts}
          showSafetyEscalation={reception.showWidget('waiting-room-safety-escalation')}
          onSelectPatient={handlePatientSelect}
          className="reception-workspace__throughput-cluster"
        />
      ) : null}

      {duplicateCandidates.length ? (
        <DuplicatePatientBanner
          candidates={duplicateCandidates}
          onOpenPatient={(patientId) => {
            if (canVerifyIntake) {
              openSmartIntake('verify', patientId);
              return;
            }
            handlePatientSelect(patientId);
          }}
          onContinueCreate={() => openSmartIntake()}
        />
      ) : null}

      {useInlineQuickIntake ? (
        <ReceptionQuickIntake
          variant="inline"
          initialSearchQuery={query}
          onCompleted={handleReceptionQuickIntakeCompleted}
          onOpenVerification={openVerificationFromDuplicate}
          onProvisionalIntake={() => handleProvisionalIntake('identity-pending')}
        />
      ) : null}

      {reception.showWidget('patient-creation') && canCreatePatient && !useInlineQuickIntake ? (
        <div className="reception-workspace__actions" aria-label={RECEPTION_COPY.workspace.actionsLabel}>
          <button
            type="button"
            className="reception-workspace__action reception-workspace__action--primary reception-workspace__action--wide"
            onClick={openQuickIntake}
          >
            {RECEPTION_COPY.workspace.registerWalkIn}
          </button>
          <div className="reception-workspace__actions reception-workspace__actions--secondary">
            {canEscalateToNurse ? (
              <button
                type="button"
                className="reception-workspace__action reception-workspace__action--escalate"
                onClick={() => {
              setEscalationReasonId(null);
              setShowEscalationPanel(true);
            }}
              >
                {RECEPTION_COPY.escalation.openAction}
              </button>
            ) : null}
            <button
              type="button"
              className="reception-workspace__action"
              onClick={openArtifactCapture}
              disabled={!canOpenSmartIntake}
            >
              {RECEPTION_COPY.workspace.checkIdentity}
            </button>
            {reception.showWidget('prepare-chooser') ? (
            <button
              type="button"
              className="reception-workspace__action"
              onClick={() => setShowPrepareChooser(true)}
            >
              {RECEPTION_COPY.workspace.otherArrivals}
            </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {reception.showWidget('patient-creation') && canCreatePatient && useInlineQuickIntake ? (
        <div
          className="reception-workspace__actions reception-workspace__actions--secondary-only"
          aria-label={RECEPTION_COPY.workspace.actionsLabel}
        >
          {canEscalateToNurse ? (
            <button
              type="button"
              className="reception-workspace__action reception-workspace__action--escalate"
              onClick={() => {
              setEscalationReasonId(null);
              setShowEscalationPanel(true);
            }}
            >
              {RECEPTION_COPY.escalation.openAction}
            </button>
          ) : null}
          <button
            type="button"
            className="reception-workspace__action"
            onClick={openArtifactCapture}
            disabled={!canOpenSmartIntake}
          >
            {RECEPTION_COPY.workspace.checkIdentity}
          </button>
          {reception.showWidget('prepare-chooser') ? (
            <button
              type="button"
              className="reception-workspace__action"
              onClick={() => setShowPrepareChooser(true)}
            >
              {RECEPTION_COPY.workspace.otherArrivals}
            </button>
          ) : null}
        </div>
      ) : null}

      {canEscalateToNurse && !canCreatePatient ? (
        <div className="reception-workspace__actions" aria-label={RECEPTION_COPY.escalation.eyebrow}>
          <button
            type="button"
            className="reception-workspace__action reception-workspace__action--escalate reception-workspace__action--wide"
            onClick={() => {
              setEscalationReasonId(null);
              setShowEscalationPanel(true);
            }}
          >
            {RECEPTION_COPY.escalation.openAction}
          </button>
        </div>
      ) : null}

      {nlpTriageExpertEnabled || voiceInterviewEnabled ? (
        <div className="reception-workspace__native-ai" aria-label="Native AI reception tools">
          {nlpTriageExpertEnabled && surfaces.reception.showTriageRuleBuilder ? (
            <TriageRuleBuilder className="reception-workspace__triage-rules" />
          ) : null}
          {voiceInterviewEnabled ? (
            <VoiceInterviewKiosk
              className="reception-workspace__voice-kiosk"
              onPreTriageReady={handleVoicePreTriageReady}
            />
          ) : null}
        </div>
      ) : null}

      {reception.showWidget('queues') ? (
      <ReceptionPipelineShell
        activeStage={activePipelineStage}
        onStageChange={handlePipelineStageChange}
        showStageRail={isReceptionFirstUxEnabled() && RECEPTION_FIRST_UX.pipelineShellEnabled}
      >
      <ArrivalDashboard
        patients={patients}
        emsArrivals={emsArrivals}
        settings={emergencySettings}
        activeQueueTab={activeQueueTab}
        receptionLoading={receptionLoading}
        canPrepareRegistration={canVerifyIntake}
        canConvertArrival={canConvertEmsArrival}
        onSelectPatient={handlePatientSelect}
        onTabChange={(tabId) => {
          const nextParams = new URLSearchParams(searchParams);
          if (tabId === 'ems') nextParams.delete('queue');
          else nextParams.set('queue', tabId);
          setSearchParams(nextParams, { replace: true });
        }}
        onOpenVerification={(patientId, emsArrivalId) =>
          openSmartIntake('verify', patientId, emsArrivalId ? { emsArrivalId } : {})
        }
        onPrepareRegistration={handlePrepareEmsRegistration}
        onConvertArrival={handleConvertEmsArrival}
        onRefreshEms={() => void refreshReceptionSnapshot()}
        preArrivalStore={preArrivalStore}
        canSubmitPreArrival={canVerifyIntake || canCreatePatient}
        preArrivalActorName={emergencyRole.roleLabel || 'Reception'}
        onPreArrivalSubmitted={handlePreArrivalSubmitted}
        emsFeedError={receptionError}
        expandedPatientId={expandedPretriagePatientId}
        onExpandPatient={setExpandedPretriagePatientId}
        onRegisterWalkIn={openQuickIntake}
        onOpenEms={() => {
          const nextParams = new URLSearchParams(searchParams);
          nextParams.set('tab', 'ems');
          setSearchParams(nextParams, { replace: true });
        }}
        dataQualitySnapshot={surfaces.reception.showDataQualityAudits ? dataQualitySnapshot : null}
        queueAuditSnapshot={surfaces.reception.showDataQualityAudits ? queueAuditSnapshot : null}
        onVerifyPatient={(patientId) => openSmartIntake('verify', patientId)}
        onCaptureComplaint={(patientId) => {
          selectPatient(patientId);
          openSmartIntake('verify', patientId);
        }}
        onReviewDuplicate={(patientId) => openVerificationFromDuplicate(patientId)}
        onQueueMetricSelect={handleMetricSelect}
      />
      </ReceptionPipelineShell>
      ) : null}

      {deskUi.show(RECEPTION_DESK_UI.surfaces.operationalHistory) &&
      surfaces.reception.showOperationalHistory ? (
      <OperationalHistoryPanel
        logs={workflowLogs}
        title="Reception operational history"
        description="Recent patient intake and queue handoff actions from workflow audit data."
        domains={[OPERATIONAL_AUDIT_DOMAIN.PATIENT, OPERATIONAL_AUDIT_DOMAIN.QUEUE]}
        limit={6}
        compact
        className="reception-workspace__history"
      />
      ) : null}

      {reception.showWidget('arrival-banner') && arrivedPatient ? (
        <div className="reception-workspace__banner" role="status">
          <span>
            <strong>{patientLabel(arrivedPatient)}</strong> {RECEPTION_COPY.workspace.sentToTriage}.
            <ArrivalControlBadge patient={arrivedPatient} compact />
            <WhatHappensNextBadge
              patient={arrivedPatient}
              referrals={referrals}
              staff={staff}
              compact
              showGuidance
            />
          </span>
          <div className="reception-workspace__banner-actions">
            <button
              type="button"
              onClick={() => {
                selectPatient(arrivedPatient.id);
              }}
            >
              {RECEPTION_COPY.workspace.openPatientCard}
            </button>
            <button
              type="button"
              onClick={() => {
                profileNavigate(
                  buildPostHandoffNavigationPaths(arrivedPatient.id).whiteboardPath,
                );
              }}
            >
              {RECEPTION_COPY.workspace.viewWhiteboard}
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchParams(
                  applyPatientRouteIntent(searchParams, arrivedPatient.id, 'queue'),
                  { replace: true },
                );
                setExpandedPretriagePatientId(arrivedPatient.id);
              }}
            >
              {RECEPTION_COPY.workspace.seeInList}
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchParams(
                  clearPatientRouteParam(searchParams, PATIENT_ROUTE_PARAM_KEYS.handoff),
                  { replace: true },
                );
                if (isRegistrationClerkRole(emergencyRole.role)) {
                  openQuickIntake();
                  return;
                }
                openSmartIntake();
              }}
            >
              {RECEPTION_COPY.workspace.registerNext}
            </button>
          </div>
        </div>
      ) : null}

      {showArtifactPicker ? (
        <IntakeArtifactPicker
          onClose={() => setShowArtifactPicker(false)}
          onSelectArtifact={(artifactId) => openSmartIntake('ocr', null, { artifactId })}
        />
      ) : null}

      {reception.showWidget('prepare-chooser') && showPrepareChooser ? (
        <PreparePatientChooser
          onClose={() => setShowPrepareChooser(false)}
          onManual={() => {
            setShowPrepareChooser(false);
            openQuickIntake();
          }}
          onScan={() => {
            setShowPrepareChooser(false);
            openSmartIntake('ocr', null, { artifactId: 'health_card' });
          }}
          onSmartIntake={() => {
            setShowPrepareChooser(false);
            if (canOpenSmartIntake) openSmartIntake();
          }}
          onQuickCreate={() => {
            setShowPrepareChooser(false);
            openQuickIntake();
          }}
          onUnknown={() => handleProvisionalIntake('unknown')}
        />
      ) : null}

      {reception.showWidget('patient-creation') &&
      showReceptionQuickIntake &&
      canCreatePatient &&
      !useInlineQuickIntake ? (
        <ReceptionQuickIntake
          variant="modal"
          initialSearchQuery={query}
          onClose={() => setShowReceptionQuickIntake(false)}
          onCompleted={handleReceptionQuickIntakeCompleted}
          onOpenVerification={openVerificationFromDuplicate}
          onProvisionalIntake={() => handleProvisionalIntake('identity-pending')}
        />
      ) : null}

      {showQuickIntake && canCreatePatient ? (
        <QuickIntake
          variant="reception"
          onClose={() => setShowQuickIntake(false)}
          onAdded={handleQuickIntakeAdded}
          onOpenVerification={openVerificationFromDuplicate}
          onProvisionalIntake={() => handleProvisionalIntake('identity-pending')}
        />
      ) : null}

      {reception.showWidget('smart-intake') && smartIntakeSession ? (
      <ReceptionSmartIntakeOverlay
        session={smartIntakeSession}
        onClose={closeSmartIntake}
        onHandoffComplete={handleSmartIntakeHandoff}
      />
      ) : null}

      {reception.showWidget('urgent-triage-escalation') ? (
      <ReceptionEscalationPanel
        open={showEscalationPanel}
        patients={patients}
        defaultPatientId={queuePatientId || contextPatientId || null}
        initialReasonId={escalationReasonId}
        actorStaffId={emergencyRole.staffId || null}
        actorName={emergencyRole.roleLabel || 'Reception'}
        onClose={() => {
          setShowEscalationPanel(false);
          setEscalationReasonId(null);
        }}
        onSubmit={(input) => submitReceptionEscalation(input)}
      />
      ) : null}
    </OperationalPresentationFrame>
  );
}

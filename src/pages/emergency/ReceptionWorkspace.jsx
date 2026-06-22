import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ReceptionQuickIntake, { focusReceptionQuickIntake } from '../../components/reception/ReceptionQuickIntake';
import QuickIntake from '../../components/QuickIntake';
import ArrivalDashboard from '../../components/reception/ArrivalDashboard';
import ReceptionOperationalStrip from '../../components/reception/ReceptionOperationalStrip';
import TriageOperationalStrip from '../../components/triage/TriageOperationalStrip';
import TriageBreachStrip from '../../components/triage/TriageBreachStrip';
import WaitingRoomSafetyEscalationStrip from '../../components/waiting-room/WaitingRoomSafetyEscalationStrip';
import PreparePatientChooser from '../../components/reception/PreparePatientChooser';
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
import ReceptionSmartIntakeOverlay from '../../components/reception/ReceptionSmartIntakeOverlay';
import ReceptionEscalationPanel from '../../components/reception/ReceptionEscalationPanel';
import ReceptionEscalationStrip from '../../components/reception/ReceptionEscalationStrip';
import ReceptionEscalationQuickActions from '../../components/reception/ReceptionEscalationQuickActions';
import ReceptionEscalationAttentionStrip from '../../components/reception/ReceptionEscalationAttentionStrip';
import HighRiskComplaintAttentionStrip from '../../components/waiting-room/HighRiskComplaintAttentionStrip';
import ReceptionThroughputAttentionCluster from '../../components/reception/ReceptionThroughputAttentionCluster';
import OperationalPresentationFrame from '../../components/emergency/OperationalPresentationFrame';
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
import useReceptionDeskUi from '../../hooks/useReceptionDeskUi';
import ReceptionPipelineShell from './ReceptionPipelineShell';
import './ReceptionWorkspace.css';

export default function ReceptionWorkspace() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const emergencyRole = useEmergencyRolePermissions();
  const reception = useReceptionScreen();
  const triage = useTriageScreen();
  const deskUi = useReceptionDeskUi();
  const { loading: receptionLoading, error: receptionError, refresh: refreshReceptionSnapshot } =
    useReceptionSnapshotPolling(15000);
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
  const submitReceptionEscalation = useEmergencyStore((state) => state.submitReceptionEscalation);
  const store = useEmergencyStore();

  const query = searchParams.get('q') || '';
  const arrivedPatientId = searchParams.get('arrived') || '';
  const contextPatientId = searchParams.get('patientId') || '';
  const queuePatientId = searchParams.get('patient') || '';
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
    setSmartIntakeSession(
      buildReceptionIntakeSession({
        step,
        patientId,
        mode: extraParams.mode,
        emsArrivalId: extraParams.emsArrivalId,
      }),
    );
  }, []);

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
      navigate(handoff.receptionPath);
    },
    [navigate, store],
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
      navigate(handoff.receptionPath);
    },
    [navigate, refreshReceptionSnapshot, store],
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

  const focusedPatientId =
    expandedPretriagePatientId || contextPatientId || queuePatientId || arrivedPatientId || null;

  const showPatientAnswersDesk = reception.showWidget('patient-answers') && !triage.isTriageScreen;

  useEffect(() => {
    if (!contextPatientId) return;
    handlePatientSelect(contextPatientId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('patientId');
    setSearchParams(nextParams, { replace: true });
  }, [contextPatientId]);

  useEffect(() => {
    if (!arrivedPatientId) return undefined;
    const timer = window.setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams);
      if (nextParams.get('arrived') !== arrivedPatientId) return;
      nextParams.delete('arrived');
      setSearchParams(nextParams, { replace: true });
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
    navigate(handoff.receptionPath);
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
    navigate(handoff.receptionPath);
  };

  const handlePrepareEmsRegistration = (arrival) => {
    openSmartIntake('capture', arrival.patientId, {
      emsArrivalId: arrival.id,
      mode: 'ems-prearrival',
    });
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
      className={`reception-workspace${deskUi.slim ? ' reception-workspace--desk-slim' : ''}${reception.isReceptionScreen ? ' reception-workspace--screen-mode' : ''}`}
      aria-labelledby="reception-workspace-title"
      data-reception-focus={reception.defaultFocus}
    >
      <header className="reception-workspace__intro">
        <h1 id="reception-workspace-title">{RECEPTION_COPY.workspace.title}</h1>
        <p className="reception-workspace__description">
          {deskUi.slim
            ? RECEPTION_COPY.workspace.deskDescription
            : RECEPTION_COPY.workspace.description}
        </p>
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
          {triage.showTriageBreach ? (
            <TriageBreachStrip
              patients={patients}
              settings={emergencySettings}
              onSelectPatient={handlePatientSelect}
              className="reception-workspace__triage-breach"
            />
          ) : null}
          {triage.showWaitingRoomSafetyEscalation ? (
            <WaitingRoomSafetyEscalationStrip
              patients={patients}
              workflowLogs={workflowLogs}
              staff={staff}
              alerts={alerts}
              communicationOverdueMinutes={
                Number(emergencySettings?.thresholds?.communicationOverdueMinutes ?? 30) || 30
              }
              onSelectPatient={handlePatientSelect}
              className="reception-workspace__safety-escalation"
            />
          ) : null}
          <ReceptionEscalationAttentionStrip
            alerts={alerts}
            roleId={emergencyRole.role}
            onSelectPatient={handlePatientSelect}
            className="reception-workspace__escalation-attention"
          />
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

      {reception.showWidget('process-education') && !showPatientAnswersDesk && !triage.isTriageScreen ? (
        <WaitingRoomProcessEducation
          audience="staff"
          variant="compact"
          className="reception-workspace__process-education"
        />
      ) : null}

      {reception.showWidget('operational-strip') && !showPatientAnswersDesk && !triage.isTriageScreen ? (
        <WaitingRoomStatusMessagingStrip
          patients={patients}
          referrals={referrals}
          capacity={capacity}
          audience="staff"
          className="reception-workspace__status-messaging"
        />
      ) : null}

      {reception.showWidget('communication-status') || triage.showWidget('communication-status') ? (
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
          <ReceptionEscalationStrip alerts={alerts} className="reception-workspace__escalation-strip" />
        </>
      ) : null}

      {reception.showWidget('operational-strip') && !triage.isTriageScreen ? (
        <>
          <HighRiskComplaintAttentionStrip
            patients={patients}
            onSelectPatient={handlePatientSelect}
            className="reception-workspace__high-risk-complaint-strip"
          />
          {(reception.showWidget('triage-breach') || reception.showWidget('operational-strip')) ? (
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
            onSelectEmsArrival={(arrival) => handleConvertEmsArrival(arrival)}
            className="reception-workspace__throughput-cluster"
          />
          ) : null}
        </>
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
              onClick={() => canOpenSmartIntake && openSmartIntake()}
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
            onClick={() => canOpenSmartIntake && openSmartIntake()}
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
        emsFeedError={receptionError}
        expandedPatientId={expandedPretriagePatientId}
        onExpandPatient={setExpandedPretriagePatientId}
        onRegisterWalkIn={openQuickIntake}
        onOpenEms={() => {
          const nextParams = new URLSearchParams(searchParams);
          nextParams.set('tab', 'ems');
          setSearchParams(nextParams, { replace: true });
        }}
        dataQualitySnapshot={dataQualitySnapshot}
        queueAuditSnapshot={queueAuditSnapshot}
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

      {deskUi.show(RECEPTION_DESK_UI.surfaces.operationalHistory) ? (
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
                const nextParams = new URLSearchParams(searchParams);
                nextParams.set('queue', 'pretriage');
                nextParams.set('patient', arrivedPatient.id);
                nextParams.delete('arrived');
                setSearchParams(nextParams, { replace: true });
                setExpandedPretriagePatientId(arrivedPatient.id);
              }}
            >
              {RECEPTION_COPY.workspace.seeInList}
            </button>
            <button
              type="button"
              onClick={() => {
                const nextParams = new URLSearchParams(searchParams);
                nextParams.delete('arrived');
                setSearchParams(nextParams, { replace: true });
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

      {reception.showWidget('prepare-chooser') && showPrepareChooser ? (
        <PreparePatientChooser
          onClose={() => setShowPrepareChooser(false)}
          onManual={() => {
            setShowPrepareChooser(false);
            openQuickIntake();
          }}
          onScan={() => {
            setShowPrepareChooser(false);
            openSmartIntake('ocr');
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

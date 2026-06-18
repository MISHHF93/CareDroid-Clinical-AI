import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ExpressRegistration from '../../components/ExpressRegistration';
import QuickIntake from '../../components/QuickIntake';
import ArrivalDashboard from '../../components/reception/ArrivalDashboard';
import ReceptionOperationalStrip from '../../components/reception/ReceptionOperationalStrip';
import PreparePatientChooser from '../../components/reception/PreparePatientChooser';
import DuplicatePatientBanner from '../../components/reception/DuplicatePatientBanner';
import ReceptionSearchHint from '../../components/reception/ReceptionSearchHint';
import {
  filterPatientsByQuery,
  patientLabel,
  selectEmsInboundCount,
} from '../../components/reception/receptionQueueModel';
import { EMERGENCY_ACTIONS, isRegistrationClerkRole } from '../../config/emergencyRolePermissions';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import { useReceptionSnapshotPolling } from '../../hooks/useEmergencyOs';
import { useEmergencyStore } from '../../store/emergencyStore';
import { completeReceptionHandoff } from '../../services/receptionHandoff';
import { completeProvisionalIntake } from '../../services/provisionalIdentityIntake';
import {
  buildReceptionIntakeSession,
  convertEmsArrivalForReception,
  RECEPTION_INTAKE_URL_KEYS,
} from '../../services/receptionIntakeBridge';
import ReceptionSmartIntakeOverlay from '../../components/reception/ReceptionSmartIntakeOverlay';
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
import ReceptionPipelineShell from './ReceptionPipelineShell';
import './ReceptionWorkspace.css';

export default function ReceptionWorkspace() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const emergencyRole = useEmergencyRolePermissions();
  const { loading: receptionLoading, error: receptionError, refresh: refreshReceptionSnapshot } =
    useReceptionSnapshotPolling(15000);
  const [handoffSyncWarning, setHandoffSyncWarning] = useState('');
  const patients = useEmergencyStore((state) => state.patients);
  const workflowLogs = useEmergencyStore((state) => state.workflowLogs);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
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
  const [showExpressRegistration, setShowExpressRegistration] = useState(false);
  const [showQuickIntake, setShowQuickIntake] = useState(false);
  const [showPrepareChooser, setShowPrepareChooser] = useState(false);
  const [smartIntakeSession, setSmartIntakeSession] = useState(null);

  const canCreatePatient = emergencyRole.can(EMERGENCY_ACTIONS.createPatient);
  const canVerifyIntake = emergencyRole.can(EMERGENCY_ACTIONS.verifyIntake);
  const canConvertEmsArrival = emergencyRole.can(EMERGENCY_ACTIONS.convertEmsArrival);

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
      setShowExpressRegistration(false);
      setShowQuickIntake(false);
      setSmartIntakeSession(null);
      const handoff = completeProvisionalIntake(store, kind);
      navigate(handoff.receptionPath);
    },
    [navigate, store],
  );

  const openVerificationFromDuplicate = useCallback(
    (patientId) => {
      setShowExpressRegistration(false);
      setShowQuickIntake(false);
      openSmartIntake('verify', patientId);
    },
    [openSmartIntake],
  );

  const handleSmartIntakeHandoff = useCallback(
    (handoff) => {
      setSmartIntakeSession(null);
      navigate(handoff.receptionPath);
    },
    [navigate],
  );

  useEffect(() => {
    const openPrimaryIntake = () => {
      if (isRegistrationClerkRole(emergencyRole.role)) {
        setShowExpressRegistration(true);
        return;
      }
      openSmartIntake();
    };
    const openPrepareChooser = () => setShowPrepareChooser(true);
    const openSmartIntakeFromEvent = (event) => {
      const detail = event?.detail || {};
      openSmartIntake(detail.step, detail.patientId, detail);
    };
    document.addEventListener('open-reception-intake', openPrimaryIntake);
    document.addEventListener('open-reception-smart-intake', openSmartIntakeFromEvent);
    document.addEventListener('open-reception-prepare', openPrepareChooser);
    const openQuickCreate = () => setShowQuickIntake(true);
    document.addEventListener('open-reception-quick-create', openQuickCreate);
    return () => {
      document.removeEventListener('open-reception-intake', openPrimaryIntake);
      document.removeEventListener('open-reception-smart-intake', openSmartIntakeFromEvent);
      document.removeEventListener('open-reception-prepare', openPrepareChooser);
      document.removeEventListener('open-reception-quick-create', openQuickCreate);
    };
  }, [emergencyRole.role, openSmartIntake]);

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
      setShowExpressRegistration(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('express');
      setSearchParams(nextParams, { replace: true });
    }
  }, [canCreatePatient, searchParams, setSearchParams]);

  useEffect(() => {
    if (searchParams.get('quickCreate') === '1' && canCreatePatient) {
      setShowQuickIntake(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('quickCreate');
      setSearchParams(nextParams, { replace: true });
    }
  }, [canCreatePatient, searchParams, setSearchParams]);

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

  const handleExpressRegistrationAdded = (patient) => {
    const handoff = completeReceptionHandoff(store, {
      patientId: patient.id,
      source: 'express-register',
    });
    if (handoff.syncPending) {
      setHandoffSyncWarning(ERROR_RECOVERY_COPY.handoffPending);
    }
    setShowExpressRegistration(false);
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
    <section className="reception-workspace" aria-labelledby="reception-workspace-title">
      <header className="reception-workspace__intro">
        <h1 id="reception-workspace-title">{RECEPTION_COPY.workspace.title}</h1>
        <p className="reception-workspace__description">{RECEPTION_COPY.workspace.description}</p>
      </header>

      <ReceptionOperationalStrip
        patients={patients}
        emsInbound={emsInbound}
        onMetricSelect={handleMetricSelect}
        shiftSummaryPath={
          emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyShift)
            ? CANONICAL_ROUTES.emergencyShift
            : null
        }
      />

      <ReceptionSearchHint query={query} />

      {receptionError ? (
        <ToolApiErrorBanner
          message={`${receptionError}. ${ERROR_RECOVERY_COPY.syncStale}`}
          onRetry={() => void refreshReceptionSnapshot()}
          retryLabel="Refresh reception feed"
        />
      ) : null}

      {handoffSyncWarning ? (
        <ToolApiErrorBanner
          message={handoffSyncWarning}
          onRetry={() => {
            setHandoffSyncWarning('');
            void refreshReceptionSnapshot();
          }}
          retryLabel="Retry sync"
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

      {canCreatePatient ? (
        <div className="reception-workspace__actions" aria-label={RECEPTION_COPY.workspace.actionsLabel}>
          <button
            type="button"
            className="reception-workspace__action reception-workspace__action--primary reception-workspace__action--wide"
            onClick={() => setShowExpressRegistration(true)}
          >
            {RECEPTION_COPY.workspace.registerWalkIn}
          </button>
          <div className="reception-workspace__actions reception-workspace__actions--secondary">
            <button
              type="button"
              className="reception-workspace__action"
              onClick={() => openSmartIntake()}
            >
              {RECEPTION_COPY.workspace.checkIdentity}
            </button>
            <button
              type="button"
              className="reception-workspace__action"
              onClick={() => setShowPrepareChooser(true)}
            >
              {RECEPTION_COPY.workspace.otherArrivals}
            </button>
          </div>
        </div>
      ) : null}

      <ReceptionPipelineShell
        activeStage={activePipelineStage}
        onStageChange={handlePipelineStageChange}
        showStageRail={isReceptionFirstUxEnabled() && RECEPTION_FIRST_UX.pipelineShellEnabled}
      >
      <ArrivalDashboard
        patients={patients}
        emsArrivals={emsArrivals}
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
        onRegisterWalkIn={() => setShowExpressRegistration(true)}
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
      />
      </ReceptionPipelineShell>

      <OperationalHistoryPanel
        logs={workflowLogs}
        title="Reception operational history"
        description="Recent patient intake and queue handoff actions from workflow audit data."
        domains={[OPERATIONAL_AUDIT_DOMAIN.PATIENT, OPERATIONAL_AUDIT_DOMAIN.QUEUE]}
        limit={6}
        compact
        className="reception-workspace__history"
      />

      {arrivedPatient ? (
        <div className="reception-workspace__banner" role="status">
          <span>
            <strong>{patientLabel(arrivedPatient)}</strong> {RECEPTION_COPY.workspace.sentToTriage}.
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
                  setShowExpressRegistration(true);
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

      {showPrepareChooser ? (
        <PreparePatientChooser
          onClose={() => setShowPrepareChooser(false)}
          onManual={() => {
            setShowPrepareChooser(false);
            setShowExpressRegistration(true);
          }}
          onScan={() => {
            setShowPrepareChooser(false);
            openSmartIntake('ocr');
          }}
          onSmartIntake={() => {
            setShowPrepareChooser(false);
            openSmartIntake();
          }}
          onQuickCreate={() => {
            setShowPrepareChooser(false);
            setShowQuickIntake(true);
          }}
          onUnknown={() => handleProvisionalIntake('unknown')}
        />
      ) : null}

      {showExpressRegistration && canCreatePatient ? (
        <ExpressRegistration
          onClose={() => setShowExpressRegistration(false)}
          onAdded={handleExpressRegistrationAdded}
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

      <ReceptionSmartIntakeOverlay
        session={smartIntakeSession}
        onClose={closeSmartIntake}
        onHandoffComplete={handleSmartIntakeHandoff}
      />
    </section>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import QuickIntake from '../../components/QuickIntake';
import ArrivalMetricsPanel from '../../components/reception/ArrivalMetricsPanel';
import EmsPreArrivalPanel from '../../components/reception/EmsPreArrivalPanel';
import PreparePatientChooser from '../../components/reception/PreparePatientChooser';
import RecentArrivalsPanel from '../../components/reception/RecentArrivalsPanel';
import DuplicatePatientBanner from '../../components/reception/DuplicatePatientBanner';
import ReceptionSearchHint from '../../components/reception/ReceptionSearchHint';
import ReceptionWorkQueues from '../../components/reception/ReceptionWorkQueues';
import {
  filterPatientsByQuery,
  patientLabel,
  selectReceptionQueues,
} from '../../components/reception/receptionQueueModel';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { EMERGENCY_ACTIONS } from '../../config/emergencyRolePermissions';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import { useReceptionSnapshotPolling } from '../../hooks/useEmergencyOs';
import { useEmergencyStore } from '../../store/emergencyStore';
import { completeReceptionHandoff } from '../../services/receptionHandoff';
import { enterEmsRegistrationQueue } from '../../services/queueAssignment';
import { PatientState } from '../../types/emergency';
import { findDuplicateCandidatesFromQuery } from '../../utils/patientDuplicateDetection';
import './ReceptionWorkspace.css';

export default function ReceptionWorkspace() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const emergencyRole = useEmergencyRolePermissions();
  const { loading: receptionLoading, refresh: refreshReceptionSnapshot } = useReceptionSnapshotPolling(15000);
  const patients = useEmergencyStore((state) => state.patients);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const convertEMSArrivalToPatient = useEmergencyStore((state) => state.convertEMSArrivalToPatient);
  const store = useEmergencyStore();

  const query = searchParams.get('q') || '';
  const arrivedPatientId = searchParams.get('arrived') || '';
  const contextPatientId = searchParams.get('patientId') || '';
  const queueParam = searchParams.get('queue') || '';
  const activeQueueTab = ['ems', 'verification', 'pretriage'].includes(queueParam) ? queueParam : 'ems';
  const [showQuickIntake, setShowQuickIntake] = useState(false);
  const [showPrepareChooser, setShowPrepareChooser] = useState(false);

  const canCreatePatient = emergencyRole.can(EMERGENCY_ACTIONS.createPatient);
  const canVerifyIntake = emergencyRole.can(EMERGENCY_ACTIONS.verifyIntake);
  const canConvertEmsArrival = emergencyRole.can(EMERGENCY_ACTIONS.convertEmsArrival);

  const filteredPatients = useMemo(
    () => filterPatientsByQuery(patients, query),
    [patients, query],
  );

  const receptionQueues = useMemo(
    () => selectReceptionQueues(filteredPatients),
    [filteredPatients],
  );

  const duplicateCandidates = useMemo(
    () => (query.trim().length >= 2 ? findDuplicateCandidatesFromQuery(patients, query) : []),
    [patients, query],
  );

  const arrivedPatient = useMemo(
    () => (arrivedPatientId ? patients.find((patient) => patient.id === arrivedPatientId) || null : null),
    [arrivedPatientId, patients],
  );

  const openSmartIntake = useCallback((step, patientId, extraParams = {}) => {
    const params = new URLSearchParams({ from: 'reception', autostart: '1', ...extraParams });
    if (step) params.set('step', step);
    if (patientId) params.set('patientId', patientId);
    navigate(`${CANONICAL_ROUTES.emergencyIntake}?${params.toString()}`);
  }, [navigate]);

  useEffect(() => {
    const openPrimaryIntake = () => openSmartIntake();
    document.addEventListener('open-reception-quick-create', openPrimaryIntake);
    document.addEventListener('open-reception-prepare', openPrimaryIntake);
    document.addEventListener('open-reception-intake', openPrimaryIntake);
    return () => {
      document.removeEventListener('open-reception-quick-create', openPrimaryIntake);
      document.removeEventListener('open-reception-prepare', openPrimaryIntake);
      document.removeEventListener('open-reception-intake', openPrimaryIntake);
    };
  }, [openSmartIntake]);

  useEffect(() => {
    if (searchParams.get('intake') === '1' && canCreatePatient) {
      openSmartIntake();
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('intake');
      setSearchParams(nextParams, { replace: true });
    }
  }, [canCreatePatient, openSmartIntake, searchParams, setSearchParams]);

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
    selectPatient(patientId);
  };

  useEffect(() => {
    if (!contextPatientId) return;
    handlePatientSelect(contextPatientId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('patientId');
    setSearchParams(nextParams, { replace: true });
  }, [contextPatientId]);

  const handleQuickIntakeAdded = (patient) => {
    const handoff = completeReceptionHandoff(store, {
      patientId: patient.id,
      source: 'quick-intake',
    });
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
    convertEMSArrivalToPatient(arrival.id);
    const converted = useEmergencyStore
      .getState()
      .emsArrivals.find((entry) => entry.id === arrival.id);
    if (converted?.patientId) {
      enterEmsRegistrationQueue(store, {
        patientId: converted.patientId,
        emsArrivalId: arrival.id,
      });
    }
    if (converted?.patientId && canVerifyIntake) {
      openSmartIntake('verify', converted.patientId, {
        emsArrivalId: arrival.id,
        source: 'ems-convert',
      });
      return;
    }
    void refreshReceptionSnapshot();
  };

  return (
    <section className="reception-workspace" aria-labelledby="reception-workspace-title">
      <header className="reception-workspace__intro">
        <div>
          <p className="reception-workspace__eyebrow">Arrival dashboard</p>
          <h1 id="reception-workspace-title">Reception workspace</h1>
          <p className="reception-workspace__description">
            Start Smart Intake for every arrival, verify identity when needed, and hand patients to
            triage from one surface.
          </p>
        </div>
      </header>

      <ReceptionSearchHint query={query} />

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

      <EmsPreArrivalPanel
        arrivals={emsArrivals}
        loading={receptionLoading}
        canPrepareRegistration={canVerifyIntake}
        canConvertArrival={canConvertEmsArrival}
        onPrepareRegistration={handlePrepareEmsRegistration}
        onConvertArrival={handleConvertEmsArrival}
        onRefresh={() => void refreshReceptionSnapshot()}
      />

      {canCreatePatient ? (
        <div className="reception-workspace__actions" aria-label="Patient arrival actions">
          <button
            type="button"
            className="reception-workspace__action reception-workspace__action--primary reception-workspace__action--wide"
            onClick={() => openSmartIntake()}
          >
            Start Smart Intake
          </button>
          <div className="reception-workspace__actions reception-workspace__actions--secondary">
            <button
              type="button"
              className="reception-workspace__action"
              onClick={() => openSmartIntake('ocr')}
            >
              Scan / OCR
            </button>
            <button
              type="button"
              className="reception-workspace__action"
              onClick={() => setShowQuickIntake(true)}
            >
              Quick walk-in
            </button>
            <button
              type="button"
              className="reception-workspace__action"
              onClick={() => setShowPrepareChooser(true)}
            >
              More options
            </button>
          </div>
        </div>
      ) : null}

      {arrivedPatient ? (
        <div className="reception-workspace__banner" role="status">
          <span>
            <strong>{patientLabel(arrivedPatient)}</strong> handed off to triage queue.
          </span>
          <div className="reception-workspace__banner-actions">
            <button
              type="button"
              onClick={() =>
                navigate(completeReceptionHandoff(store, { patientId: arrivedPatient.id }).whiteboardPath)
              }
            >
              View on Whiteboard
            </button>
            <button
              type="button"
              onClick={() => navigate(completeReceptionHandoff(store, { patientId: arrivedPatient.id }).queuesPath)}
            >
              View pre-triage queue
            </button>
            <button
              type="button"
              onClick={() => {
                const nextParams = new URLSearchParams(searchParams);
                nextParams.delete('arrived');
                setSearchParams(nextParams, { replace: true });
                openSmartIntake();
              }}
            >
              Start next arrival
            </button>
          </div>
        </div>
      ) : null}

      <ArrivalMetricsPanel />

      <RecentArrivalsPanel
        patients={receptionQueues.recentArrivals}
        onSelectPatient={handlePatientSelect}
      />

      <ReceptionWorkQueues
        patients={filteredPatients}
        activeTab={activeQueueTab}
        onTabChange={(tabId) => {
          const nextParams = new URLSearchParams(searchParams);
          if (tabId === 'ems') nextParams.delete('queue');
          else nextParams.set('queue', tabId);
          setSearchParams(nextParams, { replace: true });
        }}
        onOpenVerification={(patientId, emsArrivalId) =>
          openSmartIntake('verify', patientId, emsArrivalId ? { emsArrivalId } : {})
        }
        onOpenPatient={handlePatientSelect}
      />

      {showPrepareChooser ? (
        <PreparePatientChooser
          onClose={() => setShowPrepareChooser(false)}
          onManual={() => {
            setShowPrepareChooser(false);
            setShowQuickIntake(true);
          }}
          onScan={() => {
            setShowPrepareChooser(false);
            openSmartIntake('ocr');
          }}
          onSmartIntake={() => {
            setShowPrepareChooser(false);
            openSmartIntake();
          }}
          onUnknown={() => {
            setShowPrepareChooser(false);
            openSmartIntake('finalize', null, { mode: 'unknown' });
          }}
        />
      ) : null}

      {showQuickIntake && canCreatePatient ? (
        <QuickIntake
          variant="reception"
          onClose={() => setShowQuickIntake(false)}
          onAdded={handleQuickIntakeAdded}
        />
      ) : null}
    </section>
  );
}

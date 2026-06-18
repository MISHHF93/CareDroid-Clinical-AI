import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import QuickIntake from '../../components/QuickIntake';
import ArrivalMetricsPanel from '../../components/reception/ArrivalMetricsPanel';
import EmsPreArrivalPanel from '../../components/reception/EmsPreArrivalPanel';
import PreparePatientChooser from '../../components/reception/PreparePatientChooser';
import ReceptionWorkQueues from '../../components/reception/ReceptionWorkQueues';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { EMERGENCY_ACTIONS } from '../../config/emergencyRolePermissions';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import { useReceptionSnapshotPolling } from '../../hooks/useEmergencyOs';
import { useEmergencyStore } from '../../store/emergencyStore';
import { completeReceptionHandoff } from '../../services/receptionHandoff';
import { PatientFlag, PatientState } from '../../types/emergency';
import './ReceptionWorkspace.css';

function patientLabel(patient) {
  const name = [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim();
  return name || patient.name || patient.mrn || 'Unknown patient';
}

function isEmsRegistrationPatient(patient) {
  return patient.flags?.some((flag) =>
    typeof flag === 'string' ? flag === PatientFlag.EMSArrival : flag?.type === PatientFlag.EMSArrival,
  );
}

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

  const filteredPatients = useMemo(() => {
    if (!query.trim()) return patients;
    const normalizedQuery = query.trim().toLowerCase();
    return patients.filter((patient) =>
      [patient.firstName, patient.lastName, patient.name, patient.mrn, patient.chiefComplaint, patient.complaint]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [patients, query]);

  const emsRegistrationQueue = useMemo(
    () =>
      filteredPatients.filter(
        (patient) =>
          isEmsRegistrationPatient(patient) &&
          (patient.state === PatientState.Registration || patient.state === PatientState.Arrival),
      ),
    [filteredPatients],
  );

  const verificationQueue = useMemo(
    () =>
      filteredPatients.filter(
        (patient) =>
          patient.state === PatientState.Registration && !isEmsRegistrationPatient(patient),
      ),
    [filteredPatients],
  );

  const preTriageQueue = useMemo(
    () => filteredPatients.filter((patient) => patient.state === PatientState.Triage),
    [filteredPatients],
  );

  const queuePatients = useMemo(
    () => [...emsRegistrationQueue, ...verificationQueue, ...preTriageQueue],
    [emsRegistrationQueue, preTriageQueue, verificationQueue],
  );

  const arrivedPatient = useMemo(
    () => (arrivedPatientId ? patients.find((patient) => patient.id === arrivedPatientId) || null : null),
    [arrivedPatientId, patients],
  );

  useEffect(() => {
    const openQuickCreate = () => setShowPrepareChooser(true);
    document.addEventListener('open-reception-quick-create', openQuickCreate);
    document.addEventListener('open-reception-prepare', openQuickCreate);
    return () => {
      document.removeEventListener('open-reception-quick-create', openQuickCreate);
      document.removeEventListener('open-reception-prepare', openQuickCreate);
    };
  }, []);

  useEffect(() => {
    if (searchParams.get('quickCreate') === '1' && canCreatePatient) {
      setShowPrepareChooser(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('quickCreate');
      setSearchParams(nextParams, { replace: true });
    }
  }, [canCreatePatient, searchParams, setSearchParams]);

  const openSmartIntake = (step, patientId, extraParams = {}) => {
    const params = new URLSearchParams({ from: 'reception', ...extraParams });
    if (step) params.set('step', step);
    if (patientId) params.set('patientId', patientId);
    navigate(`${CANONICAL_ROUTES.emergencyIntake}?${params.toString()}`);
  };

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
      {query.trim() ? (
        <p className="reception-workspace__search-context" role="status">
          Showing results for <strong>{query.trim()}</strong> — use Header search to refine.
        </p>
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

      {arrivedPatient ? (
        <div className="reception-workspace__banner" role="status">
          <span>
            <strong>{patientLabel(arrivedPatient)}</strong> handed off to triage queue.
          </span>
          <div className="reception-workspace__banner-actions">
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
              }}
            >
              Start next arrival
            </button>
          </div>
        </div>
      ) : null}

      <ArrivalMetricsPanel />

      <ReceptionWorkQueues
        patients={queuePatients}
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

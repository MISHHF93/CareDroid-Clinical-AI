import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEmergencyStore } from '../store/emergencyStore';
import { buildEmergencyScenarioModuleEnvelope } from '../data/edScenarioFixtures';
import {
  aggregateFederatedLearningRound,
  compareRealTimeSimulationInterventions,
  evaluateHybridDigitalTwinScenario,
  evaluateRealTimeSimulationIntervention,
  fetchBoardingStatus,
  fetchCapacityStatus,
  fetchEDCopilot,
  fetchEMSIntake,
  fetchEmergencyAnalytics,
  fetchEmergencyPatients,
  fetchEmergencyQueues,
  fetchEmergencySettings,
  fetchEmergencyWorkflowLogs,
  fetchEmergencyWhiteboard,
  fetchFederatedLearningDashboard,
  fetchFederatedLearningGlobalModel,
  fetchHybridDigitalTwinState,
  fetchIntegrationHub,
  fetchPatientJourney,
  fetchProvincialHealth,
  fetchRealTimeSimulationRecommendations,
  initializeHybridDigitalTwin,
  fetchReassessmentQueue,
  fetchReferrals,
  fetchSmartIntake,
  registerFederatedHospital,
  simulateHybridDigitalTwin,
  submitFederatedModelUpdate,
  updateRealTimeSimulationState,
} from '../services/emergencyOsApi';

function latestVitals(patient = {}) {
  if (Array.isArray(patient.vitals)) return patient.vitals.at(-1) || {};
  return patient.vitals || {};
}

function normalizeEmsSeverity(patient = {}, offloadRisk = '') {
  if (patient.priority === 'P1' || offloadRisk === 'high') return 'Critical';
  if (patient.priority === 'P2') return 'High';
  if (patient.priority === 'P4' || patient.priority === 'P5') return 'Low';
  return 'Moderate';
}

function normalizeEmsArrival(row = {}, index = 0) {
  const patient = row.patient || row;
  const eta = Number(row.etaMinutes ?? row.eta ?? 0) || 0;
  const isPreArrival = row.handoffStatus === 'pre-arrival' || patient.state === 'Arrival';
  const estimatedArrivalTime = new Date(Date.now() + Math.max(0, eta) * 60000).toISOString();

  return {
    id: row.id || `ems-arrival-${patient.id || index}`,
    patientId: isPreArrival ? undefined : patient.id,
    unitId: patient.mrn || row.unitId || `EMS-${index + 1}`,
    unitName: row.unitName || patient.mrn || `EMS ${index + 1}`,
    crewNames: row.crewNames || ['EMS crew pending'],
    patientAge: Number(patient.age || 0),
    patientSex: patient.sex || 'Unknown',
    chiefComplaint: patient.chiefComplaint || row.chiefComplaint || 'EMS pre-arrival',
    vitals: latestVitals(patient),
    eta,
    severity: normalizeEmsSeverity(patient, row.offloadRisk),
    dispatchTime: patient.arrivalTime || estimatedArrivalTime,
    estimatedArrivalTime,
    notes: row.handoffStatus || patient.chiefComplaint || 'EMS intake fixture',
    arrivedAt: isPreArrival ? undefined : patient.arrivalTime,
    status: isPreArrival ? 'Inbound' : 'Handoff',
    prearrivalComplaint: patient.chiefComplaint || row.chiefComplaint || 'EMS pre-arrival',
    priority: patient.priority || 'P3',
  };
}

function normalizeReferralStatus(status = '') {
  const normalized = String(status).toLowerCase();
  if (normalized.includes('accepted')) return 'Accepted';
  if (normalized.includes('closed') || normalized.includes('complete')) return 'Completed';
  if (normalized.includes('declined')) return 'Declined';
  if (normalized.includes('delay')) return 'InfoRequested';
  if (normalized.includes('draft')) return 'Draft';
  return 'Sent';
}

function normalizeReferral(row = {}, index = 0) {
  const patient = row.patient || {};
  const elapsedMinutes = Number(row.elapsedMinutes || 0);
  return {
    id: row.id || `referral-${patient.id || index}`,
    patientId: row.patientId || patient.id,
    targetDepartment: row.targetDepartment || row.specialty || row.department || 'Other',
    service: row.service || row.specialty || row.department || 'Other',
    urgency: row.urgency || (patient.priority === 'P1' || patient.priority === 'P2' ? 'Emergent' : 'Urgent'),
    reason: row.reason || patient.chiefComplaint || 'Specialty review requested.',
    clinicalSummary:
      row.clinicalSummary ||
      row.summary ||
      `${patient.firstName || 'Unknown'} ${patient.lastName || 'patient'}: ${patient.chiefComplaint || 'review requested'}`,
    status: normalizeReferralStatus(row.status),
    workflow: row.workflow || 'Referral',
    requestedAt:
      row.requestedAt ||
      row.createdAt ||
      new Date(Date.now() - Math.max(0, elapsedMinutes) * 60000).toISOString(),
    respondedAt: row.respondedAt,
    responseNote: row.responseNote,
    summary: row.summary || row.reason || patient.chiefComplaint || 'Referral requested.',
  };
}

function pickHydrationPayload(envelope) {
  const data = envelope?.data || {};
  const emsArrivals = data.emsArrivals || data.arrivals?.map(normalizeEmsArrival);
  const referrals = data.referrals?.map(normalizeReferral);
  const workflowLogs = data.workflowLogs || data.logs;
  return {
    patients: data.patients || data.patient ? data.patients || [data.patient] : undefined,
    rooms: data.rooms,
    staff: data.staff,
    alerts: data.alerts,
    capacity: data.capacity,
    emsArrivals,
    referrals,
    workflowLogs,
  };
}

function hasHydrationPayload(payload) {
  return Boolean(
    payload.patients ||
      payload.rooms ||
      payload.staff ||
      payload.alerts ||
      payload.capacity ||
      payload.emsArrivals ||
      payload.referrals ||
      payload.workflowLogs
  );
}

function useEmergencyModule(fetcher, scenarioModule) {
  const hydrateFromApi = useEmergencyStore((state) => state.hydrateFromApi);
  const activeScenarioId = useEmergencyStore((state) => state.activeScenarioId);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const scenarioEnvelope = useMemo(
    () => (scenarioModule && activeScenarioId ? buildEmergencyScenarioModuleEnvelope(scenarioModule, activeScenarioId) : null),
    [activeScenarioId, scenarioModule]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    if (scenarioEnvelope) {
      setData(scenarioEnvelope);
      const hydrationPayload = pickHydrationPayload(scenarioEnvelope);
      if (hasHydrationPayload(hydrationPayload)) {
        hydrateFromApi(hydrationPayload);
      }
      setLoading(false);
      return scenarioEnvelope;
    }
    try {
      const envelope = await fetcher();
      setData(envelope);
      const hydrationPayload = pickHydrationPayload(envelope);
      if (hasHydrationPayload(hydrationPayload)) {
        hydrateFromApi(hydrationPayload);
      }
      return envelope;
    } catch (loadError) {
      const message = loadError?.message || 'Unable to load Emergency OS data.';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetcher, hydrateFromApi, scenarioEnvelope]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    if (scenarioEnvelope) {
      setData(scenarioEnvelope);
      const hydrationPayload = pickHydrationPayload(scenarioEnvelope);
      if (hasHydrationPayload(hydrationPayload)) {
        hydrateFromApi(hydrationPayload);
      }
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }
    fetcher()
      .then((envelope) => {
        if (cancelled) return;
        setData(envelope);
        const hydrationPayload = pickHydrationPayload(envelope);
        if (hasHydrationPayload(hydrationPayload)) {
          hydrateFromApi(hydrationPayload);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError?.message || 'Unable to load Emergency OS data.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher, hydrateFromApi, scenarioEnvelope]);

  const isEmpty = useMemo(() => {
    const payload = data?.data;
    if (!payload) return false;
    return Object.values(payload).every((value) => (Array.isArray(value) ? value.length === 0 : value == null));
  }, [data]);

  return { data, loading, error, isEmpty, refresh };
}

export const useEmergencyWhiteboard = () => useEmergencyModule(fetchEmergencyWhiteboard, 'whiteboard');
export const useEmergencyPatients = () => useEmergencyModule(fetchEmergencyPatients, 'patients');
export const usePatientJourney = () => useEmergencyModule(fetchPatientJourney, 'journey');
export const useEMSIntake = () => useEmergencyModule(fetchEMSIntake, 'ems');
export const useSmartIntake = () => useEmergencyModule(fetchSmartIntake);
export const useEmergencyQueues = () => useEmergencyModule(fetchEmergencyQueues, 'queues');
export const useReassessmentQueue = () => useEmergencyModule(fetchReassessmentQueue, 'reassessment');
export const useCapacityStatus = () => useEmergencyModule(fetchCapacityStatus, 'capacity');
export const useBoardingStatus = () => useEmergencyModule(fetchBoardingStatus, 'boarding');
export const useReferrals = () => useEmergencyModule(fetchReferrals);
export const useProvincialHealth = () => useEmergencyModule(fetchProvincialHealth, 'provincialHealth');
export const useIntegrationHub = () => useEmergencyModule(fetchIntegrationHub);
export const useEDCopilot = () => useEmergencyModule(fetchEDCopilot, 'copilot');
export const useEmergencyWorkflowLogs = () => useEmergencyModule(fetchEmergencyWorkflowLogs);
export const useEmergencyAnalytics = () => useEmergencyModule(fetchEmergencyAnalytics, 'analytics');
export const useEmergencySettings = () => useEmergencyModule(fetchEmergencySettings);

function useEmergencyModuleActions(fetcher, actions) {
  const moduleState = useEmergencyModule(fetcher);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [lastActionResult, setLastActionResult] = useState(null);

  const wrappedActions = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(actions).map(([name, action]) => [
          name,
          async (...args) => {
            setActionLoading(true);
            setActionError('');
            try {
              const result = await action(...args);
              setLastActionResult(result);
              await moduleState.refresh();
              return result;
            } catch (error) {
              const message = error?.message || 'Emergency OS action failed.';
              setActionError(message);
              return null;
            } finally {
              setActionLoading(false);
            }
          },
        ])
      ),
    [actions, moduleState]
  );

  return {
    ...moduleState,
    actionLoading,
    actionError,
    lastActionResult,
    ...wrappedActions,
  };
}

export const useRealTimeSimulation = () =>
  useEmergencyModuleActions(fetchRealTimeSimulationRecommendations, {
    updateLiveState: updateRealTimeSimulationState,
    evaluateIntervention: evaluateRealTimeSimulationIntervention,
    compareInterventions: compareRealTimeSimulationInterventions,
  });

export const useFederatedLearning = () =>
  useEmergencyModuleActions(fetchFederatedLearningDashboard, {
    registerHospital: registerFederatedHospital,
    submitModelUpdate: submitFederatedModelUpdate,
    aggregateRound: aggregateFederatedLearningRound,
    fetchGlobalModel: fetchFederatedLearningGlobalModel,
  });

export const useHybridDigitalTwin = () =>
  useEmergencyModuleActions(fetchHybridDigitalTwinState, {
    initializeTwin: initializeHybridDigitalTwin,
    simulateTwin: simulateHybridDigitalTwin,
    evaluateScenario: evaluateHybridDigitalTwinScenario,
  });

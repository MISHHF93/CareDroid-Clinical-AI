import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEmergencyStore } from '../store/emergencyStore';
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

function pickHydrationPayload(envelope) {
  const data = envelope?.data || {};
  return {
    patients: data.patients || data.patient ? data.patients || [data.patient] : undefined,
    rooms: data.rooms,
    staff: data.staff,
    alerts: data.alerts,
    capacity: data.capacity,
  };
}

function hasHydrationPayload(payload) {
  return Boolean(payload.patients || payload.rooms || payload.staff || payload.alerts || payload.capacity);
}

function useEmergencyModule(fetcher) {
  const hydrateFromApi = useEmergencyStore((state) => state.hydrateFromApi);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
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
  }, [fetcher, hydrateFromApi]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
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
  }, [fetcher, hydrateFromApi]);

  const isEmpty = useMemo(() => {
    const payload = data?.data;
    if (!payload) return false;
    return Object.values(payload).every((value) => (Array.isArray(value) ? value.length === 0 : value == null));
  }, [data]);

  return { data, loading, error, isEmpty, refresh };
}

export const useEmergencyWhiteboard = () => useEmergencyModule(fetchEmergencyWhiteboard);
export const useEmergencyPatients = () => useEmergencyModule(fetchEmergencyPatients);
export const usePatientJourney = () => useEmergencyModule(fetchPatientJourney);
export const useEMSIntake = () => useEmergencyModule(fetchEMSIntake);
export const useSmartIntake = () => useEmergencyModule(fetchSmartIntake);
export const useEmergencyQueues = () => useEmergencyModule(fetchEmergencyQueues);
export const useReassessmentQueue = () => useEmergencyModule(fetchReassessmentQueue);
export const useCapacityStatus = () => useEmergencyModule(fetchCapacityStatus);
export const useBoardingStatus = () => useEmergencyModule(fetchBoardingStatus);
export const useReferrals = () => useEmergencyModule(fetchReferrals);
export const useProvincialHealth = () => useEmergencyModule(fetchProvincialHealth);
export const useIntegrationHub = () => useEmergencyModule(fetchIntegrationHub);
export const useEDCopilot = () => useEmergencyModule(fetchEDCopilot);
export const useEmergencyAnalytics = () => useEmergencyModule(fetchEmergencyAnalytics);
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

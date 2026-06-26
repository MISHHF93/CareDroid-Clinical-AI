import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEmergencyStore } from '../store/emergencyStore';
import { buildEmergencyScenarioModuleEnvelope } from '../data/edScenarioFixtures';
import {
  aggregateFederatedLearningRound,
  compareRealTimeSimulationInterventions,
  evaluateHybridDigitalTwinScenario,
  evaluateRealTimeSimulationIntervention,
  fetchAdvancedEmergencyOsUpgradeHarness,
  fetchBoardingStatus,
  fetchCapacityStatus,
  fetchEDCopilot,
  fetchEMSIntake,
  fetchReceptionSnapshot,
  fetchEmergencyAnalytics,
  fetchEmergencyAiGovernanceCompliance,
  fetchEmergencyAiGovernanceRegistry,
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
  fetchUpgradeHarnessAuditSummary,
  fetchUpgradeHarnessCapacity,
  fetchUpgradeHarnessClinicalIntelligence,
  fetchUpgradeHarnessPatientFlow,
  initializeHybridDigitalTwin,
  fetchReassessmentQueue,
  fetchReferrals,
  fetchSmartIntake,
  registerFederatedHospital,
  simulateHybridDigitalTwin,
  submitFederatedModelUpdate,
  updateRealTimeSimulationState,
  validateEmergencyAiGovernancePrompts,
} from '../services/emergencyOsApi';
import { ensurePatientArrivalBlock } from '../services/patientArrivalBackendSync';

function latestVitals(patient: any = {}) {
  if (Array.isArray(patient.vitals)) return patient.vitals.at(-1) || {};
  return patient.vitals || {};
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function normalizePatientRecord(patient: any = {}) {
  const withArrival = ensurePatientArrivalBlock({
    ...patient,
    flags: Array.isArray(patient.flags) ? patient.flags : [],
    vitals: asArray(patient.vitals),
    notes: Array.isArray(patient.notes) ? patient.notes : [],
    timeline: Array.isArray(patient.timeline) ? patient.timeline : [],
  });
  return {
    ...withArrival,
    flags: Array.isArray(withArrival.flags) ? withArrival.flags : [],
    vitals: asArray(withArrival.vitals),
    notes: Array.isArray(withArrival.notes) ? withArrival.notes : [],
    timeline: Array.isArray(withArrival.timeline) ? withArrival.timeline : [],
  };
}

function normalizeEmsSeverity(patient: any = {}, offloadRisk = '') {
  if (patient.priority === 'P1' || offloadRisk === 'high') return 'Critical';
  if (patient.priority === 'P2') return 'High';
  if (patient.priority === 'P4' || patient.priority === 'P5') return 'Low';
  return 'Moderate';
}

function normalizeEmsArrival(row: any = {}, index = 0) {
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

function normalizeEmsArrivalRecord(arrival: any = {}, index = 0) {
  const eta = Number(arrival.etaMinutes ?? arrival.eta ?? 0) || 0;
  return {
    ...arrival,
    id: arrival.id || `ems-arrival-${arrival.patientId || index}`,
    unitId: arrival.unitId || arrival.unitName || `EMS-${index + 1}`,
    unitName: arrival.unitName || arrival.unitId || `EMS ${index + 1}`,
    crewNames: Array.isArray(arrival.crewNames) ? arrival.crewNames : [],
    vitals: latestVitals(arrival),
    eta,
    severity: arrival.severity || 'Moderate',
    status: arrival.status || 'Inbound',
    estimatedArrivalTime:
      arrival.estimatedArrivalTime ||
      new Date(Date.now() + Math.max(0, eta) * 60000).toISOString(),
    chiefComplaint: arrival.chiefComplaint || arrival.prearrivalComplaint || 'EMS pre-arrival',
  };
}

function normalizeReferralStatus(status = '') {
  const normalized = String(status).toLowerCase();
  if (normalized.includes('acknowledg')) return 'Acknowledged';
  if (normalized.includes('accepted')) return 'Accepted';
  if (normalized.includes('transferrequested') || normalized.includes('transfer requested')) return 'TransferRequested';
  if (normalized.includes('transportarranged') || normalized.includes('transport arranged')) return 'TransportArranged';
  if (normalized.includes('patientdeparted') || normalized.includes('patient departed')) return 'PatientDeparted';
  if (normalized.includes('closed') || normalized.includes('complete')) return 'Completed';
  if (normalized.includes('declined')) return 'Declined';
  if (normalized.includes('delay') || normalized.includes('info')) return 'InfoRequested';
  if (normalized.includes('draft')) return 'Draft';
  return 'Sent';
}

function normalizeReferral(row: any = {}, index = 0) {
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

function normalizeQueueSummary(row: any = {}, index = 0) {
  const label = row.label || row.type || row.name || `Queue ${index + 1}`;
  const patients = asArray(row.patients).map(normalizePatientRecord);
  return {
    ...row,
    id: row.id || row.type || label,
    label,
    type: row.type || label,
    name: row.name || label,
    count: row.count ?? patients.length,
    patients,
  };
}

function normalizeEmergencyData(data: any = {}) {
  const patients = data.patients
    ? asArray(data.patients).map(normalizePatientRecord)
    : data.patient
      ? [normalizePatientRecord(data.patient)]
      : undefined;
  const patient = data.patient ? normalizePatientRecord(data.patient) : undefined;
  const emsArrivals = data.emsArrivals
    ? asArray(data.emsArrivals).map(normalizeEmsArrivalRecord)
    : data.inboundEms
      ? asArray(data.inboundEms).map(normalizeEmsArrivalRecord)
      : data.arrivals
        ? asArray(data.arrivals).map(normalizeEmsArrival)
        : undefined;
  const referrals = data.referrals ? asArray(data.referrals).map(normalizeReferral) : undefined;
  const queues = data.queues ? asArray(data.queues).map(normalizeQueueSummary) : undefined;

  return {
    ...data,
    ...(patients ? { patients } : {}),
    ...(patient ? { patient } : {}),
    ...(emsArrivals ? { emsArrivals } : {}),
    ...(referrals ? { referrals } : {}),
    ...(queues ? { queues } : {}),
  };
}

function normalizeEmergencyEnvelope(envelope) {
  if (!envelope?.data || typeof envelope.data !== 'object') return envelope;
  return {
    ...envelope,
    data: normalizeEmergencyData(envelope.data),
  };
}

function pickHydrationPayload(envelope) {
  const data = envelope?.data || {};
  const emsArrivals =
    data.emsArrivals ||
    data.inboundEms ||
    data.arrivals?.map(normalizeEmsArrival);
  const referrals = data.referrals?.map(normalizeReferral);
  const workflowLogs = data.workflowLogs || data.logs;
  const emergencySettings =
    data.emergencySettings ||
    data.settings ||
    data.tenantSettings ||
    (data.tenantName && data.thresholds ? data : undefined);
  return {
    patients: data.patients || data.patient ? data.patients || [data.patient] : undefined,
    rooms: data.rooms,
    staff: data.staff,
    alerts: data.alerts,
    capacity: data.capacity,
    emsArrivals,
    referrals,
    workflowLogs,
    emergencySettings,
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
      payload.workflowLogs ||
      payload.emergencySettings
  );
}

function useEmergencyModule(fetcher, scenarioModule: any = undefined) {
  const hydrateFromApi = useEmergencyStore((state) => state.hydrateFromApi);
  const activeScenarioId = useEmergencyStore((state) => state.activeScenarioId);
  const [data, setData] = useState<any>(null);
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
      const normalizedEnvelope = normalizeEmergencyEnvelope(scenarioEnvelope);
      setData(normalizedEnvelope);
      const hydrationPayload = pickHydrationPayload(normalizedEnvelope);
      if (hasHydrationPayload(hydrationPayload)) {
        hydrateFromApi(hydrationPayload);
      }
      setLoading(false);
      return normalizedEnvelope;
    }
    try {
      const envelope = await fetcher();
      const normalizedEnvelope = normalizeEmergencyEnvelope(envelope);
      setData(normalizedEnvelope);
      const hydrationPayload = pickHydrationPayload(normalizedEnvelope);
      if (hasHydrationPayload(hydrationPayload)) {
        hydrateFromApi(hydrationPayload);
      }
      return normalizedEnvelope;
    } catch (loadError: any) {
      const message = loadError?.message || 'Unable to load CareDroid data.';
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
      const normalizedEnvelope = normalizeEmergencyEnvelope(scenarioEnvelope);
      setData(normalizedEnvelope);
      const hydrationPayload = pickHydrationPayload(normalizedEnvelope);
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
        const normalizedEnvelope = normalizeEmergencyEnvelope(envelope);
        setData(normalizedEnvelope);
        const hydrationPayload = pickHydrationPayload(normalizedEnvelope);
        if (hasHydrationPayload(hydrationPayload)) {
          hydrateFromApi(hydrationPayload);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError?.message || 'Unable to load CareDroid data.');
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
    return Object.values(payload).every((value: any) => (Array.isArray(value) ? value.length === 0 : value == null));
  }, [data]);

  return { data, loading, error, isEmpty, refresh };
}

export const useEmergencyWhiteboard = () => useEmergencyModule(fetchEmergencyWhiteboard, 'whiteboard');
export const useEmergencyPatients = () => useEmergencyModule(fetchEmergencyPatients, 'patients');
export const usePatientJourney = () => useEmergencyModule(fetchPatientJourney, 'journey');
export const useEMSIntake = () => useEmergencyModule(fetchEMSIntake, 'ems');
export const useReceptionSnapshot = () => useEmergencyModule(fetchReceptionSnapshot, 'reception');

export function useReceptionSnapshotPolling(intervalMs = 15000) {
  const snapshot = useReceptionSnapshot();
  const websocketStatus = useEmergencyStore((state) => state.websocket?.status);
  const websocketMode = useEmergencyStore((state) => state.websocket?.mode);
  const realtimeActive =
    websocketStatus === 'connected' &&
    (websocketMode === 'sse' || websocketMode === 'websocket');

  useEffect(() => {
    if (!intervalMs || realtimeActive) return undefined;
    const timer = window.setInterval(() => {
      void snapshot.refresh();
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, realtimeActive, snapshot.refresh]);
  return snapshot;
}
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
export const useEmergencyAiGovernanceRegistry = () =>
  useEmergencyModule(fetchEmergencyAiGovernanceRegistry);
export const useEmergencyAiGovernanceCompliance = (days = 30) => {
  const fetcher = useCallback(() => fetchEmergencyAiGovernanceCompliance(days), [days]);
  return useEmergencyModule(fetcher, undefined);
};
export const useEmergencyAiGovernancePromptValidation = () =>
  useEmergencyModule(validateEmergencyAiGovernancePrompts);
export const useAdvancedEmergencyOsUpgradeHarness = () =>
  useEmergencyModule(fetchAdvancedEmergencyOsUpgradeHarness);
export const useUpgradeHarnessCapacity = () => useEmergencyModule(fetchUpgradeHarnessCapacity);
export const useUpgradeHarnessPatientFlow = (patientId: any = undefined) => {
  const fetcher = useCallback(() => fetchUpgradeHarnessPatientFlow(patientId), [patientId]);
  return useEmergencyModule(fetcher, undefined);
};
export const useUpgradeHarnessClinicalIntelligence = (patientId: any = undefined) => {
  const fetcher = useCallback(
    () => fetchUpgradeHarnessClinicalIntelligence(patientId),
    [patientId]
  );
  return useEmergencyModule(fetcher, undefined);
};
export const useUpgradeHarnessAuditSummary = () => useEmergencyModule(fetchUpgradeHarnessAuditSummary);

function useEmergencyModuleActions(fetcher, actions) {
  const moduleState = useEmergencyModule(fetcher);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [lastActionResult, setLastActionResult] = useState<any>(null);

  const wrappedActions = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(actions).map(([name, action]: [string, any]) => [
          name,
          async (...args) => {
            setActionLoading(true);
            setActionError('');
            try {
              const result = await (action as any)(...args);
              setLastActionResult(result);
              await moduleState.refresh();
              return result;
            } catch (error: any) {
              const message = error?.message || 'CareDroid action failed.';
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

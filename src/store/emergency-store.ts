import { useEmergencyStore } from './emergencyStore';

export * from './emergencyStore';
export { useEmergencyStore as default } from './emergencyStore';

export type EmergencyCopilotMessage = {
  id: string;
  query: string;
  response: string;
  safetyStatus: 'safe' | 'caution' | 'unsafe' | 'blocked' | 'unknown';
  createdAt: string;
  raw?: unknown;
};

export const createInitialEmergencyStoreState = () => {
  const state = useEmergencyStore.getState();
  return {
    patients: state.patients,
    staff: state.staff,
    rooms: state.rooms,
    capacity: state.capacity,
    capacityHistory: state.capacityHistory,
    activeShift: state.activeShift,
    emsUnits: state.emsUnits,
    emsArrivals: state.emsArrivals,
    referrals: state.referrals,
    capacityMetrics: state.capacityMetrics,
    boardingMetrics: state.boardingMetrics,
    surgeStatus: state.surgeStatus,
    copilotMessages: state.copilotMessages,
    emsIncomingPatients: state.emsIncomingPatients,
    ui: state.ui,
    websocket: state.websocket,
    integrationEvents: state.integrationEvents,
    alerts: state.alerts,
    workflowLogs: state.workflowLogs,
    auditLog: state.auditLog,
    thresholds: state.thresholds,
    emergencySettings: state.emergencySettings,
    selectedPatientId: null,
    copilotOpen: false,
    activeQueueFilter: null,
    loading: false,
    features: state.features,
    flags: state.flags,
    overrides: state.overrides,
    tier: state.tier,
    lastSynced: state.lastSynced,
    backendAvailable: state.backendAvailable,
    persistenceMode: state.persistenceMode,
  };
};

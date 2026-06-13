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
    activeShift: state.activeShift,
    emsUnits: state.emsUnits,
    emsArrivals: state.emsArrivals,
    referrals: state.referrals,
    alerts: state.alerts,
    workflowLogs: state.workflowLogs,
    selectedPatientId: null,
    copilotOpen: false,
    activeQueueFilter: 'All',
    loading: false,
    features: state.features,
  };
};

import { useCallback, useEffect, useMemo } from 'react';
import { useEmergencyStore } from '../store/emergencyStore';
import { fetchPatientFlow } from '../services/emergencyOsApi';
import type {
  ContinuousPatientFlowSnapshot,
  PatientFlowPatientSnapshot,
} from '../engine/continuousPatientFlowEngine';

type PatientFlowApiEnvelope = {
  data?: {
    patientFlowSnapshot?: ContinuousPatientFlowSnapshot;
    patientId?: string | null;
  };
};

export function useContinuousPatientFlow(patientId?: string | null) {
  const snapshot = useEmergencyStore((state) => state.patientFlowSnapshot);
  const refreshLocal = useEmergencyStore((state) => state.refreshPatientFlow);
  const setPatientFlowSnapshot = useEmergencyStore((state) => state.setPatientFlowSnapshot);
  const backendAvailable = useEmergencyStore((state) => state.backendAvailable);

  const refresh = useCallback(async () => {
    if (backendAvailable) {
      try {
        const envelope = (await fetchPatientFlow(patientId || undefined)) as PatientFlowApiEnvelope;
        const remoteSnapshot = envelope?.data?.patientFlowSnapshot;
        if (remoteSnapshot) {
          setPatientFlowSnapshot(remoteSnapshot);
          return remoteSnapshot;
        }
      } catch {
        // Fall back to local continuous engine snapshot.
      }
    }
    const local = refreshLocal();
    if (patientId) {
      return Object.freeze({
        ...local,
        patients: local.patients.filter((entry) => entry.patientId === patientId),
        detections: local.detections.filter((entry) => entry.patientId === patientId),
        aiRecommendations: local.aiRecommendations.filter((entry) => entry.patientId === patientId),
      });
    }
    return local;
  }, [backendAvailable, patientId, refreshLocal, setPatientFlowSnapshot]);

  useEffect(() => {
    if (!snapshot) {
      void refresh();
    }
  }, [refresh, snapshot]);

  const patientSnapshot = useMemo<PatientFlowPatientSnapshot | null>(() => {
    if (!patientId || !snapshot) return null;
    return snapshot.patients.find((entry) => entry.patientId === patientId) || null;
  }, [patientId, snapshot]);

  return {
    snapshot,
    patientSnapshot,
    refresh,
    metrics: snapshot?.metrics || null,
    detections: snapshot?.detections || [],
    departments: snapshot?.departments || [],
    aiRecommendations: snapshot?.aiRecommendations || [],
  };
}

export default useContinuousPatientFlow;
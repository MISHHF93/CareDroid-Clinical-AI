import { useEffect, useMemo, useState } from 'react';
import {
  buildPatientCardOrchestrationContext,
  type EmergencyRoleId,
  type PatientCardOrchestrationContext,
} from '../../lib/patient-orchestration';
import type { Patient } from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';
import { useEmergencyRolePermissions } from './useEmergencyRolePermissions';
import { resolveWhatHappensNext } from '../services/whatHappensNextGuidance';
import { fetchPatientOrchestration } from '../services/emergencyOsApi';

function normalizeRole(role: string): EmergencyRoleId {
  const allowed: EmergencyRoleId[] = [
    'registration_clerk',
    'triage_nurse',
    'physician',
    'charge_nurse',
    'ed_manager',
    'ems_user',
    'admin',
    'read_only_viewer',
    'public_display',
  ];
  return (allowed.includes(role as EmergencyRoleId) ? role : 'physician') as EmergencyRoleId;
}

function mergeOrchestrationContexts(
  local: PatientCardOrchestrationContext,
  remote: PatientCardOrchestrationContext | null,
): PatientCardOrchestrationContext {
  if (!remote) return local;
  return {
    ...local,
    sourceState: remote.sourceState === 'live' ? 'live' : local.sourceState,
    blockedReasons: { ...remote.blockedReasons, ...local.blockedReasons },
    workflowActions: local.workflowActions.length ? local.workflowActions : remote.workflowActions ?? [],
    prioritizedRecommendations:
      remote.prioritizedRecommendations?.length
        ? remote.prioritizedRecommendations
        : local.prioritizedRecommendations ?? [],
    secondaryRecommendations:
      remote.secondaryRecommendations?.length
        ? remote.secondaryRecommendations
        : local.secondaryRecommendations ?? [],
  };
}

export function usePatientOrchestration(
  patient: Patient | null | undefined,
): PatientCardOrchestrationContext | null {
  const referrals = useEmergencyStore((state) => state.referrals);
  const staff = useEmergencyStore((state) => state.staff);
  const websocket = useEmergencyStore((state) => state.websocket);
  const emergencyRole = useEmergencyRolePermissions();
  const role = normalizeRole(emergencyRole.role);
  const [remoteContext, setRemoteContext] = useState<PatientCardOrchestrationContext | null>(null);

  useEffect(() => {
    if (!patient?.id) {
      setRemoteContext(null);
      return;
    }

    let cancelled = false;
    fetchPatientOrchestration(patient.id, role)
      .then((response) => {
        if (cancelled) return;
        const orchestration = response?.data?.orchestration;
        if (orchestration) {
          setRemoteContext(orchestration as PatientCardOrchestrationContext);
        }
      })
      .catch(() => {
        if (!cancelled) setRemoteContext(null);
      });

    return () => {
      cancelled = true;
    };
  }, [
    patient?.id,
    role,
    patient?.notes?.length,
    patient?.timeline?.length,
    patient?.flags?.length,
  ]);

  return useMemo(() => {
    if (!patient) return null;

    const whatHappensNext = resolveWhatHappensNext(patient, { referrals, staff });
    const sourceState = websocket?.connected ? 'live' : 'demo';

    const localContext = buildPatientCardOrchestrationContext({
      patient,
      role,
      referrals,
      sourceState,
      whatHappensNextLabel: whatHappensNext?.shortLabel || whatHappensNext?.label || null,
    });

    return mergeOrchestrationContexts(localContext, remoteContext);
  }, [
    patient,
    referrals,
    staff,
    role,
    websocket?.connected,
    remoteContext,
  ]);
}

export default usePatientOrchestration;
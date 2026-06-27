import { useEmergencyStore } from '../../store/emergencyStore';

export function usePatientDetail(patientId?: string) {
  const selectedId = useEmergencyStore((s) => s.selectedPatientId);
  const patients = useEmergencyStore((s) => s.patients);
  const alerts = useEmergencyStore((s) => s.alerts);

  const id = patientId ?? selectedId;
  const patient = patients.find((p) => p.id === id) ?? null;

  const latestVitals = patient && patient.vitals.length > 0
    ? patient.vitals[patient.vitals.length - 1]
    : null;

  const patientAlerts = alerts.filter((a) => a.patientId === id && !a.dismissed);

  return { patient, latestVitals, patientAlerts };
}

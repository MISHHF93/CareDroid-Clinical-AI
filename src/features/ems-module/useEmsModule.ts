import { useEmergencyStore } from '../../store/emergencyStore';

export function useEmsModule() {
  const emsUnits = useEmergencyStore((s) => s.emsUnits);
  const patients = useEmergencyStore((s) => s.patients);

  const inbound = emsUnits.filter((u) => u.status === 'Inbound');
  const arrived = emsUnits.filter((u) => u.status === 'Arrived');
  const available = emsUnits.filter((u) => u.status === 'Available');

  function patientName(patientId?: string): string | undefined {
    if (!patientId) return undefined;
    const p = patients.find((pt) => pt.id === patientId);
    return p ? `${p.firstName} ${p.lastName}` : undefined;
  }

  return { emsUnits, inbound, arrived, available, patientName };
}

import { useMemo } from 'react';
import { useEmergencyStore } from '../../store/emergencyStore';

export function useEmsModule() {
  const emsUnits = useEmergencyStore((s) => s.emsUnits);
  const patients = useEmergencyStore((s) => s.patients);

  const inbound = useMemo(() => emsUnits.filter((u) => u.status === 'Inbound'), [emsUnits]);
  const arrived = useMemo(() => emsUnits.filter((u) => u.status === 'Arrived'), [emsUnits]);
  const available = useMemo(() => emsUnits.filter((u) => u.status === 'Available'), [emsUnits]);

  function patientName(patientId?: string): string | undefined {
    if (!patientId) return undefined;
    const p = patients.find((pt) => pt.id === patientId);
    return p ? `${p.firstName} ${p.lastName}` : undefined;
  }

  return { emsUnits, inbound, arrived, available, patientName };
}

import { useEmergencyStore } from '../../store/emergencyStore';
import { Priority } from '../../types/emergency';

export function useCapacity() {
  const capacity = useEmergencyStore((s) => s.capacity);
  const patients = useEmergencyStore((s) => s.patients);
  const rooms = useEmergencyStore((s) => s.rooms);
  const queues = useEmergencyStore((s) => s.queues);

  const byPriority = {
    P1: patients.filter((p) => p.priority === Priority.P1).length,
    P2: patients.filter((p) => p.priority === Priority.P2).length,
    P3: patients.filter((p) => p.priority === Priority.P3).length,
    P4: patients.filter((p) => p.priority === Priority.P4).length,
    P5: patients.filter((p) => p.priority === Priority.P5).length,
  };

  const totalRooms = rooms.length || capacity.maxCapacity || 1;
  const occupiedRooms = capacity.occupiedRooms;
  const occupancyPct = Math.round((occupiedRooms / totalRooms) * 100);

  const kpis = [
    { label: 'Total Patients', value: capacity.totalPatients },
    { label: 'Occupied Rooms', value: `${occupiedRooms} / ${totalRooms}` },
    { label: 'Boarding', value: capacity.boardingCount },
    { label: 'Reassess Due', value: capacity.reassessmentDue },
    ...(capacity.waitingCount != null ? [{ label: 'Waiting', value: capacity.waitingCount }] : []),
    ...(capacity.dischargeReadyCount != null ? [{ label: 'Ready to DC', value: capacity.dischargeReadyCount }] : []),
  ];

  return { capacity, byPriority, occupancyPct, totalRooms, kpis, queues };
}

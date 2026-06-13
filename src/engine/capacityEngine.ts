import { useEmergencyStore } from '../store/emergencyStore';
import { dispatchAlert } from './alertEngine';
import { PatientFlag, PatientState, type CapacitySnapshot } from '../types/emergency';

export function calculateCapacity(): CapacitySnapshot {
  const { patients, rooms } = useEmergencyStore.getState();

  const total = patients.filter(p =>
    ![PatientState.Discharge].includes(p.state)).length;
  const boarding = patients.filter(p =>
    p.state === PatientState.Admission).length;
  const reassessmentDue = patients.filter(p =>
    p.flags.includes(PatientFlag.ReassessmentDue)).length;
  const occupied = rooms.filter(r =>
    r.status === 'Occupied').length;
  const maxRooms = rooms.length || 15;

  let score = 100;
  const occupancyPct = occupied / maxRooms;
  if (occupancyPct > 0.8) score -= (occupancyPct - 0.8) * 100;
  score -= boarding * 8;
  if (reassessmentDue > 3) score -= 10;
  score = Math.max(0, Math.min(100, score));

  const band = score >= 80 ? 'Green'
    : score >= 60 ? 'Yellow'
    : score >= 40 ? 'Orange' : 'Red';

  return { score: Math.round(score), band,
    totalPatients: total, occupiedRooms: occupied,
    boardingCount: boarding, reassessmentDue,
    updatedAt: new Date().toISOString() };
}

export function startCapacityEngine() {
  const update = () => {
    const snapshot = calculateCapacity();
    useEmergencyStore.getState().setCapacity(snapshot);
    if (snapshot.band === 'Orange' || snapshot.band === 'Red') {
      dispatchAlert({
        id: 'cap-' + Date.now(),
        severity: snapshot.band === 'Red' ? 'Critical':'Warning',
        title: 'Capacity ' + snapshot.band,
        message: `Score ${snapshot.score} — ${snapshot.band} zone`,
        source: 'capacity-engine',
      });
    }
  };
  update();
  return window.setInterval(update, 30000);
}

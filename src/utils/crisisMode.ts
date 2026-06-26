import { PatientState } from '../types/emergency';

const ACTIVE_EMS_STATUSES = new Set(['Inbound', 'Arrived', 'Handoff']);

export function patientDisplayName(patient) {
  return patient?.name || [patient?.firstName, patient?.lastName].filter(Boolean).join(' ') || 'Unknown patient';
}

export function roomLabel(patient, rooms = [] as any[]) {
  return patient?.location || rooms.find((room) => room.id === patient?.roomId)?.name || patient?.roomId || 'No bed';
}

export function minutesSince(timestamp, now = new Date()) {
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round((now.getTime() - parsed) / 60000));
}

function latestStateTimestamp(patient, state) {
  const match = [...(patient?.timeline || [])]
    .reverse()
    .find((event) => event.to === state || event.toState === state || event.summary?.includes(state));
  return match?.timestamp || patient?.lastAssessedTime || patient?.arrivalTime;
}

function targetDepartment(patient, referrals = [] as any[]) {
  return (
    patient?.referral?.targetDepartment ||
    referrals.find((referral) => referral.patientId === patient?.id)?.targetDepartment ||
    'Admitting team'
  );
}

export function deriveCrisisModeState({
  capacity,
  patients = [] as any[],
  rooms = [] as any[],
  referrals = [] as any[],
  reassessmentQueue = [] as any[],
  emsArrivals = [] as any[],
  now = new Date(),
}: any = {}) {
  const active = capacity?.riskLevel === 'Orange' || capacity?.riskLevel === 'Red';
  const severity = capacity?.riskLevel || 'Green';
  const boardingPatients = patients
    .filter((patient) => patient.state === PatientState.Admission)
    .map((patient) => ({
      patient,
      name: patientDisplayName(patient),
      room: roomLabel(patient, rooms),
      targetDepartment: targetDepartment(patient, referrals),
      boardingMinutes: minutesSince(latestStateTimestamp(patient, PatientState.Admission), now),
    }));
  const dischargeReady = patients
    .filter((patient) => patient.state === PatientState.Disposition)
    .map((patient) => ({
      patient,
      name: patientDisplayName(patient),
      room: roomLabel(patient, rooms),
      dispositionMinutes: minutesSince(latestStateTimestamp(patient, PatientState.Disposition), now),
    }));
  const inboundEms = emsArrivals
    .filter((arrival) => ACTIVE_EMS_STATUSES.has(arrival.status))
    .sort((a, b) => (a.eta ?? 999) - (b.eta ?? 999));
  const actionGroups = [] as any[];

  if (boardingPatients.length) {
    actionGroups.push({
      id: 'boarding',
      title: `Contact ${boardingPatients.length} boarding patients' admitting teams - beds must be found`,
      items: boardingPatients,
    });
  }
  if (dischargeReady.length) {
    actionGroups.push({
      id: 'discharge',
      title: `Expedite ${dischargeReady.length} discharge-ready patients`,
      items: dischargeReady,
    });
  }
  if (reassessmentQueue.length > 3) {
    actionGroups.push({
      id: 'reassessment',
      title: `Clear reassessment queue first - ${reassessmentQueue.length} patients overdue`,
      items: reassessmentQueue,
    });
  }
  if (inboundEms.length) {
    actionGroups.push({
      id: 'ems',
      title: `Prepare ${inboundEms.length} bays for incoming EMS`,
      items: inboundEms,
    });
  }

  return {
    active,
    severity,
    isRed: severity === 'Red',
    isOrange: severity === 'Orange',
    boardingPatients,
    dischargeReady,
    reassessmentQueue,
    inboundEms,
    actionGroups,
    recommendedActionCount: actionGroups.length,
  };
}

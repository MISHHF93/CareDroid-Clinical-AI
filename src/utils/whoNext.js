import { PatientState, Priority } from '../../types/emergency';
import { getSavedScores } from './clinicalScoreEvents';

const ACTIVE_STATES = new Set(
  Object.values(PatientState).filter(
    (state) => state !== PatientState.Discharge && state !== PatientState.Deceased
  )
);

const PROTOCOL_CALCULATOR_BY_CATEGORY = {
  'Chest Pain': ['heart-score'],
  Respiratory: ['news2'],
  'Shortness of Breath': ['news2'],
  'Infectious Respiratory': ['qsofa', 'news2'],
  Sepsis: ['qsofa', 'news2'],
  Stroke: ['nihss'],
  Neurologic: ['nihss'],
  Neuro: ['nihss'],
  'Neuro/Stroke': ['nihss'],
};

function waitMinutes(arrivalTime, now = new Date()) {
  const arrivedAt = new Date(arrivalTime).getTime();
  if (!Number.isFinite(arrivedAt)) return 0;
  return Math.max(0, Math.round((now.getTime() - arrivedAt) / 60000));
}

function patientName(patient) {
  return patient?.name || [patient?.firstName, patient?.lastName].filter(Boolean).join(' ') || 'Unknown';
}

export function compactPatientName(patient) {
  const first = patient?.firstName || patient?.name?.split(/\s+/)[0] || 'Unknown';
  const lastInitial = patient?.lastName?.[0] || patient?.name?.split(/\s+/)[1]?.[0] || '';
  return `${first}${lastInitial ? ` ${lastInitial}.` : ''}`;
}

export function hasPatientFlagLocal(patient, flagType) {
  return (patient?.flags || []).some((flag) => (typeof flag === 'string' ? flag : flag.type) === flagType);
}

function roomName(patient, rooms = []) {
  return patient?.location || rooms.find((room) => room.id === patient?.roomId)?.name || patient?.roomId || 'No bed';
}

function protocolCalculatorIds(patient) {
  return PROTOCOL_CALCULATOR_BY_CATEGORY[patient?.complaintCategory] || [];
}

function hasProtocolScoreMissing(patient) {
  const calculatorIds = protocolCalculatorIds(patient);
  if (!calculatorIds.length) return false;
  const savedScores = getSavedScores(patient);
  return calculatorIds.some((calculatorId) => {
    const normalizedId = calculatorId.replace(/-score$/i, '').toLowerCase();
    return !savedScores.some((score) => {
      const scoreId = String(score.toolId || '').toLowerCase();
      const scoreName = String(score.toolName || '').toLowerCase();
      return scoreId === calculatorId || scoreId === normalizedId || scoreName.includes(normalizedId);
    });
  });
}

function hasPendingLabReview(patient, backendDetailsByPatientId = {}) {
  const entry = backendDetailsByPatientId[patient?.id] || {};
  const labs = entry.data?.labs || entry.labs || [];
  return labs.some((lab) => {
    const status = String(lab.status || lab.reviewStatus || '').toLowerCase();
    return (
      lab.requiresReview ||
      lab.pendingReview ||
      lab.reviewed === false ||
      status.includes('pending') ||
      status.includes('new')
    );
  });
}

function isActivePatient(patient) {
  return patient && ACTIVE_STATES.has(patient.state);
}

function isPhysicianStaff(staff) {
  const role = String(staff?.role || staff?.roleLabel || '').toLowerCase();
  return /(attending|physician|doctor|resident|consultant|md)/.test(role);
}

export function resolvePhysicianStaffId({ user, staff = [], activeShift = {} } = {}) {
  const userText = [user?.id, user?.email, user?.name, user?.fullName].filter(Boolean).join(' ').toLowerCase();
  const directMatch = staff.find((member) => {
    const memberText = [member.id, member.email, member.name, member.displayName, member.firstName, member.lastName]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return userText && memberText && (userText.includes(memberText) || memberText.includes(userText));
  });
  if (directMatch?.id && isPhysicianStaff(directMatch)) return directMatch.id;

  const activePhysician = staff.find(
    (member) => activeShift.staffIds?.includes(member.id) && isPhysicianStaff(member)
  );
  return activePhysician?.id || null;
}

export function isSnoozed(patient, snoozes = {}, now = new Date()) {
  if (!patient?.id) return false;
  if (hasPatientFlagLocal(patient, 'DeteriorationRisk')) return false;
  const snooze = snoozes[patient.id];
  if (!snooze?.until) return false;
  return new Date(snooze.until).getTime() > now.getTime();
}

export function scoreWhoNextPatient(patient, { now = new Date(), backendDetailsByPatientId = {} } = {}) {
  const factors = [];
  let score = 0;
  const wait = waitMinutes(patient.arrivalTime, now);

  if (patient.priority === Priority.P1) {
    score += 50;
    factors.push({ label: 'P1 priority', points: 50 });
  } else if (patient.priority === Priority.P2) {
    score += 30;
    factors.push({ label: 'P2 priority', points: 30 });
  } else if (patient.priority === Priority.P3) {
    score += 15;
    factors.push({ label: 'P3 priority', points: 15 });
  }

  if (wait > 45) {
    const points = 20 + (wait - 45);
    score += points;
    factors.push({ label: `waiting ${wait}min`, points });
  }
  if (hasPatientFlagLocal(patient, 'ReassessmentDue')) {
    score += 25;
    factors.push({ label: 'reassessment due', points: 25 });
  }
  if (hasPatientFlagLocal(patient, 'DeteriorationRisk')) {
    score += 20;
    factors.push({ label: 'deterioration risk', points: 20 });
  }
  if (hasProtocolScoreMissing(patient)) {
    score += 15;
    factors.push({ label: 'clinical score not run', points: 15 });
  }
  if (hasPendingLabReview(patient, backendDetailsByPatientId)) {
    score += 10;
    factors.push({ label: 'new lab pending review', points: 10 });
  }
  if (hasPatientFlagLocal(patient, 'HighRisk')) {
    score += 30;
    factors.push({ label: 'high risk flag', points: 30 });
  }

  const topFactors = factors.sort((a, b) => b.points - a.points).slice(0, 2);
  return {
    patient,
    score,
    waitMinutes: wait,
    factors,
    reason: topFactors.map((factor) => factor.label).join(' + ') || 'next active patient',
  };
}

export function getWhoNextRecommendation({
  patients = [],
  rooms = [],
  staff = [],
  activeShift = {},
  user = null,
  snoozes = {},
  backendDetailsByPatientId = {},
  now = new Date(),
  physicianStaffId = null,
} = {}) {
  const resolvedPhysicianId =
    physicianStaffId || resolvePhysicianStaffId({ user, staff, activeShift });
  const activePatients = patients.filter(isActivePatient);
  const assignedPatients = resolvedPhysicianId
    ? activePatients.filter((patient) => patient.assignedStaffId === resolvedPhysicianId)
    : [];
  const assignedEligible = assignedPatients.filter((patient) => !isSnoozed(patient, snoozes, now));
  const scope = assignedEligible.length ? 'assigned' : 'department';
  const departmentEligible = activePatients.filter((patient) => !isSnoozed(patient, snoozes, now));
  const unassignedHighPriority = departmentEligible.filter(
    (patient) =>
      !patient.assignedStaffId && (patient.priority === Priority.P1 || patient.priority === Priority.P2)
  );
  const candidates = scope === 'assigned' ? assignedEligible : unassignedHighPriority.length ? unassignedHighPriority : departmentEligible;

  const scored = candidates
    .map((patient) => scoreWhoNextPatient(patient, { now, backendDetailsByPatientId }))
    .sort((a, b) => b.score - a.score || b.waitMinutes - a.waitMinutes);
  const recommendation = scored[0] || null;

  if (!recommendation) {
    return {
      patient: null,
      score: 0,
      scope,
      physicianStaffId: resolvedPhysicianId,
      reason: scope === 'assigned' ? 'No assigned active patients' : 'No urgent department patients',
    };
  }

  return {
    ...recommendation,
    scope,
    physicianStaffId: resolvedPhysicianId,
    displayName: compactPatientName(recommendation.patient),
    fullName: patientName(recommendation.patient),
    room: roomName(recommendation.patient, rooms),
  };
}

export function formatWhoNextForCopilot(recommendation) {
  if (!recommendation?.patient) return '';
  return `Suggested next: ${recommendation.fullName} (${recommendation.room}) — ${recommendation.reason}`;
}

export function createSnooze(patientId, now = new Date(), minutes = 15) {
  return {
    patientId,
    until: new Date(now.getTime() + minutes * 60_000).toISOString(),
  };
}

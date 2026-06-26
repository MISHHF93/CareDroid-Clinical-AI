import {
  FIRST_CUSTOMER_DEMO_MODE,
  buildFirstCustomerDemoApiEnvelope,
  buildFirstCustomerDemoMode,
} from './firstCustomerDemoMode';
import { dedupePatientsByMrn } from '../utils/patientSeedUtils';

const STORAGE_KEY = 'caredroid.edScenarioId';

export const ED_SCENARIO_DEMO_MODES = Object.freeze([
  {
    id: 'normal-day',
    label: 'Normal day',
    shortLabel: 'Normal',
    description: 'Balanced ED flow with a small waiting room, no capacity crisis, and routine reassessments.',
  },
  {
    id: 'high-volume-day',
    label: 'High-volume day',
    shortLabel: 'High volume',
    description: 'Peak arrivals with growing waits, fuller rooms, and several medium-acuity handoffs.',
  },
  {
    id: 'ems-surge',
    label: 'EMS surge',
    shortLabel: 'EMS surge',
    description: 'Multiple inbound and recently arrived EMS patients competing for resus and assessment capacity.',
  },
  {
    id: 'boarding-crisis',
    label: 'Boarding crisis',
    shortLabel: 'Boarding',
    description: 'Admitted patients are occupying ED rooms while inpatient beds remain unavailable.',
  },
  {
    id: 'reassessment-backlog',
    label: 'Reassessment backlog',
    shortLabel: 'Reassessments',
    description: 'Several waiting and treatment patients are overdue for reassessment after vitals or wait changes.',
  },
  {
    id: 'capacity-red',
    label: 'Capacity red',
    shortLabel: 'Capacity red',
    description: 'The department is over target occupancy with blocked rooms, boarders, and EMS pressure.',
  },
  {
    id: 'multiple-high-risk-waiting',
    label: 'Multiple high-risk waiting patients',
    shortLabel: 'High-risk wait',
    description: 'Several P1/P2 or flagged patients remain in the waiting room and need command attention.',
  },
  {
    id: FIRST_CUSTOMER_DEMO_MODE.id,
    label: FIRST_CUSTOMER_DEMO_MODE.label,
    shortLabel: 'First customer',
    description:
      'Sales walkthrough fixture for a 100-patient/day ED with active whiteboard, EMS, high-risk waits, reassessments, boarders, capacity, analytics, and ED Copilot context.',
  },
  {
    id: 'unknown-patient-intake',
    label: 'Unknown patient intake',
    shortLabel: 'Unknown intake',
    description: 'A critical unknown patient arrives by EMS with temporary registration and identity reconciliation pending.',
  },
  {
    id: 'provincial-data-conflict',
    label: 'Provincial data conflict',
    shortLabel: 'Data conflict',
    description: 'Provincial medication/allergy data conflicts with local intake and requires human reconciliation.',
  },
]);

export const DEFAULT_ED_SCENARIO_ID = 'normal-day';

const SCENARIO_BY_ID = new Map(ED_SCENARIO_DEMO_MODES.map((scenario) => [scenario.id, scenario]));

const STAFF = Object.freeze([
  { id: 's1', name: 'Dr. Priya Nair', role: 'MD', roleLabel: 'Attending Physician', status: 'OnShift', active: true },
  { id: 's2', name: 'Maya Thompson', role: 'TriageNurse', roleLabel: 'Triage Nurse', status: 'OnShift', active: true },
  { id: 's3', name: 'Owen Clarke', role: 'Charge', roleLabel: 'Charge Nurse', status: 'OnShift', active: true },
  { id: 's4', name: 'Leo Fraser', role: 'RN', roleLabel: 'Staff Nurse', status: 'OnShift', active: true },
  { id: 's5', name: 'Dr. Hana Patel', role: 'MD', roleLabel: 'Attending Physician', status: 'OnShift', active: true },
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function minutesAgo(minutes, now = new Date()) {
  return new Date(now.getTime() - minutes * 60_000).toISOString();
}

function minutesFromNow(minutes, now = new Date()) {
  return new Date(now.getTime() + minutes * 60_000).toISOString();
}

function waitMinutes(patient, now = new Date()) {
  const arrivedAt = new Date(patient.arrivalTime).getTime();
  if (!Number.isFinite(arrivedAt)) return 0;
  return Math.max(0, Math.round((now.getTime() - arrivedAt) / 60_000));
}

function vital(minutes, overrides: any = {}, now = undefined) {
  return {
    hr: 88,
    sbp: 126,
    dbp: 78,
    spo2: 98,
    temp: 36.8,
    rr: 16,
    gcs: 15,
    pain: 4,
    recordedAt: minutesAgo(minutes, now),
    recordedBy: overrides.recordedBy || 's2',
    ...overrides,
  };
}

function event(patientId, to, minutes, note, from = 'Arrival', staffId = 's3', now) {
  return {
    id: `evt-${patientId}-${to}-${minutes}`,
    from,
    to,
    timestamp: minutesAgo(minutes, now),
    staffId,
    note,
  };
}

function patient(input, now) {
  const latestVitals = input.vitals || vital(input.arrivalMinutes - 4, {}, now);
  const patientId = input.id;
  return {
    id: patientId,
    mrn: input.mrn || `ED-${patientId.slice(-3).toUpperCase()}`,
    firstName: input.firstName,
    lastName: input.lastName,
    dob: input.dob || '1975-01-01',
    age: input.age,
    sex: input.sex || 'F',
    arrivalTime: minutesAgo(input.arrivalMinutes, now),
    triageTime: minutesAgo(Math.max(1, input.arrivalMinutes - 8), now),
    lastAssessedTime: minutesAgo(Math.max(1, input.lastAssessedMinutes ?? input.arrivalMinutes - 12), now),
    chiefComplaint: input.chiefComplaint,
    complaintCategory: input.complaintCategory,
    state: input.state,
    priority: input.priority,
    vitals: [latestVitals],
    flags: input.flags || [],
    assignedStaffId: input.assignedStaffId || null,
    roomId: input.roomId || null,
    notes: input.notes || [],
    timeline: input.timeline || [
      event(patientId, input.state, Math.max(1, input.arrivalMinutes - 5), input.timelineNote || `${input.state} workflow started.`, 'Arrival', input.assignedStaffId || 's3', now),
    ],
  };
}

const BASE_PATIENTS = Object.freeze([
  {
    id: 'pt-chest-pain',
    mrn: 'ED-400101',
    firstName: 'Marcus',
    lastName: 'Chen',
    age: 59,
    sex: 'M',
    arrivalMinutes: 72,
    chiefComplaint: 'Chest pain radiating to left arm',
    complaintCategory: 'Cardiac',
    state: 'Assessment',
    priority: 'P2',
    flags: ['HighRisk'],
    assignedStaffId: 's1',
    roomId: 'r3',
    vitals: vital(48, { hr: 104, sbp: 148, dbp: 92, spo2: 96, pain: 7 }),
    timelineNote: 'Chest pain pathway started; repeat ECG pending.',
  },
  {
    id: 'pt-asthma',
    mrn: 'ED-400102',
    firstName: 'Sarah',
    lastName: 'Okafor',
    age: 35,
    sex: 'F',
    arrivalMinutes: 40,
    chiefComplaint: 'Shortness of breath and wheeze',
    complaintCategory: 'Respiratory',
    state: 'Orders',
    priority: 'P3',
    assignedStaffId: 's2',
    roomId: 'r7',
    vitals: vital(32, { hr: 112, sbp: 118, dbp: 76, spo2: 93, rr: 24, pain: 5 }),
  },
  {
    id: 'pt-sepsis',
    mrn: 'ED-400103',
    firstName: 'Dorothy',
    lastName: 'Walsh',
    age: 76,
    sex: 'F',
    arrivalMinutes: 128,
    chiefComplaint: 'Confusion and fever',
    complaintCategory: 'Sepsis',
    state: 'Results',
    priority: 'P2',
    flags: ['DeteriorationRisk', 'ReassessmentDue'],
    assignedStaffId: 's1',
    roomId: 'r2',
    vitals: vital(22, { hr: 118, sbp: 88, dbp: 54, spo2: 94, temp: 38.9, rr: 22, gcs: 13, pain: 3 }),
    timelineNote: 'Lactate resulted; sepsis bundle review required.',
  },
  {
    id: 'pt-abdo',
    mrn: 'ED-400104',
    firstName: 'James',
    lastName: 'Tremblay',
    age: 46,
    sex: 'M',
    arrivalMinutes: 56,
    chiefComplaint: 'Right lower quadrant abdominal pain',
    complaintCategory: 'Abdominal',
    state: 'Waiting',
    priority: 'P3',
    flags: ['ReassessmentDue'],
    assignedStaffId: 's3',
    vitals: vital(50, { hr: 96, sbp: 124, dbp: 80, temp: 37.9, pain: 8 }),
  },
  {
    id: 'pt-peds-fever',
    mrn: 'ED-400105',
    firstName: 'Amara',
    lastName: 'Singh',
    age: 6,
    sex: 'F',
    arrivalMinutes: 24,
    chiefComplaint: 'Fever and increased work of breathing',
    complaintCategory: 'Pediatric',
    state: 'Triage',
    priority: 'P2',
    assignedStaffId: 's2',
    vitals: vital(18, { hr: 142, sbp: 98, dbp: 62, spo2: 95, temp: 39.8, rr: 34, pain: 6 }),
  },
  {
    id: 'pt-laceration',
    mrn: 'ED-400106',
    firstName: 'Evan',
    lastName: 'MacDonald',
    age: 28,
    sex: 'M',
    arrivalMinutes: 34,
    chiefComplaint: 'Forearm laceration',
    complaintCategory: 'Trauma',
    state: 'Waiting',
    priority: 'P4',
    assignedStaffId: 's4',
    vitals: vital(28, { hr: 84, sbp: 126, dbp: 78, pain: 6 }),
  },
  {
    id: 'pt-psych-boarder',
    mrn: 'ED-400107',
    firstName: 'Alyssa',
    lastName: 'Green',
    age: 25,
    sex: 'F',
    arrivalMinutes: 218,
    chiefComplaint: 'Psychiatric hold, suicidal ideation, medically stable',
    complaintCategory: 'Mental Health',
    state: 'Disposition',
    priority: 'P3',
    flags: ['PendingAdmission', 'LongWait'],
    assignedStaffId: 's2',
    roomId: 'r12',
    vitals: vital(65, { hr: 90, sbp: 122, dbp: 78, pain: 0 }),
    timelineNote: 'Awaiting inpatient mental health bed.',
  },
]);

const EXTRA_PATIENTS = Object.freeze({
  gastro: {
    id: 'pt-gastro',
    mrn: 'ED-400108',
    firstName: 'Luis',
    lastName: 'Martinez',
    age: 41,
    sex: 'M',
    arrivalMinutes: 70,
    chiefComplaint: 'Vomiting and dehydration',
    complaintCategory: 'GI',
    state: 'Waiting',
    priority: 'P3',
    flags: ['LongWait'],
    assignedStaffId: 's4',
    vitals: vital(62, { hr: 106, sbp: 110, dbp: 68, pain: 6 }),
  },
  elderlyFall: {
    id: 'pt-elderly-fall',
    mrn: 'ED-400109',
    firstName: 'Helen',
    lastName: 'Kowalski',
    age: 83,
    sex: 'F',
    arrivalMinutes: 112,
    chiefComplaint: 'Fall on anticoagulants, head strike',
    complaintCategory: 'Trauma',
    state: 'Waiting',
    priority: 'P2',
    flags: ['HighRisk', 'ReassessmentDue'],
    assignedStaffId: 's3',
    vitals: vital(92, { hr: 98, sbp: 152, dbp: 84, gcs: 15, pain: 7 }),
  },
  strokeWaiting: {
    id: 'pt-stroke-wait',
    mrn: 'ED-400110',
    firstName: 'Robert',
    lastName: 'Baptiste',
    age: 64,
    sex: 'M',
    arrivalMinutes: 38,
    chiefComplaint: 'New facial droop and slurred speech',
    complaintCategory: 'Neuro/Stroke',
    state: 'Waiting',
    priority: 'P1',
    flags: ['HighRisk', 'DeteriorationRisk', 'ReassessmentDue'],
    assignedStaffId: 's1',
    vitals: vital(32, { hr: 92, sbp: 204, dbp: 112, gcs: 14, pain: 2 }),
  },
  dkaWaiting: {
    id: 'pt-dka-wait',
    mrn: 'ED-400111',
    firstName: 'Nadia',
    lastName: 'Farah',
    age: 22,
    sex: 'F',
    arrivalMinutes: 64,
    chiefComplaint: 'Vomiting, glucose 31 mmol/L, ketones positive',
    complaintCategory: 'Endocrine',
    state: 'Waiting',
    priority: 'P2',
    flags: ['HighRisk', 'ReassessmentDue'],
    assignedStaffId: 's2',
    vitals: vital(55, { hr: 126, sbp: 104, dbp: 66, rr: 28, pain: 5 }),
  },
  boarderCopd: {
    id: 'pt-copd-boarder',
    mrn: 'ED-400112',
    firstName: 'Arthur',
    lastName: 'Miller',
    age: 72,
    sex: 'M',
    arrivalMinutes: 410,
    chiefComplaint: 'COPD exacerbation, admitted to medicine',
    complaintCategory: 'Respiratory',
    state: 'Admission',
    priority: 'P2',
    flags: ['PendingAdmission', 'LongWait'],
    assignedStaffId: 's1',
    roomId: 'r5',
    vitals: vital(80, { hr: 108, sbp: 146, dbp: 82, spo2: 91, rr: 26, pain: 4 }),
  },
  boarderChf: {
    id: 'pt-chf-boarder',
    mrn: 'ED-400113',
    firstName: 'Mei',
    lastName: 'Wong',
    age: 68,
    sex: 'F',
    arrivalMinutes: 520,
    chiefComplaint: 'Heart failure, admitted to telemetry',
    complaintCategory: 'Cardiac',
    state: 'Admission',
    priority: 'P2',
    flags: ['PendingAdmission', 'LongWait', 'ReassessmentDue'],
    assignedStaffId: 's5',
    roomId: 'r8',
    vitals: vital(44, { hr: 102, sbp: 138, dbp: 86, spo2: 90, rr: 24, pain: 2 }),
  },
  unknown: {
    id: 'pt-unknown',
    mrn: 'TEMP-EMS-9931',
    firstName: 'Unknown',
    lastName: 'EMS Patient',
    age: 54,
    sex: 'Other',
    arrivalMinutes: 8,
    chiefComplaint: 'Unknown identity, reduced level of consciousness',
    complaintCategory: 'Unknown Intake',
    state: 'Registration',
    priority: 'P1',
    flags: ['EMSArrival', 'HighRisk', 'DeteriorationRisk', 'ReassessmentDue'],
    assignedStaffId: 's3',
    roomId: 'r1',
    vitals: vital(4, { hr: 132, sbp: 92, dbp: 58, spo2: 89, rr: 30, gcs: 9, pain: 0, recordedBy: 'ems' }),
    timelineNote: 'Temporary identity created; registration and clinical team reconciling identity.',
  },
  provincialConflict: {
    id: 'pt-data-conflict',
    mrn: 'ED-400114',
    firstName: 'Grace',
    lastName: 'Lavoie',
    age: 67,
    sex: 'F',
    arrivalMinutes: 44,
    chiefComplaint: 'Cellulitis with medication allergy discrepancy',
    complaintCategory: 'Infection',
    state: 'Assessment',
    priority: 'P3',
    flags: ['HighRisk', 'ReassessmentDue'],
    assignedStaffId: 's5',
    roomId: 'r9',
    vitals: vital(18, { hr: 104, sbp: 134, dbp: 78, temp: 38.4, pain: 6 }),
    timelineNote: 'Provincial profile conflicts with local allergy list; pharmacist review requested.',
  },
});

const SCENARIO_PATIENT_KEYS = Object.freeze({
  'normal-day': [],
  'high-volume-day': ['gastro', 'elderlyFall'],
  'ems-surge': ['elderlyFall', 'strokeWaiting'],
  'boarding-crisis': ['boarderCopd', 'boarderChf', 'gastro'],
  'reassessment-backlog': ['gastro', 'elderlyFall', 'dkaWaiting'],
  'capacity-red': ['gastro', 'elderlyFall', 'strokeWaiting', 'dkaWaiting', 'boarderCopd', 'boarderChf'],
  'multiple-high-risk-waiting': ['elderlyFall', 'strokeWaiting', 'dkaWaiting'],
  'unknown-patient-intake': ['unknown', 'elderlyFall'],
  'provincial-data-conflict': ['provincialConflict', 'gastro'],
});

function scenarioPatients(id, now) {
  const base = BASE_PATIENTS.map((row) => patient(row, now));
  const extras = (SCENARIO_PATIENT_KEYS[id] || []).map((key) => patient(EXTRA_PATIENTS[key], now));
  let patients = [...base, ...extras];

  if (id === 'reassessment-backlog') {
    patients = patients.map((row) =>
      ['pt-asthma', 'pt-abdo', 'pt-sepsis', 'pt-gastro', 'pt-elderly-fall', 'pt-dka-wait'].includes(row.id)
        ? { ...row, flags: Array.from(new Set([...row.flags, 'ReassessmentDue'])) }
        : row
    );
  }

  if (id === 'boarding-crisis' || id === 'capacity-red') {
    patients = patients.map((row) =>
      row.id === 'pt-psych-boarder'
        ? { ...row, state: 'Admission', flags: Array.from(new Set([...row.flags, 'PendingAdmission'])) }
        : row
    );
  }

  return dedupePatientsByMrn(patients);
}

function buildRooms(patients, id) {
  const roomDefs = [
    ['r1', 'Resus 1', 'Resus'],
    ['r2', 'Resus 2', 'Resus'],
    ['r3', 'Treatment 3', 'Treatment'],
    ['r4', 'Treatment 4', 'Treatment'],
    ['r5', 'Treatment 5', 'Treatment'],
    ['r6', 'Treatment 6', 'Treatment'],
    ['r7', 'Treatment 7', 'Treatment'],
    ['r8', 'Treatment 8', 'Treatment'],
    ['r9', 'Treatment 9', 'Treatment'],
    ['r10', 'Treatment 10', 'Treatment'],
    ['r11', 'Fast Track 1', 'Treatment'],
    ['r12', 'Mental Health Hold', 'Isolation'],
    ['r13', 'Isolation 1', 'Isolation'],
    ['r14', 'Waiting Area A', 'Waiting'],
    ['r15', 'Waiting Area B', 'Waiting'],
  ];
  const patientByRoom = new Map(patients.filter((row) => row.roomId).map((row) => [row.roomId, row.id]));
  const blocked = new Set(['capacity-red', 'boarding-crisis'].includes(id) ? ['r6', 'r10', 'r13'] : ['r10']);
  return roomDefs.map(([roomId, name, type]) => {
    const patientId = patientByRoom.get(roomId);
    return {
      id: roomId,
      name,
      type,
      status: blocked.has(roomId) ? 'Blocked' : patientId ? 'Occupied' : 'Available',
      ...(patientId ? { patientId } : {}),
    };
  });
}

function buildCapacity(patients, rooms, emsArrivals) {
  const occupiedRooms = rooms.filter((room) => room.status === 'Occupied').length;
  const boardingCount = patients.filter((row) => row.state === 'Admission' || row.flags.includes('PendingAdmission')).length;
  const reassessmentDue = patients.filter((row) => row.flags.includes('ReassessmentDue')).length;
  const blockedRooms = rooms.filter((room) => room.status === 'Blocked').length;
  const waitingCount = patients.filter((row) => row.state === 'Waiting').length;
  const criticalEMS = emsArrivals.filter((arrival) => arrival.severity === 'Critical' && arrival.status !== 'Complete').length;
  const pressure = Math.min(100, Math.round((occupiedRooms / rooms.length) * 56 + boardingCount * 7 + reassessmentDue * 4 + blockedRooms * 6 + waitingCount * 3 + criticalEMS * 5));
  const band = pressure >= 84 ? 'Red' : pressure >= 68 ? 'Orange' : pressure >= 48 ? 'Yellow' : 'Green';
  return {
    score: pressure,
    band,
    totalPatients: patients.length,
    occupiedRooms,
    boardingCount,
    reassessmentDue,
    updatedAt: new Date().toISOString(),
  };
}

function emsArrival(input, now = new Date()) {
  const estimatedArrivalTime = input.status === 'Inbound' ? minutesFromNow(input.eta, now) : minutesAgo(input.arrivedAgo || 6, now);
  return {
    id: input.id,
    patientId: input.patientId,
    unitId: input.unitId,
    unitName: input.unitName,
    crewNames: input.crewNames || ['Paramedic A', 'Paramedic B'],
    patientAge: input.patientAge,
    patientSex: input.patientSex || 'Unknown',
    chiefComplaint: input.chiefComplaint,
    mechanismOfInjury: input.mechanismOfInjury,
    vitals: input.vitals,
    eta: input.status === 'Inbound' ? input.eta : 0,
    severity: input.severity,
    dispatchTime: minutesAgo(input.dispatchAgo || 14, now),
    estimatedArrivalTime,
    notes: input.notes,
    arrivedAt: input.status === 'Inbound' ? undefined : minutesAgo(input.arrivedAgo || 6, now),
    handoffCompletedAt: input.handoffCompleted ? minutesAgo(2, now) : undefined,
    status: input.status,
    preparedRoomId: input.preparedRoomId,
    prearrivalComplaint: input.chiefComplaint,
    priority: input.priority,
    handoffSummary: input.notes,
  };
}

function buildEmsArrivals(id, patients, now) {
  const base = [
    emsArrival({
      id: 'ems-cardiac-501',
      unitId: 'EMS-501',
      unitName: 'Medic 501',
      patientAge: 58,
      patientSex: 'Male',
      chiefComplaint: 'Crushing chest pain with diaphoresis',
      vitals: vital(2, { hr: 118, sbp: 164, dbp: 94, spo2: 95, rr: 24, pain: 8, recordedBy: 'ems' }, now),
      eta: 14,
      severity: 'High',
      status: 'Inbound',
      priority: 'P2',
      notes: 'Aspirin given by crew; ECG transmitted with anterior changes.',
      preparedRoomId: 'r1',
    }, now),
  ];

  if (id === 'ems-surge' || id === 'capacity-red' || id === 'unknown-patient-intake') {
    base.push(
      emsArrival({
        id: 'ems-stroke-214',
        unitId: 'EMS-214',
        unitName: 'Medic 214',
        patientAge: 71,
        patientSex: 'Female',
        chiefComplaint: 'Possible stroke, last known well 35 minutes',
        vitals: vital(1, { hr: 108, sbp: 190, dbp: 104, spo2: 95, gcs: 12, recordedBy: 'ems' }, now),
        eta: 6,
        severity: 'Critical',
        status: 'Inbound',
        priority: 'P1',
        notes: 'Stroke alert requested; CT and resus notified.',
        preparedRoomId: 'r2',
      }, now),
      emsArrival({
        id: 'ems-resp-612',
        unitId: 'EMS-612',
        unitName: 'Medic 612',
        patientAge: 66,
        patientSex: 'Male',
        chiefComplaint: 'Severe shortness of breath on CPAP',
        vitals: vital(12, { hr: 124, sbp: 156, dbp: 88, spo2: 88, rr: 32, pain: 4, recordedBy: 'ems' }, now),
        severity: 'High',
        status: 'Arrived',
        priority: 'P2',
        arrivedAgo: 18,
        notes: 'Crew waiting for monitored bay; offload target breached.',
      }, now)
    );
  }

  const unknown = patients.find((row) => row.id === 'pt-unknown');
  if (unknown) {
    base.push(
      emsArrival({
        id: 'ems-unknown-9931',
        patientId: unknown.id,
        unitId: 'EMS-993',
        unitName: 'Medic 993',
        patientAge: unknown.age,
        patientSex: 'Unknown',
        chiefComplaint: 'Unknown identity, reduced LOC after being found down',
        vitals: vital(4, { hr: 132, sbp: 92, dbp: 58, spo2: 89, rr: 30, gcs: 9, recordedBy: 'ems' }, now),
        severity: 'Critical',
        status: 'Handoff',
        priority: 'P1',
        arrivedAgo: 8,
        notes: 'No wallet or health card; temporary MRN created.',
        preparedRoomId: 'r1',
      }, now)
    );
  }

  return base;
}

function buildQueueRows(patients, now) {
  const queueDefs = [
    ['Waiting', 'Waiting', 45, (row) => row.state === 'Waiting'],
    ['Triage', 'Triage', 15, (row) => row.state === 'Triage'],
    ['Assessment', 'Assessment', 30, (row) => row.state === 'Assessment'],
    ['Orders', 'Orders', 45, (row) => row.state === 'Orders'],
    ['Results', 'Results', 60, (row) => row.state === 'Results'],
    ['Admission', 'Admission', 120, (row) => row.state === 'Admission' || row.flags.includes('PendingAdmission')],
    ['Reassessment', 'Reassessment', 30, (row) => row.flags.includes('ReassessmentDue')],
  ];
  return queueDefs.map(([id, label, targetMinutes, predicate]) => {
    const queuedPatients = patients.filter(predicate);
    const oldestWaitMinutes = queuedPatients.reduce((max, row) => Math.max(max, waitMinutes(row, now)), 0);
    return {
      id: `queue-${String(id).toLowerCase()}`,
      type: id,
      label,
      name: label,
      count: queuedPatients.length,
      patients: queuedPatients,
      patientIds: queuedPatients.map((row) => row.id),
      target: targetMinutes,
      targetMinutes,
      targetWaitMinutes: targetMinutes,
      oldestWaitMinutes,
      longestWaitMinutes: oldestWaitMinutes,
      averageWaitMinutes: queuedPatients.length
        ? Math.round(queuedPatients.reduce((sum, row) => sum + waitMinutes(row, now), 0) / queuedPatients.length)
        : 0,
      criticalCount: queuedPatients.filter((row) => row.priority === 'P1' || row.priority === 'P2' || row.flags.includes('HighRisk')).length,
      breached: oldestWaitMinutes > targetMinutes,
      updatedAt: now.toISOString(),
    };
  });
}

function buildAlerts(patients, capacity, emsArrivals, scenario, now) {
  const alerts = [] as any[];
  patients
    .filter((row) => row.priority === 'P1' || row.flags.includes('DeteriorationRisk'))
    .slice(0, 4)
    .forEach((row, index) => {
      alerts.push({
        id: `alert-${scenario.id}-${row.id}`,
        severity: row.priority === 'P1' ? 'Critical' : 'Warning',
        title: row.priority === 'P1' ? 'Immediate attention required' : 'High-risk patient',
        message: `${row.firstName} ${row.lastName} (${row.complaintCategory}) needs command review.`,
        patientId: row.id,
        createdAt: minutesAgo(6 + index * 4, now),
        dismissed: false,
      });
    });
  if (capacity.band === 'Red') {
    alerts.unshift({
      id: `alert-${scenario.id}-capacity-red`,
      severity: 'Critical',
      title: 'Capacity red',
      message: 'Department capacity is red; review boarders, blocked rooms, EMS arrivals, and discharge opportunities.',
      createdAt: minutesAgo(3, now),
      dismissed: false,
    });
  }
  if (emsArrivals.some((arrival) => arrival.severity === 'Critical')) {
    alerts.unshift({
      id: `alert-${scenario.id}-ems-critical`,
      severity: 'Critical',
      title: 'Critical EMS inbound',
      message: 'Critical EMS pre-arrival requires room, team, and diagnostic readiness.',
      createdAt: minutesAgo(2, now),
      dismissed: false,
    });
  }
  return alerts;
}

function buildAnalytics(patients, queues, capacity, scenario, now) {
  const topComplaints = [...patients.reduce((counts, row) => {
    counts.set(row.complaintCategory, (counts.get(row.complaintCategory) || 0) + 1);
    return counts;
  }, new Map())].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const arrivalMultiplier = scenario.id === 'high-volume-day' ? 2 : scenario.id === 'ems-surge' ? 1.7 : scenario.id === 'normal-day' ? 0.8 : 1.3;
  return {
    source: 'scenario-fixture',
    generatedAt: now.toISOString(),
    scenarioId: scenario.id,
    queuePerformance: queues.map((queue) => ({
      id: queue.id,
      type: queue.type,
      name: queue.name,
      avgWaitMinutes: queue.averageWaitMinutes,
      yesterdayAvgWaitMinutes: Math.max(0, Math.round(queue.averageWaitMinutes * 0.82)),
      throughputCount: queue.count,
    })),
    operationalCommand: {
      dailyVolume: Array.from({ length: 7 }, (_, index) => ({
        date: new Date(now.getTime() - (6 - index) * 86_400_000).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        count: Math.max(4, Math.round((patients.length + index - 2) * arrivalMultiplier)),
      })),
      hourlyArrivals: Array.from({ length: 24 }, (_, hour) => ({
        hour: `${String(hour).padStart(2, '0')}:00`,
        count: hour >= 9 && hour <= 21 ? Math.max(0, Math.round((hour % 4) * arrivalMultiplier + (scenario.id === 'ems-surge' ? 1 : 0))) : 0,
      })),
      waitTrend: Array.from({ length: 7 }, (_, index) => ({
        date: new Date(now.getTime() - (6 - index) * 86_400_000).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        avgWaitMinutes: Math.max(8, Math.round((queues[0]?.averageWaitMinutes || 20) * (0.7 + index * 0.06))),
      })),
      topComplaints,
    },
  };
}

function buildProvincialHealth(id, patients) {
  if (id !== 'provincial-data-conflict') {
    return {
      connectorStatus: 'demo-ready',
      jurisdiction: 'Ontario',
      records: patients.slice(0, 2).map((row) => ({
        patientId: row.id,
        mrn: row.mrn,
        medications: ['No provincial medication conflicts returned'],
        allergies: ['No provincial allergy conflicts returned'],
        conflict: false,
      })),
    };
  }

  const conflictPatient = patients.find((row) => row.id === 'pt-data-conflict');
  return {
    connectorStatus: 'conflict-review',
    jurisdiction: 'Ontario',
    records: [
      {
        patientId: conflictPatient?.id || 'pt-data-conflict',
        mrn: conflictPatient?.mrn || 'ED-400114',
        medications: ['Provincial: warfarin active', 'Local intake: patient reports no anticoagulants'],
        allergies: ['Provincial: cefazolin anaphylaxis', 'Local intake: no known drug allergies'],
        conflict: true,
        requiredAction: 'Human reconciliation before medication decisions.',
      },
    ],
  };
}

function buildCopilotContext(patients, capacity, emsArrivals, queues, scenario, provincialHealth) {
  const activePatients = patients.filter((row) => row.state !== 'Discharge');
  const highRiskPatients = activePatients.filter((row) => row.priority === 'P1' || row.priority === 'P2' || row.flags.includes('HighRisk') || row.flags.includes('DeteriorationRisk'));
  const reassessmentQueue = activePatients.filter((row) => row.flags.includes('ReassessmentDue'));
  return {
    scenarioId: scenario.id,
    scenarioLabel: scenario.label,
    patientCount: activePatients.length,
    highRiskCount: highRiskPatients.length,
    capacity,
    emsInboundCount: emsArrivals.filter((arrival) => arrival.status === 'Inbound').length,
    reassessmentQueueCount: reassessmentQueue.length,
    boardingCount: activePatients.filter((row) => row.state === 'Admission' || row.flags.includes('PendingAdmission')).length,
    queueSummary: queues.map((queue) => `${queue.label}: ${queue.count}`).join(', '),
    dataConflictCount: provincialHealth.records.filter((record) => record.conflict).length,
    focus: scenario.description,
  };
}

export function buildEdScenarioFixture(scenarioId = DEFAULT_ED_SCENARIO_ID, options: any = {}) {
  const scenario = SCENARIO_BY_ID.get(scenarioId) || SCENARIO_BY_ID.get(DEFAULT_ED_SCENARIO_ID);
  const now = options.now || new Date();
  if (scenario!.id === FIRST_CUSTOMER_DEMO_MODE.id) {
    return buildFirstCustomerEdScenarioFixture(now);
  }
  const patients = scenarioPatients(scenario!.id, now);
  const emsArrivals = buildEmsArrivals(scenario!.id, patients, now);
  const rooms = buildRooms(patients, scenario!.id);
  const capacity = buildCapacity(patients, rooms, emsArrivals);
  const queues = buildQueueRows(patients, now);
  const provincialHealth = buildProvincialHealth(scenario!.id, patients);
  const analytics = buildAnalytics(patients, queues, capacity, scenario, now);
  const reassessmentPatients = patients.filter((row) => row.flags.includes('ReassessmentDue'));
  const boardingPatients = patients.filter((row) => row.state === 'Admission' || row.flags.includes('PendingAdmission'));
  const alerts = buildAlerts(patients, capacity, emsArrivals, scenario, now);
  const copilotContext = buildCopilotContext(patients, capacity, emsArrivals, queues, scenario, provincialHealth);

  return {
    ...scenario,
    loadedAt: now.toISOString(),
    staff: clone(STAFF),
    rooms,
    patients,
    alerts,
    emsArrivals,
    emsUnits: emsArrivals.map((arrival) => ({
      id: `unit-${arrival.unitId}`,
      callSign: arrival.unitId,
      status: arrival.status === 'Inbound' ? 'Inbound' : 'AtHospital',
      lastKnownLocation: arrival.status === 'Inbound' ? 'En route to ED' : 'Ambulance bay',
      activeArrivalId: arrival.id,
    })),
    queues,
    capacity,
    reassessment: {
      patients: reassessmentPatients,
      overdueCount: reassessmentPatients.filter((row) => waitMinutes(row, now) > 45 || row.priority === 'P1').length,
      nextAction: reassessmentPatients[0] ? `Reassess ${reassessmentPatients[0].firstName} ${reassessmentPatients[0].lastName}` : 'Review queue',
    },
    boarding: {
      patients: boardingPatients,
      longestBoardingMinutes: boardingPatients.reduce((max, row) => Math.max(max, waitMinutes(row, now)), 0),
      escalation: boardingPatients.length >= 3 ? 'Escalate bed management and inpatient flow lead.' : 'Monitor admitted patients.',
    },
    analytics,
    provincialHealth,
    copilotContext,
    unknownIntake: {
      active: scenario!.id === 'unknown-patient-intake',
      temporaryMrn: patients.find((row) => row.id === 'pt-unknown')?.mrn || null,
      requiredAction: 'Complete identity reconciliation and merge only after human verification.',
    },
  };
}

function buildFirstCustomerEdScenarioFixture(now) {
  const demo = buildFirstCustomerDemoMode(now);
  const scenario = SCENARIO_BY_ID.get(FIRST_CUSTOMER_DEMO_MODE.id);
  const state = {
    ...demo.simple,
    demoMode: {
      ...demo.simple.demoMode,
      emsArrivals: demo.simple.emsArrivals,
      analytics: demo.simple.analytics,
    },
  };
  const queues = (buildFirstCustomerDemoApiEnvelope('queues', state, now) as any).data.queues;
  const reassessment = (buildFirstCustomerDemoApiEnvelope('reassessment', state, now) as any).data;
  const boarding = (buildFirstCustomerDemoApiEnvelope('boarding', state, now) as any).data;
  const copilot = (buildFirstCustomerDemoApiEnvelope('copilot', state, now) as any).data;

  return {
    ...scenario,
    loadedAt: demo.metadata.generatedAt,
    tenantName: demo.metadata.tenantName,
    patientVolumePerDay: demo.metadata.patientVolumePerDay,
    activeCensus: demo.metadata.activeCensus,
    staff: demo.simple.staff,
    rooms: demo.simple.rooms,
    patients: demo.simple.patients,
    alerts: demo.simple.alerts,
    emsArrivals: demo.simple.emsArrivals,
    emsUnits: demo.root.emsUnits.map((unit) => ({
      id: unit.id,
      callSign: unit.callSign,
      status: unit.status,
      lastKnownLocation: unit.lastKnownLocation,
      activeArrivalId: unit.activeArrivalId,
    })),
    queues,
    capacity: demo.simple.capacity,
    reassessment,
    boarding,
    analytics: demo.simple.analytics,
    provincialHealth: {
      connectorStatus: 'demo-ready',
      jurisdiction: 'Demo',
      records: [],
    },
    copilotContext: {
      ...copilot.promptContext,
      scenarioId: FIRST_CUSTOMER_DEMO_MODE.id,
      scenarioLabel: FIRST_CUSTOMER_DEMO_MODE.label,
      capacity: demo.simple.capacity,
    },
    firstCustomerDemo: demo.metadata,
    unknownIntake: {
      active: false,
      temporaryMrn: null,
      requiredAction: 'Load the department walkthrough dataset for deterministic customer walkthroughs.',
    },
  };
}

export function getInitialEdScenarioId() {
  if (typeof window === 'undefined') return DEFAULT_ED_SCENARIO_ID;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return SCENARIO_BY_ID.has(stored as any) ? stored as any : DEFAULT_ED_SCENARIO_ID;
  } catch {
    return DEFAULT_ED_SCENARIO_ID;
  }
}

export function persistEdScenarioId(scenarioId) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, SCENARIO_BY_ID.has(scenarioId) ? scenarioId : DEFAULT_ED_SCENARIO_ID);
  } catch {
    // Non-browser test environments can reject localStorage access.
  }
}

export function getEdScenarioMeta(scenarioId) {
  return SCENARIO_BY_ID.get(scenarioId) || SCENARIO_BY_ID.get(DEFAULT_ED_SCENARIO_ID);
}

export function buildEmergencyScenarioModuleEnvelope(moduleName, scenarioId = getInitialEdScenarioId() as any) {
  const scenario = buildEdScenarioFixture(scenarioId);
  const dataByModule = {
    whiteboard: {
      scenario,
      patients: scenario.patients,
      staff: scenario.staff,
      rooms: scenario.rooms,
      alerts: scenario.alerts,
      capacity: scenario.capacity,
    },
    patients: { scenario, patients: scenario.patients },
    journey: {
      scenario,
      events: scenario.patients.flatMap((row) =>
        row.timeline.map((item) => ({
          ...item,
          patientName: `${row.firstName} ${row.lastName}`,
        }))
      ),
      stateCounts: scenario.patients.reduce((counts, row) => {
        counts[row.state] = (counts[row.state] || 0) + 1;
        return counts;
      }, {}),
    },
    ems: { scenario, arrivals: scenario.emsArrivals, units: scenario.emsUnits, patients: scenario.patients.filter((row) => row.flags.includes('EMSArrival')) },
    queues: { scenario, queues: scenario.queues },
    reassessment: { scenario, ...scenario.reassessment },
    capacity: { scenario, capacity: scenario.capacity, rooms: scenario.rooms, recommendations: capacityRecommendations(scenario) },
    boarding: { scenario, ...scenario.boarding },
    provincialHealth: { scenario, ...scenario.provincialHealth },
    copilot: { scenario, promptContext: scenario.copilotContext, quickActions: ['Who needs attention?', 'Capacity status', 'EMS update', 'Reassessment queue'] },
    analytics: scenario.analytics,
  };

  return {
    source: 'scenario-fixture',
    generatedAt: scenario.loadedAt,
    scenarioId: scenario.id,
    scenarioLabel: scenario.label,
    data: dataByModule[moduleName] || { scenario },
  };
}

function capacityRecommendations(scenario) {
  const recommendations = [] as any[];
  if (scenario.capacity.band === 'Red') recommendations.push('Open escalation huddle for bed management, charge nurse, and physician lead.');
  if (scenario.boarding.patients.length) recommendations.push('Prioritize admitted boarders for inpatient handoff and hallway safety review.');
  if (scenario.emsArrivals.some((arrival) => arrival.status === 'Inbound')) recommendations.push('Reserve resus or monitored bay for inbound EMS acuity.');
  if (scenario.reassessment.patients.length) recommendations.push('Assign a nurse to clear overdue reassessment flags before new low-acuity tasks.');
  return recommendations.length ? recommendations : ['Continue routine flow monitoring and reassessment cadence.'];
}

export function buildSrcEmergencyScenarioState(scenarioId = getInitialEdScenarioId() as any) {
  const scenario = buildEdScenarioFixture(scenarioId);
  return {
    activeScenarioId: scenario.id,
    activeScenario: {
      id: scenario.id,
      label: scenario.label,
      shortLabel: scenario.shortLabel,
      description: scenario.description,
      loadedAt: scenario.loadedAt,
    },
    patients: scenario.patients,
    staff: scenario.staff,
    rooms: scenario.rooms,
    capacity: scenario.capacity,
    alerts: scenario.alerts,
    emsArrivals: scenario.emsArrivals,
    queues: scenario.queues,
    scenarioData: scenario,
  };
}

function rootFlag(flag, detectedAt) {
  const severity = flag === 'DeteriorationRisk' || flag === 'HighRisk' ? 'Critical' : flag === 'PendingAdmission' || flag === 'EMSArrival' ? 'Info' : 'Warning';
  return {
    type: flag,
    reason: {
      ReassessmentDue: 'Scenario reassessment due',
      DeteriorationRisk: 'Scenario deterioration risk',
      LongWait: 'Scenario long wait',
      HighRisk: 'Scenario high-risk flag',
      PendingAdmission: 'Scenario admission pending',
      EMSArrival: 'Scenario EMS arrival',
      Isolation: 'Scenario isolation precautions',
    }[flag] || 'Scenario flag',
    detectedAt,
    severity,
  };
}

function toRootVitals(vitals) {
  return {
    hr: vitals.hr ?? null,
    bpSystolic: vitals.sbp ?? null,
    bpDiastolic: vitals.dbp ?? null,
    spo2: vitals.spo2 ?? null,
    temp: vitals.temp ?? null,
    rr: vitals.rr ?? null,
    gcs: vitals.gcs ?? null,
    pain: vitals.pain ?? null,
    recordedAt: vitals.recordedAt,
  };
}

function toRootPatient(row) {
  const latestVitals = row.vitals.at(-1);
  return {
    ...row,
    sex: row.sex === 'M' ? 'Male' : row.sex === 'F' ? 'Female' : 'Unknown',
    triageTime: row.triageTime || null,
    lastAssessedTime: row.lastAssessedTime || null,
    vitals: toRootVitals(latestVitals),
    assignedStaffId: rootStaffId(row.assignedStaffId),
    roomId: row.roomId ? rootRoomId(row.roomId) : null,
    flags: row.flags.map((flag) => rootFlag(flag, latestVitals.recordedAt)),
    timeline: row.timeline.map((item) => ({
      id: item.id,
      patientId: row.id,
      type: item.to,
      timestamp: item.timestamp,
      from: item.from,
      to: item.to,
      summary: item.note || `${item.to} workflow started.`,
      staffId: rootStaffId(item.staffId),
    })),
    notes: [],
  };
}

function rootStaffId(staffId) {
  return staffId ? `staff-${staffId}` : null;
}

function rootRoomId(roomId) {
  return `room-${roomId}`;
}

export function buildRootEmergencyScenarioState(scenarioId = getInitialEdScenarioId() as any) {
  if (scenarioId === FIRST_CUSTOMER_DEMO_MODE.id) {
    const demo = buildFirstCustomerDemoMode();
    return {
      activeScenarioId: FIRST_CUSTOMER_DEMO_MODE.id,
      activeScenario: {
        id: FIRST_CUSTOMER_DEMO_MODE.id,
        label: FIRST_CUSTOMER_DEMO_MODE.label,
        shortLabel: 'First customer',
        description:
          'Sales walkthrough fixture for a 100-patient/day ED with active whiteboard, EMS, high-risk waits, reassessments, boarders, capacity, analytics, and ED Copilot context.',
        loadedAt: demo.metadata.generatedAt,
      },
      patients: demo.root.patients,
      staff: demo.root.staff,
      rooms: demo.root.rooms,
      emsArrivals: demo.root.emsArrivals,
      emsUnits: demo.root.emsUnits,
      referrals: demo.root.referrals,
      activeShift: demo.root.activeShift,
      emergencyAnalytics: demo.root.analytics,
      emergencySettings: demo.root.emergencySettings,
      scenarioData: {
        ...demo.metadata,
        analytics: demo.root.analytics.data,
      },
    };
  }
  const scenario = buildEdScenarioFixture(scenarioId);
  const rootPatients = scenario.patients.map(toRootPatient);
  const rootStaff = scenario.staff.map((member) => ({
    id: rootStaffId(member.id),
    firstName: member.name.split(' ')[0],
    lastName: member.name.split(' ').slice(1).join(' ') || member.role,
    name: member.name,
    role: member.role === 'Charge' ? 'ChargeNurse' : member.role === 'MD' ? 'Attending' : member.role === 'RN' ? 'Nurse' : 'Technician',
    status: 'OnShift',
    shiftId: `shift-${scenario.id}`,
    assignedPatientIds: rootPatients.filter((patient) => patient.assignedStaffId === rootStaffId(member.id)).map((patient) => patient.id),
  }));
  const rootRooms = scenario.rooms.map((room) => ({
    id: rootRoomId(room.id),
    name: room.name,
    type: room.type === 'Resus' ? 'Resuscitation' : room.type,
    status: room.status,
    currentPatientId: room.patientId || null,
    isIsolationCapable: room.type === 'Isolation',
  }));
  const rootEmsArrivals = scenario.emsArrivals.map((arrival) => ({
    ...arrival,
    patientSex: arrival.patientSex === 'Male' || arrival.patientSex === 'Female' ? arrival.patientSex : 'Unknown',
    vitals: toRootVitals(arrival.vitals),
    preparedRoomId: arrival.preparedRoomId ? rootRoomId(arrival.preparedRoomId) : undefined,
  }));

  return {
    activeScenarioId: scenario.id,
    activeScenario: {
      id: scenario.id,
      label: scenario.label,
      shortLabel: scenario.shortLabel,
      description: scenario.description,
      loadedAt: scenario.loadedAt,
    },
    patients: rootPatients,
    staff: rootStaff,
    rooms: rootRooms,
    emsArrivals: rootEmsArrivals,
    emsUnits: scenario.emsUnits.map((unit) => ({
      ...unit,
      agency: 'Demo EMS',
      crewStaffIds: [],
    })),
    referrals: [],
    activeShift: {
      id: `shift-${scenario.id}`,
      name: `${scenario.label} demo shift`,
      startTime: minutesAgo(240),
      endTime: minutesFromNow(240),
      status: 'Active',
      chargeStaffId: rootStaffId('s3'),
      staffIds: rootStaff.map((member) => member.id),
      handoffNotes: [],
    },
    emergencyAnalytics: {
      status: 'ready',
      source: 'client-fallback',
      loadedAt: scenario.loadedAt,
      message: `Operational walkthrough dataset: ${scenario.label}`,
      data: scenario.analytics,
    },
    scenarioData: scenario,
  };
}

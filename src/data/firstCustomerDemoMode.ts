import { PRACTITIONER_WALKTHROUGH_ACTIVE_CENSUS } from '../config/practitionerCleanup.constants';
import { dedupePatientsByMrn } from '../utils/patientSeedUtils';

export const FIRST_CUSTOMER_DEMO_MODE = Object.freeze({
  id: 'first-customer-demo-mode',
  label: 'ED-18 Practitioner Walkthrough',
  tenantName: 'Emergency Department 18',
  sourceLabel: 'ED-18 walkthrough dataset',
  patientVolumePerDay: 100,
});

const ACTIVE_DEMO_CENSUS = PRACTITIONER_WALKTHROUGH_ACTIVE_CENSUS;
const DAILY_DISCHARGED_COUNT = FIRST_CUSTOMER_DEMO_MODE.patientVolumePerDay - ACTIVE_DEMO_CENSUS;

const SIMPLE_FLAG_SEVERITY = Object.freeze({
  HighRisk: 'Critical',
  DeteriorationRisk: 'Critical',
  ReassessmentDue: 'Warning',
  LongWait: 'Warning',
  PendingAdmission: 'Warning',
  EMSArrival: 'Info',
  Isolation: 'Warning',
});

const COMPLAINTS = Object.freeze([
  ['Chest Pain', 'Crushing chest pressure with diaphoresis'],
  ['Respiratory', 'Shortness of breath with COPD history'],
  ['Neurologic', 'Right-sided weakness and slurred speech'],
  ['Sepsis', 'Fever, rigors, hypotension concern'],
  ['Abdominal', 'Right lower quadrant abdominal pain'],
  ['Trauma', 'Fall with anticoagulant use'],
  ['Mental Health', 'Suicidal ideation, medically stable'],
  ['Pediatric', 'Fever and increased work of breathing'],
  ['Orthopedic', 'Hip pain after fall'],
  ['Infection', 'Flank pain with fever'],
]);

const DEMO_NAMES = Object.freeze([
  ['Amina', 'Hassan', 67, 'F'],
  ['George', 'Wilson', 74, 'M'],
  ['Priya', 'Mehta', 41, 'F'],
  ['Noah', 'Brooks', 9, 'M'],
  ['Lena', 'Kowalski', 58, 'F'],
  ['Omar', 'Alvarez', 52, 'M'],
  ['Wei', 'Zhang', 83, 'M'],
  ['Maya', 'Patel', 33, 'F'],
  ['Daniel', 'Reed', 46, 'M'],
  ['Fatima', 'Diallo', 29, 'F'],
  ['Hector', 'Rivera', 62, 'M'],
  ['Claire', 'Bennett', 71, 'F'],
  ['Jonas', 'Eriksen', 39, 'M'],
  ['Nadia', 'Farah', 24, 'F'],
  ['Robert', 'Baptiste', 64, 'M'],
  ['Mei', 'Li', 36, 'F'],
  ['Ethan', 'Nguyen', 8, 'M'],
  ['Sofia', 'Martinez', 38, 'F'],
  ['Aarav', 'Patel', 54, 'M'],
  ['Marina', 'Kowalski', 72, 'F'],
  ['James', 'Tremblay', 47, 'M'],
  ['Amara', 'Singh', 6, 'F'],
  ['Luis', 'Martinez', 41, 'M'],
  ['Helen', 'Kowalski', 70, 'F'],
  ['Sarah', 'Okafor', 35, 'F'],
  ['Marcus', 'Chen', 59, 'M'],
  ['Alyssa', 'Green', 25, 'F'],
  ['Evan', 'MacDonald', 28, 'M'],
  ['Dorothy', 'Walsh', 76, 'F'],
  ['Robert', 'Kimani', 49, 'M'],
  ['Grace', 'Morgan', 68, 'F'],
  ['Imani', 'Cole', 31, 'F'],
  ['Felix', 'Hart', 57, 'M'],
  ['Yara', 'Mansour', 44, 'F'],
  ['Oscar', 'Hill', 80, 'M'],
  ['Leah', 'Stone', 19, 'F'],
  ['Samir', 'Nasser', 63, 'M'],
  ['June', 'Carter', 55, 'F'],
  ['Theo', 'Campbell', 42, 'M'],
  ['Ella', 'Martin', 78, 'F'],
  ['Andre', 'Lewis', 43, 'M'],
  ['Nina', 'Park', 51, 'F'],
]);

const STATE_PLAN = Object.freeze([
  ...Array.from({ length: 6 }, () => 'Waiting'),
  ...Array.from({ length: 2 }, () => 'Triage'),
  ...Array.from({ length: 3 }, () => 'Assessment'),
  ...Array.from({ length: 2 }, () => 'Orders'),
  ...Array.from({ length: 1 }, () => 'Results'),
  ...Array.from({ length: 4 }, () => 'Admission'),
]);

function isoMinutesFrom(now, offsetMinutes) {
  return new Date(now.getTime() + offsetMinutes * 60_000).toISOString();
}

function isoMinutesAgo(now, minutes) {
  return isoMinutesFrom(now, -minutes);
}

function dobFromAge(now, age) {
  const date = new Date(now);
  date.setFullYear(date.getFullYear() - age);
  return date.toISOString().slice(0, 10);
}

function stateRoomId(state, stateIndex) {
  if (state === 'Waiting' && stateIndex < 4) return `demo-room-waiting-${(stateIndex % 2) + 1}`;
  if (state === 'Triage') return `demo-room-triage-${(stateIndex % 2) + 1}`;
  if (state === 'Admission') return `demo-room-observation-${(stateIndex % 6) + 1}`;
  if (state === 'Assessment' || state === 'Orders' || state === 'Results') {
    return `demo-room-assessment-${(stateIndex % 18) + 1}`;
  }
  return null;
}

function priorityFor(state, globalIndex, stateIndex) {
  if (state === 'Waiting' && stateIndex < 6) return stateIndex < 2 ? 'P1' : 'P2';
  if (state === 'Triage' && stateIndex < 2) return 'P2';
  if (state === 'Assessment' && stateIndex < 3) return stateIndex === 0 ? 'P1' : 'P2';
  if (state === 'Admission') return stateIndex < 2 ? 'P2' : 'P3';
  return globalIndex % 7 === 0 ? 'P2' : globalIndex % 5 === 0 ? 'P4' : 'P3';
}

function flagsFor(state, priority, globalIndex, stateIndex) {
  const flags = [] as any[];
  if (priority === 'P1' || priority === 'P2') flags.push('HighRisk');
  if (state === 'Waiting' && stateIndex < 6) flags.push('ReassessmentDue');
  if (state === 'Waiting' && stateIndex < 4) flags.push('DeteriorationRisk');
  if (state === 'Waiting' && stateIndex >= 4) flags.push('LongWait');
  if (state !== 'Waiting' && globalIndex % 5 === 0) flags.push('ReassessmentDue');
  if (state === 'Admission') flags.push('PendingAdmission');
  if ([4, 9, 14].includes(globalIndex)) flags.push('EMSArrival');
  if (globalIndex === 7 || globalIndex === 15) flags.push('Isolation');
  return [...new Set(flags)];
}

function buildVitals(now, patient, index) {
  const deteriorating = patient.flags.includes('DeteriorationRisk');
  const p1 = patient.priority === 'P1';
  return {
    hr: deteriorating ? 126 + (index % 4) : 78 + ((index * 7) % 44),
    sbp: deteriorating ? 88 + (index % 3) : 112 + ((index * 5) % 48),
    dbp: deteriorating ? 54 + (index % 5) : 66 + ((index * 3) % 30),
    spo2: deteriorating ? 90 + (index % 3) : 95 + (index % 5),
    temp: patient.complaintCategory === 'Sepsis' ? 38.7 : 36.5 + ((index % 6) / 10),
    rr: p1 ? 24 + (index % 4) : 14 + (index % 10),
    gcs: patient.complaintCategory === 'Neurologic' ? 13 : 15,
    pain: 2 + (index % 8),
    recordedAt: isoMinutesAgo(now, Math.max(4, Math.round(patient.waitMinutes * 0.55))),
    recordedBy: patient.assignedStaffId || 'demo-charge-rn',
  };
}

function buildActivePatientModels(now) {
  const stateCounts = new Map();
  return STATE_PLAN.map((state, index) => {
    const stateIndex = stateCounts.get(state) || 0;
    stateCounts.set(state, stateIndex + 1);
    const [firstName, lastName, age, simpleSex] = DEMO_NAMES[index];
    const [complaintCategory, chiefComplaint] = COMPLAINTS[index % COMPLAINTS.length];
    const waitMinutes =
      state === 'Waiting'
        ? 42 + stateIndex * 7
        : state === 'Admission'
          ? 185 + stateIndex * 34
          : 18 + index * 3;
    const priority = priorityFor(state, index, stateIndex);
    const flags = flagsFor(state, priority, index, stateIndex);
    const roomId = stateRoomId(state, stateIndex);
    const assignedStaffId = ['demo-attending-1', 'demo-charge-rn', 'demo-triage-rn', 'demo-fasttrack-rn'][index % 4];
    const patient = {
      id: `demo-pt-${String(index + 1).padStart(3, '0')}`,
      mrn: `ED-${String(42000 + index).padStart(6, '0')}`,
      firstName,
      lastName,
      age,
      simpleSex,
      rootSex: simpleSex === 'M' ? 'Male' : 'Female',
      dob: dobFromAge(now, age),
      arrivalTime: isoMinutesAgo(now, waitMinutes),
      triageTime: state === 'Waiting' ? isoMinutesAgo(now, waitMinutes - 6) : isoMinutesAgo(now, Math.max(8, waitMinutes - 12)),
      lastAssessedTime:
        flags.includes('ReassessmentDue') || state === 'Waiting'
          ? isoMinutesAgo(now, Math.max(35, Math.round(waitMinutes * 0.7)))
          : isoMinutesAgo(now, 12 + (index % 14)),
      chiefComplaint,
      complaintCategory,
      state,
      priority,
      flags,
      assignedStaffId,
      roomId,
      waitMinutes,
    };
    return { ...patient, vitals: buildVitals(now, patient, index) };
  });
}

function buildDischargedPatientModels(now) {
  return Array.from({ length: DAILY_DISCHARGED_COUNT }, (_, index) => {
    const name = DEMO_NAMES[index % DEMO_NAMES.length];
    const complaint = COMPLAINTS[index % COMPLAINTS.length];
    const arrivalMinutes = 60 + index * 13;
    return {
      id: `demo-discharged-${String(index + 1).padStart(3, '0')}`,
      mrn: `ED-${String(43000 + index).padStart(6, '0')}`,
      firstName: name[0],
      lastName: `${name[1]}${index + 1}`,
      age: name[2],
      simpleSex: name[3],
      rootSex: name[3] === 'M' ? 'Male' : 'Female',
      dob: dobFromAge(now, name[2]),
      arrivalTime: isoMinutesAgo(now, arrivalMinutes),
      triageTime: isoMinutesAgo(now, arrivalMinutes - 8),
      lastAssessedTime: isoMinutesAgo(now, Math.max(15, arrivalMinutes - 34)),
      dischargedAt: isoMinutesAgo(now, Math.max(4, arrivalMinutes - 72)),
      chiefComplaint: complaint[1],
      complaintCategory: complaint[0],
      state: 'Discharge',
      priority: index % 9 === 0 ? 'P2' : index % 3 === 0 ? 'P4' : 'P3',
      flags: [],
      assignedStaffId: null,
      roomId: null,
      waitMinutes: arrivalMinutes,
      vitals: {
        hr: 76 + (index % 32),
        sbp: 112 + (index % 36),
        dbp: 64 + (index % 24),
        spo2: 96 + (index % 4),
        temp: 36.4 + ((index % 5) / 10),
        rr: 14 + (index % 8),
        gcs: 15,
        pain: index % 7,
        recordedAt: isoMinutesAgo(now, Math.max(8, arrivalMinutes - 12)),
        recordedBy: 'demo-fasttrack-rn',
      },
    };
  });
}

function buildSimplePatient(patient) {
  return {
    id: patient.id,
    mrn: patient.mrn,
    firstName: patient.firstName,
    lastName: patient.lastName,
    dob: patient.dob,
    age: patient.age,
    sex: patient.simpleSex === 'M' ? 'M' : 'F',
    arrivalTime: patient.arrivalTime,
    triageTime: patient.triageTime,
    chiefComplaint: patient.chiefComplaint,
    complaintCategory: patient.complaintCategory,
    state: patient.state,
    priority: patient.priority,
    vitals: [{ ...patient.vitals }],
    flags: [...patient.flags],
    assignedStaffId: patient.assignedStaffId || undefined,
    roomId: patient.roomId || undefined,
    notes: [
      {
        id: `note-${patient.id}-demo`,
        text: 'Customer walkthrough patient record. No live clinical data.',
        authorId: patient.assignedStaffId || 'demo-charge-rn',
        timestamp: patient.lastAssessedTime || patient.arrivalTime,
      },
    ],
    timeline: [
      {
        id: `journey-${patient.id}-current`,
        to: patient.state,
        timestamp: patient.arrivalTime,
        staffId: patient.assignedStaffId || 'demo-charge-rn',
        note: `${patient.state} state loaded for customer walkthrough.`,
      },
    ],
  };
}

function buildRootFlag(flag, patient) {
  return {
    type: flag,
    reason:
      flag === 'PendingAdmission'
        ? 'Admitted patient boarding in ED'
        : flag === 'EMSArrival'
          ? 'Converted or active EMS handoff'
          : flag === 'LongWait'
            ? 'Waiting queue exceeds operational target'
            : `${flag} triggered in customer walkthrough`,
    detectedAt: patient.lastAssessedTime || patient.arrivalTime,
    severity: SIMPLE_FLAG_SEVERITY[flag] || 'Info',
  };
}

function buildRootPatient(patient) {
  const vitals = {
    hr: patient.vitals.hr,
    bpSystolic: patient.vitals.sbp,
    bpDiastolic: patient.vitals.dbp,
    spo2: patient.vitals.spo2,
    temp: patient.vitals.temp,
    rr: patient.vitals.rr,
    gcs: patient.vitals.gcs,
    pain: patient.vitals.pain,
    recordedAt: patient.vitals.recordedAt,
  };
  const timeline = [
    {
      id: `journey-${patient.id}-arrival`,
      patientId: patient.id,
      type: 'Arrival',
      timestamp: patient.arrivalTime,
      to: patient.state,
      toState: patient.state,
      staffId: patient.assignedStaffId || 'demo-charge-rn',
      summary: `${patient.firstName} ${patient.lastName} loaded into ${patient.state} for customer walkthrough.`,
      metadata: { demoMode: true },
    },
  ];
  if (patient.state === 'Discharge') {
    timeline.push({
      id: `journey-${patient.id}-discharge`,
      patientId: patient.id,
      type: 'StateChange',
      timestamp: patient.dischargedAt,
      from: 'Disposition',
      to: 'Discharge',
      fromState: 'Disposition',
      toState: 'Discharge',
      staffId: 'demo-fasttrack-rn',
      summary: 'Discharged during the 100-patient walkthrough day.',
      metadata: { demoMode: true },
    } as any);
  }
  return {
    id: patient.id,
    mrn: patient.mrn,
    firstName: patient.firstName,
    lastName: patient.lastName,
    name: `${patient.firstName} ${patient.lastName}`,
    dob: patient.dob,
    age: patient.age,
    sex: patient.rootSex,
    location: patient.roomId || 'Waiting room',
    arrivalTime: patient.arrivalTime,
    triageTime: patient.triageTime,
    lastAssessedTime: patient.lastAssessedTime,
    chiefComplaint: patient.chiefComplaint,
    complaint: patient.chiefComplaint,
    complaintCategory: patient.complaintCategory,
    state: patient.state,
    priority: patient.priority,
    vitals,
    vitalsUpdatedAt: vitals.recordedAt,
    assignedStaffId: patient.assignedStaffId,
    assignedTo: patient.assignedStaffId,
    roomId: patient.roomId,
    flags: patient.flags.map((flag) => buildRootFlag(flag, patient)),
    reassessmentReminders: patient.flags.includes('ReassessmentDue')
      ? [
          {
            id: `reminder-${patient.id}`,
            patientId: patient.id,
            scheduledBy: 'demo-charge-rn',
            scheduledAt: patient.triageTime || patient.arrivalTime,
            dueAt: isoMinutesAgo(new Date(patient.lastAssessedTime || patient.arrivalTime), -5),
            note: 'Reassessment due for customer walkthrough.',
            status: 'pending',
            lastAlertStage: 'due',
          },
        ]
      : [],
    vitalsAlerts: [],
    timeline,
    notes: [
      {
        id: `note-${patient.id}-demo`,
        patientId: patient.id,
        authorStaffId: patient.assignedStaffId || 'demo-charge-rn',
        type: 'Operational',
        body: 'Customer walkthrough patient record. No live clinical data.',
        createdAt: patient.lastAssessedTime || patient.arrivalTime,
      },
    ],
  };
}

function buildStaff() {
  return {
    simple: [
      { id: 'demo-attending-1', name: 'Dr. Priya Nair', role: 'MD', active: true },
      { id: 'demo-charge-rn', name: 'Michael Chen', role: 'Charge', active: true },
      { id: 'demo-triage-rn', name: 'Aisha Thompson', role: 'RN', active: true },
      { id: 'demo-fasttrack-rn', name: 'Maya Singh', role: 'RN', active: true },
    ],
    root: [
      {
        id: 'demo-attending-1',
        firstName: 'Priya',
        lastName: 'Nair',
        name: 'Dr. Priya Nair',
        displayName: 'Dr. Priya Nair',
        role: 'Attending',
        status: 'OnShift',
        shiftId: 'demo-shift-first-customer',
        assignedPatientIds: [],
      },
      {
        id: 'demo-charge-rn',
        firstName: 'Michael',
        lastName: 'Chen',
        name: 'Michael Chen',
        displayName: 'Michael Chen',
        role: 'ChargeNurse',
        status: 'OnShift',
        shiftId: 'demo-shift-first-customer',
        assignedPatientIds: [],
      },
      {
        id: 'demo-triage-rn',
        firstName: 'Aisha',
        lastName: 'Thompson',
        name: 'Aisha Thompson',
        displayName: 'Aisha Thompson',
        role: 'TriageNurse',
        status: 'OnShift',
        shiftId: 'demo-shift-first-customer',
        assignedPatientIds: [],
      },
      {
        id: 'demo-fasttrack-rn',
        firstName: 'Maya',
        lastName: 'Singh',
        name: 'Maya Singh',
        displayName: 'Maya Singh',
        role: 'Nurse',
        status: 'OnShift',
        shiftId: 'demo-shift-first-customer',
        assignedPatientIds: [],
      },
    ],
  };
}

function buildRooms(activeModels) {
  const occupiedByRoom = new Map(
    activeModels.filter((patient) => patient.roomId).map((patient) => [patient.roomId, patient.id])
  );
  const roomSpecs = [
    ...Array.from({ length: 4 }, (_, index) => [`demo-room-resus-${index + 1}`, `Resus ${index + 1}`, 'Resus', 'Resuscitation']),
    ...Array.from({ length: 18 }, (_, index) => [`demo-room-assessment-${index + 1}`, `Assessment ${index + 1}`, 'Treatment', 'Assessment']),
    ...Array.from({ length: 6 }, (_, index) => [`demo-room-observation-${index + 1}`, `Observation ${index + 1}`, 'Treatment', 'Observation']),
    ...Array.from({ length: 2 }, (_, index) => [`demo-room-triage-${index + 1}`, `Triage ${index + 1}`, 'Treatment', 'Triage']),
    ...Array.from({ length: 2 }, (_, index) => [`demo-room-waiting-${index + 1}`, `Waiting Area ${index + 1}`, 'Waiting', 'Waiting']),
    ...Array.from({ length: 2 }, (_, index) => [`demo-room-isolation-${index + 1}`, `Isolation ${index + 1}`, 'Isolation', 'Isolation']),
  ];

  const simple = roomSpecs.map(([id, name, simpleType]) => ({
    id,
    name,
    type: simpleType,
    status: occupiedByRoom.has(id) || id === 'demo-room-resus-1' || id === 'demo-room-isolation-1' ? 'Occupied' : id === 'demo-room-assessment-18' ? 'Blocked' : 'Available',
    patientId: occupiedByRoom.get(id),
  }));

  const root = roomSpecs.map(([id, name, , rootType]) => ({
    id,
    name,
    type: rootType,
    status: occupiedByRoom.has(id) || id === 'demo-room-resus-1' || id === 'demo-room-isolation-1' ? 'Occupied' : id === 'demo-room-assessment-18' ? 'Blocked' : 'Available',
    currentPatientId: occupiedByRoom.get(id) || null,
    isIsolationCapable: rootType === 'Isolation',
  }));

  return { simple, root };
}

function capacityFor(simplePatients, simpleRooms, now) {
  const activePatients = simplePatients.filter((patient) => patient.state !== 'Discharge');
  const occupiedRooms = simpleRooms.filter((room) => room.status === 'Occupied').length;
  const boardingCount = activePatients.filter((patient) => patient.state === 'Admission').length;
  const reassessmentDue = activePatients.filter((patient) => patient.flags.includes('ReassessmentDue')).length;
  const occupancyPenalty = Math.max(0, occupiedRooms / simpleRooms.length - 0.8) * 100;
  const score = Math.max(0, Math.min(100, Math.round(100 - occupancyPenalty - boardingCount * 8 - (reassessmentDue > 3 ? 10 : 0))));
  const band = score >= 80 ? 'Green' : score >= 60 ? 'Yellow' : score >= 40 ? 'Orange' : 'Red';
  return {
    score,
    band,
    totalPatients: activePatients.length,
    occupiedRooms,
    boardingCount,
    reassessmentDue,
    updatedAt: now.toISOString(),
  };
}

function buildAlerts(now, simplePatients) {
  const sepsisPatient = simplePatients.find((patient) => patient.complaintCategory === 'Sepsis');
  const waitingHighRisk = simplePatients.find(
    (patient) => patient.state === 'Waiting' && patient.flags.includes('DeteriorationRisk')
  );
  return [
    {
      id: 'demo-alert-capacity',
      severity: 'Critical',
      title: 'High-volume ED capacity pressure',
      message: 'ED is running a 100-patient day with boarders, EMS arrivals, and reassessments due.',
      createdAt: isoMinutesAgo(now, 8),
      dismissed: false,
    },
    {
      id: 'demo-alert-reassessment',
      severity: 'Warning',
      title: 'High-risk waiting reassessments due',
      message: `${simplePatients.filter((patient) => patient.state === 'Waiting' && patient.flags.includes('ReassessmentDue')).length} waiting patients need reassessment.`,
      patientId: waitingHighRisk?.id,
      createdAt: isoMinutesAgo(now, 6),
      dismissed: false,
    },
    {
      id: 'demo-alert-sepsis',
      severity: 'Critical',
      title: 'Sepsis risk in waiting queue',
      message: 'Walkthrough dataset includes a deteriorating infection patient for ED Copilot review.',
      patientId: sepsisPatient?.id,
      createdAt: isoMinutesAgo(now, 4),
      dismissed: false,
    },
  ];
}

function buildEMS(now) {
  const arrivals = [
    ['demo-ems-501', 'demo-ems-unit-501', 'Medic 501', ['Maya Singh', 'Theo Campbell'], 58, 'Male', 'Crushing chest pain, ECG transmitted', undefined, 7, 'High', 'Aspirin given; anterior ST changes suspected.'],
    ['demo-ems-214', 'demo-ems-unit-214', 'Medic 214', ['Ella Martin', 'David Ko'], 81, 'Female', 'Fall on anticoagulants with head strike', 'Ground-level fall at home', 11, 'Moderate', 'C-collar in place; repetitive questions.'],
    ['demo-ems-733', 'demo-ems-unit-733', 'Medic 733', ['Andre Lewis', 'Priyanka Shah'], 43, 'Unknown', 'Opioid overdose, ventilated with BVM', undefined, 4, 'Critical', 'Naloxone given; airway support ongoing.'],
    ['demo-ems-612', 'demo-ems-unit-612', 'Medic 612', ['Jordan Iqbal', 'Nina Park'], 68, 'Female', 'Sepsis alert, hypotensive', undefined, -3, 'Critical', 'Arrived at bay; offload delayed by bed pressure.'],
    ['demo-ems-309', 'demo-ems-unit-309', 'Medic 309', ['Owen Clarke', 'Lena Price'], 12, 'Male', 'Pediatric asthma exacerbation', undefined, 18, 'High', 'Continuous neb en route; parent accompanying.'],
  ];

  const emsArrivals = arrivals.map((arrival, index) => {
    const [id, unitId, unitName, crewNames, patientAge, patientSex, chiefComplaint, mechanismOfInjury, eta, severity, notes] = arrival as any[];
    const status = (eta as number) < 0 ? 'Arrived' : 'Inbound';
    const estimatedArrivalTime = isoMinutesFrom(now, eta);
    return {
      id,
      unitId,
      unitName,
      crewNames,
      patientAge,
      patientSex,
      chiefComplaint,
      mechanismOfInjury,
      vitals: {
        hr: severity === 'Critical' ? 128 - index * 6 : 96 + index * 5,
        bpSystolic: severity === 'Critical' ? 88 + index * 3 : 124 + index * 4,
        bpDiastolic: severity === 'Critical' ? 56 + index * 2 : 74 + index,
        spo2: severity === 'Critical' ? 89 + index : 95 + (index % 3),
        temp: chiefComplaint.includes('Sepsis') ? 38.9 : null,
        rr: severity === 'Critical' ? 26 : 18 + index,
        gcs: chiefComplaint.includes('overdose') ? 8 : 15,
        pain: chiefComplaint.includes('chest') ? 8 : 4,
        recordedAt: isoMinutesAgo(now, 6 + index),
      },
      eta,
      severity,
      dispatchTime: isoMinutesAgo(now, 12 + index * 3),
      estimatedArrivalTime,
      notes,
      arrivedAt: status === 'Arrived' ? isoMinutesAgo(now, Math.abs(eta)) : undefined,
      status,
      preparedRoomId: severity === 'Critical' ? 'demo-room-resus-2' : undefined,
      prearrivalComplaint: chiefComplaint,
      priority: severity === 'Critical' ? 'P1' : severity === 'High' ? 'P2' : 'P3',
      handoffSummary: `${unitName}: ${chiefComplaint}. ${notes}`,
    };
  });

  const emsUnits = emsArrivals.map((arrival, index) => ({
    id: arrival.unitId,
    callSign: arrival.unitName,
    agency: 'Metro EMS',
    status: arrival.status === 'Arrived' ? 'AtHospital' : 'Inbound',
    crewStaffIds: [],
    activeArrivalId: arrival.id,
    lastKnownLocation:
      index === 0
        ? 'Highway 7 eastbound'
        : index === 1
          ? 'North entrance ramp'
          : index === 2
            ? 'Two blocks from ambulance bay'
            : 'Ambulance bay',
  }));
  return { emsArrivals, emsUnits };
}

function rootAlert(simpleAlert) {
  const { dismissed, ...rest } = simpleAlert;
  return dismissed ? { ...rest, dismissedAt: rest.createdAt } : rest;
}

function buildRootSettings(now) {
  return {
    departmentCapacityTarget: 34,
    tenantMode: 'first-customer-demo',
    demoMode: {
      active: true,
      id: FIRST_CUSTOMER_DEMO_MODE.id,
      label: FIRST_CUSTOMER_DEMO_MODE.label,
      tenantName: FIRST_CUSTOMER_DEMO_MODE.tenantName,
      patientVolumePerDay: FIRST_CUSTOMER_DEMO_MODE.patientVolumePerDay,
      activatedAt: now.toISOString(),
      sourceLabel: FIRST_CUSTOMER_DEMO_MODE.sourceLabel,
    },
    thresholds: {
      waitWarningMinutes: 30,
      waitCriticalMinutes: 45,
      capacityWarningPercent: 80,
      emsOffloadTargetMinutes: 15,
      reassessmentIntervals: {
        P1: 10,
        P2: 20,
        P3: 45,
        P4: 90,
        P5: 120,
      },
    },
    alertRules: {
      Reassessment: { enabled: true, severity: 'Warning' },
      Capacity: { enabled: true, severity: 'Critical' },
      EMS: { enabled: true, severity: 'Warning' },
      Referral: { enabled: true, severity: 'Warning' },
      Queue: { enabled: true, severity: 'Warning' },
      System: { enabled: true, severity: 'Info' },
      CAPACITY_CRISIS: { enabled: true, severity: 'Critical' },
    },
  };
}

function buildAnalytics(now, activeModels) {
  const dailyVolume = Array.from({ length: 7 }, (_, index) => ({
    date: new Date(now.getTime() - (6 - index) * 24 * 60 * 60_000).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    }),
    count: [82, 88, 91, 94, 96, 89, FIRST_CUSTOMER_DEMO_MODE.patientVolumePerDay][index],
  }));
  const hourlyPattern = [1, 0, 0, 0, 1, 2, 4, 6, 7, 8, 7, 6, 5, 6, 7, 8, 9, 8, 6, 4, 3, 2, 2, 1];
  const topComplaints = COMPLAINTS.slice(0, 8).map(([name], index) => ({
    name,
    count: activeModels.filter((patient) => patient.complaintCategory === name).length + (index < 2 ? 9 : 5),
  }));

  return {
    status: 'ready',
    source: 'client-fallback',
    loadedAt: now.toISOString(),
    message: 'Metro General ED operational walkthrough dataset loaded.',
    data: {
      source: 'first-customer-demo',
      generatedAt: now.toISOString(),
      shift: {
        patientsSeen: 58,
        avgWaitMinutes: 38,
        avgLosMinutes: 214,
        dischargeCount: 52,
        admissionCount: 6,
        lwbsCount: 1,
        dischargeRate: 52,
        admissionRate: 6,
        comparison: {
          patientsSeen: { direction: 'up', delta: 11 },
          avgWaitMinutes: { direction: 'up', delta: 7 },
          avgLosMinutes: { direction: 'up', delta: 18 },
          dischargeRate: { direction: 'flat', delta: 0 },
          admissionRate: { direction: 'up', delta: 2 },
          lwbsCount: { direction: 'up', delta: 1 },
        },
      },
      capacityHistory: Array.from({ length: 8 }, (_, index) => ({
        timestamp: isoMinutesAgo(now, (7 - index) * 60),
        label: new Date(isoMinutesAgo(now, (7 - index) * 60)).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        score: [72, 68, 63, 56, 48, 41, 36, 34][index],
        riskLevel: ['Yellow', 'Yellow', 'Yellow', 'Orange', 'Orange', 'Orange', 'Red', 'Red'][index],
      })),
      queuePerformance: [
        { id: 'queue-waiting', type: 'Waiting', name: 'Waiting', avgWaitMinutes: 58, throughputCount: 16 },
        { id: 'queue-reassessment', type: 'Reassessment', name: 'Reassessment', avgWaitMinutes: 42, throughputCount: 10 },
        { id: 'queue-boarding', type: 'Boarding', name: 'Boarding', avgWaitMinutes: 236, throughputCount: 6 },
        { id: 'queue-ems', type: 'EMS', name: 'EMS', avgWaitMinutes: 17, throughputCount: 5 },
      ],
      operationalCommand: {
        dailyVolume,
        hourlyArrivals: hourlyPattern.map((count, hour) => ({
          hour: `${String(hour).padStart(2, '0')}:00`,
          count,
        })),
        waitTrend: dailyVolume.map((point, index) => ({
          date: point.date,
          avgWaitMinutes: [31, 33, 35, 37, 41, 44, 48][index],
        })),
        topComplaints,
        kpis: {
          dailyPatientVolume: FIRST_CUSTOMER_DEMO_MODE.patientVolumePerDay,
          activeCensus: ACTIVE_DEMO_CENSUS,
          doorToDoctorMinutes: 42,
          leftWithoutBeingSeenPercent: 1,
          boardingHours: 23,
          emsOffloadMinutes: 17,
        },
      },
    },
  };
}

function buildQueues(patients) {
  const queueDefinitions = [
    ['Waiting', 'Waiting queue', (patient) => patient.state === 'Waiting', 30],
    ['Triage', 'Triage queue', (patient) => patient.state === 'Triage', 10],
    ['Assessment', 'Active assessment', (patient) => ['Assessment', 'Orders', 'Results'].includes(patient.state), 45],
    ['HighRisk', 'High-risk waiting patients', (patient) => patient.state === 'Waiting' && (patient.priority === 'P1' || patient.priority === 'P2' || patient.flags.includes('HighRisk') || patient.flags.includes('DeteriorationRisk')), 15],
    ['Reassessment', 'Reassessments due', (patient) => patient.flags.includes('ReassessmentDue'), 30],
    ['Boarding', 'Boarders', (patient) => patient.state === 'Admission' || patient.flags.includes('PendingAdmission'), 120],
    ['EMS', 'EMS-linked patients', (patient) => patient.flags.includes('EMSArrival'), 15],
  ];
  return (queueDefinitions as any[]).map(([id, label, predicate, targetMinutes]) => {
    const queuePatients = patients.filter(predicate);
    const oldestWaitMinutes = Math.max(
      0,
      ...queuePatients.map((patient) => Math.round((Date.now() - new Date(patient.arrivalTime).getTime()) / 60000))
    );
    return {
      id,
      label,
      count: queuePatients.length,
      patients: queuePatients,
      targetMinutes,
      oldestWaitMinutes,
      breached: oldestWaitMinutes > targetMinutes,
    };
  });
}

function buildCopilotContext(simplePatients, capacity, alerts, emsArrivals) {
  const activePatients = simplePatients.filter((patient) => patient.state !== 'Discharge');
  const highRiskPatients = activePatients.filter(
    (patient) =>
      patient.priority === 'P1' ||
      patient.priority === 'P2' ||
      patient.flags.includes('HighRisk') ||
      patient.flags.includes('DeteriorationRisk')
  );
  const reassessmentPatients = activePatients.filter((patient) => patient.flags.includes('ReassessmentDue'));
  return {
    patientCount: activePatients.length,
    highRiskCount: highRiskPatients.length,
    reassessmentDueCount: reassessmentPatients.length,
    emsInboundCount: emsArrivals.filter((arrival) => arrival.status === 'Inbound').length,
    boarderCount: activePatients.filter((patient) => patient.state === 'Admission').length,
    capacity: {
      band: capacity.band,
      score: capacity.score,
    },
    topRisks: highRiskPatients.slice(0, 3).map((patient) => ({
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      reason: `${patient.priority} ${patient.complaintCategory}`,
    })),
    activeAlerts: alerts.filter((alert) => !alert.dismissed).length,
    safetyBoundary: 'Walkthrough data only. ED Copilot provides workflow guidance for human review.',
  };
}

export function buildFirstCustomerDemoMode(nowInput = new Date()) {
  const now = new Date(nowInput);
  const activeModels = dedupePatientsByMrn(buildActivePatientModels(now));
  const dischargedModels = buildDischargedPatientModels(now);
  const simplePatients = activeModels.map(buildSimplePatient);
  const rootPatients = [...activeModels, ...dischargedModels].map(buildRootPatient);
  const rooms = buildRooms(activeModels);
  const staff = buildStaff();
  const capacity = capacityFor(simplePatients, rooms.simple, now);
  const alerts = buildAlerts(now, simplePatients);
  const ems = buildEMS(now);
  const analytics = buildAnalytics(now, activeModels);
  const metadata = {
    ...FIRST_CUSTOMER_DEMO_MODE,
    activeCensus: ACTIVE_DEMO_CENSUS,
    waitingCount: simplePatients.filter((patient) => patient.state === 'Waiting').length,
    highRiskWaitingCount: simplePatients.filter(
      (patient) => patient.state === 'Waiting' && (patient.priority === 'P1' || patient.priority === 'P2')
    ).length,
    reassessmentDueCount: simplePatients.filter((patient) => patient.flags.includes('ReassessmentDue')).length,
    boarderCount: simplePatients.filter((patient) => patient.state === 'Admission').length,
    emsInboundCount: ems.emsArrivals.filter((arrival) => arrival.status === 'Inbound').length,
    generatedAt: now.toISOString(),
  };

  return {
    metadata,
    simple: {
      demoMode: {
        active: true,
        id: FIRST_CUSTOMER_DEMO_MODE.id,
        label: FIRST_CUSTOMER_DEMO_MODE.label,
        tenantName: FIRST_CUSTOMER_DEMO_MODE.tenantName,
        patientVolumePerDay: FIRST_CUSTOMER_DEMO_MODE.patientVolumePerDay,
        activatedAt: now.toISOString(),
        sourceLabel: FIRST_CUSTOMER_DEMO_MODE.sourceLabel,
      },
      patients: simplePatients,
      rooms: rooms.simple,
      staff: staff.simple,
      alerts,
      capacity,
      emsArrivals: ems.emsArrivals,
      analytics: analytics.data,
    },
    root: {
      patients: rootPatients,
      rooms: rooms.root,
      staff: staff.root,
      emsArrivals: ems.emsArrivals,
      emsUnits: ems.emsUnits,
      referrals: [],
      alerts: alerts.map(rootAlert),
      activeShift: {
        id: 'demo-shift-first-customer',
        name: 'Live customer walkthrough shift',
        startTime: isoMinutesAgo(now, 360),
        endTime: isoMinutesFrom(now, 120),
        status: 'Active',
        chargeStaffId: 'demo-charge-rn',
        staffIds: staff.root.map((member) => member.id),
        handoffNotes: [],
      },
      emergencySettings: buildRootSettings(now),
      analytics,
      selectedPatientId: activeModels[0]?.id || null,
    },
  };
}

export function buildFirstCustomerDemoApiEnvelope(moduleId, state, nowInput = new Date()) {
  if (!state?.demoMode?.active) return null;
  const now = new Date(nowInput);
  const patients = state.patients || [];
  const rooms = state.rooms || [];
  const alerts = state.alerts || [];
  const capacity = state.capacity || {};
  const emsArrivals = state.demoMode.emsArrivals || buildFirstCustomerDemoMode(now).simple.emsArrivals;
  const queues = buildQueues(patients);
  const promptContext = buildCopilotContext(patients, capacity, alerts, emsArrivals);
  const base = {
    ok: true,
    source: 'first-customer-demo',
    generatedAt: now.toISOString(),
    message: 'Metro General ED walkthrough dataset.',
  };

  switch (moduleId) {
    case 'whiteboard':
      return { ...base, data: { patients, rooms, alerts, capacity, promptContext } };
    case 'patients':
      return { ...base, data: { patients, total: patients.length } };
    case 'journey':
      return {
        ...base,
        data: {
          events: patients.flatMap((patient) =>
            (patient.timeline || []).map((event) => ({
              ...event,
              patientName: `${patient.firstName} ${patient.lastName}`,
            }))
          ),
          stateCounts: patients.reduce((counts, patient) => {
            counts[patient.state] = (counts[patient.state] || 0) + 1;
            return counts;
          }, {}),
        },
      };
    case 'ems':
      return { ...base, data: { arrivals: emsArrivals, incomingCount: emsArrivals.filter((arrival) => arrival.status === 'Inbound').length } };
    case 'queues':
      return { ...base, data: { queues } };
    case 'reassessment':
      return {
        ...base,
        data: {
          patients: patients.filter((patient) => patient.flags.includes('ReassessmentDue')),
          overdueCount: patients.filter(
            (patient) => patient.flags.includes('ReassessmentDue') && patient.state === 'Waiting'
          ).length,
          nextAction: 'Review high-risk waiting reassessments first',
        },
      };
    case 'capacity':
      return {
        ...base,
        data: {
          capacity,
          rooms,
          recommendations: [
            'Open charge huddle around boarders and EMS offload.',
            'Pull high-risk waiting patients into reassessment.',
            'Prioritize discharge-ready rooms for capacity recovery.',
          ],
        },
      };
    case 'boarding':
      return {
        ...base,
        data: {
          patients: patients.filter((patient) => patient.state === 'Admission' || patient.flags.includes('PendingAdmission')),
          longestBoardingMinutes: 355,
          escalation: 'Bed manager review active',
        },
      };
    case 'copilot':
      return {
        ...base,
        data: {
          promptContext,
          quickActions: ['Who needs attention first?', 'Summarize EMS pressure', 'Review boarders', 'Explain reassessment priorities'],
        },
      };
    case 'analytics':
      return { ...base, data: state.demoMode.analytics || buildFirstCustomerDemoMode(now).simple.analytics };
    case 'settings':
      return { ...base, data: { demoMode: state.demoMode, tenantName: state.demoMode.tenantName } };
    default:
      return { ...base, data: { patients, rooms, alerts, capacity } };
  }
}

export default Object.freeze({
  FIRST_CUSTOMER_DEMO_MODE,
  buildFirstCustomerDemoMode,
  buildFirstCustomerDemoApiEnvelope,
});

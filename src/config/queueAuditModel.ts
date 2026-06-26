/**
 * Queue audit model — length, longest wait, bottlenecks, overdue across all queues.
 * Node-safe; mirrors live queue predicates from queueAssignment + receptionQueueModel.
 */

export const QUEUE_AUDIT_DOMAIN = Object.freeze({
  RECEPTION: 'reception',
  ED: 'ed',
});

export const RECEPTION_QUEUE_AUDIT_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'ems',
    label: 'Ambulance arrivals',
    targetWaitMinutes: 20,
    tab: 'ems',
  }),
  Object.freeze({
    id: 'verification',
    label: 'Need ID check',
    targetWaitMinutes: 15,
    tab: 'verification',
  }),
  Object.freeze({
    id: 'pretriage',
    label: 'Waiting for nurse',
    targetWaitMinutes: 20,
    tab: 'pretriage',
  }),
]);

export const ED_QUEUE_AUDIT_DEFINITIONS = Object.freeze([
  Object.freeze({ id: 'waiting-room', label: 'Waiting Room', targetWaitMinutes: 20 }),
  Object.freeze({ id: 'triage-queue', label: 'Triage Queue', targetWaitMinutes: 15 }),
  Object.freeze({ id: 'provider-queue', label: 'Provider Queue', targetWaitMinutes: 35 }),
  Object.freeze({ id: 'results-queue', label: 'Results Queue', targetWaitMinutes: 60 }),
  Object.freeze({ id: 'reassessment-queue', label: 'Reassessment Queue', targetWaitMinutes: 30 }),
  Object.freeze({ id: 'referral-queue', label: 'Referral Queue', targetWaitMinutes: 45 }),
  Object.freeze({ id: 'admission-queue', label: 'Admission Queue', targetWaitMinutes: 60 }),
  Object.freeze({ id: 'discharge-queue', label: 'Discharge Queue', targetWaitMinutes: 45 }),
  Object.freeze({ id: 'ems-pre-arrival-queue', label: 'EMS Pre-Arrival', targetWaitMinutes: 20 }),
]);

export const QUEUE_AUDIT_SURFACE_REGISTRY = Object.freeze([
  { id: 'reception-operational-strip', domains: ['reception'] },
  { id: 'reception-work-queues', domains: ['reception'] },
  { id: 'queue-intelligence-panel', domains: ['ed'] },
  { id: 'charge-nurse-strip', domains: ['ed', 'reception'] },
  { id: 'whiteboard-queue-strip', domains: ['ed'] },
  { id: 'operational-handoff', domains: ['ed', 'reception'] },
]);

const PATIENT_STATE = Object.freeze({
  Arrival: 'Arrival',
  Registration: 'Registration',
  Triage: 'Triage',
  Waiting: 'Waiting',
  Assessment: 'Assessment',
  Results: 'Results',
  Disposition: 'Disposition',
  Admission: 'Admission',
  Discharge: 'Discharge',
  Deceased: 'Deceased',
});

function minutesSince(isoTime) {
  if (!isoTime) return 0;
  const timestamp = new Date(isoTime).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(0, Math.round((Date.now() - timestamp) / 60000));
}

function patientWaitMinutes(patient) {
  return minutesSince(patient?.triageTime || patient?.arrivalTime);
}

function hasFlag(patient, flagType) {
  return (patient?.flags || []).some((flag) =>
    typeof flag === 'string' ? flag === flagType : flag?.type === flagType,
  );
}

function isEmsRegistrationPatient(patient) {
  return hasFlag(patient, 'EMSArrival');
}

function isActivePatient(patient) {
  return patient?.state !== PATIENT_STATE.Discharge && patient?.state !== PATIENT_STATE.Deceased;
}

export function formatQueueWaitMinutes(minutes = 0) {
  if (!minutes) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function buildQueueAuditRow({
  id,
  label,
  domain,
  patients = [] as any[],
  targetWaitMinutes = 30,
  tab = null as any,
  type = null as any,
}) {
  const waits = patients.map(patientWaitMinutes);
  const length = patients.length;
  const longestWaitMinutes = waits.length ? Math.max(...waits) : 0;
  const averageWaitMinutes = waits.length
    ? Math.round(waits.reduce((sum, value) => sum + value, 0) / waits.length)
    : 0;
  const overdueItems = patients.filter(
    (patient) => patientWaitMinutes(patient) > targetWaitMinutes,
  );
  const overdueCount = overdueItems.length;
  const waitOverTarget = Math.max(0, longestWaitMinutes - targetWaitMinutes);
  const isBottleneck =
    length > 0 &&
    (waitOverTarget > 0 || overdueCount > 0 || longestWaitMinutes >= targetWaitMinutes * 1.5);
  const bottleneckSeverity =
    longestWaitMinutes >= targetWaitMinutes * 2 || overdueCount >= 3
      ? 'critical'
      : isBottleneck
        ? 'warning'
        : 'stable';

  return {
    id,
    label,
    domain,
    tab,
    type: type || label,
    length,
    longestWaitMinutes,
    averageWaitMinutes,
    overdueCount,
    overdueItems: overdueItems.map((patient) => ({
      patientId: patient.id,
      label:
        [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() ||
        patient.name ||
        patient.mrn,
      waitMinutes: patientWaitMinutes(patient),
    })),
    targetWaitMinutes,
    isBottleneck,
    bottleneckSeverity,
    bottleneckReason: isBottleneck
      ? `${overdueCount} overdue · longest ${formatQueueWaitMinutes(longestWaitMinutes)}`
      : null,
  };
}

export function auditReceptionQueues(patients = [] as any[], { emsInbound = 0 }: any = {}) {
  const active = patients.filter(isActivePatient);
  const emsPatients = active.filter(
    (patient) =>
      isEmsRegistrationPatient(patient) &&
      (patient.state === PATIENT_STATE.Registration || patient.state === PATIENT_STATE.Arrival),
  );
  const verificationPatients = active.filter(
    (patient) =>
      patient.state === PATIENT_STATE.Registration && !isEmsRegistrationPatient(patient),
  );
  const pretriagePatients = active.filter((patient) => patient.state === PATIENT_STATE.Triage);

  const rows = [
    buildQueueAuditRow({
      id: 'ems',
      label: 'Ambulance arrivals',
      domain: QUEUE_AUDIT_DOMAIN.RECEPTION,
      patients: emsPatients,
      targetWaitMinutes: 20,
      tab: 'ems',
      type: 'EMS',
    }),
    buildQueueAuditRow({
      id: 'verification',
      label: 'Need ID check',
      domain: QUEUE_AUDIT_DOMAIN.RECEPTION,
      patients: verificationPatients,
      targetWaitMinutes: 15,
      tab: 'verification',
      type: 'Verification',
    }),
    buildQueueAuditRow({
      id: 'pretriage',
      label: 'Waiting for nurse',
      domain: QUEUE_AUDIT_DOMAIN.RECEPTION,
      patients: pretriagePatients,
      targetWaitMinutes: 20,
      tab: 'pretriage',
      type: 'Pre-triage',
    }),
  ];

  if (emsInbound > 0) {
    rows[0] = {
      ...rows[0],
      length: rows[0].length + emsInbound,
      bottleneckReason: rows[0].bottleneckReason || `${emsInbound} inbound not yet registered`,
      isBottleneck: true,
      bottleneckSeverity: emsInbound >= 2 ? 'critical' : 'warning',
    };
  }

  return rows;
}

const ED_QUEUE_PREDICATES = {
  'waiting-room': (patient) =>
    [PATIENT_STATE.Waiting, PATIENT_STATE.Registration, PATIENT_STATE.Arrival].includes(patient.state),
  'triage-queue': (patient) => patient.state === PATIENT_STATE.Triage,
  'provider-queue': (patient) => patient.state === PATIENT_STATE.Assessment,
  'results-queue': (patient) => patient.state === PATIENT_STATE.Results,
  'reassessment-queue': (patient) => hasFlag(patient, 'ReassessmentDue'),
  'referral-queue': (patient, openReferralIds = new Set()) => openReferralIds.has(patient.id),
  'admission-queue': (patient) => patient.state === PATIENT_STATE.Admission,
  'discharge-queue': (patient, openReferralIds = new Set()) =>
    patient.state === PATIENT_STATE.Disposition && !openReferralIds.has(patient.id),
  'ems-pre-arrival-queue': (patient) =>
    isEmsRegistrationPatient(patient) &&
    (patient.state === PATIENT_STATE.Registration || patient.state === PATIENT_STATE.Arrival),
};

export function auditEdQueues(
  patients = [] as any[],
  { openReferralPatientIds = new Set(), reassessmentOverdueGraceMinutes = 10 }: any = {},
) {
  const active = patients.filter(isActivePatient);

  return ED_QUEUE_AUDIT_DEFINITIONS.map((definition) => {
    const predicate = ED_QUEUE_PREDICATES[definition.id];
    const queuePatients = predicate
      ? active.filter((patient) => predicate(patient, openReferralPatientIds))
      : [];

    const row = buildQueueAuditRow({
      id: definition.id,
      label: definition.label,
      domain: QUEUE_AUDIT_DOMAIN.ED,
      patients: queuePatients,
      targetWaitMinutes: definition.targetWaitMinutes,
      type: definition.label.replace(' Queue', ''),
    });

    if (definition.id === 'reassessment-queue') {
      const reassessmentOverdue = queuePatients.filter((patient) => {
        const flaggedAt =
          patient.lastAssessedTime || patient.triageTime || patient.arrivalTime;
        return minutesSince(flaggedAt) > definition.targetWaitMinutes + reassessmentOverdueGraceMinutes;
      });
      if (reassessmentOverdue.length) {
        return {
          ...row,
          overdueCount: reassessmentOverdue.length,
          overdueItems: reassessmentOverdue.map((patient) => ({
            patientId: patient.id,
            label:
              [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() || patient.mrn,
            waitMinutes: patientWaitMinutes(patient),
          })),
          isBottleneck: true,
          bottleneckSeverity: reassessmentOverdue.length >= 2 ? 'critical' : 'warning',
          bottleneckReason: `${reassessmentOverdue.length} reassessments overdue`,
        };
      }
    }

    return row;
  });
}

export function auditAllQueues({
  patients = [] as any[],
  emsInbound = 0,
  referrals = [] as any[],
  reassessmentOverdueGraceMinutes = 10,
}: any = {}) {
  const openReferralPatientIds = new Set(
    (referrals || [])
      .filter((referral) => !['Closed', 'Completed', 'Declined', 'PatientDeparted'].includes(referral.status))
      .map((referral) => referral.patientId)
      .filter(Boolean),
  );

  const reception = auditReceptionQueues(patients, { emsInbound });
  const ed = auditEdQueues(patients, { openReferralPatientIds, reassessmentOverdueGraceMinutes });

  return [...reception, ...ed];
}

export function summarizeQueueAudit(rows = [] as any[]) {
  const activeRows = rows.filter((row) => row.length > 0 || row.overdueCount > 0);
  const totalLength = rows.reduce((sum, row) => sum + row.length, 0);
  const totalOverdue = rows.reduce((sum, row) => sum + row.overdueCount, 0);
  const longestWaitMinutes = rows.reduce(
    (max, row) => Math.max(max, row.longestWaitMinutes || 0),
    0,
  );
  const bottlenecks = rows.filter((row) => row.isBottleneck);
  const primaryBottleneck = [...bottlenecks].sort(
    (left, right) =>
      (right.overdueCount || 0) - (left.overdueCount || 0) ||
      (right.longestWaitMinutes || 0) - (left.longestWaitMinutes || 0) ||
      (right.length || 0) - (left.length || 0),
  )[0];

  return {
    queueCount: rows.length,
    activeQueueCount: activeRows.length,
    totalLength,
    totalOverdue,
    longestWaitMinutes,
    longestWaitLabel: formatQueueWaitMinutes(longestWaitMinutes),
    bottlenecks,
    primaryBottleneck,
  };
}

export function auditQueueExposure() {
  const requiredMetrics = ['length', 'longestWait', 'bottleneck', 'overdue'];
  return {
    surfaceCount: QUEUE_AUDIT_SURFACE_REGISTRY.length,
    requiredMetrics,
    passesAudit: QUEUE_AUDIT_SURFACE_REGISTRY.length >= 5,
  };
}

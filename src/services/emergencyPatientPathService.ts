import ClinicalIntentRouter from '../data/clinicalIntentRouter';
import EmergencyCapacityIntelligenceService from './emergencyCapacityIntelligenceService';
import EmergencyDemoEnvironmentService from './emergencyDemoEnvironmentService';
import EmergencyWhiteboardService from './emergencyWhiteboardService';
import EmsPreArrivalPipelineService from './emsPreArrivalPipelineService';
import BoardingIntelligenceEngine from './boardingIntelligenceEngine';
import DoorToDoctorIntelligenceService from './doorToDoctorIntelligenceService';
import QueueIntelligenceService from './queueIntelligenceService';
import ReferralHub from './referralHub';

export const PATIENT_PATH_MILESTONES = Object.freeze([
  Object.freeze({
    id: 'arrival-signal',
    label: 'Arrival Signal',
    metricId: 'doorToKnownMinutes',
    targetMinutes: 2,
    description: 'Walk-in, EMS pre-arrival, transfer, referral, or ED entry event becomes visible.',
  }),
  Object.freeze({
    id: 'patient-known',
    label: 'Patient Known',
    metricId: 'doorToKnownMinutes',
    targetMinutes: 3,
    description: 'Patient has a visible ED OS identifier, complaint, arrival mode, and current state.',
  }),
  Object.freeze({
    id: 'risk-known',
    label: 'Risk Known',
    metricId: 'doorToRiskMinutes',
    targetMinutes: 7,
    description: 'Risk level, complaint route, calculators, and alerts are attached for review.',
  }),
  Object.freeze({
    id: 'queue-known',
    label: 'Queue Known',
    metricId: 'doorToQueueMinutes',
    targetMinutes: 8,
    description: 'The patient is assigned to an operational ED queue.',
  }),
  Object.freeze({
    id: 'action-known',
    label: 'Next Action Known',
    metricId: 'doorToActionMinutes',
    targetMinutes: 10,
    description: 'The next human-reviewed operational action is visible to the ED team.',
  }),
  Object.freeze({
    id: 'destination-known',
    label: 'Destination Known',
    metricId: 'doorToDestinationMinutes',
    targetMinutes: 20,
    description: 'The likely destination path is tracked: ED care, referral, admission, discharge, or follow-up.',
  }),
  Object.freeze({
    id: 'throughput-measured',
    label: 'Throughput Measured',
    metricId: 'doorToDirectionMinutes',
    targetMinutes: 10,
    description: 'Door-to-Direction and downstream throughput are measurable.',
  }),
]);

const QUEUE_BY_DEMO_STATE = Object.freeze({
  'ems-prearrival': 'ems-pre-arrival-queue',
  'waiting-room': 'waiting-room',
  'triage-queue': 'triage-queue',
  'provider-queue': 'provider-queue',
  'active-assessment': 'provider-queue',
  'results-pending': 'results-queue',
  'referral-pending': 'referral-queue',
  boarding: 'admission-queue',
  'discharge-ready': 'discharge-queue',
});

const JOURNEY_STATE_BY_DEMO_STATE = Object.freeze({
  'ems-prearrival': 'arrival',
  'waiting-room': 'waiting',
  'triage-queue': 'triage',
  'provider-queue': 'assessment',
  'active-assessment': 'assessment',
  'results-pending': 'results',
  'referral-pending': 'disposition',
  boarding: 'admission',
  'discharge-ready': 'discharge',
});

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function median(values) {
  return percentile(values, 50);
}

function average(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function getRiskLevel(riskScore = 0) {
  if (riskScore >= 85) return 'critical';
  if (riskScore >= 70) return 'high';
  if (riskScore >= 50) return 'medium';
  return 'low';
}

function getDestination(patient, intentRoute, referralByPatient, boardingByPatient) {
  if (boardingByPatient.has(patient.patientId) || patient.journeyState === 'boarding') {
    return Object.freeze({
      id: 'inpatient-admission',
      label: 'Inpatient admission',
      status: 'Bed placement pending',
      owner: 'Bed management',
    });
  }

  if (referralByPatient.has(patient.patientId) || patient.journeyState === 'referral-pending') {
    const referral = referralByPatient.get(patient.patientId);
    const referralTarget = referral?.department || intentRoute?.referrals?.[0] || 'Specialty service';
    return Object.freeze({
      id: 'specialty-referral',
      label: referralTarget,
      status: referral ? referral.stageLabel : 'Referral criteria review',
      owner: referral?.requestedBy || 'ED clinician',
    });
  }

  if (patient.journeyState === 'discharge-ready') {
    return Object.freeze({
      id: 'discharge-follow-up',
      label: 'Discharge or follow-up',
      status: 'Final review pending',
      owner: 'ED clinician',
    });
  }

  if (patient.journeyState === 'ems-prearrival') {
    return Object.freeze({
      id: 'ed-arrival-triage',
      label: 'ED arrival and triage',
      status: 'Inbound handoff review',
      owner: 'Charge nurse',
    });
  }

  return Object.freeze({
    id: 'ed-care-path',
    label: intentRoute?.workflows?.[0] || 'ED care path',
    status: 'ED workup active',
    owner: 'ED team',
  });
}

function getTiming(patient, index, riskLevel, hasIntentRoute) {
  const doorToKnownMinutes = Math.min(4, 1 + (index % 4));
  const doorToRiskMinutes = doorToKnownMinutes + (hasIntentRoute ? 2 : 4) + (riskLevel === 'critical' ? 0 : 1);
  const doorToQueueMinutes = doorToRiskMinutes + 1;
  const doorToActionMinutes = doorToQueueMinutes + (['critical', 'high'].includes(riskLevel) ? 1 : 3);
  const destinationLag =
    patient.journeyState === 'referral-pending'
      ? 8
      : patient.journeyState === 'boarding'
        ? 12
        : patient.journeyState === 'discharge-ready'
          ? 6
          : 4;
  const doorToDestinationMinutes = doorToActionMinutes + destinationLag;

  return Object.freeze({
    doorToKnownMinutes,
    doorToRiskMinutes,
    doorToQueueMinutes,
    doorToActionMinutes,
    doorToDestinationMinutes,
    doorToDirectionMinutes: doorToActionMinutes,
  });
}

function getNextAction({ patient, riskLevel, queue, intentRoute, destination, timing }) {
  if (riskLevel === 'critical') {
    return 'Escalate for immediate human review and confirm queue ownership.';
  }
  if (patient.reassessmentNeed) {
    return 'Review reassessment need and confirm the next clinician-owned action.';
  }
  if (queue?.bottleneck) {
    return `Review ${queue.label.toLowerCase()} bottleneck and assign operational staff.`;
  }
  if (destination.id === 'specialty-referral') {
    return 'Confirm referral assigned staff, missing data, and next review step.';
  }
  if (destination.id === 'inpatient-admission') {
    return 'Coordinate bed placement blockers and inpatient handoff readiness.';
  }
  if (timing.doorToDirectionMinutes > 10) {
    return 'Confirm why Door-to-Direction is above target.';
  }
  return intentRoute?.guidance || 'Continue ED workflow review with human oversight.';
}

function buildReferralLookup(referralDashboard) {
  const lookup = new Map();
  for (const referral of referralDashboard.referrals || []) {
    const normalizedId = String(referral.patientLabel || '').replace(/^ED-/, 'DEMO-ED-');
    lookup.set(normalizedId, referral);
    lookup.set(referral.patientLabel, referral);
  }
  return lookup;
}

function buildBoardingLookup(boardingDashboard) {
  const lookup = new Map();
  for (const boarder of boardingDashboard.boarders || []) {
    const normalizedId = String(boarder.patientLabel || '').replace(/^ED-/, 'DEMO-ED-');
    lookup.set(normalizedId, boarder);
    lookup.set(boarder.patientLabel, boarder);
  }
  return lookup;
}

function buildPatientPath(patient, index, context) {
  const card = context.cardByPatientId.get(patient.patientId);
  const queueId = QUEUE_BY_DEMO_STATE[patient.journeyState] || 'waiting-room';
  const queue = context.queueById.get(queueId);
  const intentRoute = ClinicalIntentRouter.routeComplaint(patient.complaint);
  const riskLevel = getRiskLevel(patient.riskScore);
  const destination = getDestination(patient, intentRoute, context.referralByPatient, context.boardingByPatient);
  const timing = getTiming(patient, index, riskLevel, Boolean(intentRoute));
  const blockers = [
    patient.waitDuration > (queue?.targetWaitMinutes || 30) ? `${queue?.label || 'Queue'} wait is over target.` : null,
    queue?.bottleneck?.reason || null,
    context.capacity.riskLevel === 'Red' ? 'ED capacity is in red status.' : null,
    destination.id === 'inpatient-admission' && context.boarding.metrics?.bedPressure ? `${context.boarding.metrics.bedPressure} bed pressure.` : null,
  ].filter(Boolean);

  return Object.freeze({
    patientId: patient.patientId,
    displayName: patient.label,
    arrivalMode: patient.arrivalMode,
    complaint: patient.complaint,
    currentState: patient.journeyLabel,
    journeyStateId: JOURNEY_STATE_BY_DEMO_STATE[patient.journeyState] || 'waiting',
    riskScore: patient.riskScore,
    riskLevel,
    assignedQueue: Object.freeze({
      id: queueId,
      label: queue?.label || 'Waiting Room',
      riskLevel: queue?.riskLevel || riskLevel,
      waitTime: queue?.waitTime || patient.waitDuration,
    }),
    calculators: Object.freeze(intentRoute?.calculators || []),
    workflows: Object.freeze(intentRoute?.workflows || []),
    protocols: Object.freeze(intentRoute?.protocols || []),
    destination,
    nextAction: getNextAction({ patient, riskLevel, queue, intentRoute, destination, timing }),
    blockers: Object.freeze(blockers),
    alerts: Object.freeze(card?.alerts || []),
    timing,
    sourceState: patient.demoLabel || context.sourceState,
    safetyStatement:
      intentRoute?.safetyStatement ||
      'Patient Path supports operational visibility and human-reviewed workflow guidance only.',
  });
}

function buildEmsPatientPath(patient, index, context) {
  const card = context.cardByPatientId.get(patient.id);
  const intentRoute = ClinicalIntentRouter.routeComplaint(patient.complaint);
  const timing = Object.freeze({
    doorToKnownMinutes: 0,
    doorToRiskMinutes: 0,
    doorToQueueMinutes: 0,
    doorToActionMinutes: patient.handoffStatus === 'Arriving' ? 1 : 2,
    doorToDestinationMinutes: Math.max(1, patient.etaMinutes),
    doorToDirectionMinutes: patient.handoffStatus === 'Arriving' ? 1 : 2,
  });

  return Object.freeze({
    patientId: patient.id,
    displayName: patient.patientLabel,
    arrivalMode: 'EMS',
    complaint: patient.complaint,
    currentState: patient.handoffStatus,
    journeyStateId: 'arrival',
    riskScore: ['critical', 'high'].includes(patient.riskLevel) ? 90 : 60,
    riskLevel: patient.riskLevel,
    assignedQueue: Object.freeze({
      id: 'ems-pre-arrival-queue',
      label: 'EMS Pre-Arrival Queue',
      riskLevel: patient.riskLevel,
      waitTime: patient.etaMinutes,
    }),
    calculators: Object.freeze(intentRoute?.calculators || []),
    workflows: Object.freeze(intentRoute?.workflows || []),
    protocols: Object.freeze(intentRoute?.protocols || []),
    destination: Object.freeze({
      id: 'ed-arrival-triage',
      label: 'ED arrival and triage',
      status: 'Inbound handoff review',
      owner: 'Charge nurse',
    }),
    nextAction: `Review ED Handoff Summary from ${patient.unit} before arrival.`,
    blockers: Object.freeze(patient.notificationStatus !== 'sent' ? ['ED notification is pending.'] : []),
    alerts: Object.freeze(card?.alerts || [`${patient.handoffStatus} EMS handoff`]),
    timing,
    edHandoffSummary: patient.edHandoffSummary,
    handoffStatus: patient.handoffStatus,
    etaMinutes: patient.etaMinutes,
    sourceState: 'EMS Handoff Pipeline',
    safetyStatement:
      intentRoute?.safetyStatement ||
      'EMS handoff supports ED preparation and patient journey visibility only. It does not diagnose, treat, or determine disposition.',
    sortIndex: index,
  });
}

function getMetricStatus(value, target) {
  if (value <= target) return 'on-target';
  if (value <= target * 1.5) return 'watch';
  return 'delayed';
}

function buildMetrics(patients) {
  const timingValues = (metricId) => patients.map((patient) => patient.timing[metricId]);
  const doorToDirectionValues = timingValues('doorToDirectionMinutes');
  const highRiskPatients = patients.filter((patient) => ['critical', 'high'].includes(patient.riskLevel));
  const highRiskNotActioned = highRiskPatients.filter((patient) => patient.timing.doorToActionMinutes > 10);
  const patientsWithoutDirection = patients.filter((patient) => !patient.nextAction || patient.timing.doorToDirectionMinutes > 15);

  return Object.freeze({
    patientCount: patients.length,
    highRiskPatients: highRiskPatients.length,
    patientsWithoutDirection: patientsWithoutDirection.length,
    highRiskNotActioned: highRiskNotActioned.length,
    doorToKnownMinutes: average(timingValues('doorToKnownMinutes')),
    doorToRiskMinutes: average(timingValues('doorToRiskMinutes')),
    doorToQueueMinutes: average(timingValues('doorToQueueMinutes')),
    doorToActionMinutes: average(timingValues('doorToActionMinutes')),
    doorToDestinationMinutes: average(timingValues('doorToDestinationMinutes')),
    doorToDirectionMinutes: median(doorToDirectionValues),
    p90DoorToDirectionMinutes: percentile(doorToDirectionValues, 90),
    targetDoorToDirectionMinutes: 10,
    targetCompliance: Math.round(
      (patients.filter((patient) => patient.timing.doorToDirectionMinutes <= 10).length / Math.max(patients.length, 1)) * 100
    ),
    status: getMetricStatus(median(doorToDirectionValues), 10),
  });
}

function buildMilestones(metrics) {
  return Object.freeze(
    PATIENT_PATH_MILESTONES.map((milestone) =>
      Object.freeze({
        ...milestone,
        value: metrics[milestone.metricId] ?? metrics.doorToDirectionMinutes,
        unit: 'min',
        status: getMetricStatus(metrics[milestone.metricId] ?? metrics.doorToDirectionMinutes, milestone.targetMinutes),
      })
    )
  );
}

function buildRecommendations(patients, queueDashboard, capacityDashboard, referralDashboard) {
  const recommendations = [] as any[];
  const delayedPatients = patients
    .filter((patient) => patient.timing.doorToDirectionMinutes > 10 || patient.blockers.length > 0)
    .slice(0, 5);

  for (const patient of delayedPatients) {
    recommendations.push(
      Object.freeze({
        id: `${patient.patientId}-direction-review`,
        patientId: patient.patientId,
        title: `Review ${patient.displayName}`,
        priority: ['critical', 'high'].includes(patient.riskLevel) ? 'high' : 'medium',
        rationale:
          patient.blockers[0] ||
          `${patient.displayName} has Door-to-Direction time of ${patient.timing.doorToDirectionMinutes} minutes.`,
        action: patient.nextAction,
      })
    );
  }

  return Object.freeze([
    ...recommendations,
    ...queueDashboard.recommendations.slice(0, 2),
    ...capacityDashboard.recommendations.slice(0, 2),
    ...referralDashboard.recommendations.slice(0, 2),
  ]);
}

function buildContext() {
  const demoEnvironment = EmergencyDemoEnvironmentService.getDemoEnvironment();
  const emsPreArrival = EmsPreArrivalPipelineService.getPreArrivalDashboard();
  const whiteboard = EmergencyWhiteboardService.getWhiteboard();
  const queueDashboard = QueueIntelligenceService.getQueueDashboard();
  const referralDashboard = ReferralHub.getReferralDashboard();
  const boardingDashboard = BoardingIntelligenceEngine.getBoardingDashboard();
  const capacityDashboard = EmergencyCapacityIntelligenceService.getCapacityDashboard();
  const throughput = DoorToDoctorIntelligenceService.getDashboard();

  return {
    demoEnvironment,
    emsPreArrival,
    whiteboard,
    queueDashboard,
    referralDashboard,
    boardingDashboard,
    capacityDashboard,
    throughput,
    sourceState: demoEnvironment.sourceState,
    cardByPatientId: new Map(whiteboard.cards.map((card) => [card.patientId, card])),
    queueById: new Map(queueDashboard.queues.map((queue) => [queue.id, queue])),
    referralByPatient: buildReferralLookup(referralDashboard),
    boardingByPatient: buildBoardingLookup(boardingDashboard),
    capacity: capacityDashboard,
    boarding: boardingDashboard,
  };
}

export const EmergencyPatientPathService = Object.freeze({
  getPatientPathDashboard() {
    const context = buildContext();
    const patients = Object.freeze(
      [
        ...context.emsPreArrival.queue.incomingPatients.map((patient, index) => buildEmsPatientPath(patient, index, context)),
        ...context.demoEnvironment.patients.map((patient, index) =>
          buildPatientPath(patient, index + context.emsPreArrival.queue.incomingPatients.length, context)
        ),
      ]
    );
    const metrics = buildMetrics(patients);

    return Object.freeze({
      id: 'emergency-patient-path',
      title: 'Emergency Patient Path',
      route: '/workspace/emergency/patient-path',
      sourceState: context.sourceState,
      milestones: buildMilestones(metrics),
      patients,
      metrics,
      recommendations: buildRecommendations(
        patients,
        context.queueDashboard,
        context.capacityDashboard,
        context.referralDashboard
      ),
      throughput: context.throughput,
      salesNarrative:
        'CareDroid ED OS turns every arrival into a known, risk-routed, queue-assigned, action-ready patient flow object.',
      safetyStatement:
        'Patient Path is operational routing support only. It does not diagnose, treat, move patients, or make autonomous clinical decisions.',
    });
  },

  getPatientPathForPatient(patientId) {
    return this.getPatientPathDashboard().patients.find((patient) => patient.patientId === patientId) || null;
  },

  getDoorToDirectionMetrics() {
    return this.getPatientPathDashboard().metrics;
  },

  getPathRecommendations() {
    return this.getPatientPathDashboard().recommendations;
  },
});

export const getPatientPathDashboard =
  EmergencyPatientPathService.getPatientPathDashboard.bind(EmergencyPatientPathService);
export const getPatientPathForPatient =
  EmergencyPatientPathService.getPatientPathForPatient.bind(EmergencyPatientPathService);
export const getDoorToDirectionMetrics =
  EmergencyPatientPathService.getDoorToDirectionMetrics.bind(EmergencyPatientPathService);
export const getPathRecommendations =
  EmergencyPatientPathService.getPathRecommendations.bind(EmergencyPatientPathService);

export default EmergencyPatientPathService;

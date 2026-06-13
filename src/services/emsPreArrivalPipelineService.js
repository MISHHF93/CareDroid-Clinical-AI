export const EMS_PRE_ARRIVAL_WORKFLOW = Object.freeze([
  Object.freeze({
    id: 'ems-assessment',
    label: 'EMS Assessment',
    description: 'EMS crew captures field assessment, mechanism, symptoms, and immediate concerns.',
  }),
  Object.freeze({
    id: 'complaint',
    label: 'Complaint',
    description: 'Chief complaint and field impression are structured for ED routing.',
  }),
  Object.freeze({
    id: 'vitals',
    label: 'Vitals',
    description: 'Field vitals and trends are prepared for triage review.',
  }),
  Object.freeze({
    id: 'risk-profile',
    label: 'Risk Profile',
    description: 'Risk score bundle summarizes high-risk signals without making autonomous decisions.',
  }),
  Object.freeze({
    id: 'ed-notification',
    label: 'ED Notification',
    description: 'ED receives structured pre-arrival context and preparation prompts.',
  }),
  Object.freeze({
    id: 'arrival',
    label: 'Arrival',
    description: 'Patient enters the Emergency OS arrival state with EMS context attached.',
  }),
]);

export const EMS_HANDOFF_STATUSES = Object.freeze(['Incoming', 'En Route', 'Arriving', 'Arrived']);

export const DEFAULT_EMS_INCOMING_PATIENTS = Object.freeze([
  Object.freeze({
    id: 'EMS-1048',
    patientLabel: 'Inbound EMS 1048',
    unit: 'Medic 12',
    etaMinutes: 4,
    complaint: 'Chest pain with diaphoresis',
    vitals: Object.freeze({
      bloodPressure: '92/58',
      heartRate: 118,
      respiratoryRate: 24,
      oxygenSaturation: '93%',
      temperature: '37.2 C',
    }),
    riskScoreBundle: Object.freeze([
      Object.freeze({ id: 'shock-index', label: 'Shock Index', value: '1.28', riskLevel: 'high' }),
      Object.freeze({ id: 'heart', label: 'HEART context', value: 'Needs ED review', riskLevel: 'medium' }),
    ]),
    riskIndicators: Object.freeze(['hypotension', 'tachycardia', 'diaphoresis', 'possible ACS']),
    riskLevel: 'critical',
    handoffSummary:
      'Medic 12 inbound with chest pain, hypotension, tachycardia, and diaphoresis. Prepare high-risk cardiac review and clinician handoff.',
    notificationStatus: 'sent',
    journeyState: 'arrival',
  }),
  Object.freeze({
    id: 'EMS-1049',
    patientLabel: 'Inbound EMS 1049',
    unit: 'Medic 4',
    etaMinutes: 12,
    complaint: 'Possible stroke symptoms',
    vitals: Object.freeze({
      bloodPressure: '168/94',
      heartRate: 96,
      respiratoryRate: 18,
      oxygenSaturation: '96%',
      temperature: '36.9 C',
    }),
    riskScoreBundle: Object.freeze([
      Object.freeze({ id: 'nihss', label: 'NIHSS context', value: 'Screen positive', riskLevel: 'high' }),
      Object.freeze({ id: 'stroke-window', label: 'Stroke window', value: 'Under review', riskLevel: 'critical' }),
    ]),
    riskIndicators: Object.freeze(['facial droop', 'speech change', 'stroke window review']),
    riskLevel: 'critical',
    handoffSummary:
      'Medic 4 inbound with facial droop and speech change. Stroke window review and CT readiness recommended for ED team review.',
    notificationStatus: 'sent',
    journeyState: 'arrival',
  }),
  Object.freeze({
    id: 'EMS-1050',
    patientLabel: 'Inbound EMS 1050',
    unit: 'Medic 7',
    etaMinutes: 18,
    complaint: 'Shortness of breath',
    vitals: Object.freeze({
      bloodPressure: '136/82',
      heartRate: 104,
      respiratoryRate: 28,
      oxygenSaturation: '90%',
      temperature: '38.1 C',
    }),
    riskScoreBundle: Object.freeze([
      Object.freeze({ id: 'news2', label: 'NEWS2 context', value: 'Elevated respiratory risk', riskLevel: 'high' }),
      Object.freeze({ id: 'wells-pe', label: 'Wells PE context', value: 'Consider review', riskLevel: 'medium' }),
    ]),
    riskIndicators: Object.freeze(['tachypnea', 'hypoxia', 'fever', 'respiratory distress']),
    riskLevel: 'high',
    handoffSummary:
      'Medic 7 inbound with dyspnea, fever, tachypnea, and low oxygen saturation. Prepare respiratory protocol and triage review.',
    notificationStatus: 'pending',
    journeyState: 'arrival',
  }),
]);

const RISK_PRIORITY = Object.freeze({
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
});

function deriveHandoffStatus(etaMinutes = 0) {
  if (etaMinutes <= 0) return 'Arrived';
  if (etaMinutes <= 5) return 'Arriving';
  if (etaMinutes <= 15) return 'En Route';
  return 'Incoming';
}

function formatVitals(vitals = {}) {
  return `BP ${vitals.bloodPressure || 'pending'}, HR ${vitals.heartRate || 'pending'}, RR ${vitals.respiratoryRate || 'pending'}, SpO2 ${vitals.oxygenSaturation || 'pending'}, Temp ${vitals.temperature || 'pending'}`;
}

function buildEdHandoffSummary(patient) {
  return Object.freeze({
    id: `${patient.id}-ed-handoff-summary`,
    title: 'ED Handoff Summary',
    patientId: patient.id,
    patientLabel: patient.patientLabel,
    unit: patient.unit,
    status: patient.handoffStatus,
    etaMinutes: patient.etaMinutes,
    complaint: patient.complaint,
    vitals: patient.vitals,
    riskIndicators: patient.riskIndicators,
    riskScoreBundle: patient.riskScoreBundle,
    summary:
      patient.handoffSummary ||
      `${patient.unit} inbound with ${patient.complaint}. ETA ${patient.etaMinutes} minutes. Risk indicators: ${patient.riskIndicators.join(', ') || 'pending'}.`,
    attachedToPatientJourney: true,
    journeyAttachment: Object.freeze({
      journeyStateId: 'arrival',
      status: 'attached',
      label: 'EMS handoff attached before arrival',
    }),
  });
}

function normalizeIncomingPatient(patient = {}) {
  const etaMinutes = Number(patient.etaMinutes || 0);
  const vitals = Object.freeze({
    bloodPressure: patient.vitals?.bloodPressure || 'pending',
    heartRate: patient.vitals?.heartRate || 'pending',
    respiratoryRate: patient.vitals?.respiratoryRate || 'pending',
    oxygenSaturation: patient.vitals?.oxygenSaturation || 'pending',
    temperature: patient.vitals?.temperature || 'pending',
  });
  const normalized = {
    id: patient.id || 'EMS-UNKNOWN',
    patientLabel: patient.patientLabel || patient.id || 'Inbound EMS patient',
    unit: patient.unit || 'EMS unit',
    etaMinutes,
    complaint: patient.complaint || 'Complaint pending',
    vitals,
    riskScoreBundle: Object.freeze([...(patient.riskScoreBundle || [])]),
    riskIndicators: Object.freeze([...(patient.riskIndicators || [])]),
    riskLevel: patient.riskLevel || 'medium',
    handoffSummary: patient.handoffSummary || 'EMS handoff summary pending.',
    notificationStatus: patient.notificationStatus || 'pending',
    handoffStatus: patient.handoffStatus || deriveHandoffStatus(etaMinutes),
    journeyState: patient.journeyState || 'ems-prearrival',
  };

  return Object.freeze({
    ...normalized,
    vitalsSummary: formatVitals(vitals),
    edHandoffSummary: buildEdHandoffSummary(normalized),
  });
}

function sortIncomingPatients(patients) {
  return [...patients].sort((a, b) => {
    const riskDelta = (RISK_PRIORITY[b.riskLevel] || 0) - (RISK_PRIORITY[a.riskLevel] || 0);
    if (riskDelta) return riskDelta;
    return a.etaMinutes - b.etaMinutes;
  });
}

export const EmsPreArrivalPipelineService = Object.freeze({
  getWorkflow() {
    return EMS_PRE_ARRIVAL_WORKFLOW;
  },

  getIncomingPatients(patients = DEFAULT_EMS_INCOMING_PATIENTS) {
    return Object.freeze(sortIncomingPatients(patients.map(normalizeIncomingPatient)));
  },

  getPreArrivalQueue(patients = DEFAULT_EMS_INCOMING_PATIENTS) {
    const incomingPatients = this.getIncomingPatients(patients);
    return Object.freeze({
      id: 'ems-pre-arrival-queue',
      label: 'Pre-arrival queue',
      count: incomingPatients.length,
      incomingPatients,
      statusCounts: Object.freeze(
        Object.fromEntries(
          EMS_HANDOFF_STATUSES.map((status) => [
            status,
            incomingPatients.filter((patient) => patient.handoffStatus === status).length,
          ])
        )
      ),
      nextArrival: incomingPatients.length ? incomingPatients.reduce((soonest, patient) => (patient.etaMinutes < soonest.etaMinutes ? patient : soonest)) : null,
      criticalCount: incomingPatients.filter((patient) => patient.riskLevel === 'critical').length,
      pendingNotifications: incomingPatients.filter((patient) => patient.notificationStatus !== 'sent').length,
    });
  },

  getPreArrivalMetrics(patients = DEFAULT_EMS_INCOMING_PATIENTS) {
    const queue = this.getPreArrivalQueue(patients);
    const etaValues = queue.incomingPatients.map((patient) => patient.etaMinutes);
    return Object.freeze({
      incomingCount: queue.count,
      criticalCount: queue.criticalCount,
      pendingNotifications: queue.pendingNotifications,
      nextEtaMinutes: queue.nextArrival?.etaMinutes || 0,
      averageEtaMinutes: etaValues.length
        ? Math.round(etaValues.reduce((sum, eta) => sum + eta, 0) / etaValues.length)
        : 0,
      handoffReadyCount: queue.incomingPatients.filter((patient) => patient.handoffSummary && patient.riskScoreBundle.length).length,
      whiteboardVisibleCount: queue.incomingPatients.filter((patient) => patient.handoffStatus !== 'Arrived').length,
      journeyAttachmentCount: queue.incomingPatients.filter((patient) => patient.edHandoffSummary?.attachedToPatientJourney).length,
    });
  },

  getPreArrivalRecommendations(patients = DEFAULT_EMS_INCOMING_PATIENTS) {
    return Object.freeze(
      this.getIncomingPatients(patients)
        .filter((patient) => patient.riskLevel === 'critical' || patient.notificationStatus !== 'sent' || patient.etaMinutes <= 10)
        .map((patient) =>
          Object.freeze({
            id: `${patient.id}-ed-prep`,
            patientId: patient.id,
            title: `Prepare for ${patient.patientLabel}`,
            priority: patient.riskLevel,
            rationale: `${patient.unit} ETA ${patient.etaMinutes} min: ${patient.complaint}.`,
            action: 'Review EMS handoff, risk score bundle, room readiness, and clinician notification before arrival.',
          })
        )
    );
  },

  getPreArrivalDashboard(patients = DEFAULT_EMS_INCOMING_PATIENTS) {
    const queue = this.getPreArrivalQueue(patients);
    return Object.freeze({
      pipelineId: 'ems-handoff-pipeline',
      title: 'EMS Handoff Pipeline',
      inputSchema: Object.freeze(['complaint', 'vitals', 'ETA', 'risk indicators']),
      statuses: EMS_HANDOFF_STATUSES,
      output: 'ED Handoff Summary',
      workflow: this.getWorkflow(),
      queue,
      metrics: this.getPreArrivalMetrics(patients),
      edHandoffSummaries: Object.freeze(queue.incomingPatients.map((patient) => patient.edHandoffSummary)),
      recommendations: this.getPreArrivalRecommendations(patients),
      safetyStatement:
        'EMS pre-arrival context supports ED preparation only. Clinicians remain responsible for triage, diagnosis, orders, and disposition.',
    });
  },
});

export const getEmsPreArrivalWorkflow = EmsPreArrivalPipelineService.getWorkflow.bind(EmsPreArrivalPipelineService);
export const getIncomingPatients = EmsPreArrivalPipelineService.getIncomingPatients.bind(EmsPreArrivalPipelineService);
export const getPreArrivalQueue = EmsPreArrivalPipelineService.getPreArrivalQueue.bind(EmsPreArrivalPipelineService);
export const getPreArrivalMetrics = EmsPreArrivalPipelineService.getPreArrivalMetrics.bind(EmsPreArrivalPipelineService);
export const getPreArrivalRecommendations = EmsPreArrivalPipelineService.getPreArrivalRecommendations.bind(
  EmsPreArrivalPipelineService
);
export const getPreArrivalDashboard = EmsPreArrivalPipelineService.getPreArrivalDashboard.bind(
  EmsPreArrivalPipelineService
);

export default EmsPreArrivalPipelineService;

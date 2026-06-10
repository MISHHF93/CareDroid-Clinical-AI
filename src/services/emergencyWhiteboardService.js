import EmergencyDemoEnvironmentService from './emergencyDemoEnvironmentService';
import QueueIntelligenceService from './queueIntelligenceService';

export const EMERGENCY_WHITEBOARD_COLUMNS = Object.freeze([
  Object.freeze({ id: 'arrival', label: 'Arrival', sourceStates: ['ems-prearrival'] }),
  Object.freeze({ id: 'triage', label: 'Triage', sourceStates: ['triage-queue'] }),
  Object.freeze({ id: 'waiting', label: 'Waiting', sourceStates: ['waiting-room', 'provider-queue'] }),
  Object.freeze({ id: 'assessment', label: 'Assessment', sourceStates: ['active-assessment'] }),
  Object.freeze({ id: 'orders', label: 'Orders', sourceStates: [] }),
  Object.freeze({ id: 'results', label: 'Results', sourceStates: ['results-pending'] }),
  Object.freeze({ id: 'disposition', label: 'Disposition', sourceStates: ['referral-pending', 'boarding', 'discharge-ready'] }),
]);

const COLUMN_BY_STATE = Object.freeze(
  Object.fromEntries(
    EMERGENCY_WHITEBOARD_COLUMNS.flatMap((column) =>
      column.sourceStates.map((state) => [state, column.id])
    )
  )
);

function patientAge(patientId = '') {
  const numeric = Number(String(patientId).replace(/\D/g, '').slice(-2));
  return Number.isFinite(numeric) ? 22 + (numeric % 64) : 45;
}

function mapPatientToCard(patient, index) {
  const currentColumn = COLUMN_BY_STATE[patient.journeyState] || (index % 5 === 0 ? 'orders' : 'waiting');
  const riskLevel = patient.riskScore >= 85 ? 'critical' : patient.riskScore >= 70 ? 'high' : patient.riskScore >= 50 ? 'medium' : 'low';
  const alerts = [
    patient.waitDuration > 60 ? 'Waiting over target' : null,
    patient.reassessmentNeed ? 'Reassessment due' : null,
    riskLevel === 'critical' ? 'Critical review needed' : null,
    patient.journeyState === 'boarding' ? 'Boarding pressure' : null,
    patient.journeyState === 'referral-pending' ? 'Referral delay watch' : null,
  ].filter(Boolean);

  return Object.freeze({
    patientId: patient.patientId,
    displayName: patient.label,
    age: patientAge(patient.patientId),
    complaint: patient.complaint,
    riskLevel,
    currentState: patient.journeyLabel,
    currentColumn,
    waitingTime: patient.waitDuration,
    alerts: Object.freeze(alerts),
    assignedQueue: patient.journeyLabel,
    nextAction: patient.reassessmentNeed
      ? 'Review reassessment recommendation'
      : currentColumn === 'disposition'
        ? 'Review disposition blocker'
        : 'Continue ED workflow review',
    sourceState: 'Demo data · No live integration',
  });
}

export const EmergencyWhiteboardService = Object.freeze({
  getWhiteboard() {
    const demoEnvironment = EmergencyDemoEnvironmentService.getDemoEnvironment();
    const queueDashboard = QueueIntelligenceService.getQueueDashboard();
    const cards = Object.freeze(demoEnvironment.patients.slice(0, 48).map(mapPatientToCard));
    const columns = Object.freeze(
      EMERGENCY_WHITEBOARD_COLUMNS.map((column) => {
        const columnCards = cards.filter((card) => card.currentColumn === column.id);
        return Object.freeze({
          ...column,
          cards: Object.freeze(columnCards),
          count: columnCards.length,
          highRiskCount: columnCards.filter((card) => ['high', 'critical'].includes(card.riskLevel)).length,
          oldestWaitMinutes: Math.max(0, ...columnCards.map((card) => card.waitingTime)),
        });
      })
    );
    const bottleneckColumn = [...columns].sort((a, b) => b.oldestWaitMinutes - a.oldestWaitMinutes)[0];

    return Object.freeze({
      route: '/workspace/emergency/whiteboard',
      title: 'Emergency Digital Whiteboard',
      sourceState: demoEnvironment.sourceState,
      columns,
      cards,
      filters: Object.freeze(['Acuity', 'Chief complaint', 'Waiting over target', 'Reassessment due', 'EMS arrivals', 'Alerts only', 'Disposition type']),
      searchFields: Object.freeze(['patient ID', 'chief complaint', 'queue', 'alert', 'workflow']),
      summary: Object.freeze({
        totalActivePatients: cards.length,
        waitingPatients: cards.filter((card) => card.currentColumn === 'waiting').length,
        highRiskPatients: cards.filter((card) => ['high', 'critical'].includes(card.riskLevel)).length,
        reassessmentDue: cards.filter((card) => card.alerts.includes('Reassessment due')).length,
        longestWaitMinutes: Math.max(0, ...cards.map((card) => card.waitingTime)),
        bottleneckColumn: bottleneckColumn?.label || 'Waiting',
        activeAlerts: cards.reduce((sum, card) => sum + card.alerts.length, 0),
        queueBottlenecks: queueDashboard.metrics.bottleneckCount,
      }),
      safetyStatement:
        'Whiteboard data is demo/local flow tracking. It supports human review only and does not move patients or change clinical state.',
    });
  },
});

export const getEmergencyWhiteboard = EmergencyWhiteboardService.getWhiteboard.bind(EmergencyWhiteboardService);

export default EmergencyWhiteboardService;

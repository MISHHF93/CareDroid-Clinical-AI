import EdAutomationMarketplace from './edAutomationMarketplace';
import EmergencyKPILayerService from './emergencyKpiLayerService';
import QueueIntelligenceService from './queueIntelligenceService';

const ROI_BASELINES = Object.freeze({
  'emergency-automated-triage-matrix': Object.freeze({
    minutesPerRun: 8,
    clicksPerRun: 12,
    queueId: 'triage-queue',
    kpiId: 'doorToDoctor',
    eligibleEvents: 42,
    runs: 31,
  }),
  'emergency-rag-evidence-retrieval': Object.freeze({
    minutesPerRun: 6,
    clicksPerRun: 10,
    queueId: 'provider-queue',
    kpiId: 'doorToDoctor',
    eligibleEvents: 36,
    runs: 27,
  }),
  'emergency-referral-routing': Object.freeze({
    minutesPerRun: 18,
    clicksPerRun: 16,
    queueId: 'referral-queue',
    kpiId: 'referralDelay',
    eligibleEvents: 18,
    runs: 11,
  }),
  'emergency-surge-staffing': Object.freeze({
    minutesPerRun: 14,
    clicksPerRun: 9,
    queueId: 'waiting-room',
    kpiId: 'lengthOfStay',
    eligibleEvents: 12,
    runs: 6,
  }),
  'emergency-simulation-academy': Object.freeze({
    minutesPerRun: 20,
    clicksPerRun: 14,
    queueId: 'reassessment-queue',
    kpiId: 'simulation_completion',
    eligibleEvents: 10,
    runs: 6,
  }),
  'emergency-medical-iot-monitoring': Object.freeze({
    minutesPerRun: 12,
    clicksPerRun: 8,
    queueId: 'ems-pre-arrival-queue',
    kpiId: 'lengthOfStay',
    eligibleEvents: 9,
    runs: 4,
  }),
  'emergency-documentation-integrity': Object.freeze({
    minutesPerRun: 10,
    clicksPerRun: 11,
    queueId: 'discharge-queue',
    kpiId: 'dischargeTime',
    eligibleEvents: 20,
    runs: 9,
  }),
  'emergency-discharge-summary-drafting': Object.freeze({
    minutesPerRun: 12,
    clicksPerRun: 13,
    queueId: 'discharge-queue',
    kpiId: 'dischargeTime',
    eligibleEvents: 14,
    runs: 7,
  }),
  'emergency-virtual-ed': Object.freeze({
    minutesPerRun: 16,
    clicksPerRun: 12,
    queueId: 'ems-pre-arrival-queue',
    kpiId: 'doorToDoctor',
    eligibleEvents: 8,
    runs: 2,
  }),
  'emergency-prior-authorization': Object.freeze({
    minutesPerRun: 18,
    clicksPerRun: 15,
    queueId: 'admission-queue',
    kpiId: 'lengthOfStay',
    eligibleEvents: 6,
    runs: 1,
  }),
});

function boundedPercent(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreProfile({ timeSaved, clicksReduced, queueImpact, throughputImpact, adoption }) {
  const timeSavedScore = Math.min(100, timeSaved.totalMinutes / 4);
  const clicksReducedScore = Math.min(100, clicksReduced.totalClicks / 5);
  const queueImpactScore = Math.min(100, queueImpact.estimatedMinutesReduced * 2);
  const throughputImpactScore = Math.min(100, throughputImpact.estimatedMinutesReduced * 2);
  const adoptionScore = adoption.adoptionRate;
  return Math.round(
    timeSavedScore * 0.3 +
      clicksReducedScore * 0.15 +
      queueImpactScore * 0.25 +
      throughputImpactScore * 0.2 +
      adoptionScore * 0.1,
  );
}

function buildProfile(module, queueById, kpiById) {
  const baseline = ROI_BASELINES[module.automationId] || {
    minutesPerRun: 5,
    clicksPerRun: 6,
    queueId: 'waiting-room',
    kpiId: 'doorToDoctor',
    eligibleEvents: 5,
    runs: module.enabled ? 3 : 1,
  };
  const queue = queueById[baseline.queueId] || {};
  const kpi = kpiById[baseline.kpiId] || {};
  const adoptionRate = boundedPercent((baseline.runs / Math.max(baseline.eligibleEvents, 1)) * 100);
  const timeSaved = {
    minutesPerRun: baseline.minutesPerRun,
    totalMinutes: baseline.minutesPerRun * baseline.runs,
    source: 'Demo estimate from Emergency automation baseline',
  };
  const clicksReduced = {
    clicksPerRun: baseline.clicksPerRun,
    totalClicks: baseline.clicksPerRun * baseline.runs,
    source: 'Demo estimate from consolidated Emergency workspace launch',
  };
  const queueImpact = {
    queueId: baseline.queueId,
    queueMetric: queue.label || baseline.queueId,
    estimatedMinutesReduced: Math.round(Math.min(queue.waitTime || 0, baseline.runs * 2.5)),
    source: 'QueueIntelligenceService demo queue snapshot',
  };
  const throughputImpact = {
    kpiId: baseline.kpiId,
    estimatedMinutesReduced: Math.round(
      Math.min(kpi.value || baseline.runs * 2, baseline.runs * 2),
    ),
    source: 'EmergencyKPILayer demo KPI snapshot',
  };
  const adoption = {
    eligibleEvents: baseline.eligibleEvents,
    automationRuns: baseline.runs,
    adoptionRate,
    repeatUseRate: boundedPercent(adoptionRate * 0.68),
  };
  const status =
    module.subscriptionTier === 'enterprise' ? 'roadmap' : module.enabled ? 'core' : 'expansion';

  return Object.freeze({
    automationId: module.automationId,
    title: module.title,
    status,
    measurementState: module.enabled ? 'demo-estimate' : 'needs-events',
    runs: baseline.runs,
    adoptionRate,
    timeSaved: Object.freeze(timeSaved),
    clicksReduced: Object.freeze(clicksReduced),
    queueImpact: Object.freeze(queueImpact),
    throughputImpact: Object.freeze(throughputImpact),
    adoption: Object.freeze(adoption),
    valueScore: scoreProfile({ timeSaved, clicksReduced, queueImpact, throughputImpact, adoption }),
    roiEstimate: module.roiEstimate,
    safetyStatement:
      'ROI measures workflow value only; every automation output remains human-reviewed.',
  });
}

export const AutomationROIService = Object.freeze({
  getAutomationRoiDashboard(automations) {
    const marketplace = EdAutomationMarketplace.getMarketplaceDashboard(automations);
    const queueDashboard = QueueIntelligenceService.getQueueDashboard();
    const kpiLayer = EmergencyKPILayerService.getKpiLayer();
    const queueById = Object.fromEntries(queueDashboard.queues.map((queue) => [queue.id, queue]));
    const profiles = Object.freeze(
      marketplace.modules
        .map((module) => buildProfile(module, queueById, kpiLayer.metricById))
        .sort((a, b) => b.valueScore - a.valueScore),
    );

    return Object.freeze({
      route: '/workspace/emergency/automation-roi',
      title: 'Emergency Automation ROI',
      summaryWindow: 'current demo shift',
      sourceState: 'Demo estimates · no live automation event stream',
      totals: Object.freeze({
        automationsTracked: profiles.length,
        totalRuns: profiles.reduce((sum, profile) => sum + profile.runs, 0),
        adoptedAutomations: profiles.filter((profile) => profile.adoptionRate >= 50).length,
        estimatedMinutesSaved: profiles.reduce(
          (sum, profile) => sum + profile.timeSaved.totalMinutes,
          0,
        ),
        estimatedClicksReduced: profiles.reduce(
          (sum, profile) => sum + profile.clicksReduced.totalClicks,
          0,
        ),
        queueMinutesReduced: profiles.reduce(
          (sum, profile) => sum + profile.queueImpact.estimatedMinutesReduced,
          0,
        ),
        throughputMinutesReduced: profiles.reduce(
          (sum, profile) => sum + profile.throughputImpact.estimatedMinutesReduced,
          0,
        ),
      }),
      automations: profiles,
      metricDefinitions: Object.freeze([
        'time saved',
        'clicks reduced',
        'queue impact',
        'throughput impact',
        'adoption',
      ]),
      safetyStatement:
        'Automation ROI measures workflow value only. It does not validate autonomous clinical, referral, discharge, admission, or escalation decisions.',
    });
  },
});

export const getAutomationRoiDashboard =
  AutomationROIService.getAutomationRoiDashboard.bind(AutomationROIService);

export default AutomationROIService;

import BoardingIntelligenceEngine from './boardingIntelligenceEngine';
import DoorToDoctorIntelligenceService from './doorToDoctorIntelligenceService';
import EmsOffloadCommandCenterService from './emsOffloadCommandCenterService';
import QueueIntelligenceService from './queueIntelligenceService';
import ReferralHub from './referralHub';

function buildMetric({
  metricId,
  label,
  value,
  unit = 'minutes',
  median,
  p90,
  longestActiveDuration,
  target,
  trend = 'worsening',
  sourceSignals = [],
  dataState = 'demo',
}) {
  const numericValue = Number(value || 0);
  const medianValue = Number(median ?? numericValue);
  const p90Value = Number(p90 ?? Math.round(numericValue * 1.25));
  const longestValue = Number(longestActiveDuration ?? Math.round(numericValue * 1.5));
  const compliance = target ? Math.max(0, Math.min(100, Math.round((target / Math.max(numericValue, 1)) * 100))) : null;
  return Object.freeze({
    metricId,
    label,
    value: numericValue,
    unit,
    median: medianValue,
    p90: p90Value,
    longestActiveDuration: longestValue,
    summaryWindow: 'current demo shift',
    target,
    targetCompliance: compliance,
    trend,
    sourceSignals: Object.freeze(sourceSignals),
    dataState,
  });
}

export const EmergencyKPILayerService = Object.freeze({
  getKpiLayer() {
    const doorToDoctor = DoorToDoctorIntelligenceService.getDashboard();
    const boarding = BoardingIntelligenceEngine.getBoardingDashboard();
    const ems = EmsOffloadCommandCenterService.getDashboard();
    const referral = ReferralHub.getReferralDashboard();
    const queue = QueueIntelligenceService.getQueueDashboard();
    const dischargeQueue = queue.queues.find((item) => item.id === 'discharge-queue') || {};
    const resultsQueue = queue.queues.find((item) => item.id === 'results-queue') || {};
    const admissionQueue = queue.queues.find((item) => item.id === 'admission-queue') || {};

    const metrics = Object.freeze([
      buildMetric({
        metricId: 'doorToDoctor',
        label: 'Door-to-Doctor',
        value: doorToDoctor.kpi.value,
        median: doorToDoctor.kpi.median,
        p90: doorToDoctor.kpi.p90,
        longestActiveDuration: doorToDoctor.kpi.longestActiveWait,
        target: doorToDoctor.targets.doorToDoctorMinutes,
        trend: doorToDoctor.delays.length ? 'worsening' : 'stable',
        sourceSignals: ['arrivalTime', 'triageTime', 'providerTime'],
      }),
      buildMetric({
        metricId: 'lengthOfStay',
        label: 'Length of Stay',
        value: resultsQueue.waitTime + admissionQueue.waitTime + dischargeQueue.waitTime,
        target: 240,
        trend: 'worsening',
        sourceSignals: ['arrival', 'results queue', 'admission queue', 'discharge queue'],
      }),
      buildMetric({
        metricId: 'boardingTime',
        label: 'Boarding Time',
        value: boarding.metrics.boardingTime,
        target: 240,
        trend: boarding.score >= 70 ? 'worsening' : 'stable',
        sourceSignals: ['boarding patients', 'pending beds', 'bed pressure'],
      }),
      buildMetric({
        metricId: 'emsOffload',
        label: 'EMS Offload',
        value: ems.metrics.currentOffloadDelay,
        target: 20,
        trend: ems.metrics.pressureState === 'critical' ? 'worsening' : 'stable',
        sourceSignals: ['ambulance arrival', 'handoff start', 'handoff complete'],
      }),
      buildMetric({
        metricId: 'referralDelay',
        label: 'Referral Delay',
        value: referral.metrics.averageElapsedMinutes,
        target: 45,
        trend: referral.metrics.delayed ? 'worsening' : 'stable',
        sourceSignals: ['referral request', 'department queue', 'acceptance'],
      }),
      buildMetric({
        metricId: 'dischargeTime',
        label: 'Discharge Time',
        value: dischargeQueue.waitTime || 0,
        target: dischargeQueue.targetWaitMinutes || 45,
        trend: dischargeQueue.bottleneck ? 'worsening' : 'stable',
        sourceSignals: ['disposition decision', 'discharge queue', 'encounter closure'],
      }),
    ]);

    return Object.freeze({
      id: 'EmergencyKPILayer',
      label: 'Emergency KPI Layer',
      metrics,
      metricById: Object.freeze(Object.fromEntries(metrics.map((metric) => [metric.metricId, metric]))),
      sourceState: 'Demo data · No live integration',
      safetyStatement:
        'EmergencyKPILayer is the canonical source for ED metrics. Dashboards should render these values instead of recalculating locally.',
    });
  },
});

export default EmergencyKPILayerService;

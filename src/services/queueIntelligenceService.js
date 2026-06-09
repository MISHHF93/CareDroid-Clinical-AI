export const EMERGENCY_QUEUE_IDS = Object.freeze([
  'waiting-room',
  'triage-queue',
  'provider-queue',
  'results-queue',
  'referral-queue',
  'admission-queue',
  'discharge-queue',
]);

export const EMERGENCY_QUEUE_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'waiting-room',
    label: 'Waiting Room',
    description: 'Patients waiting for registration, triage, or room assignment.',
    journeyStates: ['arrival', 'registration', 'waiting'],
    targetWaitMinutes: 20,
    minimumThroughput: 6,
  }),
  Object.freeze({
    id: 'triage-queue',
    label: 'Triage Queue',
    description: 'Patients waiting for vitals, chief complaint review, acuity, and calculator routing.',
    journeyStates: ['triage', 'waiting'],
    targetWaitMinutes: 15,
    minimumThroughput: 5,
  }),
  Object.freeze({
    id: 'provider-queue',
    label: 'Provider Queue',
    description: 'Patients waiting for provider assessment or reassessment.',
    journeyStates: ['assessment', 'reassessment'],
    targetWaitMinutes: 35,
    minimumThroughput: 4,
  }),
  Object.freeze({
    id: 'results-queue',
    label: 'Results Queue',
    description: 'Patients waiting on lab, imaging, telemetry, or external result review.',
    journeyStates: ['orders', 'results', 'reassessment'],
    targetWaitMinutes: 60,
    minimumThroughput: 5,
  }),
  Object.freeze({
    id: 'referral-queue',
    label: 'Referral Queue',
    description: 'Consult, transfer, specialty, and follow-up work waiting for review.',
    journeyStates: ['disposition', 'follow-up'],
    targetWaitMinutes: 45,
    minimumThroughput: 3,
  }),
  Object.freeze({
    id: 'admission-queue',
    label: 'Admission Queue',
    description: 'Admitted ED patients waiting for handoff, bed assignment, or prior authorization review.',
    journeyStates: ['disposition', 'admission'],
    targetWaitMinutes: 60,
    minimumThroughput: 3,
  }),
  Object.freeze({
    id: 'discharge-queue',
    label: 'Discharge Queue',
    description: 'Patients waiting for discharge instructions, summaries, medications, or follow-up closure.',
    journeyStates: ['disposition', 'discharge', 'follow-up'],
    targetWaitMinutes: 45,
    minimumThroughput: 4,
  }),
]);

export const EMERGENCY_QUEUE_DEFINITION_BY_ID = Object.freeze(
  Object.fromEntries(EMERGENCY_QUEUE_DEFINITIONS.map((queue) => [queue.id, queue]))
);

export const DEFAULT_EMERGENCY_QUEUE_STATE = Object.freeze({
  'waiting-room': Object.freeze({
    count: 18,
    waitTime: 42,
    oldestPatient: Object.freeze({ id: 'ED-1042', label: 'ED-1042', waitMinutes: 96, acuity: 'ESI 3' }),
    riskLevel: 'high',
    throughput: 5,
  }),
  'triage-queue': Object.freeze({
    count: 7,
    waitTime: 18,
    oldestPatient: Object.freeze({ id: 'ED-1038', label: 'ED-1038', waitMinutes: 38, acuity: 'ESI 2' }),
    riskLevel: 'critical',
    throughput: 4,
  }),
  'provider-queue': Object.freeze({
    count: 11,
    waitTime: 52,
    oldestPatient: Object.freeze({ id: 'ED-1027', label: 'ED-1027', waitMinutes: 88, acuity: 'ESI 3' }),
    riskLevel: 'high',
    throughput: 3,
  }),
  'results-queue': Object.freeze({
    count: 10,
    waitTime: 68,
    oldestPatient: Object.freeze({ id: 'ED-1019', label: 'ED-1019', waitMinutes: 122, acuity: 'Sepsis review' }),
    riskLevel: 'high',
    throughput: 4,
  }),
  'referral-queue': Object.freeze({
    count: 9,
    waitTime: 50,
    oldestPatient: Object.freeze({ id: 'ED-1011', label: 'ED-1011', waitMinutes: 74, acuity: 'Transfer review' }),
    riskLevel: 'medium',
    throughput: 2,
  }),
  'admission-queue': Object.freeze({
    count: 8,
    waitTime: 84,
    oldestPatient: Object.freeze({ id: 'ED-1007', label: 'ED-1007', waitMinutes: 145, acuity: 'Bed hold' }),
    riskLevel: 'high',
    throughput: 2,
  }),
  'discharge-queue': Object.freeze({
    count: 6,
    waitTime: 39,
    oldestPatient: Object.freeze({ id: 'ED-1004', label: 'ED-1004', waitMinutes: 58, acuity: 'Follow-up pending' }),
    riskLevel: 'medium',
    throughput: 4,
  }),
});

const RISK_WEIGHT = Object.freeze({
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
});

function normalizeQueueState(queueState = DEFAULT_EMERGENCY_QUEUE_STATE) {
  return EMERGENCY_QUEUE_DEFINITIONS.map((definition) => {
    const state = queueState[definition.id] || {};
    const oldestPatient = state.oldestPatient || {};
    return Object.freeze({
      ...definition,
      count: Number(state.count || 0),
      waitTime: Number(state.waitTime || 0),
      oldestPatient: Object.freeze({
        id: oldestPatient.id || 'unknown-patient',
        label: oldestPatient.label || oldestPatient.id || 'Unknown patient',
        waitMinutes: Number(oldestPatient.waitMinutes || 0),
        acuity: oldestPatient.acuity || 'Unknown acuity',
      }),
      riskLevel: state.riskLevel || 'low',
      throughput: Number(state.throughput || 0),
    });
  });
}

function scoreQueue(queue) {
  const waitOverTarget = Math.max(0, queue.waitTime - queue.targetWaitMinutes);
  const oldestOverTarget = Math.max(0, queue.oldestPatient.waitMinutes - queue.targetWaitMinutes * 2);
  const throughputGap = Math.max(0, queue.minimumThroughput - queue.throughput);

  return waitOverTarget + oldestOverTarget + throughputGap * 10 + RISK_WEIGHT[queue.riskLevel] * 15 + queue.count;
}

function getQueueBottleneck(queue) {
  const waitOverTarget = Math.max(0, queue.waitTime - queue.targetWaitMinutes);
  const oldestOverTarget = Math.max(0, queue.oldestPatient.waitMinutes - queue.targetWaitMinutes * 2);
  const throughputGap = Math.max(0, queue.minimumThroughput - queue.throughput);
  const riskScore = RISK_WEIGHT[queue.riskLevel] || 0;
  const earlyWarning = waitOverTarget > 0 || oldestOverTarget > 0 || throughputGap > 0 || riskScore >= 2;

  if (!earlyWarning) return null;

  const severity =
    riskScore >= 3 || waitOverTarget >= 20 || oldestOverTarget >= 30 || throughputGap >= 2 ? 'critical' : 'high';

  return Object.freeze({
    queueId: queue.id,
    label: queue.label,
    severity,
    score: scoreQueue(queue),
    reason:
      waitOverTarget > 0
        ? `${queue.label} wait time is ${waitOverTarget} minutes over target.`
        : `${queue.label} throughput is below target before queue growth becomes obvious.`,
    signals: Object.freeze({
      waitOverTarget,
      oldestOverTarget,
      throughputGap,
      riskLevel: queue.riskLevel,
    }),
  });
}

export const QueueIntelligenceService = Object.freeze({
  getQueues(queueState) {
    return Object.freeze(normalizeQueueState(queueState).map((queue) => Object.freeze({ ...queue, score: scoreQueue(queue) })));
  },

  getQueueBottlenecks(queueState) {
    return Object.freeze(
      normalizeQueueState(queueState)
        .map(getQueueBottleneck)
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
    );
  },

  getQueueMetrics(queueState) {
    const queues = normalizeQueueState(queueState);
    const bottlenecks = this.getQueueBottlenecks(queueState);
    const totalCount = queues.reduce((sum, queue) => sum + queue.count, 0);
    const totalThroughput = queues.reduce((sum, queue) => sum + queue.throughput, 0);
    const weightedWait = queues.reduce((sum, queue) => sum + queue.waitTime * Math.max(queue.count, 1), 0);
    const weight = queues.reduce((sum, queue) => sum + Math.max(queue.count, 1), 0);
    const highestRiskQueue = [...queues].sort((a, b) => scoreQueue(b) - scoreQueue(a))[0];

    return Object.freeze({
      queueCount: queues.length,
      totalCount,
      averageWaitTime: Math.round(weightedWait / weight),
      totalThroughput,
      bottleneckCount: bottlenecks.length,
      highestRiskQueue: highestRiskQueue
        ? Object.freeze({
            queueId: highestRiskQueue.id,
            label: highestRiskQueue.label,
            riskLevel: highestRiskQueue.riskLevel,
            score: scoreQueue(highestRiskQueue),
          })
        : null,
    });
  },

  getQueueRecommendations(queueState) {
    return Object.freeze(
      this.getQueueBottlenecks(queueState).map((bottleneck) =>
        Object.freeze({
          id: `${bottleneck.queueId}-early-warning`,
          queueId: bottleneck.queueId,
          title: `Review ${bottleneck.label}`,
          priority: bottleneck.severity,
          rationale: bottleneck.reason,
          action: `Route staff attention to ${bottleneck.label.toLowerCase()} before downstream queues degrade.`,
        })
      )
    );
  },

  getQueueDashboard(queueState) {
    const queues = this.getQueues(queueState);
    const bottlenecks = this.getQueueBottlenecks(queueState);
    const bottleneckByQueue = new Map(bottlenecks.map((bottleneck) => [bottleneck.queueId, bottleneck]));

    return Object.freeze({
      queues: Object.freeze(
        queues.map((queue) =>
          Object.freeze({
            ...queue,
            bottleneck: bottleneckByQueue.get(queue.id) || null,
          })
        )
      ),
      bottlenecks,
      metrics: this.getQueueMetrics(queueState),
      recommendations: this.getQueueRecommendations(queueState),
    });
  },
});

export const getQueues = QueueIntelligenceService.getQueues.bind(QueueIntelligenceService);
export const getQueueBottlenecks = QueueIntelligenceService.getQueueBottlenecks.bind(QueueIntelligenceService);
export const getQueueMetrics = QueueIntelligenceService.getQueueMetrics.bind(QueueIntelligenceService);
export const getQueueRecommendations = QueueIntelligenceService.getQueueRecommendations.bind(QueueIntelligenceService);
export const getQueueDashboard = QueueIntelligenceService.getQueueDashboard.bind(QueueIntelligenceService);

export default QueueIntelligenceService;

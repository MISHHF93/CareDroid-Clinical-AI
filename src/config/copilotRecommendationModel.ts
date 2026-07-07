/**
 * Copilot recommendation audit — actionable, prioritized operational guidance.
 * Priority order: queue ? capacity ? boarding ? reassessment.
 * Node-safe.
 */
import { getCopilotRecommendationLimit } from './practitionerCleanup.config';

export const COPILOT_RECOMMENDATION_DOMAIN = Object.freeze({
  QUEUE: 'queue',
  CAPACITY: 'capacity',
  BOARDING: 'boarding',
  REASSESSMENT: 'reassessment',
});

export const COPILOT_DOMAIN_PRIORITY = Object.freeze([
  COPILOT_RECOMMENDATION_DOMAIN.QUEUE,
  COPILOT_RECOMMENDATION_DOMAIN.CAPACITY,
  COPILOT_RECOMMENDATION_DOMAIN.BOARDING,
  COPILOT_RECOMMENDATION_DOMAIN.REASSESSMENT,
]);

export const COPILOT_ROUTES = Object.freeze({
  queues: '/emergency/queues',
  capacity: '/emergency/capacity',
  boarding: '/emergency/capacity?view=boarding',
  reassessment: '/emergency/reassessment',
  whiteboard: '/emergency/whiteboard',
  ems: '/emergency/ems',
});

export const GENERIC_COPILOT_PHRASES = Object.freeze([
  'continue clinical review',
  'monitor closely',
  'monitor the situation',
  'review when possible',
  'consider reviewing',
  'stay vigilant',
  'keep an eye on',
  'may wish to',
  'it may be helpful',
  'as appropriate',
  'when time permits',
  'ask about',
  'try:',
  'query not recognized',
]);

const DOMAIN_RANK = Object.fromEntries(
  COPILOT_DOMAIN_PRIORITY.map((domain, index) => [domain, index]),
);

const SEVERITY_RANK = Object.freeze({ critical: 0, warning: 1, info: 2, stable: 3 });

function domainRank(domain) {
  return DOMAIN_RANK[domain] ?? 99;
}

function severityRank(severity) {
  return SEVERITY_RANK[severity] ?? 99;
}

export function isActionableRecommendation(recommendation) {
  if (!recommendation) return false;
  return Boolean(
    recommendation.route ||
      recommendation.whiteboardFilter ||
      recommendation.eventName ||
      recommendation.patientId,
  );
}

export function isGenericCopilotText(text = '') {
  const normalized = String(text).trim().toLowerCase();
  if (!normalized) return true;
  return GENERIC_COPILOT_PHRASES.some((phrase) => normalized.includes(phrase));
}

function freezeRecommendation(recommendation) {
  return Object.freeze({
    ...recommendation,
    actionable: isActionableRecommendation(recommendation),
    generic: isGenericCopilotText(recommendation.action) || isGenericCopilotText(recommendation.detail),
  });
}

function mapQueueToWhiteboardFilter(queueId) {
  const map = Object.freeze({
    'waiting-room': 'Waiting',
    'triage-queue': 'Waiting',
    'provider-queue': 'Assessment',
    'results-queue': 'Assessment',
    'reassessment-queue': 'Reassess',
    'referral-queue': 'All',
    'admission-queue': 'Boarding',
    'discharge-queue': 'Boarding',
    'ems-pre-arrival-queue': 'EMS',
  });
  return map[queueId] || null;
}

/**
 * @param {object} context
 * @param {object} context.centralSnapshot
 * @param {object} [context.queueAuditSummary]
 * @param {object} [context.primaryBottleneck]
 * @param {Array} [context.breachedQueues]
 * @param {string} [context.generatedAt]
 */
export function buildCopilotRecommendations(context: any = {}) {
  const centralSnapshot = context.centralSnapshot || {};
  const capacityStatus = centralSnapshot.capacityStatus || {};
  const boardingStatus = centralSnapshot.boardingStatus || {};
  const reassessmentStatus = centralSnapshot.reassessmentStatus || {};
  const breachedQueues = context.breachedQueues || centralSnapshot.queueHealth?.filter((queue) => queue.breached) || [];
  const primaryBottleneck = context.primaryBottleneck || context.queueAuditSummary?.primaryBottleneck || null;
  const generatedAt = context.generatedAt || new Date().toISOString();
  const recommendations = [] as any[];

  if (primaryBottleneck?.isBottleneck) {
    recommendations.push(
      freezeRecommendation({
        id: `queue-bottleneck-${primaryBottleneck.id}`,
        domain: COPILOT_RECOMMENDATION_DOMAIN.QUEUE,
        action: `Clear ${primaryBottleneck.label} bottleneck`,
        detail: [
          `${primaryBottleneck.length} waiting`,
          primaryBottleneck.longestWaitMinutes
            ? `oldest ${primaryBottleneck.longestWaitMinutes}m`
            : null,
          primaryBottleneck.overdueCount ? `${primaryBottleneck.overdueCount} overdue` : null,
          primaryBottleneck.bottleneckReason,
        ]
          .filter(Boolean)
          .join(' · '),
        route: COPILOT_ROUTES.queues,
        whiteboardFilter: mapQueueToWhiteboardFilter(primaryBottleneck.id),
        severity: primaryBottleneck.bottleneckSeverity === 'critical' ? 'critical' : 'warning',
        reasonCodes: ['queue_bottleneck'],
        timestamp: generatedAt,
      }),
    );
  }

  for (const queue of breachedQueues.slice(0, 2)) {
    if (primaryBottleneck?.id === queue.id) continue;
    recommendations.push(
      freezeRecommendation({
        id: `queue-breach-${queue.id || queue.label}`,
        domain: COPILOT_RECOMMENDATION_DOMAIN.QUEUE,
        action: `Open ${queue.label} queue`,
        detail: `${queue.count} waiting · oldest ${queue.oldestWaitMinutes}m vs ${queue.targetMinutes}m target`,
        route: COPILOT_ROUTES.queues,
        whiteboardFilter: mapQueueToWhiteboardFilter(queue.id),
        severity:
          queue.oldestWaitMinutes >= (queue.targetMinutes || 20) * 2 ? 'critical' : 'warning',
        reasonCodes: ['queue_target_breach'],
        timestamp: generatedAt,
      }),
    );
  }

  const capacityBand = capacityStatus.band || 'Green';
  if (capacityBand === 'Red' || capacityBand === 'Orange') {
    recommendations.push(
      freezeRecommendation({
        id: 'capacity-pressure',
        domain: COPILOT_RECOMMENDATION_DOMAIN.CAPACITY,
        action: 'Open capacity dashboard',
        detail: `Score ${capacityStatus.score ?? '—'} · ${capacityBand} band · act before grid saturates`,
        route: COPILOT_ROUTES.capacity,
        severity: capacityBand === 'Red' ? 'critical' : 'warning',
        reasonCodes: [`capacity_${capacityBand.toLowerCase()}_band`],
        timestamp: generatedAt,
      }),
    );
  }

  const boarders = Number(boardingStatus.boarders) || 0;
  const boardingRisk = boardingStatus.risk || 'normal';
  if (boarders > 0 || boardingRisk === 'critical' || boardingRisk === 'high') {
    recommendations.push(
      freezeRecommendation({
        id: 'boarding-pressure',
        domain: COPILOT_RECOMMENDATION_DOMAIN.BOARDING,
        action: 'Review boarding list',
        detail: `${boarders} boarder${boarders === 1 ? '' : 's'} · ${boardingRisk} risk`,
        route: COPILOT_ROUTES.boarding,
        whiteboardFilter: 'Boarding',
        severity: boardingRisk === 'critical' || boardingRisk === 'high' ? 'critical' : 'warning',
        reasonCodes: ['boarding_pressure'],
        timestamp: generatedAt,
      }),
    );
  }

  const reassessDue = Number(reassessmentStatus.due) || 0;
  const reassessOverdue = Number(reassessmentStatus.overdue) || 0;
  if (reassessDue > 0 || reassessOverdue > 0) {
    recommendations.push(
      freezeRecommendation({
        id: 'reassessment-queue',
        domain: COPILOT_RECOMMENDATION_DOMAIN.REASSESSMENT,
        action: 'Open reassessment queue',
        detail: `${reassessDue} due${reassessOverdue ? ` · ${reassessOverdue} overdue` : ''}`,
        route: COPILOT_ROUTES.reassessment,
        whiteboardFilter: 'Reassess',
        severity: reassessOverdue >= 2 || reassessDue >= 4 ? 'critical' : 'warning',
        reasonCodes: reassessOverdue ? ['reassessment_overdue'] : ['reassessment_due'],
        timestamp: generatedAt,
      }),
    );
  }

  return Object.freeze(
    [...recommendations]
      .sort(
        (left, right) =>
          domainRank(left.domain) - domainRank(right.domain) ||
          severityRank(left.severity) - severityRank(right.severity),
      )
      .slice(0, getCopilotRecommendationLimit()),
  );
}

export function formatCopilotRecommendationLine(recommendation, index = 0) {
  const prefix = `[${recommendation.domain}]`;
  const routeHint = recommendation.route ? ` ? ${recommendation.route}` : '';
  return `${index + 1}. ${prefix} ${recommendation.action} — ${recommendation.detail}${routeHint}`;
}

export function formatCopilotRecommendationsForPrompt(recommendations = [] as any[]) {
  if (!recommendations.length) {
    return 'No prioritized queue, capacity, boarding, or reassessment actions detected.';
  }
  return [
    'Prioritized actionable recommendations (staff must confirm before acting):',
    ...recommendations.map((rec, index) => formatCopilotRecommendationLine(rec, index)),
    'Do not repeat generic advice. Cite counts, queues, and routes from this list.',
  ].join('\n');
}

/**
 * @param {string} query
 * @param {object} context
 */
export function resolveCopilotQuickAction(query = '', context: any = {}) {
  const normalized = String(query).trim().toLowerCase();
  if (!normalized) return Object.freeze({ handled: false });

  const recommendations = buildCopilotRecommendations(context);
  const top = recommendations.slice(0, 3);

  if (
    normalized.includes('who needs attention') ||
    normalized.includes('priority') ||
    normalized.includes('bottleneck') ||
    normalized.includes('queue')
  ) {
    if (!top.length) {
      return Object.freeze({
        handled: true,
        source: 'rule',
        response:
          'No queue, capacity, boarding, or reassessment actions are flagged. Whiteboard filters remain available if you want to drill in.',
      });
    }
    return Object.freeze({
      handled: true,
      source: 'rule',
      response: [
        'Top operational actions (confirm before acting):',
        ...top.map((rec, index) => formatCopilotRecommendationLine(rec, index)),
      ].join('\n'),
      recommendations: top,
    });
  }

  if (normalized.includes('capacity')) {
    const capacityRec = recommendations.find(
      (rec) => rec.domain === COPILOT_RECOMMENDATION_DOMAIN.CAPACITY,
    );
    const band = context.centralSnapshot?.capacityStatus?.band || 'Green';
    const score = context.centralSnapshot?.capacityStatus?.score ?? '—';
    return Object.freeze({
      handled: true,
      source: 'rule',
      response: capacityRec
        ? formatCopilotRecommendationLine(capacityRec, 0)
        : `[capacity] Stable — score ${score}, ${band} band. No capacity escalation route needed.`,
      recommendations: capacityRec ? [capacityRec] : [],
    });
  }

  if (normalized.includes('boarding')) {
    const boardingRec = recommendations.find(
      (rec) => rec.domain === COPILOT_RECOMMENDATION_DOMAIN.BOARDING,
    );
    const boarders = context.centralSnapshot?.boardingStatus?.boarders ?? 0;
    return Object.freeze({
      handled: true,
      source: 'rule',
      response: boardingRec
        ? formatCopilotRecommendationLine(boardingRec, 0)
        : `[boarding] No boarding pressure — ${boarders} boarders on the board.`,
      recommendations: boardingRec ? [boardingRec] : [],
    });
  }

  if (normalized.includes('reassessment') || normalized.includes('reassess')) {
    const reassessRec = recommendations.find(
      (rec) => rec.domain === COPILOT_RECOMMENDATION_DOMAIN.REASSESSMENT,
    );
    const due = context.centralSnapshot?.reassessmentStatus?.due ?? 0;
    return Object.freeze({
      handled: true,
      source: 'rule',
      response: reassessRec
        ? formatCopilotRecommendationLine(reassessRec, 0)
        : `[reassessment] Queue clear — ${due} patients flagged.`,
      recommendations: reassessRec ? [reassessRec] : [],
    });
  }

  return Object.freeze({ handled: false });
}

export function auditCopilotRecommendations(recommendations = [] as any[]) {
  const actionable = recommendations.filter((rec) => rec.actionable);
  const generic = recommendations.filter((rec) => rec.generic);
  const byDomain = Object.fromEntries(
    COPILOT_DOMAIN_PRIORITY.map((domain) => [
      domain,
      recommendations.filter((rec) => rec.domain === domain).length,
    ]),
  );

  return Object.freeze({
    total: recommendations.length,
    actionableCount: actionable.length,
    genericCount: generic.length,
    byDomain,
    passesAudit:
      recommendations.length > 0 &&
      actionable.length === recommendations.length &&
      generic.length === 0,
    issues: [
      ...(generic.length
        ? [`${generic.length} recommendation(s) use generic phrasing`]
        : []),
      ...(actionable.length < recommendations.length
        ? [`${recommendations.length - actionable.length} recommendation(s) lack route or filter`]
        : []),
    ],
  });
}

export function auditCopilotRecommendationExposure() {
  return Object.freeze({
    priorityOrder: [...COPILOT_DOMAIN_PRIORITY],
    quickActions: [
      'Queue bottlenecks',
      'Capacity status',
      'Boarding pressure',
      'Reassessment queue',
    ],
    routes: { ...COPILOT_ROUTES },
    genericPhraseCount: GENERIC_COPILOT_PHRASES.length,
  });
}

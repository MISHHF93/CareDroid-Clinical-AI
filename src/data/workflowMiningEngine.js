export const WORKFLOW_MINING_SIGNAL_TYPES = Object.freeze([
  'page_transition',
  'ai_launch',
  'workflow_launch',
  'tool_usage',
  'search_behavior',
]);

export const WORKFLOW_MINING_EVENTS = Object.freeze([
  {
    id: 'search-triage',
    type: 'search_behavior',
    label: 'Search qSOFA calculator',
    route: '/search?q=qsofa',
    journeyId: 'ed-triage-calculator-to-dashboard',
  },
  {
    id: 'open-calculator',
    type: 'tool_usage',
    label: 'Open qSOFA calculator',
    route: '/tools/calculators/qsofa',
    journeyId: 'ed-triage-calculator-to-dashboard',
  },
  {
    id: 'launch-ai-summary',
    type: 'ai_launch',
    label: 'Launch patient summary AI',
    route: '/tools/patient-summary-ai',
    journeyId: 'ed-triage-calculator-to-dashboard',
  },
  {
    id: 'open-dashboard',
    type: 'page_transition',
    label: 'Open Emergency dashboard',
    route: '/dashboard',
    journeyId: 'ed-triage-calculator-to-dashboard',
  },
  {
    id: 'workflow-builder',
    type: 'workflow_launch',
    label: 'Launch workflow builder',
    route: '/workflows',
    journeyId: 'protocol-workflow-build-and-complete',
  },
  {
    id: 'protocol-search',
    type: 'search_behavior',
    label: 'Search sepsis protocol',
    route: '/search?q=sepsis',
    journeyId: 'protocol-workflow-build-and-complete',
  },
  {
    id: 'protocol-open',
    type: 'page_transition',
    label: 'Open protocols',
    route: '/protocols',
    journeyId: 'protocol-workflow-build-and-complete',
  },
  {
    id: 'workflow-complete',
    type: 'workflow_launch',
    label: 'Mark workflow complete',
    route: '/workflows',
    journeyId: 'protocol-workflow-build-and-complete',
  },
  {
    id: 'iot-open',
    type: 'page_transition',
    label: 'Open Medical IoT',
    route: '/medical-iot',
    journeyId: 'device-alert-to-maintenance',
  },
  {
    id: 'device-open',
    type: 'tool_usage',
    label: 'Open device fleet',
    route: '/devices',
    journeyId: 'device-alert-to-maintenance',
  },
  {
    id: 'fleet-open',
    type: 'page_transition',
    label: 'Open fleet map',
    route: '/fleet/map',
    journeyId: 'device-alert-to-maintenance',
  },
]);

export const WORKFLOW_MINING_JOURNEYS = Object.freeze([
  {
    id: 'ed-triage-calculator-to-dashboard',
    title: 'ED triage calculator to dashboard',
    frequency: 148,
    completionRate: 82,
    steps: ['Search qSOFA calculator', 'Open qSOFA calculator', 'Launch patient summary AI', 'Open Emergency dashboard'],
    frictionSignals: ['Repeated calculator searches before launch', 'AI summary opens after calculator instead of inline'],
    deadEnds: ['Users who stop after search often never open the calculator'],
    unnecessaryClicks: ['Search -> tools overview -> calculator library -> qSOFA can be shortened to search -> qSOFA'],
    recommendations: [
      'Promote qSOFA as the top search result for emergency users',
      'Add inline patient summary AI from calculator result pages',
    ],
  },
  {
    id: 'protocol-workflow-build-and-complete',
    title: 'Protocol search to workflow completion',
    frequency: 96,
    completionRate: 74,
    steps: ['Launch workflow builder', 'Search sepsis protocol', 'Open protocols', 'Mark workflow complete'],
    frictionSignals: ['Users leave workflow builder to find protocols', 'Protocol lookup adds extra context switching'],
    deadEnds: ['Protocol searches without workflow completion cluster around sepsis and stroke pathways'],
    unnecessaryClicks: ['Workflow builder -> search -> protocol -> workflow builder loop repeats before completion'],
    recommendations: [
      'Embed protocol search inside workflow builder',
      'Suggest workflow blocks from protocol pages',
    ],
  },
  {
    id: 'device-alert-to-maintenance',
    title: 'Device alert to maintenance context',
    frequency: 63,
    completionRate: 61,
    steps: ['Open Medical IoT', 'Open device fleet', 'Open fleet map'],
    frictionSignals: ['Maintenance users jump between IoT, devices, and fleet context'],
    deadEnds: ['Fleet map often ends the journey without maintenance assignment'],
    unnecessaryClicks: ['Separate IoT and device fleet pages require repeated asset lookup'],
    recommendations: [
      'Add related fleet and maintenance actions to Medical IoT alerts',
      'Show device assignment status before users leave the IoT page',
    ],
  },
]);

function rankByFrequency(journeys) {
  return [...journeys].sort((a, b) => b.frequency - a.frequency);
}

function countSignals(events) {
  return WORKFLOW_MINING_SIGNAL_TYPES.reduce((counts, type) => {
    counts[type] = events.filter((event) => event.type === type).length;
    return counts;
  }, {});
}

export function buildWorkflowMiningReport({
  events = WORKFLOW_MINING_EVENTS,
  journeys = WORKFLOW_MINING_JOURNEYS,
} = {}) {
  const commonJourneys = rankByFrequency(journeys);
  const friction = commonJourneys.flatMap((journey) =>
    journey.frictionSignals.map((signal) => ({
      journeyId: journey.id,
      journeyTitle: journey.title,
      signal,
    })),
  );
  const deadEnds = commonJourneys.flatMap((journey) =>
    journey.deadEnds.map((signal) => ({
      journeyId: journey.id,
      journeyTitle: journey.title,
      signal,
    })),
  );
  const unnecessaryClicks = commonJourneys.flatMap((journey) =>
    journey.unnecessaryClicks.map((signal) => ({
      journeyId: journey.id,
      journeyTitle: journey.title,
      signal,
    })),
  );

  return {
    generatedAt: new Date().toISOString(),
    signalTypes: WORKFLOW_MINING_SIGNAL_TYPES,
    signalCounts: countSignals(events),
    mostCommonUserJourneys: commonJourneys,
    friction,
    deadEnds,
    unnecessaryClicks,
    recommendations: commonJourneys.flatMap((journey) =>
      journey.recommendations.map((recommendation) => ({
        journeyId: journey.id,
        journeyTitle: journey.title,
        recommendation,
      })),
    ),
    summary: {
      journeyCount: commonJourneys.length,
      eventCount: events.length,
      frictionCount: friction.length,
      deadEndCount: deadEnds.length,
      unnecessaryClickCount: unnecessaryClicks.length,
      topJourney: commonJourneys[0],
    },
  };
}

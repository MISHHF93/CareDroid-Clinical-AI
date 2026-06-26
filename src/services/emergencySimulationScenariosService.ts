export const EMERGENCY_SIMULATION_SCENARIOS = Object.freeze([
  Object.freeze({
    scenarioId: 'mass-casualty',
    scenarioName: 'Mass Casualty',
    triggerPattern: 'Many simultaneous EMS and walk-in arrivals create triage, rooming, resource, and escalation pressure.',
    pressureSignals: Object.freeze(['incoming ambulances', 'waiting room count', 'resource shortages', 'high-risk queue growth']),
    expectedActions: Object.freeze(['open surge triage review', 'prioritize rooms and stretchers', 'escalate command center review']),
    successCriteria: 'Critical patients are identified, queue pressure is visible, and escalation occurs before resource collapse.',
  }),
  Object.freeze({
    scenarioId: 'sepsis-surge',
    scenarioName: 'Sepsis Surge',
    triggerPattern: 'Clustered high-risk infection presentations increase reassessment and provider-start pressure.',
    pressureSignals: Object.freeze(['risk score elevation', 'reassessment queue', 'door-to-doctor delay', 'boarding pressure']),
    expectedActions: Object.freeze(['review qSOFA/NEWS2 context', 'prioritize reassessments', 'coordinate provider queue flow']),
    successCriteria: 'Sepsis-risk patients remain visible and move through reassessment and provider review.',
  }),
  Object.freeze({
    scenarioId: 'stroke-surge',
    scenarioName: 'Stroke Surge',
    triggerPattern: 'Multiple time-sensitive neurologic presentations compete for triage, imaging, referral, and transfer workflows.',
    pressureSignals: Object.freeze(['EMS ETA clustering', 'neurology referral delay', 'provider queue age', 'resource availability']),
    expectedActions: Object.freeze(['prepare stroke workflow', 'review CT/readiness blockers', 'prioritize neurology referral handoff']),
    successCriteria: 'Stroke workflows are routed and bottlenecks are visible before referral delay grows.',
  }),
  Object.freeze({
    scenarioId: 'ems-overload',
    scenarioName: 'EMS Overload',
    triggerPattern: 'Inbound ambulances, clustered ETAs, waiting handoffs, and offload delays create community EMS pressure.',
    pressureSignals: Object.freeze(['incoming ambulances', 'waiting handoffs', 'offload delay', 'available rooms']),
    expectedActions: Object.freeze(['review handoff ownership', 'open room readiness review', 'escalate boarding blockers']),
    successCriteria: 'EMS pressure is measurable and handoff delays are actively reviewed.',
  }),
  Object.freeze({
    scenarioId: 'boarding-crisis',
    scenarioName: 'Boarding Crisis',
    triggerPattern: 'Admitted patients remain in the ED long enough to block rooms, stretchers, EMS offload, and provider flow.',
    pressureSignals: Object.freeze(['boarding time', 'pending beds', 'capacity overload', 'discharge delay']),
    expectedActions: Object.freeze(['coordinate bed-management review', 'prioritize longest boarders', 'accelerate discharge candidates']),
    successCriteria: 'Boarding pressure is escalated and linked to capacity recovery actions.',
  }),
]);

export const EmergencySimulationScenariosService = Object.freeze({
  getScenarioDashboard() {
    return Object.freeze({
      id: 'emergency-simulation-scenarios',
      label: 'Emergency Simulation Scenarios',
      scenarios: EMERGENCY_SIMULATION_SCENARIOS,
      metrics: Object.freeze({
        scenarioCount: EMERGENCY_SIMULATION_SCENARIOS.length,
        operationalScenarioCount: EMERGENCY_SIMULATION_SCENARIOS.length,
        debriefMetrics: 7,
      }),
      trainingOutputs: Object.freeze([
        'Scenario timeline',
        'Operational decisions made',
        'Missed or delayed escalations',
        'KPI movement',
        'Queue and bottleneck changes',
        'Resource constraints encountered',
        'Debrief summary',
      ]),
      sourceState: 'Simulated data · Training only',
      safetyStatement:
        'Scenario mode uses simulated operational data and must not be interpreted as live patient care execution.',
    });
  },
});

export default EmergencySimulationScenariosService;

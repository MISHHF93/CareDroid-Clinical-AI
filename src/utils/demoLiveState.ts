export const DEMO_LIVE_STATES = Object.freeze({
  LIVE: 'live',
  DEMO: 'demo',
  MOCK: 'mock',
  SIMULATED: 'simulated',
  BACKEND_UNAVAILABLE: 'backend-unavailable',
  UNSUPPORTED: 'unsupported',
  LOCAL_ONLY: 'local-only',
  /** Architect Mode: AppShell engines (reassessment/capacity/alerts) that are session-local */
  SESSION_ENGINE: 'session-engine',
});

export const DEMO_LIVE_STATE_LABELS = Object.freeze({
  [DEMO_LIVE_STATES.LIVE]: 'Live',
  [DEMO_LIVE_STATES.DEMO]: 'Demo',
  [DEMO_LIVE_STATES.MOCK]: 'Mock',
  [DEMO_LIVE_STATES.SIMULATED]: 'Simulated',
  [DEMO_LIVE_STATES.BACKEND_UNAVAILABLE]: 'Backend unavailable',
  [DEMO_LIVE_STATES.UNSUPPORTED]: 'Unsupported',
  [DEMO_LIVE_STATES.LOCAL_ONLY]: 'Local-only',
  [DEMO_LIVE_STATES.SESSION_ENGINE]: 'Session engine',
});

export const DEMO_LIVE_STATE_DESCRIPTIONS = Object.freeze({
  [DEMO_LIVE_STATES.LIVE]: 'Connected to a real backend or external system of record.',
  [DEMO_LIVE_STATES.DEMO]: 'Uses deterministic sample data or demo backend contracts.',
  [DEMO_LIVE_STATES.MOCK]: 'Uses synthetic placeholder records or coordinate mocks.',
  [DEMO_LIVE_STATES.SIMULATED]: 'Runs a scenario or model without real-world side effects.',
  [DEMO_LIVE_STATES.BACKEND_UNAVAILABLE]: 'Falls back because the backend capability is unavailable.',
  [DEMO_LIVE_STATES.UNSUPPORTED]: 'No live backend route or write action is currently supported.',
  [DEMO_LIVE_STATES.LOCAL_ONLY]: 'Runs only in browser state and does not persist to a backend.',
  [DEMO_LIVE_STATES.SESSION_ENGINE]:
    'Driven by in-browser timers/engines; not multi-user durable state unless an API snapshot overwrites it.',
});

export function getDemoLiveStateLabel(state) {
  return DEMO_LIVE_STATE_LABELS[state] || DEMO_LIVE_STATE_LABELS[DEMO_LIVE_STATES.UNSUPPORTED];
}

export function getDemoLiveStateDescription(state) {
  return DEMO_LIVE_STATE_DESCRIPTIONS[state] || DEMO_LIVE_STATE_DESCRIPTIONS[DEMO_LIVE_STATES.UNSUPPORTED];
}

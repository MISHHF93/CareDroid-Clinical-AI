import {
  DEFAULT_API_TIMEOUT_MS,
  normalizeApiPath,
  resolveApiRoot,
  resolveWebSocketOrigin,
} from './apiEnv';

export { DEFAULT_API_TIMEOUT_MS, normalizeApiPath, resolveApiRoot, resolveWebSocketOrigin };

/**
 * Canonical frontend API endpoint constants.
 * Values include the Nest global `/api` prefix unless explicitly external
 * (for example `/health`).
 */
export const API_ROUTES = Object.freeze({
  health: '/health',
  config: Object.freeze({
    system: '/api/config/system',
  }),
  ai: Object.freeze({
    remainingQueries: '/api/ai/remaining-queries',
  }),
  tools: Object.freeze({
    available: '/api/tools/available',
    execute: (toolId) => `/api/tools/${encodeURIComponent(toolId)}/execute`,
  }),
  subscriptions: Object.freeze({
    current: '/api/subscriptions/current',
    plans: '/api/subscriptions/plans',
  }),
  auth: Object.freeze({
    profile: '/api/auth/profile',
    devSession: '/api/auth/dev-session',
  }),
  users: Object.freeze({
    profile: '/api/users/profile',
  }),
  profile: Object.freeze({
    me: '/api/profile/me',
    preferences: '/api/profile/me/preferences',
  }),
  chat: Object.freeze({
    message: '/api/chat/message',
    intentClassify: '/api/chat/intent-classify',
  }),
  hospitalMap: Object.freeze({
    floors: '/api/hospital-map/floors',
    devices: '/api/hospital-map/devices',
    rooms: '/api/hospital-map/rooms',
  }),
  medicalIot: Object.freeze({
    snapshot: '/api/medical-iot/snapshot',
  }),
  fleet: Object.freeze({
    vehiclesLive: '/api/fleet/vehicles/live',
    routesActive: '/api/fleet/routes/active',
  }),
});

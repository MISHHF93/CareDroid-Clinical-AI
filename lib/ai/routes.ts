export const AI_ROUTES = Object.freeze({
  edCopilot: '/api/emergency/copilot/message',
  smartIntake: '/api/emergency/intake/ai/message',
  referrals: '/api/emergency/referrals/ai/message',
  analytics: '/api/emergency/analytics/ai/message',
});

export const LEGACY_AI_ROUTE_REDIRECTS = Object.freeze({
  chatMessage: AI_ROUTES.edCopilot,
  chatSuggestAction: '/api/chat/suggest-action',
  chatAnalyzeVitals: '/api/chat/analyze-vitals',
});

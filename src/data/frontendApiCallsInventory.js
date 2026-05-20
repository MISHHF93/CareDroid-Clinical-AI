/**
 * Frontend REST/WebSocket calls — each entry must map to a backend route or a
 * `backendApiCapabilities` gate (capability = false → client must skip network).
 *
 * @see docs/backend-exposure-report.md
 */

/** @typedef {{
 *   id: string,
 *   method: string,
 *   path: string,
 *   client: string,
 *   capability?: keyof import('../config/backendApiCapabilities.js').BACKEND_API_CAPABILITIES,
 *   notes?: string
 * }} FrontendApiCall */

/** @type {readonly FrontendApiCall[]} */
export const FRONTEND_API_CALLS = Object.freeze([
  { id: 'chat-message', method: 'POST', path: '/api/chat/message', client: 'clinicalChatService.js', capability: 'chatMessage' },
  { id: 'chat-intent-classify', method: 'POST', path: '/api/chat/intent-classify', client: 'advancedRecommendationService.js', capability: 'chatIntentClassify' },
  { id: 'chat-messages-sync', method: 'POST', path: '/api/chat/messages', client: 'syncService.js', capability: 'chatPersistence', notes: 'No route — gated off' },
  { id: 'chat-conversations-sync', method: 'POST', path: '/api/chat/conversations', client: 'syncService.js', capability: 'chatPersistence' },

  { id: 'protocols-list', method: 'GET', path: '/api/protocols', client: 'clinicalContentApi.js' },
  { id: 'protocols-categories', method: 'GET', path: '/api/protocols/categories', client: 'clinicalContentApi.js' },
  { id: 'drugs-list', method: 'GET', path: '/api/drugs', client: 'clinicalContentApi.js' },
  { id: 'tools-list', method: 'GET', path: '/api/tools', client: 'clinicalToolsApi.js', capability: 'toolsList' },
  { id: 'tools-available', method: 'GET', path: '/api/tools/available', client: 'clinicalToolsApi.js', capability: 'toolsList' },
  { id: 'tools-metadata', method: 'GET', path: '/api/tools/:id', client: 'clinicalToolsApi.js', capability: 'toolsList' },
  { id: 'tools-validate', method: 'POST', path: '/api/tools/:id/validate', client: 'clinicalToolsApi.js', capability: 'toolsExecute' },
  { id: 'tools-executor-catalog', method: 'GET', path: '/api/tools/catalog/executors', client: 'clinicalToolsApi.js', capability: 'toolsList' },
  { id: 'tools-statistics', method: 'GET', path: '/api/tools/statistics', client: 'clinicalToolsApi.js', capability: 'toolsList' },
  { id: 'tools-execute', method: 'POST', path: '/api/tools/:id/execute', client: 'clinicalOrchestratorApi.js', capability: 'toolsExecute' },
  { id: 'tools-results', method: 'POST', path: '/api/tools/results', client: 'syncService.js', capability: 'toolsResultsSync' },
  { id: 'tools-share-results', method: 'POST', path: '/api/tools/share-results', client: 'ToolResultShare.jsx', capability: 'toolsShareResults' },

  { id: 'compliance-consent-get', method: 'GET', path: '/api/compliance/consent', client: 'complianceApi.js', capability: 'complianceConsent' },
  { id: 'compliance-consent-post', method: 'POST', path: '/api/compliance/consent', client: 'complianceApi.js', capability: 'complianceConsent' },

  { id: 'audit-logs', method: 'GET', path: '/api/audit/logs', client: 'AuditLogs.jsx' },
  { id: 'audit-verify', method: 'GET', path: '/api/audit/verify-integrity', client: 'AuditLogs.jsx' },
  { id: 'audit-statistics', method: 'GET', path: '/api/audit/statistics', client: 'AuditLogs.jsx' },
  { id: 'audit-sync', method: 'POST', path: '/api/audit/sync', client: 'syncService.js', capability: 'auditSync' },

  { id: 'notifications-list', method: 'GET', path: '/api/notifications', client: 'NotificationService.js', capability: 'notificationsRest' },
  { id: 'notifications-read', method: 'PATCH', path: '/api/notifications/:id/read', client: 'NotificationService.js', capability: 'notificationsRest' },
  { id: 'notifications-delete', method: 'DELETE', path: '/api/notifications/:id', client: 'NotificationService.js', capability: 'notificationsRest' },
  { id: 'notifications-preferences-get', method: 'GET', path: '/api/notifications/preferences', client: 'NotificationService.js', capability: 'notificationsRest' },
  { id: 'notifications-preferences-patch', method: 'PATCH', path: '/api/notifications/preferences', client: 'NotificationService.js', capability: 'notificationsRest' },
  { id: 'notifications-devices-register', method: 'POST', path: '/api/notifications/devices/register', client: 'NotificationService.js', capability: 'notificationsRest' },
  { id: 'notifications-test', method: 'POST', path: '/api/notifications/test', client: 'NotificationService.js', capability: 'notificationsRest' },
  { id: 'notifications-stream', method: 'GET', path: '/api/notifications/stream', client: 'NotificationService.js', capability: 'notificationStream' },
  { id: 'notifications-send-channel', method: 'POST', path: '/api/notifications/send/:channel', client: 'notifications/NotificationService.js', capability: 'notificationSendChannel' },

  { id: 'team-users', method: 'GET', path: '/api/team/users', client: 'TeamManagement.jsx', capability: 'teamManagement' },
  { id: 'team-user-update', method: 'PUT', path: '/api/team/users/:id', client: 'TeamManagement.jsx', capability: 'teamManagement' },
  { id: 'team-user-delete', method: 'DELETE', path: '/api/team/users/:id', client: 'TeamManagement.jsx', capability: 'teamManagement' },
  { id: 'team-invite', method: 'POST', path: '/api/team/invite', client: 'TeamManagement.jsx', capability: 'teamManagement' },

  { id: 'bulk-sync', method: 'POST', path: '/api/sync', client: 'offline.js / OfflineSupport.jsx', capability: 'bulkSync' },

  { id: 'clinical-alerts-ack', method: 'POST', path: '/api/clinical/alerts/:id/acknowledge', client: 'clinicalAlertNotifications.js', capability: 'clinicalAlerts' },
  { id: 'clinical-alerts-dismiss', method: 'POST', path: '/api/clinical/alerts/:id/dismiss', client: 'clinicalAlertNotifications.js', capability: 'clinicalAlerts' },
  { id: 'clinical-alerts-stream', method: 'GET', path: '/api/clinical/alerts/stream', client: 'clinicalAlertNotifications.js', capability: 'clinicalAlerts', notes: 'WebSocket upgrade' },

  { id: 'exports-pdf', method: 'POST', path: '/api/exports/pdf', client: 'export/ExportService.js', capability: 'exportsPdf' },
  { id: 'exports-excel', method: 'POST', path: '/api/exports/excel', client: 'export/ExportService.js', capability: 'exportsExcel' },
  { id: 'reports-generate', method: 'POST', path: '/api/reports/generate', client: 'export/ExportService.js', capability: 'reportsGenerate' },
  { id: 'reports-schedule-create', method: 'POST', path: '/api/reports/schedule', client: 'export/ExportService.js', capability: 'reportsSchedule', notes: 'No route — gated off' },
  { id: 'reports-schedule-cancel', method: 'DELETE', path: '/api/reports/schedule/:reportId', client: 'export/ExportService.js', capability: 'reportsSchedule' },

  { id: 'analytics-metrics', method: 'GET', path: '/api/analytics/metrics', client: 'AnalyticsDashboard.jsx' },
  { id: 'auth-biometric-stats', method: 'GET', path: '/api/auth/biometric/stats', client: 'BiometricSetup.jsx' },
  { id: 'auth-biometric-verify', method: 'POST', path: '/api/auth/biometric/verify', client: 'BiometricSetup.jsx' },
  { id: 'auth-biometric-disable', method: 'DELETE', path: '/api/auth/biometric/disable/:deviceId', client: 'BiometricSetup.jsx' },

  { id: 'config-system', method: 'GET', path: '/api/config/system', client: 'configService.js' },
  { id: 'ai-remaining-queries', method: 'GET', path: '/api/ai/remaining-queries', client: 'configService.js' },
  { id: 'users-profile', method: 'GET', path: '/api/users/profile', client: 'UserContext.jsx / syncService.js' },
  { id: 'subscriptions-current', method: 'GET', path: '/api/subscriptions/current', client: 'configService.js' },
  { id: 'subscriptions-plans', method: 'GET', path: '/api/subscriptions/plans', client: 'configService.js' },

  { id: 'auth-login', method: 'POST', path: '/api/auth/login', client: 'Auth.jsx' },
  { id: 'auth-register', method: 'POST', path: '/api/auth/register', client: 'Auth.jsx' },
  { id: 'auth-verify-2fa', method: 'POST', path: '/api/auth/verify-2fa', client: 'Auth.jsx' },
  { id: 'auth-magic-link', method: 'POST', path: '/api/auth/magic-link', client: 'Auth.jsx' },
  { id: 'auth-dev-session', method: 'POST', path: '/api/auth/dev-session', client: 'Auth.jsx' },
  { id: 'auth-biometric-config', method: 'GET', path: '/api/auth/biometric/config', client: 'BiometricSetup.jsx' },
  { id: 'auth-biometric-enroll', method: 'POST', path: '/api/auth/biometric/enroll', client: 'BiometricSetup.jsx' },
  { id: 'two-factor-generate', method: 'GET', path: '/api/two-factor/generate', client: 'TwoFactorSetup.jsx' },
  { id: 'two-factor-enable', method: 'POST', path: '/api/two-factor/enable', client: 'TwoFactorSetup.jsx' },
  { id: 'two-factor-status', method: 'GET', path: '/api/two-factor/status', client: 'TwoFactorSettings.jsx' },
  { id: 'two-factor-disable', method: 'DELETE', path: '/api/two-factor/disable', client: 'TwoFactorSettings.jsx' },

  { id: 'crashes', method: 'POST', path: '/api/crashes', client: 'ErrorBoundary.jsx' },
  { id: 'analytics-events', method: 'POST', path: '/api/analytics/events', client: 'analyticsService.ts' },
]);

import { BACKEND_API_CAPABILITIES } from '../config/backendApiCapabilities';
import { BACKEND_HTTP_ROUTES } from '../data/backendHttpRouteInventory';
import {
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  REGISTRY,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
} from '../data/clinicalToolIdContract';
import { getToolById } from '../data/toolRegistry';
import { CHROME_ICONS, getToolIcon } from '../navigation/iconRegistry';
import { Permission } from '../contexts/UserContext';

const EXECUTOR_REGISTRY_IDS = Object.freeze([
  REGISTRY.drugCheck,
  REGISTRY.labInterp,
  REGISTRY.sofaScore,
]);

function routeExists(routes, method, path) {
  return routes.some((route) => route.method === method && route.path === path);
}

function capabilityEnabled(capabilities, capability) {
  return Boolean(capabilities?.[capability]);
}

function textMatches(input, terms) {
  const normalized = String(input || '').toLowerCase();
  if (!normalized) return false;
  return terms.some((term) => normalized.includes(term));
}

function scoreSuggestion(input, suggestion) {
  if (!input?.trim()) return suggestion.defaultRank;
  return textMatches(input, suggestion.keywords) ? suggestion.defaultRank - 100 : suggestion.defaultRank;
}

function makeExecutorSuggestion(registryId, index) {
  const tool = getToolById(registryId);
  const executorId = REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId];
  if (!tool || !ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.includes(executorId)) return null;
  return {
    id: `executor-${executorId}`,
    label: tool.name,
    description: tool.description,
    kind: 'executor',
    toolId: registryId,
    executorId,
    icon: getToolIcon(registryId),
    source: 'POST /api/tools/:id/execute',
    defaultRank: 20 + index,
    keywords: [tool.name, tool.description, registryId, executorId],
  };
}

export const CHAT_SENSITIVE_CONFIRMATIONS = Object.freeze({
  'follow-up-planning': {
    title: 'Confirm follow-up planning',
    sensitivity: 'PHI-sensitive workflow',
    whatWillHappen: 'Chat will open a guided planner and may use visible clinical context in a protected draft.',
    affectedData: 'User-entered patient context, follow-up reason, timing, and any visible Chat context you choose to include.',
    reversible: 'Yes. This creates a draft only and does not send, schedule, or document outreach.',
    authRequirement: 'Requires authenticated access to protected Chat.',
  },
  'audit-logs': {
    title: 'Confirm audit log review',
    sensitivity: 'PHI/audit-sensitive workflow',
    whatWillHappen: 'Chat will open the protected audit log surface.',
    affectedData: 'Audit events, access history, and PHI access metadata visible to your role.',
    reversible: 'Yes. Opening the page does not change audit records.',
    authRequirement: `Requires ${Permission.VIEW_AUDIT_LOGS}. Backend authorization still applies.`,
    requiredPermission: Permission.VIEW_AUDIT_LOGS,
  },
  'data-export': {
    title: 'Confirm compliance export',
    sensitivity: 'Compliance export',
    whatWillHappen: 'Chat will open Settings so you can start the supported compliance export workflow.',
    affectedData: 'Account and compliance data included by the backend export endpoint.',
    reversible: 'Not fully reversible once an export is generated or downloaded. Handle exported data securely.',
    authRequirement: 'Requires authenticated account access. Backend export guards still apply.',
  },
  'notification-preferences': {
    title: 'Confirm notification settings',
    sensitivity: 'Notification bulk-action surface',
    whatWillHappen: 'Chat will open notification preferences, where bulk toggles can affect notification delivery.',
    affectedData: 'Notification preferences, device tokens, unread state, and test notification actions.',
    reversible: 'Usually reversible by changing preferences again. Sent test notifications cannot be recalled.',
    authRequirement: 'Requires authenticated account access. Backend notification guards still apply.',
  },
  'billing-account': {
    title: 'Confirm billing access',
    sensitivity: 'Billing action surface',
    whatWillHappen: 'Chat will open Settings for subscription status, checkout, and customer portal actions.',
    affectedData: 'Subscription tier, checkout session, customer portal, and billing account state.',
    reversible: 'Billing changes may not be immediately reversible and can require portal or support follow-up.',
    authRequirement: `May require ${Permission.MANAGE_SUBSCRIPTIONS} or billing-owner privileges. Backend billing guards still apply.`,
  },
});

function withConfirmation(suggestion) {
  const confirmation = CHAT_SENSITIVE_CONFIRMATIONS[suggestion.id];
  return confirmation ? { ...suggestion, confirmation } : suggestion;
}

export function getChatCapabilitySuggestions({
  input = '',
  capabilities = BACKEND_API_CAPABILITIES,
  routes = BACKEND_HTTP_ROUTES,
  hasPermission = () => true,
} = {}) {
  const suggestions = [];

  if (capabilityEnabled(capabilities, 'chatMessage')) {
    suggestions.push(withConfirmation({
      id: 'follow-up-planning',
      label: 'Plan follow-up',
      description: 'Draft a follow-up or outreach plan for clinician review; no message is sent.',
      kind: 'workflow',
      action: 'openOutreachPlanner',
      icon: CHROME_ICONS.messageCircle,
      source: 'POST /api/chat/message',
      defaultRank: 10,
      keywords: ['follow', 'outreach', 'reminder', 'message', 'discharge'],
    }));
  }

  if (
    capabilityEnabled(capabilities, 'toolsExecute') &&
    capabilityEnabled(capabilities, 'toolsList')
  ) {
    EXECUTOR_REGISTRY_IDS.map(makeExecutorSuggestion).filter(Boolean).forEach((suggestion) => {
      suggestions.push(suggestion);
    });
  }

  if (
    hasPermission(Permission.VIEW_AUDIT_LOGS) &&
    routeExists(routes, 'GET', '/api/audit/logs')
  ) {
    suggestions.push(withConfirmation({
      id: 'audit-logs',
      label: 'Review audit logs',
      description: 'Open the protected audit log surface.',
      kind: 'route',
      path: '/audit-logs',
      icon: CHROME_ICONS.clipboardList,
      source: 'GET /api/audit/logs',
      defaultRank: 60,
      keywords: ['audit', 'log', 'phi', 'access', 'integrity'],
    }));
  }

  if (
    capabilityEnabled(capabilities, 'complianceExport') &&
    routeExists(routes, 'POST', '/api/compliance/export')
  ) {
    suggestions.push(withConfirmation({
      id: 'data-export',
      label: 'Request data export',
      description: 'Open privacy settings for the supported compliance export workflow.',
      kind: 'route',
      path: '/settings',
      icon: CHROME_ICONS.download,
      source: 'POST /api/compliance/export',
      defaultRank: 65,
      keywords: ['export', 'data', 'privacy', 'gdpr', 'compliance'],
    }));
  }

  if (
    capabilityEnabled(capabilities, 'notificationsRest') &&
    routeExists(routes, 'GET', '/api/notifications/preferences')
  ) {
    suggestions.push(withConfirmation({
      id: 'notification-preferences',
      label: 'Notification settings',
      description: 'Open notification preferences, devices, unread state, and test notification actions.',
      kind: 'route',
      path: '/notifications',
      icon: CHROME_ICONS.bell,
      source: 'GET/PATCH /api/notifications/*',
      defaultRank: 70,
      keywords: ['notification', 'alert', 'device', 'preference', 'push'],
    }));
  }

  if (
    routeExists(routes, 'GET', '/api/subscriptions/current') &&
    routeExists(routes, 'GET', '/api/subscriptions/plans') &&
    routeExists(routes, 'POST', '/api/subscriptions/portal')
  ) {
    suggestions.push(withConfirmation({
      id: 'billing-account',
      label: 'Billing and account',
      description: 'Open Settings for subscription status, checkout, and customer portal actions.',
      kind: 'route',
      path: '/settings',
      icon: CHROME_ICONS.circleDollar,
      source: 'GET/POST /api/subscriptions/*',
      defaultRank: 80,
      keywords: ['billing', 'subscription', 'plan', 'checkout', 'account', 'portal'],
    }));
  }

  if (routeExists(routes, 'GET', '/api/users/profile')) {
    suggestions.push({
      id: 'profile-account',
      label: 'Profile',
      description: 'Open the authenticated profile surface.',
      kind: 'route',
      path: '/profile',
      icon: CHROME_ICONS.user,
      source: 'GET /api/users/profile',
      defaultRank: 90,
      keywords: ['profile', 'account', 'user'],
    });
  }

  return suggestions
    .map((suggestion) => ({
      ...suggestion,
      score: scoreSuggestion(input, suggestion),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 8);
}

export function suggestionIds(suggestions) {
  return suggestions.map((suggestion) => suggestion.id);
}

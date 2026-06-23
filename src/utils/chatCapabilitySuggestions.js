import { BACKEND_API_CAPABILITIES } from '../config/backendApiCapabilities';
import { BACKEND_HTTP_ROUTES } from '../data/backendHttpRouteInventory';
import {
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  REGISTRY,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
} from '../data/clinicalToolIdContract';
import { getBackendBackedToolInventory, getUserFacingToolRegistryProjection } from '../data/toolInventory';
import { buildProfileToolGraph, getProfileAssistantRecommendations } from '../data/profileToolSegmentation';
import { compileUserProfile } from '../config/userProfileCompiler';
import { getCareDroidDidYouKnowSuggestions } from '../data/capabilityDiscoveryEngine';
import { buildSearchFirstResults } from '../data/searchFirstDiscovery';
import { CHROME_ICONS, getToolIcon } from '../navigation/iconRegistry';
import { Permission } from '../contexts/UserContext';

const ENTERPRISE_PLATFORM_SUGGESTIONS = Object.freeze([
  {
    id: 'ai-governance-center',
    label: 'AI Governance Center',
    path: '/ai-governance',
    permissions: [Permission.VIEW_GOVERNANCE],
    sourceRoute: '/api/ai-governance/summary',
    keywords: ['governance', 'model inventory', 'approval', 'release history'],
  },
  {
    id: 'llm-security-dashboard',
    label: 'LLM Security Dashboard',
    path: '/security',
    permissions: [Permission.VIEW_AI_SECURITY],
    sourceRoute: '/api/security/summary',
    keywords: ['security', 'prompt injection', 'blocked prompts', 'phi leakage'],
  },
  {
    id: 'human-review-queue',
    label: 'Human Review Queue',
    path: '/human-review',
    permissions: [Permission.VIEW_REVIEW_QUEUE],
    sourceRoute: '/api/human-review/items',
    keywords: ['review', 'pending ai output', 'approve', 'reject'],
  },
  {
    id: 'system-health',
    label: 'System Health',
    path: '/system-health',
    permissions: [Permission.VIEW_OPERATIONS, Permission.VIEW_OBSERVABILITY],
    sourceRoute: '/api/system-health',
    keywords: ['health', 'deployment', 'version', 'observability'],
  },
]);

function getExecutorInventoryRecords() {
  return getBackendBackedToolInventory().filter((record) =>
    ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.includes(record.orchestratorToolId)
  );
}

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

const CONTEXT_AWARE_LAUNCHER_INTENTS = Object.freeze([
  {
    id: 'stroke',
    terms: ['stroke', 'tia', 'nihss', 'facial droop', 'aphasia', 'weakness', 'thrombolysis'],
    toolIds: [REGISTRY.nihss, REGISTRY.abcd2, REGISTRY.strokeWorkflowAssistant],
    workspace: {
      id: 'neurology-workspace',
      label: 'Neurology Workspace',
      path: '/workspace/neurology',
      description: 'Open a neurology workspace for stroke, TIA, NIHSS, and neuro workflow support.',
    },
  },
  {
    id: 'chest-pain',
    terms: ['chest pain', 'acs', 'stemi', 'nstemi', 'troponin', 'cardiac pain', 'heart attack'],
    toolIds: [REGISTRY.heartScore, REGISTRY.timiUaNstemi, REGISTRY.acsWorkflowAssistant],
    workspace: {
      id: 'cardiology-workspace',
      label: 'Cardiology Workspace',
      path: '/workspace/cardiology',
      description: 'Open a cardiology workspace for ACS risk, ECG, troponin, and cardiac workflows.',
    },
  },
  {
    id: 'ventilator',
    terms: ['ventilator', 'ventilation', 'intubated', 'ards', 'hypoxemia', 'fio2', 'p/f ratio', 'pf ratio'],
    toolIds: [REGISTRY.roxIndex, REGISTRY.pao2Fio2Ratio],
    workspace: {
      id: 'respiratory-workspace',
      label: 'Respiratory Workspace',
      path: '/workspace/respiratory',
      description: 'Open a respiratory workspace for ventilator, oxygenation, ROX, and P/F ratio support.',
    },
  },
]);

function findTool(tools, toolId) {
  return tools.find((tool) => tool.id === toolId);
}

function toolSuggestionFromIntent({ tool, intent, index, recentToolIds, workspaceContext, profileGraph }) {
  const graphTool = profileGraph?.visibleTools?.find((candidate) => candidate.id === tool.id);
  if (profileGraph && !graphTool) return null;
  const sourceTool = graphTool || tool;
  const recentBoost = recentToolIds.includes(tool.id) ? -8 : 0;
  const workspaceBoost =
    workspaceContext?.activeWorkspaceId &&
    sourceTool.workspaceTags?.includes(workspaceContext.activeWorkspaceId)
      ? -6
      : 0;
  const profileBoost = sourceTool.profileScore ? Math.min(18, Math.max(0, Math.round(sourceTool.profileScore / 12))) : 0;

  return {
    id: `intent-${intent.id}-${tool.id}`,
    label: sourceTool.name || sourceTool.label || tool.id,
    description: `Suggested for ${intent.id.replace('-', ' ')} context using your profile, workspace, recent activity, and tool graph.`,
    kind: 'route',
    toolId: tool.id,
    path: sourceTool.path || sourceTool.navigationPath,
    icon: getToolIcon(tool.id),
    source: 'context-aware-ai-launcher',
    defaultRank: -30 + index + recentBoost + workspaceBoost - profileBoost,
    keywords: [intent.id, ...intent.terms, tool.id, sourceTool.name, sourceTool.category],
  };
}

function workspaceSuggestionFromIntent({ intent, workspaceContext, profileContext }) {
  const activeWorkspaceId = workspaceContext?.activeWorkspaceId || profileContext?.workspace;
  const activeBoost = intent.workspace.path.endsWith(`/${activeWorkspaceId}`) ? -8 : 0;
  return {
    id: `intent-${intent.id}-${intent.workspace.id}`,
    label: intent.workspace.label,
    description: intent.workspace.description,
    kind: 'route',
    path: intent.workspace.path,
    icon: CHROME_ICONS.layoutDashboard,
    source: 'context-aware-ai-launcher',
    defaultRank: -24 + activeBoost,
    keywords: [intent.id, ...intent.terms, intent.workspace.label, activeWorkspaceId],
  };
}

function getContextAwareLauncherSuggestions({
  input,
  tools,
  profileContext,
  saasRole = null,
  workspaceContext,
  recentToolIds = [],
}) {
  if (!input?.trim()) return [];
  const matchedIntents = CONTEXT_AWARE_LAUNCHER_INTENTS.filter((intent) => textMatches(input, intent.terms));
  if (!matchedIntents.length) return [];

  const compiled = saasRole ? compileUserProfile({ saasRole, tools }) : null;
  const effectiveTools = compiled?.tools.visible?.length ? compiled.tools.visible : tools;
  const effectiveProfile = compiled?.segmentationProfile || profileContext;
  const profileGraph = effectiveProfile
    ? buildProfileToolGraph({ tools: effectiveTools, profile: effectiveProfile })
    : null;
  return matchedIntents.flatMap((intent) => {
    const toolSuggestions = intent.toolIds
      .map((toolId, index) => {
        const tool = findTool(tools, toolId);
        if (!tool) return null;
        return toolSuggestionFromIntent({
          tool,
          intent,
          index,
          recentToolIds,
          workspaceContext,
          profileGraph,
        });
      })
      .filter(Boolean);

    return [
      ...toolSuggestions,
      workspaceSuggestionFromIntent({ intent, workspaceContext, profileContext }),
    ];
  });
}

function getWorkspaceContextSuggestions({ tools, workspaceContext, recentToolIds = [] }) {
  const visibleAssetIds = new Set(workspaceContext?.visibleAssetIds || []);
  if (!visibleAssetIds.size) return [];
  return tools
    .filter((tool) => visibleAssetIds.has(tool.id))
    .slice(0, 4)
    .map((tool, index) => ({
      id: `workspace-${workspaceContext?.workspaceKey || 'active'}-${tool.id}`,
      label: tool.name || tool.label || tool.id,
      description: `Recommended for ${workspaceContext?.label || 'the active workspace'}.`,
      kind: 'route',
      toolId: tool.id,
      path: tool.path || tool.navigationPath,
      icon: getToolIcon(tool.id),
      source: 'workspace-context',
      defaultRank: -12 + index + (recentToolIds.includes(tool.id) ? -4 : 0),
      keywords: [workspaceContext?.label, workspaceContext?.workspaceKey, tool.id, tool.name, tool.category],
    }));
}

const SEARCH_FIRST_ICON_BY_KIND = Object.freeze({
  workflow: CHROME_ICONS.clipboardList,
  automation: CHROME_ICONS.bolt,
  simulation: CHROME_ICONS.training,
  protocol: CHROME_ICONS.stethoscope,
  'ai-agent': CHROME_ICONS.bot,
  'ai-model': CHROME_ICONS.brain,
  operation: CHROME_ICONS.activity,
  dashboard: CHROME_ICONS.layoutDashboard,
  destination: CHROME_ICONS.search,
  notification: CHROME_ICONS.bell,
  workspace: CHROME_ICONS.layoutDashboard,
  asset: CHROME_ICONS.artifacts,
  commercial: CHROME_ICONS.circleDollar,
});

function makeSearchFirstSuggestion(entry, index) {
  return {
    id: `search-first-${entry.id}`,
    label: entry.title || entry.label || entry.name,
    description: entry.description || `Open ${entry.category || entry.kind}.`,
    kind: entry.tool?.id ? 'route' : entry.kind || 'route',
    toolId: entry.tool?.id,
    path: entry.path,
    icon: SEARCH_FIRST_ICON_BY_KIND[entry.kind] || CHROME_ICONS.search,
    source: 'search-first-index',
    defaultRank: 84 + index,
    keywords: [
      entry.id,
      entry.sourceId,
      entry.title,
      entry.label,
      entry.category,
      entry.type,
      ...(entry.tags || []),
      ...(entry.aliases || []),
    ],
  };
}

const SEARCH_FIRST_QUERY_STOPWORDS = new Set([
  'where',
  'is',
  'the',
  'that',
  'feature',
  'find',
  'open',
  'show',
  'me',
  'please',
]);

function normalizeSearchFirstQuery(input) {
  const tokens = String(input || '')
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9-]/g, ''))
    .filter((token) => token && !SEARCH_FIRST_QUERY_STOPWORDS.has(token));
  return tokens.join(' ').trim();
}

function getSearchFirstCapabilitySuggestions({
  input,
  workspaceContext,
  navigationPermissions = [],
  includePlatformCatalog = false,
}) {
  const query = normalizeSearchFirstQuery(input);
  if (!query) return [];
  const scopedResults = buildSearchFirstResults({
    query,
    workspaceId: workspaceContext?.activeWorkspaceId || 'all',
    navigationPermissions,
    includePlatformCatalog,
  });
  const results = scopedResults.length
    ? scopedResults
    : buildSearchFirstResults({ query, navigationPermissions, includePlatformCatalog });

  return results
    .filter((entry) => entry.path || entry.tool?.id)
    .slice(0, 5)
    .map(makeSearchFirstSuggestion);
}

function makeExecutorSuggestion(registryId, index) {
  const record = typeof registryId === 'string' ? null : registryId;
  const canonicalId = record?.id || registryId;
  const executorId = record?.orchestratorToolId || REGISTRY_ID_TO_ORCHESTRATOR_TOOL[canonicalId];
  if (!ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.includes(executorId)) return null;
  return {
    id: `executor-${executorId}`,
    label: record?.label || canonicalId,
    description: record?.safetyCopy || record?.notes || 'Registered clinical tool executor.',
    kind: 'executor',
    toolId: canonicalId,
    executorId,
    icon: getToolIcon(canonicalId),
    source: 'POST /api/tools/:id/execute',
    defaultRank: 20 + index,
    keywords: [
      record?.label,
      record?.description,
      record?.safetyCopy,
      canonicalId,
      record?.nluToolId,
      executorId,
      ...(record?.aliases || []),
    ],
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
  profileContext = null,
  saasRole = null,
  tools = getUserFacingToolRegistryProjection(),
  workspaceContext = null,
  recentToolIds = [],
  navigationPermissions = [],
  includePlatformCatalog = false,
} = {}) {
  const suggestions = [];
  const compiled = saasRole ? compileUserProfile({ saasRole, tools }) : null;
  const effectiveTools = compiled?.tools.visible?.length ? compiled.tools.visible : tools;
  const effectiveProfile = compiled?.segmentationProfile || profileContext;

  getContextAwareLauncherSuggestions({
    input,
    tools: effectiveTools,
    profileContext: effectiveProfile,
    saasRole,
    workspaceContext,
    recentToolIds,
  }).forEach((suggestion) => {
    suggestions.push(suggestion);
  });

  getWorkspaceContextSuggestions({ tools, workspaceContext, recentToolIds }).forEach((suggestion) => {
    suggestions.push(suggestion);
  });

  getSearchFirstCapabilitySuggestions({
    input,
    workspaceContext,
    navigationPermissions,
    includePlatformCatalog,
  }).forEach((suggestion) => {
    suggestions.push(suggestion);
  });

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
    getExecutorInventoryRecords().map(makeExecutorSuggestion).filter(Boolean).forEach((suggestion) => {
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
      path: '/audit',
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

  ENTERPRISE_PLATFORM_SUGGESTIONS.forEach((item, index) => {
    if (!item.permissions.every((permission) => hasPermission(permission))) return;
    if (!routeExists(routes, 'GET', item.sourceRoute)) return;
    suggestions.push({
      id: item.id,
      label: item.label,
      description: 'Open a governed enterprise platform module. No backend executor is invoked.',
      kind: 'route',
      path: item.path,
      icon: CHROME_ICONS.shield || CHROME_ICONS.clipboardList,
      source: item.sourceRoute,
      defaultRank: 120 + index,
      keywords: item.keywords,
    });
  });

  if (effectiveProfile) {
    getProfileAssistantRecommendations(effectiveProfile, effectiveTools, 4).forEach((item, index) => {
      suggestions.push({
        ...item,
        icon: getToolIcon(item.toolId),
        defaultRank: 72 + index,
        keywords: [item.label, item.toolId, effectiveProfile.role, effectiveProfile.specialty],
      });
    });

    getCareDroidDidYouKnowSuggestions({
      profile: effectiveProfile,
      saasRole,
      tools: effectiveTools,
      recentToolIds,
      limit: 3,
    }).forEach((item, index) => {
      suggestions.push({
        ...item,
        icon: getToolIcon(item.toolId),
        defaultRank: 96 + index,
      });
    });
  }

  const deduped = Array.from(
    suggestions
      .reduce((acc, suggestion) => {
        const key = suggestion.toolId || suggestion.id;
        const current = acc.get(key);
        if (!current || suggestion.defaultRank < current.defaultRank) acc.set(key, suggestion);
        return acc;
      }, new Map())
      .values()
  );

  return deduped
    .map((suggestion) => ({
      ...suggestion,
      score: scoreSuggestion(input, suggestion),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 10);
}

export function suggestionIds(suggestions) {
  return suggestions.map((suggestion) => suggestion.id);
}

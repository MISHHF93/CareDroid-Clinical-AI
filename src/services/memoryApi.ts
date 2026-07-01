import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';

export const LOCAL_MEMORY_DASHBOARD = Object.freeze({
  recentActivity: [],
  recentConversations: [],
  recentTools: [],
  savedWorkflows: [],
  aiContext: {
    shortTerm: {
      activeConversation: null,
      activeCalculator: null,
      activeDashboard: null,
    },
    longTerm: {
      preferences: [],
      history: [],
      savedTools: [],
    },
    clinical: {
      findings: [],
      summaries: [],
      scores: [],
    },
  },
});

export const LOCAL_MEMORY_FABRIC_CONTEXT = Object.freeze({
  generatedAt: null,
  tenant: {},
  organizationMemory: {
    commonSearches: [],
    successfulWorkflows: [],
    accessibleAssetCount: 0,
    enabledPackCount: 0,
  },
  workspaceMemory: {
    recentAssets: [],
    visibleAssetIds: [],
  },
  roleMemory: {
    role: null,
    roleProfileId: null,
    preferredAssetIds: [],
  },
  userMemory: {
    preferences: {},
    pinnedAssets: [],
    recentAssets: [],
    savedWorkflows: [],
  },
  aiMemory: {
    shortTerm: {},
    recentAiChats: [],
    savedPromptCount: 0,
    recentPromptCount: 0,
  },
  artifactMemory: {
    references: [],
  },
  rules: {
    tenantIsolated: true,
    permissionAware: true,
    auditable: true,
    rawPromptIncluded: false,
    rawSearchIncluded: false,
  },
});

async function requestJson(path, options: any = {}) {
  try {
    const response = await apiFetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const data = await parseApiResponse(response, { fallback: {} });
    if (!response.ok) {
      return { ok: false, data: null, message: data?.message || getApiErrorMessage(null, response) };
    }
    return { ok: true, data, message: '' };
  } catch (error: any) {
    return { ok: false, data: null, message: getApiErrorMessage(error) };
  }
}

export async function fetchMemoryDashboard() {
  const result = await requestJson('/api/memory/dashboard');
  if (!result.ok) {
    return {
      ok: false,
      ...LOCAL_MEMORY_DASHBOARD,
      message: result.message,
    };
  }
  return {
    ok: true,
    recentActivity: result.data?.recentActivity || [],
    recentConversations: result.data?.recentConversations || [],
    recentTools: result.data?.recentTools || [],
    savedWorkflows: result.data?.savedWorkflows || [],
    aiContext: result.data?.aiContext || LOCAL_MEMORY_DASHBOARD.aiContext,
    message: '',
  };
}

export async function fetchMemoryFabricContext() {
  const result = await requestJson('/api/memory/fabric/context');
  if (!result.ok) {
    return {
      ok: false,
      ...LOCAL_MEMORY_FABRIC_CONTEXT,
      message: result.message,
    };
  }
  return {
    ok: true,
    ...LOCAL_MEMORY_FABRIC_CONTEXT,
    ...(result.data || {}),
    message: '',
  };
}

export async function recordMemorySignal(signal) {
  const result = await requestJson('/api/memory/fabric/signals', {
    method: 'POST',
    body: JSON.stringify(signal || {}),
  });
  return {
    ok: result.ok,
    data: result.data,
    message: result.message,
  };
}

export async function persistShortMemory(memory) {
  const result = await requestJson('/api/memory/short', {
    method: 'POST',
    body: JSON.stringify(memory),
  });
  return {
    ok: result.ok,
    data: result.data,
    message: result.message,
  };
}

export async function saveLongMemory(memory) {
  const result = await requestJson('/api/memory/long', {
    method: 'POST',
    body: JSON.stringify(memory),
  });
  return {
    ok: result.ok,
    data: result.data,
    message: result.message,
  };
}

export async function recordClinicalMemory(memory) {
  const result = await requestJson('/api/memory/clinical', {
    method: 'POST',
    body: JSON.stringify(memory),
  });
  return {
    ok: result.ok,
    data: result.data,
    message: result.message,
  };
}

export default {
  LOCAL_MEMORY_DASHBOARD,
  LOCAL_MEMORY_FABRIC_CONTEXT,
  fetchMemoryDashboard,
  fetchMemoryFabricContext,
  persistShortMemory,
  recordMemorySignal,
  saveLongMemory,
  recordClinicalMemory,
};

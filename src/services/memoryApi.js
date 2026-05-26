import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';

export const LOCAL_MEMORY_DASHBOARD = Object.freeze({
  recentActivity: [],
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

async function requestJson(path, options = {}) {
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
  } catch (error) {
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
    savedWorkflows: result.data?.savedWorkflows || [],
    aiContext: result.data?.aiContext || LOCAL_MEMORY_DASHBOARD.aiContext,
    message: '',
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
  fetchMemoryDashboard,
  persistShortMemory,
  saveLongMemory,
  recordClinicalMemory,
};

import { apiFetchJson, getApiErrorMessage } from './apiClient';

const jsonHeaders = { 'content-type': 'application/json' };

export interface NavigatorDestination {
  id: string;
  label: string;
  description: string;
  path: string;
  component: string;
  navigationGroup: string;
  breadcrumbs: readonly string[];
  aliases: readonly string[];
  workflowOwner: string;
  requiredPermissions: readonly string[];
  navigable: boolean;
  score: number;
  matchedTerms: string[];
}

export interface NavigatorQueryResponse {
  query: string;
  answer: string;
  source: 'catalog' | 'groq';
  providerError: string | null;
  destinations: NavigatorDestination[];
}

async function guardedJson(path: string, options: Record<string, unknown> = {}) {
  try {
    const { response, data } = await apiFetchJson(path, options);
    if (!response.ok) {
      return { ok: false, data: null, message: data?.error || data?.message || getApiErrorMessage(null, response) };
    }
    return { ok: true, data, message: '' };
  } catch (error: unknown) {
    return { ok: false, data: null, message: getApiErrorMessage(error) };
  }
}

export function queryNavigator(query: string) {
  return guardedJson('/api/navigator/query', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ query }),
  }) as Promise<{ ok: boolean; data: NavigatorQueryResponse | null; message: string }>;
}

export function fetchNavigatorHealth() {
  return guardedJson('/api/navigator/health') as Promise<{
    ok: boolean;
    data: { ok: boolean; documents: number; catalogCommit: string; groqConfigured: boolean } | null;
    message: string;
  }>;
}

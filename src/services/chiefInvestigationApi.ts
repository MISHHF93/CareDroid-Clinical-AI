import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';

/**
 * Thin client for the Chief Investigation vertical slice
 * (backend/src/modules/chief-investigation). Deliberately separate from
 * emergencyOsApi.ts's EMERGENCY_OS_API_ENDPOINTS map -- this isn't an
 * emergency-os route, it's the first Agent Command Platform capability
 * (see CLINICAL_AGENT_COMMAND_PLATFORM.md). Mirrors requestEmergencyJson's
 * status-preserving error handling so callers can distinguish 403 (not
 * authorized) from a transient network failure.
 */

export interface InvestigationStepTrace {
  stepId: string;
  label: string;
  status: 'completed' | 'warning' | 'failed' | 'skipped';
  detail: string;
}

export type InvestigationFindingState =
  | 'SUPPORTED'
  | 'PARTIALLY_SUPPORTED'
  | 'INSUFFICIENT_DATA'
  | 'STALE_DATA'
  | 'TOOL_FAILURE'
  | 'OUTSIDE_SCOPE'
  | 'REQUIRES_HUMAN_REVIEW';

export interface InvestigationFinding {
  state: InvestigationFindingState;
  summary: string;
  evidence: string[];
  sources: string[];
}

export interface PreparedAction {
  actionType: string;
  description: string;
  rationale: string;
  requiresApproval: true;
  proposalId?: string;
}

export interface InvestigationRunResult {
  runId: string;
  goal: 'deterioration_investigation';
  createdAt: string;
  requestedByUserId: string;
  patient: {
    patientId: string;
    mrn?: string;
    name?: string;
    age?: number;
    sex?: string;
    priority?: string;
    edState?: string;
    chiefComplaint?: string;
  };
  planVersion: string;
  autonomyLevelUsed: 'LEVEL_0_OBSERVE' | 'LEVEL_2_PREPARE';
  steps: InvestigationStepTrace[];
  findings: InvestigationFinding[];
  preparedActions: PreparedAction[];
  overallState: InvestigationFindingState;
  noClinicalActionTaken: true;
  disclaimer: string;
}

async function requestChiefInvestigationJson(path: string, options: any = {}) {
  let response: Response | undefined;
  try {
    response = await apiFetch(path, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    });
    const data = await parseApiResponse(response, { fallback: {} });
    if (!response?.ok) {
      const httpError: any = new Error(data?.message || getApiErrorMessage(null, response));
      httpError.status = response.status;
      throw httpError;
    }
    return data as InvestigationRunResult;
  } catch (error: any) {
    const wrapped: any = new Error(getApiErrorMessage(error, response));
    wrapped.status = error?.status ?? response?.status;
    throw wrapped;
  }
}

export const runDeteriorationInvestigation = (patientId: string) =>
  requestChiefInvestigationJson(`/api/chief-investigation/deterioration/${encodeURIComponent(patientId)}`, {
    method: 'POST',
  });

export const fetchInvestigationRun = (runId: string) =>
  requestChiefInvestigationJson(`/api/chief-investigation/${encodeURIComponent(runId)}`);

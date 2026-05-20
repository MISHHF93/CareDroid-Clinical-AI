/**
 * POST execute coverage for every registered orchestrator NLU tool id.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS } from '../data/clinicalToolIdContract';

vi.mock('./apiClient', () => ({
  apiFetch: vi.fn(),
  parseApiResponse: vi.fn(async (response) => response._json ?? {}),
  getApiErrorMessage: vi.fn((err) => err?.message || 'API error'),
}));

import { apiFetch } from './apiClient';
import { executeClinicalTool } from './clinicalOrchestratorApi';

describe('clinicalOrchestratorApi — registered executors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      _json: {
        success: true,
        toolId: 'stub',
        result: { success: true, data: {} },
      },
    });
  });

  it.each(ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS)(
    'POST /api/tools/%s/execute for %s',
    async (nluToolId) => {
      const params =
        nluToolId === 'drug-interactions'
          ? { medications: ['a', 'b'] }
          : nluToolId === 'lab-interpreter'
            ? { labValues: [] }
            : { respiration: 1, coagulation: 1, liver: 1, cardiovascular: 1, cns: 1, renal: 1 };

      const result = await executeClinicalTool(nluToolId, params);

      expect(apiFetch).toHaveBeenCalledWith(
        `/api/tools/${nluToolId}/execute`,
        expect.objectContaining({ method: 'POST' }),
      );
      expect(result.ok).toBe(true);
      expect(result.nluToolId).toBe(nluToolId);
    },
  );
});

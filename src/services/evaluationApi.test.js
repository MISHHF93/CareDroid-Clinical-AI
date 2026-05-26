import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetchJson = vi.hoisted(() => vi.fn());
const capabilityStatus = vi.hoisted(() => vi.fn(() => 'real'));

vi.mock('../config/backendApiCapabilities', () => ({
  BACKEND_CAPABILITY_STATUS: {
    REAL: 'real',
    DEMO: 'demo',
    DISABLED: 'disabled',
  },
  getBackendCapabilityStatus: (capability) => capabilityStatus(capability),
}));

vi.mock('./apiClient', () => ({
  apiFetchJson: (...args) => apiFetchJson(...args),
  getApiErrorMessage: () => 'API error',
}));

const {
  LOCAL_EVALUATION_DASHBOARD,
  createEvaluationRun,
  fetchEvaluationDashboard,
} = await import('./evaluationApi');

describe('evaluationApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capabilityStatus.mockReturnValue('real');
    apiFetchJson.mockResolvedValue({
      response: { ok: true },
      data: { generatedAt: '2026-05-26T00:00:00.000Z', runs: [] },
    });
  });

  it('fetches the evaluation dashboard from the backend', async () => {
    const result = await fetchEvaluationDashboard();

    expect(result.ok).toBe(true);
    expect(apiFetchJson).toHaveBeenCalledWith('/evaluation/dashboard');
    expect(result.data.generatedAt).toBe('2026-05-26T00:00:00.000Z');
  });

  it('uses local baselines when the evaluation framework is disabled', async () => {
    capabilityStatus.mockReturnValue('disabled');

    const result = await fetchEvaluationDashboard();

    expect(result.ok).toBe(false);
    expect(result.data).toBe(LOCAL_EVALUATION_DASHBOARD);
    expect(apiFetchJson).not.toHaveBeenCalled();
  });

  it('creates an evaluation run', async () => {
    apiFetchJson.mockResolvedValue({
      response: { ok: true },
      data: { id: 'run-1' },
    });

    const run = await createEvaluationRun({ modelName: 'candidate' });

    expect(run.id).toBe('run-1');
    expect(apiFetchJson).toHaveBeenCalledWith(
      '/evaluation/runs',
      expect.objectContaining({ method: 'POST' })
    );
  });
});

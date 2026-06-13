import { beforeEach, describe, expect, it, vi } from 'vitest';

const buildApiUrl = vi.hoisted(() => vi.fn((path) => path));
const parseApiResponse = vi.hoisted(() => vi.fn());

vi.mock('./apiClient', () => ({
  buildApiUrl,
  getApiErrorMessage: (error) => error?.message || 'API error',
  parseApiResponse,
}));

const {
  aggregateFederatedLearningRound,
  compareRealTimeSimulationInterventions,
  evaluateHybridDigitalTwinScenario,
  evaluateRealTimeSimulationIntervention,
  fetchFederatedLearningDashboard,
  fetchFederatedLearningGlobalModel,
  fetchHybridDigitalTwinState,
  fetchRealTimeSimulationRecommendations,
  initializeHybridDigitalTwin,
  registerFederatedHospital,
  simulateHybridDigitalTwin,
  submitFederatedModelUpdate,
  updateRealTimeSimulationState,
} = await import('./emergencyOsApi');

describe('emergencyOsApi advanced Emergency OS capabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parseApiResponse.mockResolvedValue({ status: 'ok' });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  it('calls the real-time simulation endpoints', async () => {
    await updateRealTimeSimulationState({ census: 55 });
    await evaluateRealTimeSimulationIntervention({ type: 'open_fast_track' });
    await compareRealTimeSimulationInterventions({});
    await fetchRealTimeSimulationRecommendations();

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/emergency/simulation/update-live',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ census: 55 }) })
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/emergency/simulation/evaluate',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ type: 'open_fast_track' }) })
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      3,
      '/api/emergency/simulation/compare',
      expect.objectContaining({ method: 'POST' })
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      4,
      '/api/emergency/simulation/recommendations',
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) })
    );
  });

  it('calls the federated learning endpoints', async () => {
    await registerFederatedHospital({ hospitalId: 'h1' });
    await submitFederatedModelUpdate({ hospitalId: 'h1', weights: { intercept: 0.2 } });
    await aggregateFederatedLearningRound();
    await fetchFederatedLearningGlobalModel('h1');
    await fetchFederatedLearningDashboard();

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/emergency/federated-learning/register',
      expect.objectContaining({ method: 'POST' })
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/emergency/federated-learning/update',
      expect.objectContaining({ method: 'POST' })
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      3,
      '/api/emergency/federated-learning/aggregate',
      expect.objectContaining({ method: 'POST' })
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      4,
      '/api/emergency/federated-learning/global-model/h1',
      expect.any(Object)
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      5,
      '/api/emergency/federated-learning/dashboard',
      expect.any(Object)
    );
  });

  it('calls the hybrid digital twin endpoints', async () => {
    await initializeHybridDigitalTwin({ twinId: 'twin-1' });
    await simulateHybridDigitalTwin({ includeTrace: true });
    await fetchHybridDigitalTwinState();
    await evaluateHybridDigitalTwinScenario({ interventions: [{ type: 'increase_staff' }] });

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/emergency/digital-twin/initialize',
      expect.objectContaining({ method: 'POST' })
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/emergency/digital-twin/simulate',
      expect.objectContaining({ method: 'POST' })
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      3,
      '/api/emergency/digital-twin/state',
      expect.any(Object)
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      4,
      '/api/emergency/digital-twin/scenario',
      expect.objectContaining({ method: 'POST' })
    );
  });
});

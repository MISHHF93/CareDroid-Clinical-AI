import { render, screen, waitFor } from '@testing-library/react';
import DriftMonitoringPanel from './DriftMonitoringPanel';

vi.mock('../../services/devBackendAuth', () => ({
  ensureDevBackendSession: vi.fn().mockRejectedValue(new Error('no backend in test env')),
}));

vi.mock('../../services/nativeAiApi', () => ({
  fetchNativeAiDriftEnvelope: vi.fn().mockRejectedValue(new Error('no backend in test env')),
  evaluateNativeAiDrift: vi.fn().mockRejectedValue(new Error('no backend in test env')),
}));

describe('DriftMonitoringPanel', () => {
  it('P0.4: labels every registered model Manual, since the real registry contains zero trained models today', async () => {
    render(<DriftMonitoringPanel />);

    await waitFor(() => expect(screen.getByText(/Source: local/)).toBeInTheDocument());

    const labels = screen.getAllByTestId('ai-truth-label-chip');
    expect(labels.length).toBeGreaterThan(0);
    // Every registry entry currently maps to Manual or Demo (per its own
    // maturity field) — none should ever claim Live, since no entry in this
    // registry is backed by a real trained model (see modelRegistry.test.ts).
    for (const label of labels) {
      expect(['Manual', 'Demo']).toContain(label.textContent);
    }
  });

  it('P0.4: the model-registry truth label explains the metrics were not traced to a real evaluation run', async () => {
    render(<DriftMonitoringPanel />);
    await waitFor(() => expect(screen.getByText(/Source: local/)).toBeInTheDocument());

    const labels = screen.getAllByTestId('ai-truth-label-chip');
    const registryLabel = labels.find((label) =>
      label.getAttribute('title')?.includes('registry metrics not traced'),
    );
    expect(registryLabel).toBeDefined();
  });

  it('2026-08-07: a drift alert built on an unvalidated registry baseline says so, not just "Drift evaluation for X"', async () => {
    const { ensureDevBackendSession } = await import('../../services/devBackendAuth');
    (ensureDevBackendSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    const { fetchNativeAiDriftEnvelope } = await import('../../services/nativeAiApi');
    (fetchNativeAiDriftEnvelope as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        enabled: true,
        driftDetected: true,
        summary: '1 model drift alert(s) — retraining review required',
        generatedAt: new Date().toISOString(),
        alerts: [
          {
            id: 'drift-test-1',
            modelId: 'post-ed-orientation',
            detectedAt: new Date().toISOString(),
            baselineMetric: 0.68,
            currentMetric: 0.55,
            dropPercent: 19.1,
            thresholdPercent: 5,
            severity: 'retrain_required',
            summary: 'post-ed-orientation accuracy dropped 19.1% — baseline is an unvalidated registry default, not a prior measurement',
            sourceState: 'demo',
            baselineSource: 'unvalidated_registry_default',
          },
        ],
      },
    });

    render(<DriftMonitoringPanel />);
    await waitFor(() => expect(screen.getByText(/Source: api/)).toBeInTheDocument());

    const labels = screen.getAllByTestId('ai-truth-label-chip');
    const alertLabel = labels.find((label) =>
      label.getAttribute('title')?.includes("modelRegistry.ts's unvalidated default"),
    );
    expect(alertLabel).toBeDefined();
  });
});

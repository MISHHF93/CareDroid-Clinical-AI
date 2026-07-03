import { refreshLivingDocumentationSnapshot } from '../store/livingDocumentationStore';
import { startWorkflowTrace } from '../services/observabilityTrace';

const REFRESH_INTERVAL_MS = 5 * 60_000;

function refreshWithTelemetry(trigger: string) {
  const trace = startWorkflowTrace('living-documentation-refresh', {
    source: 'livingDocumentationEngine',
    summary: `Living documentation refresh (${trigger})`,
  });
  try {
    refreshLivingDocumentationSnapshot();
    trace.end('success', { trigger });
  } catch (error: unknown) {
    trace.end('error', {
      trigger,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export function startLivingDocumentationEngine(): () => void {
  refreshWithTelemetry('startup');

  const intervalId = window.setInterval(() => {
    refreshWithTelemetry('interval');
  }, REFRESH_INTERVAL_MS);

  return () => {
    window.clearInterval(intervalId);
  };
}
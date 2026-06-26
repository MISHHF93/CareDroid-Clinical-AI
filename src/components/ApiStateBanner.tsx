import React from 'react';
import ToolApiErrorBanner from './ToolApiErrorBanner';
import {
  LoadingState,
  UnsupportedState,
} from './ui/CareDroidPrimitives';
import './ApiStateBanner.css';

/**
 * Loading / error / unsupported states for tool and fleet pages.
 */
export default function ApiStateBanner({
  loading = false,
  loadingMessage = 'Loading…',
  error = null,
  unsupportedMessage = null,
  onRetry = undefined as any,
}) {
  if (loading) {
    return (
      <LoadingState
        title={loadingMessage}
        className="api-state-banner api-state-banner--loading"
        aria-live="polite"
      />
    );
  }

  if (unsupportedMessage) {
    return (
      <UnsupportedState
        title="Unsupported"
        description={unsupportedMessage}
        className="api-state-banner api-state-banner--unsupported"
        aria-live="polite"
      />
    );
  }

  if (error) {
    return <ToolApiErrorBanner message={error} onRetry={onRetry} />;
  }

  return null;
}

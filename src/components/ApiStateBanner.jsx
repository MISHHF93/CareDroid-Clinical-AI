import React from 'react';
import ToolApiErrorBanner from './ToolApiErrorBanner';
import './ApiStateBanner.css';

/**
 * Loading / error / unsupported states for tool and fleet pages.
 */
export default function ApiStateBanner({
  loading = false,
  loadingMessage = 'Loading…',
  error = null,
  unsupportedMessage = null,
  onRetry,
}) {
  if (loading) {
    return (
      <div className="api-state-banner api-state-banner--loading" role="status" aria-live="polite">
        <div className="api-state-banner__spinner" aria-hidden="true" />
        <p className="api-state-banner__text">{loadingMessage}</p>
      </div>
    );
  }

  if (unsupportedMessage) {
    return (
      <div className="api-state-banner api-state-banner--unsupported" role="status" aria-live="polite">
        <p className="api-state-banner__text">{unsupportedMessage}</p>
      </div>
    );
  }

  if (error) {
    return <ToolApiErrorBanner message={error} onRetry={onRetry} />;
  }

  return null;
}

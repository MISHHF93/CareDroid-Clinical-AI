import React from 'react';
import Alert from './ui/Alert';
import './ApiConfigDegradedBanner.css';

const AlertAny = Alert as any;

/**
 * Shown when system config could not be loaded from the API (defaults in use).
 */
export default function ApiConfigDegradedBanner({ configDegraded, error, loading, refresh }) {
  if (loading || !configDegraded) return null;

  return (
    <AlertAny
      tone="warning"
      className="api-config-degraded-banner"
      role="status"
      aria-live="polite"
      action={
        <button type="button" className="api-config-degraded-banner__retry" onClick={refresh}>
          Retry
        </button>
      }
    >
      <div className="api-config-degraded-banner__inner">
        <p className="api-config-degraded-banner__text">
          Could not load settings from the API
          {error ? ` (${error})` : ''}. Some limits and features may use offline defaults until
          the backend is reachable.
        </p>
      </div>
    </AlertAny>
  );
}

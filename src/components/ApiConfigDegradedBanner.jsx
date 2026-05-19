import React from 'react';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import './ApiConfigDegradedBanner.css';

/**
 * Shown when system config could not be loaded from the API (defaults in use).
 */
export default function ApiConfigDegradedBanner() {
  const { configDegraded, error, loading, refresh } = useSystemConfig();

  if (loading || !configDegraded) return null;

  return (
    <div className="api-config-degraded-banner" role="status" aria-live="polite">
      <div className="api-config-degraded-banner__inner">
        <p className="api-config-degraded-banner__text">
          Could not load settings from the API
          {error ? ` (${error})` : ''}. Some limits and features may use offline defaults until
          the backend is reachable.
        </p>
        <button type="button" className="api-config-degraded-banner__retry" onClick={refresh}>
          Retry
        </button>
      </div>
    </div>
  );
}

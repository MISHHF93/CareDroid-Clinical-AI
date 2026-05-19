import React from 'react';
import './ToolApiErrorBanner.css';

/**
 * User-visible API / executor failure (not silent).
 */
export default function ToolApiErrorBanner({ message, onRetry, retryLabel = 'Try again' }) {
  if (!message) return null;

  return (
    <div
      className="tool-api-error-banner"
      role="alert"
      aria-live="polite"
    >
      <p className="tool-api-error-banner__text">{message}</p>
      {onRetry ? (
        <button type="button" className="tool-api-error-banner__retry" onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

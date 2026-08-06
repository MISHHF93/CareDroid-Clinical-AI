import Alert from './ui/Alert';
import './ToolApiErrorBanner.css';

const AlertAny = Alert as any;

/**
 * User-visible API / executor failure (not silent).
 */
export default function ToolApiErrorBanner({ message, onRetry, retryLabel = 'Try again' }) {
  if (!message) return null;

  return (
    <AlertAny
      tone="danger"
      className="tool-api-error-banner"
      role="alert"
      aria-live="polite"
      action={
        onRetry ? (
          <button type="button" className="tool-api-error-banner__retry" onClick={onRetry}>
            {retryLabel}
          </button>
        ) : null
      }
    >
      <p className="tool-api-error-banner__text">{message}</p>
    </AlertAny>
  );
}

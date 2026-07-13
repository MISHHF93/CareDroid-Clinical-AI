import { useLocation } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';

type RouteErrorBoundaryProps = {
  children: React.ReactNode;
  /** Optional fallback title for the error view */
  fallbackTitle?: string;
};

/**
 * Route-scoped error boundary that catches rendering errors
 * within a route segment without crashing the entire application.
 * Provides route context in the error view for debugging.
 */
export default function RouteErrorBoundary({
  children,
  fallbackTitle,
}: RouteErrorBoundaryProps) {
  const location = useLocation();
  
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div
          role="alert"
          style={{
            padding: '24px',
            margin: '16px',
            border: '1px solid var(--app-border-subtle, #e5e7eb)',
            borderRadius: '8px',
            background: 'var(--app-surface-1, #ffffff)',
          }}
        >
          <h2 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600, color: 'var(--app-text-primary, #111827)' }}>
            {fallbackTitle || 'Something went wrong'}
          </h2>
          <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--app-text-secondary, #6b7280)' }}>
            This section encountered an error and could not render.
          </p>
          <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--app-text-muted, #9ca3af)', fontFamily: 'monospace' }}>
            Route: {location.pathname}
          </p>
          {import.meta.env.DEV && error && (
            <details style={{ margin: '0 0 12px', fontSize: '12px', fontFamily: 'monospace', color: 'var(--app-text-secondary, #6b7280)' }}>
              <summary style={{ cursor: 'pointer' }}>Error details</summary>
              <pre style={{ margin: '8px 0 0', padding: '8px', background: 'var(--app-surface-muted, #f9fafb)', borderRadius: '4px', overflow: 'auto', maxHeight: '200px' }}>
                {error.message}
                {'\n'}
                {error.stack}
              </pre>
            </details>
          )}
          <button
            type="button"
            onClick={resetErrorBoundary}
            style={{
              padding: '6px 16px',
              border: '1px solid var(--app-border-subtle, #d1d5db)',
              borderRadius: '6px',
              background: 'var(--app-surface-1, #ffffff)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            Try again
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

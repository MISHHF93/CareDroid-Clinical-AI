import { useLocation } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';
import './RouteErrorBoundary.css';

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
export default function RouteErrorBoundary({ children, fallbackTitle }: RouteErrorBoundaryProps) {
  const location = useLocation();

  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div role="alert" className="reb-wrapper">
          <h2 className="reb-title">{fallbackTitle || 'Something went wrong'}</h2>
          <p className="reb-message">This section encountered an error and could not render.</p>
          <p className="reb-route">Route: {location.pathname}</p>
          {import.meta.env.DEV && error && (
            <details className="reb-details">
              <summary className="reb-summary">Error details</summary>
              <pre className="reb-pre">
                {error.message}
                {'\n'}
                {error.stack}
              </pre>
            </details>
          )}
          <button type="button" onClick={resetErrorBoundary} className="reb-retry-btn">
            Try again
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

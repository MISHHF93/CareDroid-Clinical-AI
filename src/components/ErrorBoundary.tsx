import React, { Component } from 'react';
import crashReportingService from '../services/crashReportingService';
import logger from '../utils/logger';
import './ErrorBoundary.css';

const SESSION_KEY = 'caredroid_session_id';

const getSessionId = () => {
  if (typeof window === 'undefined') return 'session-server';
  const generated =
    window.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    window.localStorage.setItem(SESSION_KEY, generated);
  } catch (_err: any) {
    return generated;
  }
  return generated;
};

const reportCrash = (error, errorInfo) => {
  const normalizedError =
    error instanceof Error ? error : new Error(String(error?.message || error || 'Unknown error'));
  crashReportingService.captureException(normalizedError, {
    componentStack: errorInfo?.componentStack || '',
    sessionId: getSessionId(),
    surface: 'ErrorBoundary',
  });
};

class ErrorBoundary extends Component<any, any> {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(_error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('ErrorBoundary caught', { error, errorInfo });
    reportCrash(error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallbackRender) {
        return this.props.fallbackRender({
          error: this.state.error,
          resetErrorBoundary: this.resetErrorBoundary,
        });
      }

      const showErrorDetails = Boolean(import.meta?.env?.DEV);
      if (this.props.fallbackText || this.props.fallback) {
        return (
          this.props.fallback || (
            <div role="alert" className="eb-fallback-text">
              <p className="eb-fallback-msg">{this.props.fallbackText}</p>
              {this.state.error && (
                <details className="eb-details">
                  <summary className="eb-details-summary">Error Details</summary>
                  <pre className="eb-error-pre--wrap">
                    {this.state.error.toString()}
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
              <button type="button" onClick={this.handleReload}>
                Reload
              </button>
            </div>
          )
        );
      }

      return (
        <div className="eb-page">
          <div className="eb-page-content">
            <span className="eb-page-brand" aria-hidden="true">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 12h4l2-6 4 12 2-6h6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <h1 className="eb-page-title">CareDroid hit a snag</h1>
            <p className="eb-page-desc">
              This screen ran into an unexpected error and has been automatically reported. Your
              other work in CareDroid is unaffected — reloading usually resolves it.
            </p>
            {showErrorDetails && this.state.error && (
              <details className="eb-details--full-page">
                <summary className="eb-details-summary">Error Details</summary>
                <pre className="eb-error-pre">
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <button type="button" onClick={this.handleReload} className="eb-reload-btn">
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

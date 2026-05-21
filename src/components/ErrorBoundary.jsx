import React, { Component } from 'react';
import { apiFetch } from '../services/apiClient';
import logger from '../utils/logger';

const SESSION_KEY = 'caredroid_session_id';

const getSessionId = () => {
  if (typeof window === 'undefined') return 'session-server';
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const generated = (window.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  window.localStorage.setItem(SESSION_KEY, generated);
  return generated;
};

const reportCrash = (error, errorInfo) => {
  const payload = {
    id: `crash-${Date.now()}`,
    error: {
      name: error?.name || 'Error',
      message: error?.message || 'Unknown error',
      stack: (error?.stack ? error.stack.split('\n') : []),
    },
    breadcrumbs: [],
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    environment: (import.meta?.env?.MODE || 'development'),
  };

  apiFetch('/api/crashes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
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

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--navy-bg)',
          color: 'var(--text-color)',
          padding: '20px',
        }}>
          <div style={{
            maxWidth: '600px',
            textAlign: 'center',
          }}>
            <h1 style={{ color: '#FF0000', marginBottom: '20px' }}>
              ⚠️ Something went wrong
            </h1>
            <p style={{ marginBottom: '20px', fontSize: '16px' }}>
              The application encountered an unexpected error. This has been automatically reported.
            </p>
            {this.state.error && (
              <details style={{
                marginBottom: '20px',
                textAlign: 'left',
                backgroundColor: 'rgba(255,255,255,0.1)',
                padding: '10px',
                borderRadius: '5px',
              }}>
                <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>
                  Error Details
                </summary>
                <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleReload}
              style={{
                backgroundColor: '#00FF88',
                color: 'var(--navy-ink)',
                border: 'none',
                padding: '15px 30px',
                fontSize: '16px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              🔄 Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

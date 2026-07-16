import './theme-init';
import './styles/design-system.css';
import './styles/alarm-system.css';
import './styles/inline-style-utilities.css';
import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';

import logger from './utils/logger';
import observabilityService from './services/observabilityService';

import { scheduleDeferredStartupTasks } from './utils/deferStartupTasks';

import { runAfterFirstPaint } from './utils/deferStartup';
import { ensureBackendReachabilityProbed } from './services/backendReachability';
import { isReceptionFirstUxEnabled } from './config/receptionFirstUx.config';

observabilityService.initialize();

window.addEventListener('error', (event) => {
  logger.error('Global error', event.error, { stack: event.error?.stack });
  if (event.error instanceof Error) {
    void import('./services/crashReportingService').then(({ default: crashReportingService }) => {
      crashReportingService.captureException(event.error, { surface: 'window.error' });
    });
  } else {
    observabilityService.recordError({
      name: 'GlobalError',
      message: String(event.message || 'Unknown global error'),
      source: 'window.error',
    });
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  logger.error('Unhandled promise rejection', reason instanceof Error ? reason : undefined, {
    reason: reason instanceof Error ? undefined : reason,
  });
  if (reason instanceof Error) {
    void import('./services/crashReportingService').then(({ default: crashReportingService }) => {
      crashReportingService.captureException(reason, { surface: 'unhandledrejection' });
    });
  } else {
    observabilityService.recordError({
      name: 'UnhandledRejection',
      message: String(reason),
      source: 'unhandledrejection',
    });
  }
});

scheduleDeferredStartupTasks();

if (import.meta.env.DEV) {
  void ensureBackendReachabilityProbed();
}

// Cycle 68: only warm the reception workspace when already on a reception-ish path.
// Unconditional preload forced reception (and its graph) into every session with the flag on.
if (isReceptionFirstUxEnabled()) {
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  if (/\/(reception|intake)(\/|$)/i.test(path) || path === '/' || path === '') {
    void import('./pages/emergency/ReceptionWorkspace');
  }
}

const clearDevelopmentServiceWorkers = () => {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) =>
      Promise.all(registrations.map((registration) => registration.unregister()))
    )
    .then(() => {
      if (!('caches' in window)) return null;
      return caches
        .keys()
        .then((cacheNames) => Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))));
    })
    .then(() => {
      logger.info('Development service workers and caches cleared');
    })
    .catch((error) => logger.warn('Failed to clear development service workers', { error }));
};

if (import.meta.env.DEV) {
  runAfterFirstPaint(clearDevelopmentServiceWorkers, 500);
} else if ('serviceWorker' in navigator) {
  runAfterFirstPaint(() => {
    navigator.serviceWorker

      .register('/sw.js')

      .then((registration) => {
        logger.info('Service Worker registered', { scope: registration.scope });
      })

      .catch((error) => logger.error('Service Worker registration failed', { error }));
  }, 1500);
}

const syncViewportMetrics = () => {
  if (typeof window === 'undefined' || !document?.documentElement) return;

  const viewport = window.visualViewport;

  const layoutHeight = window.innerHeight || document.documentElement.clientHeight;

  const visualHeight = viewport?.height || layoutHeight;

  const offsetTop = viewport?.offsetTop || 0;

  const viewportHeight = Math.max(320, Math.round(visualHeight));

  const keyboardInset = Math.max(0, Math.round(layoutHeight - visualHeight - offsetTop));

  document.documentElement.style.setProperty('--app-viewport-height', `${viewportHeight}px`);

  document.documentElement.style.setProperty(
    '--app-visual-viewport-offset-top',
    `${Math.round(offsetTop)}px`
  );

  document.documentElement.style.setProperty('--app-keyboard-inset-bottom', `${keyboardInset}px`);

  document.documentElement.classList.toggle('app-keyboard-visible', keyboardInset > 80);
};

let viewportRaf = 0;

const requestViewportSync = () => {
  window.cancelAnimationFrame(viewportRaf);

  viewportRaf = window.requestAnimationFrame(syncViewportMetrics);
};

syncViewportMetrics();

window.addEventListener('resize', requestViewportSync);

window.addEventListener('orientationchange', requestViewportSync);

window.visualViewport?.addEventListener('resize', requestViewportSync);

window.visualViewport?.addEventListener('scroll', requestViewportSync);

try {
  const root = document.getElementById('root');

  if (!root) {
    document.body.innerHTML =
      '<div style="padding:20px;color:red">ERROR: Root element not found</div>';
  } else {
    logger.info('Mounting React App');

    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
} catch (error: any) {
  logger.error('Failed to mount React app', { error, stack: error?.stack });

  document.body.innerHTML = `

    <div style="padding: 20px; font-family: monospace; color: red;">

      <h1>Error Loading Application</h1>

      <p>${error.message}</p>

      <button type="button" onclick="location.reload()">Reload</button>

    </div>

  `;
}

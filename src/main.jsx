import './theme-init.js';

import './styles/theme-tokens.css';

import React from 'react';

import ReactDOM from 'react-dom/client';

import App from './App';

import {
  startEmergencyReassessment,
  stopEmergencyReassessment,
} from '../engine/reassessmentEngine';
import { startCapacityIntelligence, stopCapacityIntelligence } from '../engine/capacityEngine';
import { startEmergencySimulation, stopEmergencySimulation } from '../engine/simulation';
import { useFeatureStore } from '../store/featureStore';

import './index.css';

import './styles/design-tokens.css';

import './styles/theme-legacy-bridge.css';

import './styles/theme-surfaces.css';

import './styles/layout-breakpoints.css';

import './styles/responsive-ux.css';

import './styles/layout-visibility.css';

import './styles/mobile-first-layout.css';

import './styles/mobile-performance.css';

import './styles/visual-consistency.css';

import './styles/mobile-first-recovery.css';

import './globals.css';

import logger from './utils/logger';

import { scheduleDeferredStartupTasks } from './utils/deferStartupTasks';

import { runAfterFirstPaint } from './utils/deferStartup';

window.addEventListener('error', (event) => {
  logger.error('Global error', { error: event.error, stack: event.error?.stack });
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', { reason: event.reason });
});

scheduleDeferredStartupTasks();

void useFeatureStore
  .getState()
  .initializeFlags()
  .then(() => {
    if (useFeatureStore.getState().isEnabled('simulation_engine')) {
      startEmergencySimulation();
    }
  });
startEmergencyReassessment();
startCapacityIntelligence();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopEmergencySimulation();
    stopEmergencyReassessment();
    stopCapacityIntelligence();
  });
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
} catch (error) {
  logger.error('Failed to mount React app', { error, stack: error?.stack });

  document.body.innerHTML = `

    <div style="padding: 20px; font-family: monospace; color: red;">

      <h1>Error Loading Application</h1>

      <p>${error.message}</p>

      <button type="button" onclick="location.reload()">Reload</button>

    </div>

  `;
}

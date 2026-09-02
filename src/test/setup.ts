import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { cancelAllBackgroundTimers } from '../services/backgroundTimerRegistry';
import '@testing-library/jest-dom/vitest';

const originalConsoleWarn = console.warn.bind(console);
console.warn = (...args) => {
  const message = String(args[0] ?? '');
  if (
    message.includes('React Router Future Flag Warning') &&
    (message.includes('v7_startTransition') || message.includes('v7_relativeSplatPath'))
  ) {
    return;
  }
  originalConsoleWarn(...args);
};

vi.mock('react-router-dom', async () => {
  const [React, actual] = await Promise.all([
    vi.importActual('react'),
    vi.importActual('react-router-dom'),
  ]);
  const futureDefaults = {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  };
  const withFutureDefaults = (Router) => {
    const RouterWithFutureDefaults = ({ future, ...props }) =>
      (React as any).createElement(Router, {
        ...props,
        future: {
          ...futureDefaults,
          ...future,
        },
      });
    return RouterWithFutureDefaults;
  };

  return {
    ...actual,
    BrowserRouter: withFutureDefaults(actual.BrowserRouter),
    MemoryRouter: withFutureDefaults(actual.MemoryRouter),
  };
});

// Cleanup after each test
afterEach(() => {
  // Background debounces can outlive the file that armed them and then fire
  // against a torn-down environment, which Vitest reports as an
  // EnvironmentTeardownError and which makes the run exit non-zero even when
  // every test passed. Cancelling here covers every file at once rather than
  // each suite remembering to do it. The registry is dependency-free, so this
  // import costs nothing for files that never arm a timer.
  cancelAllBackgroundTimers();
  cleanup();
});

afterEach(async () => {
  // Several services hand off through `void import(...)` fire-and-forget calls.
  // Those module graphs keep loading after the test that started them returns,
  // and tearing the environment down mid-load is what produces
  // "Cannot load ... after the environment was torn down". Giving the macrotask
  // queue a few turns lets the in-flight ones finish first.
  for (let i = 0; i < 3; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  cancelAllBackgroundTimers();
});

// Mock localStorage
const localStorageMock = (() => {
  let store: any = {};

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {} as any;
    },
  };
})();

global.localStorage = localStorageMock as any;

// Mock logger
vi.mock('../utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock fetch globally
global.fetch = vi.fn();

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = global.ResizeObserver || ResizeObserverMock;
window.ResizeObserver = window.ResizeObserver || ResizeObserverMock;

if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

// jsdom cannot navigate across documents; stub to avoid noisy integration-test failures.
if (!('navigation' in window)) {
  Object.defineProperty(window, 'navigation', {
    configurable: true,
    value: {
      navigate: vi.fn().mockResolvedValue(undefined),
      back: vi.fn(),
      forward: vi.fn(),
      reload: vi.fn(),
    },
  });
}

const jsdomNavigationPattern = /Not implemented: navigation to another Document/;
const originalConsoleError = console.error.bind(console);
console.error = (...args) => {
  if (jsdomNavigationPattern.test(String(args[0] ?? ''))) {
    return;
  }
  originalConsoleError(...args);
};

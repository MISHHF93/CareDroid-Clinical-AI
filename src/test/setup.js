import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
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
      React.createElement(Router, {
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
  cleanup();
});

// Mock localStorage
const localStorageMock = (() => {
  let store = {};

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

global.localStorage = localStorageMock;

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

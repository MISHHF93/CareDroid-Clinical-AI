/**
 * Shared render helpers for responsive regression / page smoke tests.
 */

import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

export const mockToolPreferencesValue = {
  recordToolAccess: vi.fn(),
  favorites: [],
  pinned: [],
  recentTools: [],
  toggleFavorite: vi.fn(),
  togglePinned: vi.fn(),
  clearRecentTools: vi.fn(),
};

export const mockConversationValue = {
  conversations: [{ id: '1', title: 'Test', date: new Date().toISOString() }],
  activeConversationId: '1',
  messages: [{ id: 'm1', role: 'assistant', content: 'Clinical decision support ready.' }],
  selectedTool: null,
  isLoading: false,
  addConversation: vi.fn(),
  selectConversation: vi.fn(),
  deleteConversation: vi.fn(),
  addMessage: vi.fn(),
  clearMessages: vi.fn(),
  selectTool: vi.fn(),
  setActiveTool: vi.fn(),
  clearTool: vi.fn(),
  setIsLoading: vi.fn(),
};

export const mockUserValue = {
  user: {
    id: 'test-user',
    email: 'test@caredroid.local',
    name: 'Test Clinician',
    role: 'physician',
    fullName: 'Test Clinician',
  },
  authToken: 'test-token',
  isAuthenticated: true,
  isLoading: false,
  hasPermission: () => true,
  hasAnyPermission: () => true,
  hasAllPermissions: () => true,
  setUser: vi.fn(),
  setAuthToken: vi.fn(),
  signOut: vi.fn(),
};

export const mockWorkspaceValue = {
  workspaces: [{ id: 'default', name: 'Default', toolIds: [] }],
  activeWorkspaceId: 'default',
  setActiveWorkspaceId: vi.fn(),
  addWorkspace: vi.fn(),
};

export const mockNotificationsValue = {
  notifications: [],
  addNotification: vi.fn(),
  markAsRead: vi.fn(),
  clearAll: vi.fn(),
};

/**
 * @param {import('react').ReactElement} ui
 * @param {{ route?: string }} [options]
 */
export function renderWithRouter(ui, options = {}) {
  const { route = '/' } = options;
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

/**
 * Mock compact layout media query (AppShell uses max-width: 900px).
 * @param {boolean} matches
 */
export function mockCompactViewport(matches = true) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: matches && /max-width:\s*900px/.test(String(query)),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

/**
 * @param {HTMLElement} container
 */
export function expectNonEmptyPage(container) {
  const text = (container.textContent || '').replace(/\s+/g, ' ').trim();
  expect(text.length).toBeGreaterThan(24);
}

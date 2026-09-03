import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Regression coverage for a real bug found by rendering the app against a
 * static build with no live backend (roadmap item #22's verification
 * pipeline): NotificationPreferences.tsx showed a raw browser exception —
 * `Unexpected token '<', "<!DOCTYPE "... is not valid JSON` — instead of a
 * friendly message, while sibling pages (Security/Audit governance
 * dashboards) hitting the identical "backend returned the SPA's index.html
 * instead of JSON" condition show a designed fallback message via
 * apiClient's parseApiResponse. NotificationService.ts's REST methods were
 * inconsistent: some already used parseApiResponse (safe), others called
 * `response.json()` directly (unsafe, lets the raw SyntaxError propagate).
 *
 * This suite mocks only the network boundary (apiFetch) and keeps the real
 * parseApiResponse/getApiErrorMessage — mocking NotificationService itself,
 * as NotificationPreferences.test.tsx correctly does for its own purpose,
 * would never be able to catch this class of bug.
 */
const apiFetch = vi.fn();

vi.mock('./apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./apiClient')>();
  return {
    ...actual,
    apiFetch: (...args: unknown[]) => apiFetch(...args),
    getStoredAccessToken: () => 'test-token',
  };
});

const { NotificationService } = await import('./NotificationService');

function htmlFallbackResponse(url: string) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    url,
    headers: { get: () => 'text/html; charset=utf-8' },
    text: async () => '<!DOCTYPE html><html><head></head><body>CareDroid</body></html>',
  };
}

function jsonResponse(body: unknown, url: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    url,
    headers: { get: () => 'application/json' },
    text: async () => JSON.stringify(body),
  };
}

describe('NotificationService REST methods — real parseApiResponse behavior', () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it('getPreferences rejects with the friendly HTML-fallback message, not a raw SyntaxError', async () => {
    apiFetch.mockResolvedValue(htmlFallbackResponse('/api/notifications/preferences'));
    await expect(NotificationService.getPreferences()).rejects.toThrow(
      /API returned an HTML page instead of JSON/i,
    );
  });

  it('fetchNotificationHistory rejects with the friendly HTML-fallback message', async () => {
    apiFetch.mockResolvedValue(htmlFallbackResponse('/api/notifications?limit=10'));
    await expect(NotificationService.fetchNotificationHistory(10)).rejects.toThrow(
      /API returned an HTML page instead of JSON/i,
    );
  });

  it('markAsRead rejects with the friendly HTML-fallback message', async () => {
    apiFetch.mockResolvedValue(htmlFallbackResponse('/api/notifications/abc/read'));
    await expect(NotificationService.markAsRead('abc')).rejects.toThrow(
      /API returned an HTML page instead of JSON/i,
    );
  });

  it('updatePreferences rejects with the friendly HTML-fallback message', async () => {
    apiFetch.mockResolvedValue(htmlFallbackResponse('/api/notifications/preferences'));
    await expect(NotificationService.updatePreferences({ emailEnabled: false })).rejects.toThrow(
      /API returned an HTML page instead of JSON/i,
    );
  });

  it('getPreferences still returns real parsed JSON on a genuine success response', async () => {
    apiFetch.mockResolvedValue(
      jsonResponse({ preferences: { emailEnabled: true } }, '/api/notifications/preferences'),
    );
    await expect(NotificationService.getPreferences()).resolves.toEqual({
      preferences: { emailEnabled: true },
    });
  });

  it('getPreferences surfaces a real backend error message on a non-HTML failure response', async () => {
    apiFetch.mockResolvedValue(
      jsonResponse(
        { message: 'Preferences record not found.' },
        '/api/notifications/preferences',
        404,
      ),
    );
    await expect(NotificationService.getPreferences()).rejects.toThrow(
      'Preferences record not found.',
    );
  });
});

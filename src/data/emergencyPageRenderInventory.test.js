import { describe, expect, it } from 'vitest';
import {
  EMERGENCY_PAGE_ALL_RENDER_PATHS,
  EMERGENCY_PAGE_PRIMARY_PATHS,
  EMERGENCY_PAGE_RENDER_INVENTORY,
  EMERGENCY_PAGE_SCREENSHOT_TARGETS,
  getCanonicalAppPagePaths,
} from './emergencyPageRenderInventory';
import { APP_SHELL_NAV_ITEMS } from '../config/navigation.config';
import { BACKEND_HTTP_ROUTES } from './backendHttpRouteInventory';

function routeKey(method, path) {
  return `${method.toUpperCase()} ${path}`;
}

function endpointKey(endpoint) {
  const match = endpoint.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(.+)$/i);
  return match ? routeKey(match[1], match[2]) : routeKey('GET', endpoint);
}

describe('emergencyPageRenderInventory', () => {
  it('matches the mounted App page routes', () => {
    expect(getCanonicalAppPagePaths()).toEqual(EMERGENCY_PAGE_ALL_RENDER_PATHS);
  });

  it('keeps requested AppShell nav paths in the active page inventory', () => {
    expect(APP_SHELL_NAV_ITEMS.map((item) => item.label)).toEqual([
      'Board',
      'Pulse',
      'Patients',
      'Journey',
      'Intake',
      'Queues',
      'Reassess',
      'EMS',
      'Referrals',
      'Provincial',
      'Integrations',
      'Capacity',
      'Boarding',
      'Copilot',
      'Analytics',
      'Sim',
      'Tools',
      'Shift',
      'Settings',
    ]);

    for (const item of APP_SHELL_NAV_ITEMS) {
      expect(EMERGENCY_PAGE_PRIMARY_PATHS).toContain(item.path);
    }
    expect(APP_SHELL_NAV_ITEMS.map((item) => item.id)).not.toContain('ai_governance');
  });

  it('maps page load and action endpoints to inventoried backend routes', () => {
    const backendKeys = new Set(
      BACKEND_HTTP_ROUTES.map((route) => routeKey(route.method, route.path)),
    );

    for (const entry of EMERGENCY_PAGE_RENDER_INVENTORY) {
      for (const endpoint of [...entry.loadEndpoints, ...entry.actionEndpoints]) {
        expect(backendKeys.has(endpointKey(endpoint)), `${entry.id} -> ${endpoint}`).toBe(true);
      }
    }
  });

  it('keeps screenshot targets unique and concrete', () => {
    expect(new Set(EMERGENCY_PAGE_SCREENSHOT_TARGETS.map((target) => target.path)).size).toBe(
      EMERGENCY_PAGE_SCREENSHOT_TARGETS.length,
    );
    expect(
      new Set(EMERGENCY_PAGE_SCREENSHOT_TARGETS.map((target) => target.screenshotSlug)).size,
    ).toBe(EMERGENCY_PAGE_SCREENSHOT_TARGETS.length);
    expect(EMERGENCY_PAGE_SCREENSHOT_TARGETS.every((target) => target.path.startsWith('/'))).toBe(
      true,
    );
  });
});

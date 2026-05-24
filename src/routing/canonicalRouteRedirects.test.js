import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');

describe('canonical route redirects', () => {
  it('keeps legacy dashboard and chat paths as redirects, not duplicate page routes', () => {
    expect(appSource).toContain("path: '/dashboard', element: <LegacyProtectedRouteRedirect to=\"/home\" />");
    expect(appSource).toContain("path: '/chat', element: <LegacyProtectedRouteRedirect to=\"/assistant\" />");
    expect(appSource).not.toContain("path: '/dashboard', element: <AppShellPage><Dashboard /></AppShellPage>");
    expect(appSource).not.toContain("path: '/chat', element: <AppShellPage><Dashboard /></AppShellPage>");
  });

  it('gives the fleet area an explicit canonical landing redirect', () => {
    expect(appSource).toContain("path: '/fleet', element: <LegacyProtectedRouteRedirect to=\"/fleet/command\" />");
    expect(appSource).toContain("path: '/fleet/command', element: <AppShellPage><FleetDashboard /></AppShellPage>");
  });
});

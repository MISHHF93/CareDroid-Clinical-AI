/**
 * Sidebar navigation contracts (source-level; avoids heavy Sidebar render).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sidebarSource = readFileSync(join(__dirname, 'Sidebar.jsx'), 'utf8');
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const appShellSource = readFileSync(join(__dirname, '../layout/AppShell.jsx'), 'utf8');
const primaryNavSource = readFileSync(join(__dirname, '../navigation/primaryNavigation.js'), 'utf8');

describe('Simplified sidebar navigation wiring', () => {
  it('keeps /tools and /tools/calculators as first-class canonical routes', () => {
    expect(appSource).toContain("path: '/tools'");
    expect(appSource).toContain('<ToolsOverview />');
    expect(appSource).toContain("path: '/tools/calculators'");
    expect(appSource).toContain('<Calculators />');
  });

  it('renders canonical primary navigation without duplicate tool-card shortcuts', () => {
    expect(sidebarSource).toContain('PRIMARY_SIDEBAR_NAV_ITEMS');
    expect(sidebarSource).toContain('ADVANCED_SIDEBAR_NAV_ITEMS');
    expect(sidebarSource).not.toContain('getSidebarToolRegistryProjection');
    expect(sidebarSource).not.toContain('partitionSidebarTools');
    expect(sidebarSource).not.toContain('showToolsSection');
    expect(sidebarSource).not.toContain('applyRegistryToolLaunch');
  });

  it('keeps removed sidebar props out of AppShell wiring', () => {
    expect(appShellSource).not.toContain('onOpenToolsOverview');
    expect(appShellSource).not.toContain('onOpenToolsCatalog');
    expect(appShellSource).not.toContain('onToolSelect={');
    expect(appShellSource).toContain('onOpenQuickCommand={openQuickCommand}');
  });

  it('defines the requested visible primary routes and advanced routes', () => {
    for (const path of [
      '/dashboard',
      '/assistant',
      '/tools',
      '/tools/calculators',
      '/hospital-map',
      '/medical-iot',
      '/fleet/map',
      '/profile',
      '/settings',
    ]) {
      expect(primaryNavSource, path).toContain(`path: '${path}'`);
    }

    for (const path of ['/tools/catalog', '/system-health', '/ai-governance', '/security', '/audit-logs']) {
      expect(primaryNavSource, path).toContain(`path: '${path}'`);
    }
  });

  it('keeps Advanced collapsed and permission-gated', () => {
    expect(sidebarSource).toContain('showAdvanced &&');
    expect(sidebarSource).toContain('aria-expanded={showAdvanced}');
    expect(sidebarSource).toContain('PermissionGate');
    expect(sidebarSource).toContain('requireAll={item.requireAllPermissions}');
    expect(primaryNavSource).toContain("label: 'Developer Catalog / Source Audit'");
    expect(primaryNavSource).toContain("permission: 'CONFIGURE_SYSTEM'");
  });

  it('closes the mobile drawer after navigation and starts new chats on /assistant', () => {
    expect(sidebarSource).toContain('handleNavClick');
    expect(sidebarSource).toContain('onCloseMobileNav();');
    expect(sidebarSource).toContain("navigate('/assistant')");
    expect(sidebarSource).toContain('onNewConversation?.()');
  });
});

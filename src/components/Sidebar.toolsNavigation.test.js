/**
 * Sidebar navigation contracts (source-level; avoids heavy Sidebar render).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ADVANCED_SIDEBAR_NAV_ITEMS,
  OPERATIONS_SIDEBAR_NAV_ITEMS,
  PRIMARY_SIDEBAR_NAV_ITEMS,
} from '../config/navigation.config';
import { CANONICAL_ROUTES } from '../config/routes.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sidebarSource = readFileSync(join(__dirname, 'Sidebar.jsx'), 'utf8');
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const appShellSource = readFileSync(join(__dirname, '../layout/AppShell.jsx'), 'utf8');
const navigationConfigSource = readFileSync(
  join(__dirname, '../config/navigation.config.js'),
  'utf8'
);
const visibleSidebarItems = [
  ...PRIMARY_SIDEBAR_NAV_ITEMS,
  ...OPERATIONS_SIDEBAR_NAV_ITEMS,
  ...ADVANCED_SIDEBAR_NAV_ITEMS,
];

describe('Simplified sidebar navigation wiring', () => {
  it('keeps /tools and /tools/calculators as first-class canonical routes', () => {
    expect(appSource).toContain("path: '/tools'");
    expect(appSource).toContain('<ToolsOverview />');
    expect(appSource).toContain("path: '/tools/calculators'");
    expect(appSource).toMatch(
      /path:\s*'\/tools\/calculators'[\s\S]*<ToolsOverview \/>[\s\S]*requiresAuth:\s*true/
    );
    expect(appSource).toMatch(
      /path:\s*'\/tools\/calculators\/:slug'[\s\S]*<Calculators \/>[\s\S]*requiresAuth:\s*true/
    );
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
    const navPaths = visibleSidebarItems.map((item) => item.path);

    for (const path of [
      '/dashboard',
      '/discover',
      '/automation',
      '/assistant',
      '/tools',
      '/operations',
      '/digital-twin',
      '/hospital-map',
      '/medical-iot',
      '/devices',
      '/fleet/map',
      '/live-map',
      '/profile',
      '/settings',
    ]) {
      expect(navPaths, path).toContain(path);
    }

    for (const path of [
      '/tools/catalog',
      '/system-health',
      '/feature-flags',
      '/plugins',
      '/dependency-map',
      '/data-lineage',
      '/self-diagnostics',
      '/ai-governance',
      '/security',
      '/audit',
      '/regulatory',
      '/assets',
    ]) {
      expect(navPaths, path).toContain(path);
    }
  });

  it('does not duplicate visible sidebar destinations, labels, or non-canonical links', () => {
    const labels = visibleSidebarItems.map((item) => item.label);
    const paths = visibleSidebarItems.map((item) => item.path);
    const canonicalPaths = new Set(Object.values(CANONICAL_ROUTES));

    expect(new Set(labels).size).toBe(labels.length);
    expect(new Set(paths).size).toBe(paths.length);
    for (const item of visibleSidebarItems) {
      expect(canonicalPaths.has(item.path), `${item.label} -> ${item.path}`).toBe(true);
    }
  });

  it('keeps Advanced collapsed and permission-gated', () => {
    expect(sidebarSource).toContain('showAdvanced &&');
    expect(sidebarSource).toContain('aria-expanded={showAdvanced}');
    expect(sidebarSource).toContain('PermissionGate');
    expect(sidebarSource).toContain('requireAll={item.requireAllPermissions}');
    expect(navigationConfigSource).toContain("label: 'Developer Catalog'");
    expect(navigationConfigSource).toContain("permission: 'CONFIGURE_SYSTEM'");
  });

  it('closes the mobile drawer after navigation and starts new chats on /assistant', () => {
    expect(sidebarSource).toContain('handleNavClick');
    expect(sidebarSource).toContain('onCloseMobileNav();');
    expect(sidebarSource).toContain("navigate('/assistant')");
    expect(sidebarSource).toContain('onNewConversation?.()');
  });
});

/**
 * Sidebar navigation contracts (source-level; avoids heavy Sidebar render).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_UTILITY_NAV_ITEMS,
  ADVANCED_SIDEBAR_NAV_ITEMS,
  OPERATIONS_SIDEBAR_NAV_ITEMS,
  PRIMARY_SIDEBAR_NAV_ITEMS,
  SECONDARY_NAV_ITEMS,
  SOLUTIONS_SIDEBAR_NAV_ITEMS,
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
const visibleSidebarItems = PRIMARY_SIDEBAR_NAV_ITEMS;

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
    expect(sidebarSource).not.toContain('ADVANCED_SIDEBAR_NAV_ITEMS');
    expect(sidebarSource).not.toContain('getSidebarToolRegistryProjection');
    expect(sidebarSource).not.toContain('partitionSidebarTools');
    expect(sidebarSource).not.toContain('showToolsSection');
    expect(sidebarSource).not.toContain('applyRegistryToolLaunch');
  });

  it('keeps sidebar recent chats capped for entropy compression', () => {
    expect(sidebarSource).toContain('conversations.slice(-2).reverse()');
  });

  it('keeps removed sidebar props out of AppShell wiring', () => {
    expect(appShellSource).not.toContain('onOpenToolsOverview');
    expect(appShellSource).not.toContain('onOpenToolsCatalog');
    expect(appShellSource).not.toContain('onToolSelect={');
    expect(appShellSource).toContain('app-shell-header-utilities');
    expect(appShellSource).toContain('onClick={openQuickCommand}');
  });

  it('defines exactly the reduced visible primary routes', () => {
    const navPaths = visibleSidebarItems.map((item) => item.path);

    expect(navPaths).toEqual(['/dashboard', '/assistant', '/tools', '/operations', '/workspaces', '/profile']);
    expect(navPaths).toHaveLength(6);

    for (const path of [
      '/discover',
      '/automation',
      '/digital-twin-intelligence',
      '/digital-twin',
      '/hospital-map',
      '/medical-iot',
      '/devices',
      '/fleet/map',
      '/live-map',
      '/asset-packs',
      '/products',
      '/organization',
      '/platform-admin',
      '/configuration-studio',
      '/tools/catalog',
      '/system-health',
      '/saas-health',
      '/feature-flags',
      '/plugins',
      '/dependency-map',
      '/dependency-graph',
      '/governance-registry',
      '/data-lineage',
      '/self-diagnostics',
      '/platform-learning-engine',
      '/brain',
      '/ai-evaluation',
      '/ai-governance',
      '/security',
      '/audit',
      '/regulatory',
      '/assets',
    ]) {
      expect(navPaths, path).not.toContain(path);
    }
  });

  it('keeps secondary, solutions, operations, advanced, and account destinations outside primary nav', () => {
    expect(SECONDARY_NAV_ITEMS).toEqual([]);
    expect(SOLUTIONS_SIDEBAR_NAV_ITEMS.map((item) => item.path)).toEqual(
      expect.arrayContaining(['/solution-builder', '/value-tracking', '/success-center'])
    );
    expect(OPERATIONS_SIDEBAR_NAV_ITEMS.map((item) => item.path)).toEqual([
      '/workflow-mining',
      '/workspace-dependency-graph',
      '/digital-twin-intelligence',
      '/digital-twin',
      '/hospital-map',
      '/medical-iot',
      '/devices',
      '/fleet/map',
      '/live-map',
      '/usage',
    ]);
    expect(ACCOUNT_UTILITY_NAV_ITEMS.map((item) => item.path)).toEqual([
      '/search',
      '/discover',
      '/workflows',
      '/customer-portal',
      '/knowledge-hub',
      '/knowledge-base',
      '/marketplace',
      '/enterprise-readiness',
      '/platform-admin',
      '/tenant-admin',
      '/billing',
      '/notifications',
    ]);
    expect(ADVANCED_SIDEBAR_NAV_ITEMS.map((item) => item.path)).toEqual(
      expect.arrayContaining(['/tools/catalog', '/system-health', '/ai-governance', '/audit'])
    );
    expect(ADVANCED_SIDEBAR_NAV_ITEMS.map((item) => item.path)).not.toEqual(
      expect.arrayContaining(['/asset-packs', '/products', '/platform-admin'])
    );
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

  it('keeps non-primary destinations out of persistent sidebar navigation', () => {
    expect(sidebarSource).not.toContain('showAdvanced &&');
    expect(sidebarSource).not.toContain('aria-expanded={showAdvanced}');
    expect(sidebarSource).not.toContain('sidebar-advanced-toggle');
    expect(sidebarSource).not.toContain('aria-label="Open notifications"');
    expect(sidebarSource).not.toContain('BuildInfoBadge');
    expect(sidebarSource).not.toContain('sidebar-nav--solutions');
    expect(sidebarSource).not.toContain('sidebar-operational-workspace');
    expect(sidebarSource).toContain('PermissionGate');
    expect(sidebarSource).toContain('requireAll={item.requireAllPermissions}');
    expect(navigationConfigSource).toContain("label: 'Developer Catalog'");
    expect(navigationConfigSource).toContain("permission: 'CONFIGURE_SYSTEM'");
    expect(navigationConfigSource).toContain("label: 'Workspace'");
    expect(navigationConfigSource).not.toContain("id: 'workspace',\n    label: 'Workspace',\n    mobileLabel: 'Work',\n    path: '/workspaces'");
  });

  it('closes the mobile drawer after navigation and starts new chats on /assistant', () => {
    expect(sidebarSource).toContain('handleNavClick');
    expect(sidebarSource).toContain('onCloseMobileNav();');
    expect(sidebarSource).toContain("navigate('/assistant')");
    expect(sidebarSource).toContain('onNewConversation?.()');
  });
});

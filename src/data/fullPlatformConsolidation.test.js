/**
 * Full platform consolidation guardrail.
 *
 * This does not replace focused feature tests; it verifies the integrated
 * operating-system surface stays coherent across auth, routes, tools,
 * calculators, AI systems, governance, profile, maps, and backend contracts.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import { resolveCatalogLaunch } from './clinicalCatalogWiring';
import { getCalculatorToolInventory, getUserFacingToolInventory } from './toolInventory';
import { BACKEND_HTTP_ROUTES, findBackendRoute } from './backendHttpRouteInventory';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = dirname(__dirname);
const appSource = readFileSync(join(srcRoot, 'App.jsx'), 'utf8');
const appShellSource = readFileSync(join(srcRoot, 'layout/AppShell.jsx'), 'utf8');
const userContextSource = readFileSync(join(srcRoot, 'contexts/UserContext.jsx'), 'utf8');
const authSource = readFileSync(join(srcRoot, 'pages/Auth.jsx'), 'utf8');
const devAuthSource = readFileSync(join(srcRoot, 'auth/devAuthBypass.js'), 'utf8');
const appConfigSource = readFileSync(join(srcRoot, 'config/appConfig.js'), 'utf8');
const authConfigSource = readFileSync(join(srcRoot, 'config/auth.config.js'), 'utf8');
const appShellCss = readFileSync(join(srcRoot, 'layout/AppShell.css'), 'utf8');
const indexCss = readFileSync(join(srcRoot, 'index.css'), 'utf8');
const themeTokensCss = readFileSync(join(srcRoot, 'styles/theme-tokens.css'), 'utf8');
const routeConfigSource = readFileSync(join(srcRoot, 'config/routes.config.js'), 'utf8');
const viteConfigSource = readFileSync(join(dirname(srcRoot), 'vite.config.js'), 'utf8');

const REQUIRED_AUTH_SNIPPETS = Object.freeze([
  "path: '/auth'",
  'AUTH_PATH_ALIASES.map',
  'element: <Navigate to="/dashboard" replace />',
]);

const REQUIRED_ROUTES = Object.freeze([
  '/dashboard',
  '/workspaces',
  '/search',
  '/timeline',
  '/notifications',
  '/digital-twin',
  '/workflows',
  '/assets',
  '/assistant',
  '/tools',
  '/tools/calculators',
  '/tools/catalog',
  '/ai-command-center',
  '/fleet/command',
  '/fleet/map',
  '/medical-iot',
  '/hospital-map',
  '/devices',
  '/live-map',
  '/profile',
  '/profile/settings',
  '/profile/activity',
  '/profile/workspaces',
  '/ai-governance',
  '/security',
  '/privacy',
  '/audit',
  '/regulatory',
  '/human-review',
  '/system-health',
]);

const REQUIRED_CALCULATORS = Object.freeze([
  'qsofa',
  'news2',
  'sofa-score',
  'apache2-calculator',
  'curb65-calculator',
  'mews',
  'gcs-calculator',
  'shock-index',
  'revised-trauma-score',
  'pews',
  'nihss',
  'canadian-c-spine',
  'ottawa-ankle',
  'perc',
  'wells-pe',
  'wells-dvt-calculator',
  'nexus-cspine',
  'pecarn-head',
  'heart-score',
  'grace-acs',
]);

const REQUIRED_AI_SYSTEM_TOOLS = Object.freeze([
  'ai-gateway',
  'moe-router',
  'ai-rag',
  'ai-tool-calling',
  'ai-memory',
  'ai-artifacts',
  'ai-cost-optimization',
  'ai-evaluation',
  'ai-command-center',
  'ai-governance',
  'ai-security',
]);

const REQUIRED_BACKEND_ROUTES = Object.freeze([
  ['GET', '/api/ai-governance/summary'],
  ['GET', '/api/security/summary'],
  ['GET', '/api/fleet/snapshot'],
  ['GET', '/api/medical-iot/snapshot'],
  ['GET', '/api/hospital-map/floors'],
  ['GET', '/api/hospital-map/devices'],
  ['GET', '/api/platform-governance/summary'],
  ['GET', '/api/operations/service-health'],
  ['GET', '/api/profile/me'],
  ['GET', '/api/profile/me/workspaces'],
]);

describe('full platform consolidation contract', () => {
  it('bypasses /auth with direct open access and no team verification wrapper', () => {
    for (const snippet of REQUIRED_AUTH_SNIPPETS) {
      expect(appSource).toContain(snippet);
    }

    expect(authSource).toContain('Enter Platform');
    expect(authSource).toContain('directSignInSection');
    expect(userContextSource).toContain('OPEN_ACCESS_USER');
    expect(userContextSource).toContain("authMode: 'open-access'");
    expect(appSource).not.toContain('<TenantRequired>');
    expect(appShellSource).toContain('app-shell-dev-mode-banner');
    expect(devAuthSource).toContain('AUTH_CONFIG.demo.exposed');
    expect(authConfigSource).toContain('ENV_CONFIG.demoMode');
    expect(authConfigSource).toContain('showDemoAuth');
    expect(appConfigSource).toContain('VITE_DEMO_MODE');
    expect(appConfigSource).toContain('VITE_SHOW_DEMO_AUTH');
  });

  it('declares the unified clinical operating-system route surface once', () => {
    for (const route of REQUIRED_ROUTES) {
      expect(appSource, route).toContain(`path: '${route}'`);
    }

    expect(appSource).toContain('PROTECTED_ROUTE_ALIAS_REDIRECTS.map');
    expect(routeConfigSource).toContain(
      "export const ASSISTANT_ROUTE_ALIASES = Object.freeze(['/chat', '/ai', '/copilot'])"
    );
    expect(routeConfigSource).toContain(
      "export const TOOLS_ROUTE_ALIASES = Object.freeze(['/all-tools', '/clinical-tools', '/catalog'])"
    );
    expect(routeConfigSource).toContain(
      "export const OPERATIONS_ROUTE_ALIASES = Object.freeze(['/operations-center'])"
    );
    expect(routeConfigSource).toContain("export const HOME_ROUTE_ALIASES = Object.freeze(['/home'])");
    expect(routeConfigSource).toContain('export const PROTECTED_ROUTE_ALIAS_REDIRECTS = Object.freeze(');
    expect(appSource).not.toMatch(/element:\s*null|element:\s*undefined/);
  });

  it('keeps all user-facing tools unique, searchable, and launchable', () => {
    const userFacing = getUserFacingToolInventory();
    const registryIds = new Set(toolRegistry.map((tool) => tool.id));
    const userIds = new Set(userFacing.map((tool) => tool.id));

    expect(userIds.size).toBe(userFacing.length);
    for (const registryId of registryIds) {
      expect(userIds, registryId).toContain(registryId);
    }

    for (const tool of userFacing.filter((record) => record.launchable)) {
      const launch = resolveCatalogLaunch(tool.id);
      expect(launch.path || launch.chatSeed, tool.id).toBeTruthy();
      expect(tool.label || tool.name, tool.id).toBeTruthy();
      expect(tool.description || tool.category, tool.id).toBeTruthy();
    }
  });

  it('wires the requested emergency and critical-care calculators', () => {
    const calculatorIds = new Set(getCalculatorToolInventory().map((tool) => tool.id));

    for (const calculatorId of REQUIRED_CALCULATORS) {
      const registryRecord = toolRegistryById[calculatorId];
      const launch = resolveCatalogLaunch(calculatorId);

      expect(registryRecord, calculatorId).toBeTruthy();
      expect(calculatorIds, calculatorId).toContain(calculatorId);
      expect(launch.path || launch.chatSeed, calculatorId).toBeTruthy();
    }
  });

  it('keeps AI-native systems, governance, profile, maps, and telemetry visible', () => {
    for (const toolId of REQUIRED_AI_SYSTEM_TOOLS) {
      expect(toolRegistryById[toolId], toolId).toBeTruthy();
      expect(
        resolveCatalogLaunch(toolId).path || resolveCatalogLaunch(toolId).chatSeed,
        toolId
      ).toBeTruthy();
    }

    for (const toolId of [
      'hospital-map',
      'medical-iot-dashboard',
      'device-fleet-management',
      'fleet-live-map',
      'live-tracking-map',
    ]) {
      expect(toolRegistryById[toolId], toolId).toBeTruthy();
      expect(resolveCatalogLaunch(toolId).path, toolId).toMatch(
        /^\/(hospital-map|medical-iot|devices|fleet|live-map)/
      );
    }
  });

  it('keeps backend routes, executor contracts, and Vite proxy discoverable', () => {
    expect(BACKEND_HTTP_ROUTES.length).toBeGreaterThan(50);

    for (const [method, path] of REQUIRED_BACKEND_ROUTES) {
      expect(findBackendRoute(method, path), `${method} ${path}`).toBeTruthy();
    }

    expect(viteConfigSource).toContain("'/api'");
    expect(viteConfigSource).toContain("'/health'");
    expect(viteConfigSource).toContain('proxy: proxyPaths(proxyTarget)');
  });

  it('keeps theme and mobile scrolling consolidated at the shell layer', () => {
    expect(themeTokensCss).toContain('--app-bg');
    expect(themeTokensCss).toContain('--app-accent');
    expect(themeTokensCss).toContain("html[data-theme='dark']");
    expect(indexCss).toMatch(/html\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(indexCss).toMatch(/body\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(appShellCss).toMatch(/\.app-shell-page-body\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(appShellCss).toMatch(
      /\.app-shell-page-body--conversation\s*\{[\s\S]*overflow:\s*hidden/
    );
  });
});

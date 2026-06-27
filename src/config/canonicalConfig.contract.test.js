import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { API_ROUTES, normalizeApiPath } from './api.config';
import appConfig, { SUPPORTED_APP_ENVIRONMENTS, normalizeAppEnvironment } from './appConfig';
import { AUTH_CONFIG } from './auth.config';
import { FEATURE_FLAGS } from './featureFlags.config';
import {
  ASSISTANT_ROUTE_ALIASES,
  AUTH_PATH_ALIASES,
  CANONICAL_ROUTES,
  ORGANIZATION_PACKS_ROUTE_ALIASES,
  PROTECTED_ROUTE_ALIAS_REDIRECTS,
  ROUTE_ALIAS_GROUPS,
  ROUTE_RECORDS,
  ROUTE_RECORDS_BY_ID,
  getRouteAliasTarget,
} from './routes.config';
import { LAYOUT_SCROLL_CONTRACT } from './layout.config';
import { THEME_CONFIG } from './theme.tokens';
import { QUICK_COMMAND_DESTINATION_ITEMS } from './navigation.config';
import { CARE_WORKSPACES } from './workspace.config';
import { CALCULATOR_ROUTE_DEFS } from '../routes/clinicalToolRoutes';
import { getCalculatorToolInventory, getUserFacingToolInventory } from '../data/toolInventory';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, '..');
const read = (path) => readFileSync(join(srcRoot, path), 'utf8');

describe('canonical configuration contract', () => {
  it('keeps active route aliases in routes.config and consumed by App/route health', () => {
    const appSource = read('App.jsx');
    const routeHealthSource = read('routing/routeHealth.js');

    expect(CANONICAL_ROUTES.auth).toBe('/auth');
    expect(AUTH_CONFIG.canonicalRoute).toBe(CANONICAL_ROUTES.auth);
    expect(getRouteAliasTarget('/signin')).toBe('/auth');
    expect(getRouteAliasTarget('/chat')).toBe('/emergency/copilot');
    expect(getRouteAliasTarget('/copilot')).toBe('/emergency/copilot');
    expect(getRouteAliasTarget('/catalog')).toBe('/emergency/tools');
    expect(getRouteAliasTarget('/fleet')).toBeNull();
    expect(getRouteAliasTarget('/home')).toBe('/emergency/whiteboard');
    expect(getRouteAliasTarget('/automation')).toBe('/workflows');
    expect(getRouteAliasTarget('/asset-packs')).toBeNull();
    expect(getRouteAliasTarget('/privacy')).toBeNull();
    expect(getRouteAliasTarget('/operations')).toBeNull();
    expect(ROUTE_ALIAS_GROUPS.assistant.aliases).toBe(ASSISTANT_ROUTE_ALIASES);
    expect(ROUTE_ALIAS_GROUPS.dashboard.target).toBe('/emergency/whiteboard');
    expect(ROUTE_ALIAS_GROUPS.assistant.target).toBe('/emergency/copilot');
    expect(ROUTE_ALIAS_GROUPS.tools.target).toBe('/emergency/tools');
    expect(ROUTE_ALIAS_GROUPS.calculators.target).toBe('/emergency/tools');
    expect(ROUTE_ALIAS_GROUPS.operations.target).toBe('/emergency/queues');
    expect(ROUTE_ALIAS_GROUPS.organizationPacks.aliases).toBe(ORGANIZATION_PACKS_ROUTE_ALIASES);
    expect(new Set(AUTH_PATH_ALIASES).size).toBe(AUTH_PATH_ALIASES.length);
    expect(new Set(PROTECTED_ROUTE_ALIAS_REDIRECTS.map((entry) => entry.path)).size).toBe(
      PROTECTED_ROUTE_ALIAS_REDIRECTS.length
    );

    expect(appSource).toContain("from './config/routes.config'");
    expect(appSource).toContain('LEGACY_EMERGENCY_ROUTE_REDIRECTS.map(({ path, to }) => (');
    expect(appSource).not.toMatch(/const\s+ASSISTANT_ROUTE_ALIASES\s*=\s*\[/);
    expect(appSource).not.toMatch(/const\s+TOOLS_ROUTE_ALIASES\s*=\s*\[/);
    expect(appSource).not.toContain('ASSISTANT_ROUTE_ALIASES.map');
    expect(appSource).not.toContain('AUDIT_ROUTE_ALIASES.map');
    expect(routeHealthSource).toContain("from '../config/routes.config'");
    expect(routeHealthSource).not.toContain('parseStringArrayConstant');
  });

  it('keeps canonical route records as the source for generated protected aliases', () => {
    const routeIds = ROUTE_RECORDS.map((route) => route.id);

    expect(new Set(routeIds).size).toBe(routeIds.length);
    expect(ROUTE_RECORDS_BY_ID.dashboard.path).toBe('/emergency/whiteboard');
    expect(ROUTE_RECORDS_BY_ID.dashboard.aliases).toContain('/home');
    expect(ROUTE_RECORDS_BY_ID.assistant.path).toBe('/emergency/copilot');
    expect(ROUTE_RECORDS_BY_ID.tools.path).toBe('/emergency/tools');
    expect(ROUTE_RECORDS_BY_ID.calculators.path).toBe('/emergency/tools');
    expect(ROUTE_RECORDS_BY_ID.assetPacks.path).toBe('/asset-packs');
    expect(ROUTE_RECORDS_BY_ID.assetPacks.componentKey).toBe('PackMarketplace');
    expect(ROUTE_RECORDS_BY_ID.organizationPacks.path).toBe('/settings/organization/packs');
    expect(ROUTE_RECORDS_BY_ID.organizationPacks.aliases).toBe(ORGANIZATION_PACKS_ROUTE_ALIASES);
    expect(PROTECTED_ROUTE_ALIAS_REDIRECTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/home', to: '/emergency/whiteboard', routeId: 'dashboard' }),
        expect.objectContaining({ path: '/chat', to: '/emergency/copilot', routeId: 'assistant' }),
        expect.objectContaining({ path: '/automation', to: '/workflows', routeId: 'workflows' }),
      ])
    );
    expect(PROTECTED_ROUTE_ALIAS_REDIRECTS).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/asset-packs' })])
    );
  });

  it('declares the compact clinical OS route surface in the canonical route map', () => {
    expect(Object.values(CANONICAL_ROUTES)).toEqual(
      expect.arrayContaining([
        '/dashboard',
        '/assistant',
        '/tools',
        '/operations',
        '/tools/calculators',
        '/tools/calculators/:slug',
        '/hospital-map',
        '/medical-iot',
        '/devices',
        '/fleet/map',
        '/live-map',
        '/digital-twin',
        '/digital-twin-intelligence',
        '/profile',
        '/profile/settings',
        '/profile/tool-preferences',
        '/settings',
        '/notifications',
        '/knowledge-hub',
        '/timeline',
        '/workflows',
        '/workflow-mining',
        '/workspace-dependency-graph',
        '/search',
        '/tools/catalog',
        '/system-health',
        '/platform-learning-engine',
        '/department-intelligence',
        '/product-intelligence',
        '/expansion-opportunities',
        '/brain',
        '/business-brain',
        '/ai-evaluation',
        '/ai-governance',
        '/security',
        '/audit',
        '/regulatory',
        '/human-review',
        '/assets',
        '/settings/organization/packs',
      ])
    );
    expect(getRouteAliasTarget('/audit-logs')).toBe('/audit');
  });

  it('keeps calculator manifest as a toolInventory projection', () => {
    const manifestSource = read('data/calculatorHubManifest.js');
    const calculatorRoutes = new Set(CALCULATOR_ROUTE_DEFS.map((route) => route.path));

    expect(manifestSource).toContain("from './toolInventory'");
    for (const tool of getCalculatorToolInventory().filter((tool) => tool.hasDedicatedForm)) {
      expect(calculatorRoutes, tool.id).toContain(tool.route);
    }
  });

  it('keeps user-facing tools, navigation destinations, and workspaces unique', () => {
    const toolIds = getUserFacingToolInventory().map((tool) => tool.id);
    const navPaths = QUICK_COMMAND_DESTINATION_ITEMS.map((item) => item.path);
    const workspaceIds = CARE_WORKSPACES.map((workspace) => workspace.id);

    expect(new Set(toolIds).size).toBe(toolIds.length);
    expect(new Set(navPaths).size).toBe(navPaths.length);
    expect(new Set(workspaceIds).size).toBe(workspaceIds.length);
  });

  it('routes API clients through api.config and auth.config', () => {
    expect(API_ROUTES.config.system).toBe('/api/config/system');
    expect(API_ROUTES.tools.execute('sofa-calculator')).toBe('/api/tools/sofa-calculator/execute');
    expect(normalizeApiPath('/users/profile')).toBe('/api/users/profile');

    expect(read('services/configService.js')).toContain("from '../config/api.config'");
    expect(read('services/apiClient.js')).toContain("from '../config/auth.config'");
    expect(read('services/clinicalOrchestratorApi.js')).toContain('API_ROUTES.tools.execute');
    expect(read('services/clinicalToolsApi.js')).toContain('AUTH_CONFIG.tokenStorageKey');
  });

  it('projects feature flags through featureFlags.config before env/auth consumers', () => {
    expect(FEATURE_FLAGS).toHaveProperty('enableDemoMode');
    expect(FEATURE_FLAGS).toHaveProperty('enableDevAuthBypass');
    expect(read('config/env.config.js')).toContain("from './featureFlags.config'");
    expect(read('config/auth.config.js')).toContain("from './env.config'");
  });

  it('normalizes frontend environment config and deployment metadata', () => {
    expect(SUPPORTED_APP_ENVIRONMENTS).toEqual([
      'local',
      'development',
      'staging',
      'production',
    ]);
    expect(normalizeAppEnvironment('dev')).toBe('development');
    expect(normalizeAppEnvironment('prod')).toBe('production');
    expect(normalizeAppEnvironment('staging')).toBe('staging');
    expect(normalizeAppEnvironment('qa')).toBe('development');
    expect(appConfig.app.environmentValidation.allowed).toBe(SUPPORTED_APP_ENVIRONMENTS);
    expect(appConfig.app.deployment).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        commit: expect.any(String),
        branch: expect.any(String),
      })
    );
  });

  it('centralizes theme and layout contracts without page-owned viewport shells', () => {
    expect(THEME_CONFIG.cssTokenSources).toContain('src/styles/theme-tokens.css');
    expect(read('contexts/ThemeContext.jsx')).toContain("from '../config/theme.tokens'");

    expect(LAYOUT_SCROLL_CONTRACT.viewportOwner).toBe('AppShell');
    expect(LAYOUT_SCROLL_CONTRACT.primaryScrollContainer).toBe('.app-shell-main-content');
    expect(LAYOUT_SCROLL_CONTRACT.normalPagesCreateViewportScrollShells).toBe(false);
    expect(read('layout/AppShell.jsx')).toContain("from '../config/layout.config'");
    expect(read('layout/AppShell.css')).toContain('.app-shell-main-content');
  });
});

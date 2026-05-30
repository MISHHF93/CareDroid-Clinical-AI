import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { API_ROUTES, normalizeApiPath } from './api.config';
import { AUTH_CONFIG } from './auth.config';
import {
  ASSISTANT_ROUTE_ALIASES,
  AUTH_PATH_ALIASES,
  CANONICAL_ROUTES,
  ROUTE_ALIAS_GROUPS,
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
    expect(getRouteAliasTarget('/copilot')).toBe('/assistant');
    expect(ROUTE_ALIAS_GROUPS.assistant.aliases).toBe(ASSISTANT_ROUTE_ALIASES);
    expect(new Set(AUTH_PATH_ALIASES).size).toBe(AUTH_PATH_ALIASES.length);

    expect(appSource).toContain("from './config/routes.config'");
    expect(appSource).not.toMatch(/const\s+ASSISTANT_ROUTE_ALIASES\s*=\s*\[/);
    expect(appSource).not.toMatch(/const\s+TOOLS_ROUTE_ALIASES\s*=\s*\[/);
    expect(routeHealthSource).toContain("from '../config/routes.config'");
    expect(routeHealthSource).not.toContain('parseStringArrayConstant');
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

  it('centralizes theme and layout contracts without page-owned viewport shells', () => {
    expect(THEME_CONFIG.cssTokenSources).toContain('src/styles/theme-tokens.css');
    expect(read('contexts/ThemeContext.jsx')).toContain("from '../config/theme.tokens'");

    expect(LAYOUT_SCROLL_CONTRACT.viewportOwner).toBe('AppShell');
    expect(LAYOUT_SCROLL_CONTRACT.primaryScrollContainer).toBe('.app-shell-page-body');
    expect(LAYOUT_SCROLL_CONTRACT.normalPagesCreateViewportScrollShells).toBe(false);
    expect(read('layout/AppShell.jsx')).toContain("from '../config/layout.config'");
    expect(read('layout/AppShell.css')).toContain('.app-shell-page-body');
  });
});

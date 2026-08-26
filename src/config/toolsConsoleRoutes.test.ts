import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TOOL_LAUNCH_PATHS } from '../data/clinicalToolIdContract';
import {
  TOOLS_AI_PAGE_ROUTES,
  TOOLS_CONSOLE_ROUTE_PATHS,
  TOOLS_FILTERED_CONSOLE_ROUTES,
  TOOLS_SHORTCUT_PAGE_ROUTES,
} from './toolsConsoleRoutes';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const routeTreeSource = readFileSync(join(__dirname, '../app/toolsConsoleRouteTree.tsx'), 'utf8');

describe('toolsConsoleRoutes', () => {
  it('covers the high-traffic tool console and AI tool paths', () => {
    expect(TOOLS_CONSOLE_ROUTE_PATHS).toEqual(
      expect.arrayContaining([
        TOOL_LAUNCH_PATHS.toolsOverview,
        TOOL_LAUNCH_PATHS.calculatorsHub,
        '/tools/ambient-scribe',
        '/tools/calculator-recommender',
        TOOL_LAUNCH_PATHS.protocols,
        '/lab',
      ]),
    );
  });

  it('maps filtered console routes to ToolsFilteredConsole', () => {
    expect(TOOLS_FILTERED_CONSOLE_ROUTES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/catalog', source: 'catalog', filter: 'all' }),
        expect.objectContaining({
          path: TOOL_LAUNCH_PATHS.calculatorsHub,
          source: 'calculators',
          filter: 'calculator',
        }),
      ]),
    );
  });

  it('keeps clinical shortcut pages on dedicated surfaces', () => {
    expect(TOOLS_SHORTCUT_PAGE_ROUTES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/lab', componentKey: 'laboratoryDashboard' }),
        expect.objectContaining({ path: TOOL_LAUNCH_PATHS.protocols, componentKey: 'protocolsLibrary' }),
      ]),
    );
  });

  it('lists every AI tool route with a component key', () => {
    for (const route of TOOLS_AI_PAGE_ROUTES) {
      expect(route.componentKey).toBeTruthy();
      expect(route.path.startsWith('/tools/')).toBe(true);
    }
  });

  it('mounts the tools console route tree inside RootLayout', () => {
    expect(appSource).toContain('{renderToolsConsoleRoutes(LazyRoute)}');
    expect(routeTreeSource).toContain('ToolsFilteredConsole');
    expect(routeTreeSource).toContain('AmbientScribe');
    expect(routeTreeSource).toContain('ProtocolsLibraryPage');
  });

  it('keeps calculator hub and legacy tool redirects out of explicit App mounts', () => {
    expect(appSource).not.toContain("path: '/tools/calculators'");
    expect(appSource).not.toContain("path: '/tools/calculators/:slug'");
    expect(appSource).not.toContain("path: '/tools/lab-interpreter'");
    expect(appSource).not.toContain("path: '/tools/calculator-recommender'");
    expect(appSource).not.toContain("path: '/protocols'");
    expect(appSource).not.toContain('element: <Protocols />');
    expect(appSource).toMatch(/<Route path="\/tools\/\*"\s+element=\{<ToolsRedirect \/>\}/);
    expect(appSource).toMatch(/<Route path="\/calculators\/\*"\s+element=\{<ToolsRedirect \/>\}/);
  });

  it('retires duplicate outside-shell shortcuts now served in RootLayout', () => {
    expect(appSource).not.toContain('<Route path="/catalog"');
    expect(appSource).not.toContain('<Route path="/all-tools"');
    expect(appSource).not.toContain('<Route path="/lab"');
    expect(appSource).not.toContain('<Route path="/fleet/route-optimizer"');
    expect(appSource).not.toContain('<Route path="/maps"');
  });

});
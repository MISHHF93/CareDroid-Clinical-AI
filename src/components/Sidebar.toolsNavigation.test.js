/**
 * Sidebar tools navigation contracts (source-level; avoids heavy Sidebar render).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sidebarSource = readFileSync(join(__dirname, 'Sidebar.jsx'), 'utf8');
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const appShellSource = readFileSync(join(__dirname, '../layout/AppShell.jsx'), 'utf8');
const primaryNavSource = readFileSync(join(__dirname, '../navigation/primaryNavigation.js'), 'utf8');

describe('Flattened tools navigation wiring', () => {
  it('registers /tools route to ToolsOverview', () => {
    expect(appSource).toContain("path: '/tools'");
    expect(appSource).toContain('<ToolsOverview />');
  });

  it('clears active tool and navigates via handleOpenToolsOverview', () => {
    expect(appSource).toContain('handleOpenToolsOverview');
    expect(appSource).toContain("navigate('/tools')");
    expect(appSource).toContain('setActiveTool(null)');
    expect(appSource).toContain('onOpenToolsOverview={handleOpenToolsOverview}');
  });

  it('renders canonical primary navigation in Sidebar instead of duplicate tool shortcuts', () => {
    expect(appShellSource).toContain('onOpenToolsOverview');
    expect(sidebarSource).toContain('PRIMARY_SIDEBAR_NAV_ITEMS');
    expect(sidebarSource).not.toContain('onOpenToolsOverview');
    expect(sidebarSource).not.toContain('handleViewAllTools');
  });

  it('exposes canonical tools through primary navigation active state', () => {
    expect(sidebarSource).toContain('navItems.map');
    expect(sidebarSource).toContain('primaryNavPathMatches');
    expect(sidebarSource).toContain('isNavItemActive(item)');
    expect(primaryNavSource).toContain("path: '/tools'");
    expect(sidebarSource).not.toContain('Browse All Tools');
  });

  it('keeps the source audit route available as a developer catalog', () => {
    expect(readFileSync(join(__dirname, '../navigation/primaryNavigation.js'), 'utf8')).toContain("id: 'developer-audit'");
    expect(readFileSync(join(__dirname, '../navigation/primaryNavigation.js'), 'utf8')).toContain("path: '/tools/catalog'");
    expect(sidebarSource).not.toContain("navigate('/tools/catalog')");
  });

  it('flattens maps and IoT under Operations in visible shell navigation', () => {
    expect(primaryNavSource).toContain('PRIMARY_SIDEBAR_NAV_ITEMS');
    expect(primaryNavSource).toMatch(/id:\s*'operations'[\s\S]*'\/hospital-map'[\s\S]*'\/medical-iot'/);
    expect(primaryNavSource).toMatch(/id:\s*'maps'[\s\S]*showInSidebar:\s*false[\s\S]*showInMobile:\s*false/);
    expect(primaryNavSource).toMatch(/id:\s*'medical-iot'[\s\S]*showInSidebar:\s*false[\s\S]*showInMobile:\s*false/);
    expect(appShellSource).toContain('PRIMARY_MOBILE_NAV_ITEMS');
  });

  it('keeps the duplicate sidebar Actions inventory collapsed until requested', () => {
    expect(sidebarSource).toContain('useState(false)');
    expect(sidebarSource).toContain('showToolsSection &&');
    expect(sidebarSource).toContain('sidebar-workspace-controls');
  });

  it('navigates sidebar tool cards via centralized registry launch', () => {
    expect(sidebarSource).toContain('applyRegistryToolLaunch');
    expect(sidebarSource).toContain('onToolSelect(tool.id)');
    expect(sidebarSource).toContain('if (onToolSelect)');
  });

  it('derives sidebar cards from canonical tool inventory projection', () => {
    expect(sidebarSource).toContain('getSidebarToolRegistryProjection');
    expect(sidebarSource).toContain('const medicalTools = useMemo(() => getSidebarToolRegistryProjection(), [])');
    expect(appShellSource).toContain('<Sidebar');
  });

  it('closes mobile drawer after navigation', () => {
    expect(sidebarSource).toContain('onCloseMobileNav');
    expect(sidebarSource).toContain('handleNavClick');
    expect(sidebarSource).toContain('handleToolClick');
  });

  it('groups clinical tools by category with expand/collapse', () => {
    expect(sidebarSource).toContain('partitionSidebarTools');
    expect(sidebarSource).toContain('categoryGroups.map');
    expect(sidebarSource).toContain('toggleCategoryGroup');
    expect(sidebarSource).toContain('aria-expanded={isExpanded}');
  });

  it('highlights calculator routes via matchCalculatorRoute and initialCalc', () => {
    expect(sidebarSource).toContain('matchCalculatorRoute');
    expect(sidebarSource).toContain('tool.initialCalc');
  });
});

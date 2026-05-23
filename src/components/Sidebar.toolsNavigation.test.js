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

describe('View All Tools navigation wiring', () => {
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

  it('passes onOpenToolsOverview through AppShell to Sidebar', () => {
    expect(appShellSource).toContain('onOpenToolsOverview');
    expect(sidebarSource).toContain('onOpenToolsOverview');
    expect(sidebarSource).toContain('handleViewAllTools');
  });

  it('exposes accessible tools workspace control with active state on /tools', () => {
    expect(sidebarSource).toContain('Open canonical tools browser');
    expect(sidebarSource).toContain('Browse All Tools');
    expect(sidebarSource).toContain('isOnToolsOverview');
    expect(sidebarSource).toContain("location.pathname === '/tools'");
    expect(sidebarSource).toContain('sidebar-tools-quick-action--active');
  });

  it('keeps the source audit route available as a developer catalog', () => {
    expect(sidebarSource).toContain('Open developer catalog and source audit');
    expect(sidebarSource).toContain('Developer Catalog / Source Audit');
    expect(sidebarSource).toContain("navigate('/tools/catalog')");
  });

  it('navigates sidebar tool cards via centralized registry launch', () => {
    expect(sidebarSource).toContain('applyRegistryToolLaunch');
    expect(sidebarSource).toContain('onToolSelect(tool.id)');
    expect(sidebarSource).toContain('if (onToolSelect)');
  });

  it('derives sidebar cards from canonical tool inventory projection', () => {
    expect(sidebarSource).toContain('getSidebarToolRegistryProjection');
    expect(sidebarSource).toContain('const medicalTools = getSidebarToolRegistryProjection()');
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

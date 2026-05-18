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

  it('exposes accessible View All Tools control with active state on /tools', () => {
    expect(sidebarSource).toContain('Open tools overview');
    expect(sidebarSource).toContain('isOnToolsOverview');
    expect(sidebarSource).toContain("location.pathname === '/tools'");
    expect(sidebarSource).toContain('sidebar-tools-quick-action--active');
  });

  it('navigates sidebar tool cards to registry paths', () => {
    expect(sidebarSource).toContain('navigate(tool.path)');
    expect(sidebarSource).toMatch(/onToolSelect\?\.\(tool\.id\)/);
  });

  it('closes mobile drawer after navigation', () => {
    expect(sidebarSource).toContain('onCloseMobileNav');
    expect(sidebarSource).toContain('handleNavClick');
    expect(sidebarSource).toContain('handleToolClick');
  });
});

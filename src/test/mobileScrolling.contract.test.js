/**
 * Mobile scrolling contracts — app shell pages use document-flow scrolling by default.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = dirname(__dirname);

const indexCss = readFileSync(join(srcRoot, 'index.css'), 'utf8');
const themeSurfacesCss = readFileSync(join(srcRoot, 'styles/theme-surfaces.css'), 'utf8');
const appShellCss = readFileSync(join(srcRoot, 'layout/AppShell.css'), 'utf8');
const authShellCss = readFileSync(join(srcRoot, 'layout/AuthShell.css'), 'utf8');
const layoutVisibilityCss = readFileSync(join(srcRoot, 'styles/layout-visibility.css'), 'utf8');
const toolsOverviewCss = readFileSync(join(srcRoot, 'pages/tools/ToolsOverview.css'), 'utf8');
const calculatorsCss = readFileSync(join(srcRoot, 'pages/tools/Calculators.css'), 'utf8');

describe('mobile scrolling contracts', () => {
  it('does not lock document scrolling by default', () => {
    expect(indexCss).toMatch(/html\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(indexCss).toMatch(/body\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(indexCss).toMatch(/#root\s*\{[\s\S]*overflow-y:\s*visible/);
    expect(themeSurfacesCss).toMatch(/body\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(indexCss).not.toMatch(/html\s*\{[^}]*overflow:\s*hidden/);
    expect(indexCss).not.toMatch(/#root\s*\{[^}]*\n\s*height:\s*var\(--app-viewport-height/);
  });

  it('uses scroll lock only through the active overlay class', () => {
    expect(indexCss).toMatch(/html\.app-scroll-locked,\s*body\.app-scroll-locked[\s\S]*overflow:\s*hidden/);
    expect(appShellCss).toMatch(/\.app-shell--nav-open \.app-shell-main-wrap[\s\S]*touch-action:\s*none/);
  });

  it('keeps normal pages in document flow while preserving chat as a local viewport', () => {
    expect(appShellCss).toMatch(/\.app-shell\s*\{[\s\S]*overflow-y:\s*visible/);
    expect(appShellCss).toMatch(/\.app-shell-main-wrap\s*\{[\s\S]*height:\s*auto/);
    expect(appShellCss).toMatch(/\.app-shell-page-body\s*\{[\s\S]*overflow-y:\s*visible/);
    expect(appShellCss).toMatch(/\.app-shell-page-body--conversation\s*\{[\s\S]*overflow:\s*hidden/);
    expect(appShellCss).toMatch(/\.app-shell-page-body--conversation\s*\{[\s\S]*height:\s*calc/);
  });

  it('allows auth, tools, and calculator pages to grow beyond mobile viewport height', () => {
    expect(authShellCss).toMatch(/\.auth-shell\s*\{[\s\S]*height:\s*auto/);
    expect(authShellCss).toMatch(/\.auth-shell\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(layoutVisibilityCss).toMatch(/\.tools-overview[\s\S]*overflow-x:\s*clip/);
    expect(layoutVisibilityCss).toMatch(/\.calculators-content[\s\S]*overflow-x:\s*clip/);
    expect(toolsOverviewCss).not.toMatch(/\.tools-overview\s*\{[^}]*height:\s*100vh/);
    expect(calculatorsCss).not.toMatch(/\.calculators-content\s*\{[^}]*height:\s*100vh/);
  });
});

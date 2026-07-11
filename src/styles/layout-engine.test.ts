import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const layoutEngineCss = readFileSync(join(__dirname, 'layout-engine.css'), 'utf8');
const designSystemCss = readFileSync(join(__dirname, 'design-system.css'), 'utf8');
const appShellCss = readFileSync(join(dirname(__dirname), 'components/app-shell.css'), 'utf8');

describe('layout-engine.css', () => {
  it('is wired through the canonical design-system entry', () => {
    expect(designSystemCss).toContain("@import './layout-engine.css'");
    expect(designSystemCss).toContain("@import './caredroid-design-language.css'");
  });

  it('owns shell gutters and a single content max width', () => {
    expect(layoutEngineCss).toContain('--app-layout-content-max');
    expect(layoutEngineCss).toMatch(
      /\.emergency-app-shell \.app-shell-main-content\s*\{[\s\S]*padding-inline:\s*var\(--app-layout-page-gutter-inline\)/
    );
  });

  it('removes duplicate horizontal padding from canonical page templates', () => {
    expect(layoutEngineCss).toMatch(/\.cd-page-shell[\s\S]*padding-inline:\s*0/);
    expect(layoutEngineCss).toMatch(/\.emergency-route-page[\s\S]*padding-inline:\s*0/);
    expect(layoutEngineCss).toMatch(/\.hospital-command-center/);
  });

  it('unifies dashboard and metric grids under shared tokens', () => {
    expect(layoutEngineCss).toContain('.hospital-command-center__metric-grid');
    expect(layoutEngineCss).toContain('.emergency-route-metric-grid');
    expect(layoutEngineCss).toMatch(/grid-template-columns:\s*repeat\(auto-fit, minmax/);
  });

  it('caps the header topbar to the same content-max as the page below it', () => {
    expect(layoutEngineCss).toMatch(
      /\.caredroid-header--compact \.caredroid-header__topbar\s*\{[\s\S]*max-width:\s*var\(--app-layout-content-max\)[\s\S]*margin-inline:\s*auto/
    );
  });
});

describe('app-shell.css — route scrollport', () => {
  it('keeps main content as the scroll container without nested max-width hacks', () => {
    expect(appShellCss).toMatch(/\.app-shell-main-content\s*\{[\s\S]*overflow:\s*auto/);
    expect(appShellCss).not.toMatch(/\.app-shell-main-content > \*/);
  });
});
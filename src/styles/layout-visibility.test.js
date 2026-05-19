import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const layoutVisibilityCss = readFileSync(join(__dirname, 'layout-visibility.css'), 'utf8');
const appShellCss = readFileSync(join(dirname(__dirname), 'layout', 'AppShell.css'), 'utf8');
const calculatorsCss = readFileSync(
  join(dirname(__dirname), 'pages', 'tools', 'Calculators.css'),
  'utf8'
);

describe('layout-visibility.css', () => {
  it('allows scroll routes to grow inside page-body scrollport', () => {
    expect(layoutVisibilityCss).toMatch(
      /\.app-shell-page-body:not\(\.app-shell-page-body--conversation\) > \*[\s\S]*height:\s*auto/
    );
    expect(layoutVisibilityCss).toMatch(
      /\.app-shell-page-body:not\(\.app-shell-page-body--conversation\) > \*[\s\S]*overflow:\s*visible/
    );
  });

  it('uses minmax grids for tool cards', () => {
    expect(layoutVisibilityCss).toMatch(/minmax\(min\(100%,\s*260px\)/);
    expect(layoutVisibilityCss).toMatch(/\.catalog-table-wrap[\s\S]*overflow-x:\s*auto/);
  });

  it('sets min-width 0 on calculator flex children', () => {
    expect(layoutVisibilityCss).toMatch(/\.calculator-interface[\s\S]*min-width:\s*0/);
  });
});

describe('AppShell.css — scroll vs conversation', () => {
  it('conversation child fills viewport; scroll routes do not clip', () => {
    expect(appShellCss).toMatch(
      /\.app-shell-page-body--conversation > \*[\s\S]*overflow:\s*hidden/
    );
    expect(appShellCss).toMatch(
      /\.app-shell-page-body:not\(\.app-shell-page-body--conversation\) > \*[\s\S]*max-height:\s*none/
    );
  });
});

describe('Calculators.css — responsive calculator grid', () => {
  it('stacks calculator interface on tablet', () => {
    expect(calculatorsCss).toMatch(/@media \(max-width:\s*1024px\)[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  });

  it('uses minmax hub cards', () => {
    expect(calculatorsCss).toMatch(/minmax\(min\(100%,\s*220px\)/);
  });
});

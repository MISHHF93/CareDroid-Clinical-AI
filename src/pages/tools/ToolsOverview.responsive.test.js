import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const toolsOverviewCss = readFileSync(join(__dirname, 'ToolsOverview.css'), 'utf8');
const toolsOverviewJsx = readFileSync(join(__dirname, 'ToolsOverview.jsx'), 'utf8');

describe('ToolsOverview responsive layout', () => {
  it('wraps cards and prevents tool metadata overflow', () => {
    expect(toolsOverviewCss).toMatch(/\.tools-grid[\s\S]*minmax\(min\(100%,\s*240px\)/);
    expect(toolsOverviewCss).toMatch(/\.tool-card-large[\s\S]*min-width:\s*0/);
    expect(toolsOverviewCss).toMatch(/\.tool-meta[\s\S]*min-width:\s*min\(100%,\s*12rem\)/);
  });

  it('stacks important launch actions on mobile with touch targets', () => {
    expect(toolsOverviewCss).toMatch(/\.btn-open-tool[\s\S]*min-height:\s*var\(--compact-control-height/);
    expect(toolsOverviewCss).toMatch(/\.btn-chat-tool[\s\S]*min-height:\s*var\(--compact-control-height/);
    expect(toolsOverviewCss).toMatch(
      /@media \(max-width: 768px\)[\s\S]*\.tool-actions[\s\S]*flex-direction:\s*column/
    );
  });

  it('lets workspace controls wrap at phone widths', () => {
    expect(toolsOverviewCss).toMatch(/\.tools-workspace[\s\S]*flex-wrap:\s*wrap/);
    expect(toolsOverviewCss).toMatch(/@media \(max-width: 640px\)[\s\S]*\.tools-workspace[\s\S]*width:\s*100%/);
    expect(toolsOverviewCss).toMatch(/\.tools-workspace select[\s\S]*min-width:\s*0/);
  });

  it('keeps search and filter controls touch-friendly at phone widths', () => {
    expect(toolsOverviewCss).toMatch(/\.tools-discovery-controls[\s\S]*grid-template-columns:\s*minmax/);
    expect(toolsOverviewCss).toMatch(/\.tools-search-field input[\s\S]*min-height:\s*var\(--compact-control-height/);
    expect(toolsOverviewCss).toMatch(/\.tools-filter-field select[\s\S]*min-height:\s*var\(--compact-control-height/);
    expect(toolsOverviewCss).toMatch(
      /@media \(max-width: 768px\)[\s\S]*\.tools-discovery-controls[\s\S]*grid-template-columns:\s*1fr/
    );
  });

  it('does not label source audit as another user-facing tools catalog', () => {
    expect(toolsOverviewJsx).not.toContain('Developer Catalog / Source Audit');
  });
});

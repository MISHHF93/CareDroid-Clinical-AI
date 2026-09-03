import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DESIGN_DENSITY_PRESETS,
  DESIGN_SYSTEM_CSS_ENTRY,
  SEMANTIC_COLOR_ROLES,
  THEME_CONFIG,
} from './designSystem';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, '..');
const designSystemCss = readFileSync(join(__dirname, '../styles/design-system.css'), 'utf8');
const bridgeCss = readFileSync(join(__dirname, '../styles/design-system-bridge.css'), 'utf8');

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectSourceFiles(full, out);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('designSystem barrel', () => {
  it('exposes a single CSS entry and consolidated token sources', () => {
    expect(DESIGN_SYSTEM_CSS_ENTRY).toBe('src/styles/design-system.css');
    expect(THEME_CONFIG.cssEntry).toBe(DESIGN_SYSTEM_CSS_ENTRY);
    expect(THEME_CONFIG.cssTokenSources).toContain('src/styles/primitives.css');
    expect(THEME_CONFIG.cssTokenSources).toContain('src/styles/design-system-bridge.css');
  });

  it('maps semantic color roles to CSS custom properties', () => {
    expect(SEMANTIC_COLOR_ROLES.critical.bg).toBe('var(--semantic-critical-bg)');
    expect(SEMANTIC_COLOR_ROLES.information.border).toBe('var(--semantic-information-border)');
  });

  it('defines role-focused density presets', () => {
    expect(DESIGN_DENSITY_PRESETS.compact.pageClass).toBe('density-compact');
    expect(DESIGN_DENSITY_PRESETS.standard.gap).toContain('--density-standard-gap');
  });

  it('loads bridge and primitives in design-system.css before normalization', () => {
    expect(designSystemCss).toContain("@import './primitives.css';");
    expect(designSystemCss).toContain("@import './design-system-bridge.css';");
    expect(bridgeCss).toContain('--cd-bg-base: var(--app-bg');
    expect(bridgeCss).toContain('--density-compact-gap');
  });

  it('duplicate-system-audit: Design token split -- no source file bypasses the designSystem.ts barrel', () => {
    // "Token drift across CSS and programmatic consumers" -- docs/duplicate-system-audit.md's
    // stated risk. theme.tokens.ts/layout/designTokens.ts/caredroidDesignLanguage.ts are the
    // real underlying sources; designSystem.ts is the one barrel meant to re-export them.
    // Allowed direct importers: the 3 source files themselves (theme.tokens.ts and
    // caredroidDesignLanguage.ts legitimately import from layout/designTokens.ts to build
    // themselves) and designSystem.ts itself. Test files are excluded entirely by
    // collectSourceFiles -- each source file's own dedicated test legitimately imports it
    // directly.
    const allowedFiles = [
      join('config', 'designSystem.ts'),
      join('config', 'theme.tokens.ts'),
      join('config', 'caredroidDesignLanguage.ts'),
      join('layout', 'designTokens.ts'),
    ];
    const pattern =
      /from\s+['"][^'"]*(?:theme\.tokens|layout\/designTokens|caredroidDesignLanguage)['"]/;
    const offenders: string[] = [];
    for (const file of collectSourceFiles(srcRoot)) {
      const relPath = relative(srcRoot, file);
      if (allowedFiles.some((allowed) => file.endsWith(allowed))) continue;
      const content = readFileSync(file, 'utf8');
      if (pattern.test(content)) {
        offenders.push(relPath);
      }
    }
    expect(offenders).toEqual([]);
  });
});

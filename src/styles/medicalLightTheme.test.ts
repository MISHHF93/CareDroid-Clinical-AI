import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname);

describe('Medical Light theme contract', () => {
  const light = readFileSync(resolve(root, 'medical-light-theme.css'), 'utf8');
  const designSystem = readFileSync(resolve(root, 'design-system.css'), 'utf8');

  it('is imported from the canonical design-system entry', () => {
    expect(designSystem).toMatch(/medical-light-theme\.css/);
  });

  it('defines AI purple as a labelled assistant accent', () => {
    expect(light).toMatch(/--ml-ai-purple:/);
    expect(light).toMatch(/\.cd-ai-badge/);
    expect(light).toMatch(/content:\s*'AI'/);
  });

  it('defines semantic amber and red clinical states', () => {
    expect(light).toMatch(/--ml-status-warning:/);
    expect(light).toMatch(/--ml-status-critical:/);
  });

  it('preserves focus rings (never removes focus)', () => {
    expect(light).toMatch(/--ml-focus-ring:/);
    expect(light).toMatch(/:focus-visible/);
    expect(light).not.toMatch(/outline:\s*none;\s*\n\s*box-shadow:\s*none/);
  });

  it('includes ultrawide readable measure guardrails', () => {
    expect(light).toMatch(/min-width:\s*1920px/);
    expect(light).toMatch(/ml-readable-measure|cd-clinical-form-column/);
  });
});

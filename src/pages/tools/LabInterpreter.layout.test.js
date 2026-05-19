/**
 * Lab interpreter layout — prevents page-level horizontal overflow on narrow viewports.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, 'LabInterpreter.css'), 'utf8');

describe('LabInterpreter.css layout', () => {
  it('uses minmax(0) columns and width constraints on root grid', () => {
    expect(css).toMatch(/\.lab-interpreter-content[\s\S]*minmax\(0,\s*1fr\)/);
    expect(css).toMatch(/\.lab-interpreter-content[\s\S]*min-width:\s*0/);
    expect(css).toMatch(/\.lab-interpreter-content[\s\S]*max-width:\s*min\(1400px,\s*100%\)/);
  });

  it('stacks patient context and entry form below 768px', () => {
    expect(css).toMatch(
      /@media \(max-width: 768px\)[\s\S]*\.patient-context[\s\S]*grid-template-columns:\s*1fr/
    );
    expect(css).toMatch(
      /@media \(max-width: 768px\)[\s\S]*\.lab-entry-form[\s\S]*grid-template-columns:\s*1fr/
    );
  });

  it('allows category tables to scroll horizontally inside section', () => {
    expect(css).toMatch(/\.lab-category-section[\s\S]*overflow-x:\s*auto/);
  });
});

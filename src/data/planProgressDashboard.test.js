import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('plan progress dashboard', () => {
  const filePath = path.resolve('docs/plan-progress-dashboard.md');
  const content = fs.readFileSync(filePath, 'utf8');

  it('includes backlog progress section with counts', () => {
    expect(content).toContain('## Backlog Progress');
    expect(content).toMatch(/Total plan checklist items: \d+/);
    expect(content).toMatch(/Pending checklist items: \d+/);
  });

  it('includes validation battery summary', () => {
    expect(content).toContain('## Validation Battery Health');
    expect(content).toMatch(/Suites run: \d+/);
    expect(content).toMatch(/Suites failed: \d+/);
  });
});

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('plan implementation backlog document', () => {
  const backlogPath = path.resolve('docs/plan-implementation-backlog.md');
  const content = fs.readFileSync(backlogPath, 'utf8');

  it('exists and includes coverage summary', () => {
    expect(content).toContain('# Plan Implementation Backlog');
    expect(content).toContain('## Coverage');
    expect(content).toContain('Documents with implementation phases:');
  });

  it('contains actionable checklist phase entries', () => {
    const checklistMatches = content.match(/^- \[ \] Phase\s+\d+:/gim) ?? [];
    expect(checklistMatches.length).toBeGreaterThan(20);
  });

  it('tracks core roadmap sources', () => {
    expect(content).toContain('`platform-systems-expansion-plan.md`');
    expect(content).toContain('`platform-blind-spots-upgrade-plan.md`');
    expect(content).toContain('`caredroid-next-generation-roadmap.md`');
  });
});

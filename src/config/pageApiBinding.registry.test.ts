import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import {
  PAGE_API_BINDINGS,
  getPageApiBinding,
  listLocalOnlyPageBindings,
} from './pageApiBinding.registry';

describe('pageApiBinding.registry', () => {
  it('marks formerly local-only ED surfaces as wired through operating snapshots', () => {
    for (const pageId of ['dispatch', 'diagnostics', 'handoffs', 'reports', 'pulse', 'shift', 'ed-readiness']) {
      expect(getPageApiBinding(pageId)?.mode).toBe('wired');
    }
    expect(listLocalOnlyPageBindings()).toEqual([]);
  });

  it('wires command center to operational intelligence endpoints', () => {
    const binding = getPageApiBinding('command-center');
    expect(binding?.mode).toBe('wired');
    expect(binding?.endpoints).toEqual(
      expect.arrayContaining([
        '/api/emergency/operational-intelligence/snapshot',
        '/api/emergency/operating-surfaces/command-center',
      ]),
    );
  });

  it('redirects legacy executive route into command center operating surface', () => {
    const binding = getPageApiBinding('executive');
    expect(binding?.mode).toBe('redirect');
    expect(binding?.endpoints).toContain('/api/emergency/operating-surfaces/command-center');
  });

  it('maps triage to pretriage queue landing', () => {
    const binding = getPageApiBinding('triage');
    expect(binding?.path).toBe(`${CANONICAL_ROUTES.emergencyQueues}?queue=pretriage`);
    expect(binding?.capabilities).toContain('emergencyTriageAssist');
  });

  it('keeps every binding path unique', () => {
    const paths = PAGE_API_BINDINGS.map((entry) => entry.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
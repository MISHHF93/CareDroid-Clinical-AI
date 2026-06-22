import { describe, expect, it } from 'vitest';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';
import {
  normalizeOperationalStripMetrics,
  resolveOperationalPresentation,
  resolveOperationalStripAccentClass,
} from './emergencyOperationalPresentationModel';

describe('emergencyOperationalPresentationModel', () => {
  it('maps each primary screen mode to a role-specific emphasis', () => {
    expect(resolveOperationalPresentation(CARE_DROID_SCREEN_MODES.reception).emphasis).toBe('speed');
    expect(resolveOperationalPresentation(CARE_DROID_SCREEN_MODES.triage).emphasis).toBe('assessment');
    expect(resolveOperationalPresentation(CARE_DROID_SCREEN_MODES.chargeNurse).emphasis).toBe('flow');
    expect(resolveOperationalPresentation(CARE_DROID_SCREEN_MODES.physician).emphasis).toBe('patient');
    expect(resolveOperationalPresentation(CARE_DROID_SCREEN_MODES.commandCenter).emphasis).toBe(
      'throughput',
    );
    expect(resolveOperationalPresentation(CARE_DROID_SCREEN_MODES.publicWaiting).emphasis).toBe(
      'reassuring',
    );
  });

  it('uses compact strip layout for speed and assessment surfaces', () => {
    expect(resolveOperationalPresentation(CARE_DROID_SCREEN_MODES.reception).stripLayout).toBe(
      'compact',
    );
    expect(resolveOperationalPresentation(CARE_DROID_SCREEN_MODES.triage).stripLayout).toBe('compact');
    expect(resolveOperationalPresentation(CARE_DROID_SCREEN_MODES.chargeNurse).stripLayout).toBe(
      'command',
    );
  });

  it('normalizes strip metrics with interactive queue tabs', () => {
    const metrics = normalizeOperationalStripMetrics(
      [{ id: 'awaiting-triage', label: 'Awaiting triage', value: 3, queueTab: 'pretriage' }],
      { onMetricSelect: () => {} },
    );
    expect(metrics[0]?.interactive).toBe(true);
    expect(metrics[0]?.queueTab).toBe('pretriage');
  });

  it('resolves accent modifier classes without forking strip components', () => {
    expect(resolveOperationalStripAccentClass('reassessment')).toBe(
      'operational-strip--accent-reassessment',
    );
    expect(resolveOperationalStripAccentClass('default')).toBe('');
  });

  it('derives presentation density from the canonical screen mode registry', () => {
    expect(resolveOperationalPresentation(CARE_DROID_SCREEN_MODES.commandCenter).density).toBe('wall');
    expect(resolveOperationalPresentation(CARE_DROID_SCREEN_MODES.triage).density).toBe('compact');
  });
});

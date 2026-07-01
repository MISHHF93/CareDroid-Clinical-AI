import { describe, expect, it } from 'vitest';
import {
  healthCheckStatusToSemanticRole,
  healthCheckStatusToWidgetTone,
  metricColorForTone,
  resolveSemanticColorRole,
  SEMANTIC_COLOR_ROLES,
} from './semanticColorSystem';

describe('semanticColorSystem', () => {
  it('maps operational tones to semantic roles', () => {
    expect(resolveSemanticColorRole('critical')).toBe('critical');
    expect(resolveSemanticColorRole('watch')).toBe('attention');
    expect(resolveSemanticColorRole('stable')).toBe('healthy');
    expect(resolveSemanticColorRole('unknown', 'inactive')).toBe('inactive');
  });

  it('exposes readable tokens for each semantic role', () => {
    expect(SEMANTIC_COLOR_ROLES.critical.fg).toBeTruthy();
    expect(SEMANTIC_COLOR_ROLES.information.cssVar).toBe('--semantic-information');
  });

  it('returns metric accent colors only for non-inactive tones', () => {
    expect(metricColorForTone('critical')).toBe(SEMANTIC_COLOR_ROLES.critical.fg);
    expect(metricColorForTone('neutral')).toBeUndefined();
  });

  it('maps platform health statuses to semantic roles and widget tones', () => {
    expect(healthCheckStatusToSemanticRole('healthy')).toBe('healthy');
    expect(healthCheckStatusToSemanticRole('warning')).toBe('attention');
    expect(healthCheckStatusToSemanticRole('critical')).toBe('critical');
    expect(healthCheckStatusToWidgetTone('healthy')).toBe('success');
    expect(healthCheckStatusToWidgetTone('critical')).toBe('critical');
  });
});
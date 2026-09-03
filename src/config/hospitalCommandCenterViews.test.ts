import { describe, expect, it } from 'vitest';
import {
  COMMAND_CENTER_INTELLIGENCE_REDIRECTS,
  commandCenterRedirectForView,
  resolveCommandCenterIntelligenceView,
  resolveCommandCenterViewFromPath,
} from './hospitalCommandCenterViews.config';

describe('hospitalCommandCenterViews.config', () => {
  it('resolves intelligence views from search params and legacy paths', () => {
    expect(resolveCommandCenterIntelligenceView('?view=executive')).toBe('executive');
    expect(resolveCommandCenterIntelligenceView('?view=ai')).toBe('ai');
    expect(resolveCommandCenterViewFromPath('/executive')).toBe('executive');
    expect(resolveCommandCenterViewFromPath('/ai-command-center')).toBe('ai');
    expect(resolveCommandCenterViewFromPath('/predictive-analytics')).toBe('predictive');
  });

  it('builds canonical redirect targets with view query params', () => {
    expect(commandCenterRedirectForView('predictive')).toBe(
      '/emergency/command-center?view=predictive',
    );
  });

  it('lists legacy paths that funnel into Hospital Command Center', () => {
    expect(COMMAND_CENTER_INTELLIGENCE_REDIRECTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/executive', view: 'executive' }),
        expect.objectContaining({ path: '/ai-command-center', view: 'ai' }),
        expect.objectContaining({ path: '/predictive-analytics', view: 'predictive' }),
      ]),
    );
  });
});

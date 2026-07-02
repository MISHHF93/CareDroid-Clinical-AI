import { describe, expect, it } from 'vitest';
import {
  buildPlatformGovernanceSurfaceView,
  inferPlatformGovernanceSurface,
  resolvePlatformGovernanceCopy,
} from './platformGovernanceSurfaces';

describe('platformGovernanceSurfaces', () => {
  it('infers enterprise governance surfaces from pathname', () => {
    expect(inferPlatformGovernanceSurface('/ai-governance')).toBe('governance');
    expect(inferPlatformGovernanceSurface('/security')).toBe('ai-security');
    expect(inferPlatformGovernanceSurface('/equity')).toBe('equity');
    expect(inferPlatformGovernanceSurface('/privacy')).toBe('privacy');
    expect(inferPlatformGovernanceSurface('/integrations')).toBe('interoperability');
  });

  it('resolves enterprise route copy', () => {
    expect(resolvePlatformGovernanceCopy('/ai-governance').title).toBe('AI Governance Center');
    expect(resolvePlatformGovernanceCopy('/security').title).toBe('LLM Security Dashboard');
    expect(resolvePlatformGovernanceCopy('/privacy').title).toBe('Consent + Privacy Center');
  });

  it('builds demo panel views when API panels are missing', () => {
    const view = buildPlatformGovernanceSurfaceView({
      surface: 'governance',
      pathname: '/ai-governance',
      apiData: { status: 'local_fallback', readiness: { blocked: true } },
      sourceStatus: 'fallback',
    });

    expect(view.metrics).toHaveLength(4);
    expect(Object.keys(view.panels).length).toBeGreaterThan(0);
    expect(view.panelChart.length).toBeGreaterThan(0);
    expect(view.controls.length).toBeGreaterThan(0);
  });
});
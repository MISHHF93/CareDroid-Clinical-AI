import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import {
  ED_JOURNEY_PHASES,
  ED_OPERATING_SURFACES,
  LEGACY_DASHBOARD_REDIRECTS,
  getEdOperatingSurface,
  resolveEdOperatingSurfaceFromPath,
} from './edOperatingSurface.config';

describe('edOperatingSurface.config', () => {
  it('defines six journey phases covering the full ED patient journey', () => {
    expect(ED_JOURNEY_PHASES).toHaveLength(6);
    expect(ED_JOURNEY_PHASES.map((phase) => phase.order)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('maps canonical emergency routes to operating surfaces', () => {
    expect(resolveEdOperatingSurfaceFromPath(CANONICAL_ROUTES.emergencyReception)?.surfaceId).toBe(
      'reception',
    );
    expect(resolveEdOperatingSurfaceFromPath(CANONICAL_ROUTES.emergencyDispatch)?.surfaceId).toBe(
      'dispatch',
    );
    expect(resolveEdOperatingSurfaceFromPath(CANONICAL_ROUTES.emergencyWhiteboard)?.surfaceId).toBe(
      'whiteboard',
    );
    expect(resolveEdOperatingSurfaceFromPath(`${CANONICAL_ROUTES.triage}?queue=pretriage`)?.surfaceId).toBe(
      'triage',
    );
  });

  it('assigns P0 priority to first-three-minute surfaces', () => {
    const p0Surfaces = ED_OPERATING_SURFACES.filter((surface) => surface.priority === 'P0');
    expect(p0Surfaces.map((surface) => surface.surfaceId)).toEqual(
      expect.arrayContaining(['dispatch', 'reception', 'triage', 'alerts']),
    );
  });

  it('funnels legacy dashboards into ED OS journey surfaces', () => {
    expect(LEGACY_DASHBOARD_REDIRECTS[CANONICAL_ROUTES.executive]).toBe(
      CANONICAL_ROUTES.emergencyCommandCenter,
    );
    expect(LEGACY_DASHBOARD_REDIRECTS[CANONICAL_ROUTES.aiCommandCenter]).toBe(
      CANONICAL_ROUTES.emergencyCopilot,
    );
    expect(LEGACY_DASHBOARD_REDIRECTS[CANONICAL_ROUTES.predictiveAnalytics]).toBe(
      CANONICAL_ROUTES.emergencyAnalytics,
    );
  });

  it('exposes owner role and primary decision for each surface', () => {
    const reception = getEdOperatingSurface('reception');
    expect(reception?.ownerRole).toBe('Registration clerk');
    expect(reception?.primaryDecision).toMatch(/register/i);
    expect(reception?.phaseId).toBe('arrival-intake');
  });
});
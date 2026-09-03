import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import { NAVIGATION_ITEMS } from './unified-navigation.config';
import { resolveActiveNavigationItemId } from './emergencyNavPolicy';

describe('resolveActiveNavigationItemId', () => {
  it('marks only Medical Tools active on /emergency/tools', () => {
    const activeId = resolveActiveNavigationItemId(
      NAVIGATION_ITEMS,
      CANONICAL_ROUTES.emergencyTools,
    );
    expect(activeId).toBe('tools');
  });

  it('marks only Whiteboard active on /emergency/whiteboard', () => {
    const activeId = resolveActiveNavigationItemId(
      NAVIGATION_ITEMS,
      CANONICAL_ROUTES.emergencyWhiteboard,
    );
    expect(activeId).toBe('whiteboard');
  });

  it('marks Reception active for reception pipeline query params', () => {
    const activeId = resolveActiveNavigationItemId(
      NAVIGATION_ITEMS,
      CANONICAL_ROUTES.emergencyReception,
      '?intake=1',
    );
    expect(activeId).toBe('reception');
  });

  it('marks Patients active on standalone patients route', () => {
    const activeId = resolveActiveNavigationItemId(
      NAVIGATION_ITEMS,
      CANONICAL_ROUTES.emergencyPatients,
    );
    expect(activeId).toBe('patients');
  });

  it('maps embedded intake routes to Reception when intake is hidden', () => {
    const adminItems = NAVIGATION_ITEMS.filter((item) => item.id !== 'intake');
    const activeId = resolveActiveNavigationItemId(adminItems, CANONICAL_ROUTES.emergencyIntake);
    expect(activeId).toBe('reception');
  });
});

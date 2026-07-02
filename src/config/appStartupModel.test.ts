import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import {
  APP_OPTIONAL_ENTRY_PATH,
  APP_PAGE_JOURNEY_ORDER,
  resolveAppStartupRoute,
} from './appStartupModel';

describe('appStartupModel', () => {
  it('orders journey pages from pre-arrival through clinical care', () => {
    expect(APP_PAGE_JOURNEY_ORDER[0]?.id).toBe('dispatch');
    expect(APP_PAGE_JOURNEY_ORDER.find((page) => page.id === 'reception')?.path).toBe(
      CANONICAL_ROUTES.emergencyReception,
    );
    expect(APP_OPTIONAL_ENTRY_PATH).toBe(CANONICAL_ROUTES.platformStart);
  });

  it('lands startup on reception when reception-first UX is enabled', () => {
    expect(resolveAppStartupRoute()).toBe(CANONICAL_ROUTES.emergencyReception);
    expect(resolveAppStartupRoute({ returnUrl: '/emergency/whiteboard' })).toBe(
      '/emergency/whiteboard',
    );
  });
});
import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import {
  ACCOUNT_CHROME_PLACEMENT,
  ACCOUNT_MENU_DESTINATIONS,
  resolveAccountMenuDestinations,
} from './accountChrome.config';

describe('accountChrome.config', () => {
  it('locks placement: header menu only, no sidebar account, no compact header switcher', () => {
    expect(ACCOUNT_CHROME_PLACEMENT.entry).toBe('header-account-menu');
    expect(ACCOUNT_CHROME_PLACEMENT.sidebarAccountLink).toBe(false);
    expect(ACCOUNT_CHROME_PLACEMENT.headerCompactProfileSwitcher).toBe(false);
  });

  it('lists Profile overview first as the primary account destination', () => {
    expect(ACCOUNT_MENU_DESTINATIONS[0]).toMatchObject({
      id: 'profile-overview',
      path: CANONICAL_ROUTES.profile,
      primary: true,
    });
  });

  it('gates admin console by role flag', () => {
    const standard = resolveAccountMenuDestinations({ showAdmin: false }).map((d) => d.id);
    const admin = resolveAccountMenuDestinations({ showAdmin: true }).map((d) => d.id);

    expect(standard).toEqual(['profile-overview', 'profile-settings', 'entry-hub']);
    expect(admin).toEqual(['profile-overview', 'profile-settings', 'entry-hub', 'admin-console']);
  });
});

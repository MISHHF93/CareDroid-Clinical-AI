/**
 * Account chrome package — import from here for header/shell wiring.
 *
 * Public surface:
 * - UserAccountMenu: sole header profile/session control
 * - ProfileRoleSwitcher: used inside the menu (not a second header control)
 * - accountChrome.config: destinations + placement contract
 */

export { default as UserAccountMenu } from './UserAccountMenu';
export { default as ProfileRoleSwitcher } from './ProfileRoleSwitcher';
export {
  ACCOUNT_CHROME_PLACEMENT,
  ACCOUNT_MENU_DESTINATIONS,
  resolveAccountMenuDestinations,
  type AccountMenuDestination,
  type AccountMenuDestinationId,
} from './accountChrome.config';

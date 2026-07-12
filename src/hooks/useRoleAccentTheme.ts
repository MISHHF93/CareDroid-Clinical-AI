import { useEffect } from 'react';
import { resolveRoleAccentKey } from '../config/roleAccentTheme';

/**
 * Stamps the active user's role-accent group onto <html> as `data-role-theme`,
 * mirroring ThemeContext's applyDomTheme() pattern for `data-theme`. Every
 * role-accent CSS block in src/styles/role-accent-theme.css keys off this
 * attribute, so the whole app's brand-chrome accent (links, buttons, focus
 * rings, active nav) follows the signed-in role without any per-page changes.
 */
export default function useRoleAccentTheme(role: string | null | undefined): void {
  useEffect(() => {
    document.documentElement.dataset.roleTheme = resolveRoleAccentKey(role);
  }, [role]);
}

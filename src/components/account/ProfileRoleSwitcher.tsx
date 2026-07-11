import useProfileNavigate from '../../hooks/useProfileNavigate';
import useEmergencyRolePermissions from '../../hooks/useEmergencyRolePermissions';
import {
  listCuratedDemoRoleViews,
  resolveDemoRoleLandingRoute,
} from '../../config/demoPersonaModel';
import './ProfileRoleSwitcher.css';

type ProfileRoleSwitcherProps = {
  variant?: 'compact' | 'chips' | 'menu';
  className?: string;
  onSwitch?: (roleId: string) => void;
};

/**
 * Workflow profile switcher.
 *
 * ARIA notes (Microsoft Edge Tools / axe static analysis):
 * - Avoid JSX expressions in aria-* values — static scanners treat `{expr}` as invalid.
 * - Prefer native radios for exclusive choice; chips use literal aria-pressed strings.
 */
export default function ProfileRoleSwitcher({
  variant = 'chips',
  className = '',
  onSwitch,
}: ProfileRoleSwitcherProps) {
  const { role, switchDemoRole } = useEmergencyRolePermissions();
  const { profileNavigate } = useProfileNavigate();
  const roleViews = listCuratedDemoRoleViews();
  const groupName = 'caredroid-workflow-profile';

  const handleSwitch = (emergencyRoleId: string) => {
    switchDemoRole(emergencyRoleId);
    profileNavigate(resolveDemoRoleLandingRoute(emergencyRoleId));
    onSwitch?.(emergencyRoleId);
  };

  if (variant === 'compact') {
    return (
      <label className={`profile-role-switcher profile-role-switcher--compact ${className}`.trim()}>
        <span className="profile-role-switcher__label">Profile</span>
        <select
          value={role}
          onChange={(event) => handleSwitch(event.target.value)}
          aria-label="Switch workflow profile"
        >
          {roleViews.map((view) => (
            <option key={view.emergencyRoleId} value={view.emergencyRoleId}>
              {view.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (variant === 'menu') {
    // Native radiogroup: LTR layout is [radio] [label] — see ProfileRoleSwitcher.css.
    return (
      <fieldset
        className={`profile-role-switcher profile-role-switcher--menu ${className}`.trim()}
        dir="ltr"
      >
        <legend className="profile-role-switcher__legend">Switch workflow profile</legend>
        {roleViews.map((view) => {
          const active = view.emergencyRoleId === role;
          return (
            <label
              key={view.emergencyRoleId}
              className={`profile-role-switcher__menu-item${active ? ' is-active' : ''}`}
              title={view.description}
              dir="ltr"
            >
              <input
                type="radio"
                name={groupName}
                value={view.emergencyRoleId}
                checked={active}
                onChange={() => handleSwitch(view.emergencyRoleId)}
              />
              <span className="profile-role-switcher__menu-copy">
                <span>{view.label}</span>
                <small>{view.sceneLabel}</small>
              </span>
            </label>
          );
        })}
      </fieldset>
    );
  }

  // Chips: toggle buttons with *literal* aria-pressed (no JSX expression value).
  return (
    <div
      className={`profile-role-switcher profile-role-switcher--chips ${className}`.trim()}
      role="group"
      aria-label="Switch workflow profile"
    >
      {roleViews.map((view) => {
        const active = view.emergencyRoleId === role;
        if (active) {
          return (
            <button
              key={view.emergencyRoleId}
              type="button"
              className="profile-role-switcher__chip is-active"
              aria-pressed="true"
              title={view.description}
              onClick={() => handleSwitch(view.emergencyRoleId)}
            >
              {view.label}
            </button>
          );
        }
        return (
          <button
            key={view.emergencyRoleId}
            type="button"
            className="profile-role-switcher__chip"
            aria-pressed="false"
            title={view.description}
            onClick={() => handleSwitch(view.emergencyRoleId)}
          >
            {view.label}
          </button>
        );
      })}
    </div>
  );
}

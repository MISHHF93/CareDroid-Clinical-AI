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

export default function ProfileRoleSwitcher({
  variant = 'chips',
  className = '',
  onSwitch,
}: ProfileRoleSwitcherProps) {
  const { role, switchDemoRole } = useEmergencyRolePermissions();
  const { profileNavigate } = useProfileNavigate();
  const roleViews = listCuratedDemoRoleViews();

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
    return (
      <div
        className={`profile-role-switcher profile-role-switcher--menu ${className}`.trim()}
        role="group"
        aria-label="Switch workflow profile"
      >
        {roleViews.map((view) => {
          const active = view.emergencyRoleId === role;
          return (
            <button
              key={view.emergencyRoleId}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              className={`profile-role-switcher__menu-item${active ? ' is-active' : ''}`}
              title={view.description}
              onClick={() => handleSwitch(view.emergencyRoleId)}
            >
              <span>{view.label}</span>
              <small>{view.sceneLabel}</small>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`profile-role-switcher profile-role-switcher--chips ${className}`.trim()}
      role="group"
      aria-label="Switch workflow profile"
    >
      {roleViews.map((view) => {
        const active = view.emergencyRoleId === role;
        return (
          <button
            key={view.emergencyRoleId}
            type="button"
            className={`profile-role-switcher__chip${active ? ' is-active' : ''}`}
            aria-pressed={active}
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
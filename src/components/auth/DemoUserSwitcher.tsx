import React from 'react';
import { useCareDroidUser } from '../../hooks/useCareDroidUser';
import { getRoleLabel } from '../../lib/users/roleAccess';
import type { CareDroidUserProfile } from '../../lib/users/userTypes';
import './DemoUserSwitcher.css';

type DemoUserSwitcherProps = {
  variant?: 'list' | 'compact' | 'select';
  className?: string;
  onSwitch?: (userId: string) => void;
};

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export default function DemoUserSwitcher({
  variant = 'list',
  className = '',
  onSwitch,
}: DemoUserSwitcherProps) {
  const { profile, allDemoUsers, switchDemoUser } = useCareDroidUser();

  const handleSwitch = (userId: string) => {
    switchDemoUser(userId);
    onSwitch?.(userId);
  };

  if (variant === 'select') {
    return (
      <div className={`demo-user-switcher ${className}`.trim()}>
        <div className="demo-user-switcher__header">
          Demo user <span className="demo-user-switcher__badge">DEMO</span>
        </div>
        <select
          className="demo-user-switcher__select"
          value={profile.id}
          onChange={(e) => handleSwitch(e.target.value)}
          aria-label="Switch demo user"
        >
          {allDemoUsers.map((u: CareDroidUserProfile) => (
            <option key={u.id} value={u.id}>
              {u.fullName} — {getRoleLabel(u.role)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <label className={`demo-user-switcher ${className}`.trim()}>
        <div className="demo-user-switcher__header">
          Demo user <span className="demo-user-switcher__badge">DEMO</span>
        </div>
        <select
          className="demo-user-switcher__select"
          value={profile.id}
          onChange={(e) => handleSwitch(e.target.value)}
          aria-label="Switch demo user"
        >
          {allDemoUsers.map((u: CareDroidUserProfile) => (
            <option key={u.id} value={u.id}>
              {u.fullName} ({getRoleLabel(u.role)})
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className={`demo-user-switcher ${className}`.trim()}>
      <div className="demo-user-switcher__header">
        Demo users <span className="demo-user-switcher__badge">DEMO</span>
      </div>
      <div className="demo-user-switcher__list" role="group" aria-label="Switch demo user">
        {allDemoUsers.map((u: CareDroidUserProfile) => {
          const active = u.id === profile.id;
          // Edge Tools rejects JSX expressions in ARIA values — use literals only.
          if (active) {
            return (
              <button
                key={u.id}
                type="button"
                aria-pressed="true"
                className="demo-user-switcher__item is-active"
                onClick={() => handleSwitch(u.id)}
              >
                <div className="demo-user-switcher__avatar" aria-hidden="true">
                  {initials(u.fullName)}
                </div>
                <div className="demo-user-switcher__info">
                  <span className="demo-user-switcher__name">{u.fullName}</span>
                  <span className="demo-user-switcher__meta">
                    {getRoleLabel(u.role)} · {u.department}
                  </span>
                </div>
              </button>
            );
          }
          return (
            <button
              key={u.id}
              type="button"
              aria-pressed="false"
              className="demo-user-switcher__item"
              onClick={() => handleSwitch(u.id)}
            >
              <div className="demo-user-switcher__avatar" aria-hidden="true">
                {initials(u.fullName)}
              </div>
              <div className="demo-user-switcher__info">
                <span className="demo-user-switcher__name">{u.fullName}</span>
                <span className="demo-user-switcher__meta">
                  {getRoleLabel(u.role)} · {u.department}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

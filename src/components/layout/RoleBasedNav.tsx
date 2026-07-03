import React from 'react';
import { NavLink } from 'react-router-dom';
import useSecurityAccess from '../../hooks/useSecurityAccess';
import { getNavVisibleRoutes } from '../../lib/navigation';
import type { HospitalRole } from '../../lib/users/userTypes';

type RoleBasedNavProps = {
  className?: string;
  onNavigate?: (path: string) => void;
};

export default function RoleBasedNav({ className = '', onNavigate }: RoleBasedNavProps) {
  const { hospitalRole } = useSecurityAccess();
  const role = (hospitalRole || 'physician') as HospitalRole;
  const routes = getNavVisibleRoutes(role);

  if (!routes.length) return null;

  return (
    <nav
      className={`cd-role-nav ${className}`.trim()}
      aria-label={`Navigation for ${role}`}
    >
      {routes.map((entry) => (
        <NavLink
          key={entry.path}
          to={entry.path}
          className={({ isActive }) =>
            ['cd-role-nav__item', isActive ? 'cd-role-nav__item--active' : '']
              .filter(Boolean)
              .join(' ')
          }
          aria-label={entry.label}
          onClick={() => onNavigate?.(entry.path)}
        >
          {entry.label}
        </NavLink>
      ))}
    </nav>
  );
}

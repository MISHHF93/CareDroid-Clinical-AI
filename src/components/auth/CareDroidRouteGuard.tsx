import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MEDICAL_THEME, MEDICAL_TYPE } from '../../config/medicalTheme.constants';
import { canRoleAccessRoute, getUnauthorizedFallback } from '../../lib/navigation';
import { getRoleLabel } from '../../lib/users/roleAccess';
import { useRolePermissions } from '../../hooks/useRolePermissions';

type CareDroidRouteGuardProps = {
  children: React.ReactNode;
};

export function CareDroidRouteGuard({ children }: CareDroidRouteGuardProps) {
  const { role } = useRolePermissions();
  const { pathname } = useLocation();

  // Pass through: unknown paths (not in ROUTE_ACCESS_CONFIG) or permitted roles
  if (canRoleAccessRoute(role, pathname)) {
    return <>{children}</>;
  }

  const fallback = getUnauthorizedFallback();

  return (
    <section
      style={{
        minHeight: '100%',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: MEDICAL_THEME.surfacePage,
      }}
      aria-label="Access denied"
    >
      <div
        role="alert"
        aria-live="assertive"
        style={{
          maxWidth: 560,
          border: '1px solid #7F1D1D',
          borderRadius: 16,
          background: MEDICAL_THEME.surfaceCard,
          color: MEDICAL_THEME.ink,
          padding: 24,
          boxShadow: 'none',
        }}
      >
        <span
          style={{
            color: MEDICAL_TYPE.statusCritical,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Access denied
        </span>
        <h1 style={{ margin: '6px 0 0', fontSize: 22 }}>CareDroid page unavailable</h1>
        <p style={{ color: MEDICAL_THEME.inkSubtle, lineHeight: 1.5 }}>
          {getRoleLabel(role)} does not have access to this CareDroid page.
        </p>
        <Link
          to={fallback}
          style={{
            display: 'inline-flex',
            marginTop: 10,
            borderRadius: 10,
            background: MEDICAL_THEME.accent,
            color: MEDICAL_THEME.onAccent,
            padding: '10px 13px',
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          Go to permitted CareDroid page
        </Link>
      </div>
    </section>
  );
}

export default CareDroidRouteGuard;

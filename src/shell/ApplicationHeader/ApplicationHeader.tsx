/**
 * ApplicationHeader Component
 *
 * The universal header that appears on every authenticated page.
 * Responsibilities:
 * - User identity and avatar
 * - Facility/tenant selector
 * - Global search
 * - System health indicator
 * - Notifications
 * - Help
 * - Shift/session state
 * - User menu
 */

import React from 'react';
import { useUser } from '../../contexts/UserContext';
import { useTenantContext } from '../../contexts/TenantContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, typography, colors, layout } from '../../tokens';

export interface ApplicationHeaderProps {
  showSearch?: boolean;
  showNotifications?: boolean;
  showHelp?: boolean;
  className?: string;
}

export const ApplicationHeader: React.FC<ApplicationHeaderProps> = ({
  showSearch = true,
  showNotifications = true,
  showHelp = true,
  className,
}) => {
  const { user } = useUser();
  const tenantCtx = useTenantContext();
  const tenant = tenantCtx?.tenant;
  const { notifications } = useNotifications();
  const { theme } = useTheme();

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header
      className={`application-header ${className || ''}`}
      role="banner"
      aria-label="Application header"
      style={{
        height: layout.header.height,
        display: 'flex',
        alignItems: 'center',
        padding: `0 ${spacing[4]}`,
        borderBottom: `1px solid ${colors.neutral[200]}`,
        backgroundColor: theme === 'dark' ? colors.neutral[800] : colors.white,
      }}
    >
      {/* Brand */}
      <div className="application-header__brand" style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
        <img src="/logo.svg" alt="CareDroid" style={{ height: '32px' }} />
        <span style={{ fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.lg }}>
          CareDroid
        </span>
      </div>

      {/* Facility Selector */}
      {tenant && (
        <div className="application-header__facility" style={{ marginLeft: spacing[6] }}>
          <button
            type="button"
            aria-label={`Current facility: ${tenant.name}`}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: colors.neutral[600],
              fontSize: typography.fontSize.sm,
            }}
          >
            {tenant.name}
          </button>
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Global Search */}
      {showSearch && (
        <div className="application-header__search" style={{ marginRight: spacing[4] }}>
          <button
            type="button"
            aria-label="Search (Ctrl+K)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              padding: `${spacing[1.5]} ${spacing[3]}`,
              backgroundColor: colors.neutral[100],
              border: `1px solid ${colors.neutral[200]}`,
              borderRadius: '6px',
              cursor: 'pointer',
              color: colors.neutral[500],
              fontSize: typography.fontSize.sm,
            }}
          >
            <span>🔍</span>
            <span>Search...</span>
            <kbd style={{ marginLeft: spacing[2], fontSize: typography.fontSize.xs }}>⌘K</kbd>
          </button>
        </div>
      )}

      {/* System Health */}
      <div className="application-header__health" style={{ marginRight: spacing[4] }}>
        <button
          type="button"
          aria-label="System health"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: colors.success.DEFAULT,
          }}
        >
          ●
        </button>
      </div>

      {/* Notifications */}
      {showNotifications && (
        <div className="application-header__notifications" style={{ marginRight: spacing[4] }}>
          <button
            type="button"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            style={{
              position: 'relative',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: colors.neutral[600],
            }}
          >
            🔔
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: colors.error.DEFAULT,
                  color: colors.white,
                  borderRadius: '50%',
                  fontSize: typography.fontSize.xs,
                  padding: '2px 6px',
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Help */}
      {showHelp && (
        <div className="application-header__help" style={{ marginRight: spacing[4] }}>
          <button
            type="button"
            aria-label="Help"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: colors.neutral[600],
            }}
          >
            ?
          </button>
        </div>
      )}

      {/* User Menu */}
      <div className="application-header__user">
        <button
          type="button"
          aria-label={`User menu: ${user?.name || 'User'}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            padding: `${spacing[1]} ${spacing[2]}`,
            backgroundColor: 'transparent',
            border: `1px solid ${colors.neutral[200]}`,
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: colors.primary[100],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.primary[700],
              fontWeight: typography.fontWeight.semibold,
            }}
          >
            {user?.name?.charAt(0) || 'U'}
          </div>
          <span style={{ fontSize: typography.fontSize.sm }}>{user?.name || 'User'}</span>
        </button>
      </div>
    </header>
  );
};

export default ApplicationHeader;

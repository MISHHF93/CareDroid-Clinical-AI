/**
 * PageCommandBar Component
 *
 * The contextual command bar that appears below the WorkspaceHeader.
 * Responsibilities:
 * - Page title
 * - Breadcrumbs
 * - Local search/filter
 * - View controls
 * - Primary page action
 * - Contextual commands
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { spacing, typography, colors, layout, radii } from '../../tokens';

export interface PageCommandBarProps {
  title: string;
  breadcrumbs?: Array<{ label: string; path?: string }>;
  actions?: Array<{
    id: string;
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
    disabled?: boolean;
    icon?: string;
  }>;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  className?: string;
}

export const PageCommandBar: React.FC<PageCommandBarProps> = ({
  title,
  breadcrumbs = [],
  actions = [],
  showSearch = false,
  onSearch,
  className,
}) => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <div
      className={`page-command-bar ${className || ''}`}
      role="region"
      aria-label="Page command bar"
      style={{
        height: layout.header.commandBarHeight,
        display: 'flex',
        alignItems: 'center',
        padding: `0 ${spacing[4]}`,
        borderBottom: `1px solid ${colors.neutral[100]}`,
        backgroundColor: colors.white,
        gap: spacing[4],
      }}
    >
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav
          className="page-command-bar__breadcrumbs"
          aria-label="Breadcrumbs"
          style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}
        >
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span style={{ color: colors.neutral[400] }}>/</span>}
              {crumb.path ? (
                <Link
                  to={crumb.path}
                  style={{
                    color: colors.neutral[600],
                    textDecoration: 'none',
                    fontSize: typography.fontSize.sm,
                  }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  style={{
                    color: colors.neutral[900],
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                  }}
                >
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Page Title */}
      <h1
        className="page-command-bar__title"
        style={{
          margin: 0,
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.semibold,
          color: colors.neutral[900],
        }}
      >
        {title}
      </h1>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Search */}
      {showSearch && (
        <div className="page-command-bar__search">
          <input
            type="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={handleSearchChange}
            aria-label="Search within page"
            style={{
              padding: `${spacing[1.5]} ${spacing[3]}`,
              border: `1px solid ${colors.neutral[200]}`,
              borderRadius: radii.sm,
              fontSize: typography.fontSize.sm,
              width: '200px',
            }}
          />
        </div>
      )}

      {/* Actions */}
      <div
        className="page-command-bar__actions"
        style={{ display: 'flex', gap: spacing[2] }}
      >
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            aria-label={action.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[1],
              padding: `${spacing[1.5]} ${spacing[3]}`,
              backgroundColor:
                action.variant === 'primary'
                  ? colors.primary[500]
                  : action.variant === 'secondary'
                  ? colors.white
                  : 'transparent',
              color:
                action.variant === 'primary'
                  ? colors.white
                  : action.variant === 'secondary'
                  ? colors.neutral[700]
                  : colors.neutral[600],
              border:
                action.variant === 'secondary'
                  ? `1px solid ${colors.neutral[200]}`
                  : 'none',
              borderRadius: radii.sm,
              cursor: action.disabled ? 'not-allowed' : 'pointer',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              opacity: action.disabled ? 0.5 : 1,
            }}
          >
            {action.icon && <span>{action.icon}</span>}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PageCommandBar;

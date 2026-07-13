/**
 * WorkspaceHeader Component
 *
 * The role-specific header that appears below the ApplicationHeader.
 * Responsibilities:
 * - Role identity and icon
 * - Workspace navigation
 * - Active operational status
 * - Role-specific quick actions
 * - Permission-aware context
 */

import React from 'react';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import { useRouteScreenMode } from '../../hooks/useRouteScreenMode';
import { spacing, typography, colors, layout, radii, roleAccents } from '../../tokens';
import type { StaffRole } from '../../contracts/domains';

export interface WorkspaceHeaderProps {
  className?: string;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({ className }) => {
  const { role } = useEmergencyRolePermissions();
  const screenMode = useRouteScreenMode();

  const accent = roleAccents[role as keyof typeof roleAccents] || roleAccents.physician;

  return (
    <header
      className={`workspace-header ${className || ''}`}
      role="region"
      aria-label="Workspace header"
      style={{
        height: layout.header.workspaceHeight,
        display: 'flex',
        alignItems: 'center',
        padding: `0 ${spacing[4]}`,
        borderBottom: `1px solid ${colors.neutral[100]}`,
        backgroundColor: accent.light,
      }}
    >
      {/* Role Icon */}
      <div
        className="workspace-header__role-icon"
        style={{
          width: '24px',
          height: '24px',
          borderRadius: radii.full,
          backgroundColor: accent.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.white,
          marginRight: spacing[2],
        }}
      >
        {getRoleIcon(role)}
      </div>

      {/* Role Name */}
      <div
        className="workspace-header__role-name"
        style={{
          fontWeight: typography.fontWeight.semibold,
          fontSize: typography.fontSize.sm,
          color: accent.dark,
          marginRight: spacing[4],
        }}
      >
        {formatRoleName(role)}
      </div>

      {/* Workspace Navigation */}
      <nav
        className="workspace-header__nav"
        aria-label="Workspace navigation"
        style={{ display: 'flex', gap: spacing[1] }}
      >
        {getWorkspaceNavItems(role).map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            style={{
              padding: `${spacing[1]} ${spacing[2]}`,
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: radii.sm,
              cursor: 'pointer',
              fontSize: typography.fontSize.sm,
              color: colors.neutral[600],
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Operational Status - placeholder for future integration */}
      <div
        className="workspace-header__status"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[4],
          fontSize: typography.fontSize.sm,
          color: colors.neutral[600],
        }}
      >
        {/* Status chips will be added when operational data integration is complete */}
      </div>

      {/* Quick Actions */}
      <div
        className="workspace-header__actions"
        style={{ marginLeft: spacing[4], display: 'flex', gap: spacing[2] }}
      >
        {getQuickActions(role).map((action) => (
          <button
            key={action.id}
            type="button"
            aria-label={action.label}
            onClick={action.onClick}
            style={{
              padding: `${spacing[1.5]} ${spacing[3]}`,
              backgroundColor: accent.primary,
              color: colors.white,
              border: 'none',
              borderRadius: radii.sm,
              cursor: 'pointer',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </header>
  );
};

// Helper functions
function getRoleIcon(role: string): string {
  const icons: Record<string, string> = {
    receptionist: '📋',
    triage_nurse: '🏥',
    charge_nurse: '👔',
    bedside_nurse: '💊',
    physician: '👨‍⚕️',
    resident: '🎓',
    ems_provider: '🚑',
    technician: '🔧',
  };
  return icons[role] || '👤';
}

function formatRoleName(role: string): string {
  return role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getWorkspaceNavItems(role: string) {
  const baseItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'patients', label: 'Patients' },
    { id: 'alerts', label: 'Alerts' },
  ];

  // Add role-specific items
  if (role === 'physician' || role === 'resident') {
    baseItems.push({ id: 'orders', label: 'Orders' });
    baseItems.push({ id: 'documentation', label: 'Documentation' });
  }

  if (role === 'triage_nurse' || role === 'charge_nurse') {
    baseItems.push({ id: 'triage', label: 'Triage' });
    baseItems.push({ id: 'flow', label: 'Patient Flow' });
  }

  return baseItems;
}

function getQuickActions(role: string) {
  const actions: Array<{ id: string; label: string; onClick: () => void }> = [];

  if (role === 'receptionist') {
    actions.push({ id: 'new-patient', label: 'New Patient', onClick: () => {} });
  }

  if (role === 'triage_nurse' || role === 'charge_nurse') {
    actions.push({ id: 'new-alert', label: 'New Alert', onClick: () => {} });
  }

  return actions;
}

function StatusChip({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
      <span>{label}:</span>
      <strong>{value}</strong>
    </div>
  );
}

export default WorkspaceHeader;

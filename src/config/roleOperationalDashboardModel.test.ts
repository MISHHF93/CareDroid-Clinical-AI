import { describe, expect, it } from 'vitest';
import {
  INFORMATION_HIERARCHY_LEVELS,
  resolveRoleOperationalFocus,
  shouldShowRoleSummaryCard,
  shouldSuppressOperationalSurface,
} from './roleOperationalDashboardModel';
import { EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';

describe('roleOperationalDashboardModel', () => {
  it('prioritizes life-critical hierarchy for charge nurse', () => {
    const focus = resolveRoleOperationalFocus(EMERGENCY_ROLE_IDS.chargeNurse);
    expect(focus.hierarchyLevels[0]).toBe(INFORMATION_HIERARCHY_LEVELS.L1);
    expect(focus.primarySurfaces).toContain('critical-queue');
    expect(focus.showRoleSummaryCards).toContain('charge');
  });

  it('suppresses department KPIs for physician workflow', () => {
    const focus = resolveRoleOperationalFocus(EMERGENCY_ROLE_IDS.physician);
    expect(focus.suppressSurfaces).toContain('department-kpis');
    expect(shouldSuppressOperationalSurface('ems-offload-aggregate', EMERGENCY_ROLE_IDS.physician)).toBe(
      true,
    );
  });

  it('maps registration clerk hospital role to reception surfaces', () => {
    const focus = resolveRoleOperationalFocus(undefined, 'registration_clerk');
    expect(focus.roleLabel).toBe('Reception');
    expect(shouldShowRoleSummaryCard('reception', undefined, 'registration_clerk')).toBe(true);
    expect(shouldShowRoleSummaryCard('physician', undefined, 'registration_clerk')).toBe(false);
  });

  it('exposes leadership overview cards for ed manager', () => {
    const focus = resolveRoleOperationalFocus(EMERGENCY_ROLE_IDS.edManager);
    expect(focus.showRoleSummaryCards).toEqual(
      expect.arrayContaining(['charge', 'physician', 'nurse', 'flow']),
    );
  });
});
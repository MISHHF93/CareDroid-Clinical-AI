import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import { EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import { getVisibleNavigation } from './unified-navigation.config';
import { canAccessEmergencyRoute } from './emergencyRolePermissions';
import {
  ED_STAFF_EMERGENCY_ROLE_IDS,
  assertEdStaffCollaborationWiring,
  buildEdStaffCollaborationPath,
  edStaffShouldSeeCollaboration,
  listCuratedEdStaffRoleViews,
  resolveEdStaffCollabChannelSlug,
} from './edStaffCollaborationModel';
import { listCuratedDemoRoleViews } from './demoPersonaModel';
import { buildLocalCollaborationSeed } from '../services/collaborationLocalCatalog';

describe('ED staff Collaboration Hub wiring', () => {
  it('covers core ED staff emergency roles (not public waiting wall)', () => {
    expect(ED_STAFF_EMERGENCY_ROLE_IDS).toContain(EMERGENCY_ROLE_IDS.registrationClerk);
    expect(ED_STAFF_EMERGENCY_ROLE_IDS).toContain(EMERGENCY_ROLE_IDS.triageNurse);
    expect(ED_STAFF_EMERGENCY_ROLE_IDS).toContain(EMERGENCY_ROLE_IDS.chargeNurse);
    expect(ED_STAFF_EMERGENCY_ROLE_IDS).toContain(EMERGENCY_ROLE_IDS.physician);
    expect(ED_STAFF_EMERGENCY_ROLE_IDS).toContain(EMERGENCY_ROLE_IDS.edManager);
    expect(ED_STAFF_EMERGENCY_ROLE_IDS).toContain(EMERGENCY_ROLE_IDS.emsUser);
    expect(ED_STAFF_EMERGENCY_ROLE_IDS).not.toContain(EMERGENCY_ROLE_IDS.publicDisplay);
  });

  it('every ED staff role has Collaboration Hub in sidebar nav and route access', () => {
    const report = assertEdStaffCollaborationWiring();
    for (const row of report) {
      expect(row.nav, `${row.role} nav`).toBe(true);
      expect(row.route, `${row.role} route`).toBe(true);
      expect(row.channel, `${row.role} channel`).toBeTruthy();
    }
  });

  it('getVisibleNavigation includes collaboration for each curated ED staff lane', () => {
    for (const view of listCuratedEdStaffRoleViews()) {
      const ids = getVisibleNavigation(view.emergencyRoleId).map((item) => item.id);
      expect(ids, view.label).toContain('collaboration');
      expect(canAccessEmergencyRoute(view.emergencyRoleId, CANONICAL_ROUTES.emergencyCollaboration)).toBe(
        true,
      );
    }
  });

  it('public waiting wall is not treated as ED staff collaboration', () => {
    expect(edStaffShouldSeeCollaboration(EMERGENCY_ROLE_IDS.publicDisplay)).toBe(false);
    expect(
      canAccessEmergencyRoute(EMERGENCY_ROLE_IDS.publicDisplay, CANONICAL_ROUTES.emergencyCollaboration),
    ).toBe(false);
  });

  it('maps each ED staff role to a preferred team channel path', () => {
    expect(resolveEdStaffCollabChannelSlug(EMERGENCY_ROLE_IDS.registrationClerk)).toBe('reception');
    expect(resolveEdStaffCollabChannelSlug(EMERGENCY_ROLE_IDS.triageNurse)).toBe('triage');
    expect(resolveEdStaffCollabChannelSlug(EMERGENCY_ROLE_IDS.chargeNurse)).toBe('charge_nurses');
    expect(resolveEdStaffCollabChannelSlug(EMERGENCY_ROLE_IDS.physician)).toBe('physicians');
    expect(resolveEdStaffCollabChannelSlug(EMERGENCY_ROLE_IDS.emsUser)).toBe('ems');
    expect(buildEdStaffCollaborationPath(EMERGENCY_ROLE_IDS.registrationClerk)).toContain(
      'channel=reception',
    );
  });

  it('local desk seed opens the preferred channel for each ED staff role', () => {
    const roles = [
      [EMERGENCY_ROLE_IDS.registrationClerk, 'reception'],
      [EMERGENCY_ROLE_IDS.triageNurse, 'triage'],
      [EMERGENCY_ROLE_IDS.chargeNurse, 'charge_nurses'],
      [EMERGENCY_ROLE_IDS.physician, 'physicians'],
      [EMERGENCY_ROLE_IDS.edManager, 'hospital_operations'],
      [EMERGENCY_ROLE_IDS.emsUser, 'ems'],
    ] as const;

    for (const [role, key] of roles) {
      const seed = buildLocalCollaborationSeed({
        role,
        preferredChannelSlug: resolveEdStaffCollabChannelSlug(role),
      });
      const preferred = seed.entries.find((e) => e.channel.id === seed.preferredChannelId);
      expect(preferred?.channel.departmentKey, role).toBe(key);
    }
  });

  it('demo journey includes Collaboration Hub for ED staff walkthrough', () => {
    const views = listCuratedDemoRoleViews();
    expect(views.some((v) => v.description.toLowerCase().includes('channel') || v.copilotHint.includes('Collaboration'))).toBe(
      true,
    );
  });
});

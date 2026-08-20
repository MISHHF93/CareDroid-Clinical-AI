import { UserProfileService } from './user-profile.service';

/**
 * HEAL-333: PATCH /profile/me let any authenticated user (canAssignRole:
 * false, i.e. not an admin / no MANAGE_ROLES / MANAGE_USERS) rewrite their
 * own UserProfile.organizationId to an arbitrary value with zero membership
 * check -- unlike dto.role, dto.permissions, and dto.allowedWorkspaces,
 * which are correctly gated behind options.canAssignRole in the same
 * method. Same bug class HEAL-196 already fixed for
 * platform/me/role-profile's roleProfileId field, just missed for this
 * sibling field on this sibling endpoint.
 *
 * JwtStrategy reloads the profile fresh on every request, so a spoofed
 * organizationId takes effect immediately; chat.controller.ts and
 * clinical-intelligence.controller.ts both read
 * req.user.profile.organizationId directly (bypassing
 * TenantContextService's membership-verified resolution) to scope RAG
 * retrieval -- letting any user read another organization's privately-
 * ingested guideline/knowledge documents they were never a member of.
 */
describe('UserProfileService.updateOperationalProfile organizationId escalation (HEAL-333)', () => {
  function buildService(existingProfile: any) {
    const savedProfiles: any[] = [];
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'user-1',
        role: 'nurse',
        email: 'attacker@example.com',
        profile: existingProfile,
      }),
    };
    const profileRepository = {
      findOne: jest.fn().mockResolvedValue(existingProfile),
      create: jest.fn((payload) => ({ ...payload })),
      save: jest.fn(async (payload) => {
        savedProfiles.push({ ...payload });
        return payload;
      }),
    };
    const professionalRepository = {
      findOne: jest.fn().mockResolvedValue({ userId: 'user-1' }),
      create: jest.fn((p) => p),
      save: jest.fn(async (p) => p),
    };
    const preferencesService = {
      getPreferences: jest.fn().mockResolvedValue({ toolPreferences: {} }),
      updatePreferences: jest.fn().mockResolvedValue(undefined),
    };
    const workspaceService = {
      getWorkspaceState: jest.fn().mockResolvedValue({}),
    };
    const activityService = {
      getSummary: jest.fn().mockResolvedValue({}),
    };
    const personalizationService = {
      getForUser: jest.fn().mockResolvedValue({}),
    };
    const auditService = {
      findByUser: jest.fn().mockResolvedValue([]),
      log: jest.fn().mockResolvedValue(undefined),
    };

    const service = new UserProfileService(
      userRepository as any,
      profileRepository as any,
      professionalRepository as any,
      preferencesService as any,
      workspaceService as any,
      activityService as any,
      personalizationService as any,
      auditService as any,
    );

    return { service, profileRepository, savedProfiles };
  }

  it('blocks a non-admin caller from changing dto.role (sibling field, already correct)', async () => {
    const { service } = buildService({ userId: 'user-1', organizationId: 'org-own' });

    await expect(
      service.updateOperationalProfile('user-1', { role: 'admin' } as any, '127.0.0.1', 'jest', {
        canAssignRole: false,
      }),
    ).rejects.toThrow('Role assignment is managed by your organization administrator.');
  });

  it('blocks a non-admin caller from overwriting dto.organizationId to an org they are not a member of', async () => {
    const { service, savedProfiles } = buildService({
      userId: 'user-1',
      organizationId: 'org-own',
    });

    await expect(
      service.updateOperationalProfile(
        'user-1',
        { organizationId: 'org-VICTIM-not-a-member' } as any,
        '127.0.0.1',
        'jest',
        { canAssignRole: false },
      ),
    ).rejects.toThrow('Organization assignment is managed by your organization administrator.');

    // Nothing was persisted -- the rejected call never reached save().
    expect(savedProfiles).toHaveLength(0);
  });

  it('still allows an admin (canAssignRole: true) to set organizationId, matching the existing role/permissions/allowedWorkspaces behavior', async () => {
    const { service, savedProfiles } = buildService({
      userId: 'user-1',
      organizationId: 'org-own',
    });

    const result = await service.updateOperationalProfile(
      'user-1',
      { organizationId: 'org-new' } as any,
      '127.0.0.1',
      'jest',
      { canAssignRole: true },
    );

    expect(result).toBeDefined();
    expect(savedProfiles[0].organizationId).toBe('org-new');
  });
});

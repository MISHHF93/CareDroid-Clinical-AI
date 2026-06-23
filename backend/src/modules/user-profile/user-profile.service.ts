import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import { PersonalizationService } from '../personalization/personalization.service';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { ActivityService } from './activity.service';
import { UpdateOperationalProfileDto } from './dto/update-operational-profile.dto';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { ProfessionalProfile } from './entities/professional-profile.entity';
import {
  DEFAULT_SAAS_PROFILE,
  ROLE_PERMISSION_PRESETS,
  normalizeOrganizationType,
  normalizeSaasRole,
  uniqueStrings,
} from './saas-profile.constants';
import {
  buildUserProfileAccessSummary,
  resolveUserProfileFromSaasRole,
  validateHiddenAssetsWithinProfile,
} from './user-profile-catalog';
import { UserPreferencesService } from './user-preferences.service';
import { WorkspaceService } from './workspace.service';

@Injectable()
export class UserProfileService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(ProfessionalProfile)
    private readonly professionalRepository: Repository<ProfessionalProfile>,
    private readonly preferencesService: UserPreferencesService,
    private readonly workspaceService: WorkspaceService,
    private readonly activityService: ActivityService,
    private readonly personalizationService: PersonalizationService,
    private readonly auditService: AuditService,
  ) {}

  async getOperationalProfile(userId: string) {
    const user = await this.loadUser(userId);
    const preferences = await this.getPreferences(userId);
    const professional = await this.getProfessionalProfile(user);
    const workspace = await this.workspaceService.getWorkspaceState(user);
    const activity = await this.activityService.getSummary(userId);
    const aiPersonalization = await this.personalizationService.getForUser(userId);
    const auditLogs = await this.auditService.findByUser(userId, 5);
    const profile = user.profile || ({} as UserProfile);
    const saasRole = normalizeSaasRole(
      profile.roleProfileId || preferences?.toolPreferences?.saasProfile?.role || user.role,
    );

    return {
      userId: user.id,
      account: this.buildAccount(user, professional),
      saasProfile: this.buildSaasProfile(user, professional, preferences, workspace, activity),
      effectiveProfile: resolveUserProfileFromSaasRole(saasRole),
      accessSummary: buildUserProfileAccessSummary(saasRole),
      professional: this.serializeProfessional(user, professional),
      preferences,
      aiPersonalization,
      workspace,
      activity,
      security: {
        emailVerified: user.emailVerified,
        role: user.role,
        mfaEnabled: Boolean((user as any).twoFactor?.enabled),
        lastLoginAt: user.lastLoginAt,
      },
      audit: {
        recentEvents: auditLogs.map((log) => ({
          id: log.id,
          action: log.action,
          resource: log.resource,
          timestamp: log.timestamp,
          phiAccessed: log.phiAccessed,
        })),
      },
    };
  }

  async updateOperationalProfile(
    userId: string,
    dto: UpdateOperationalProfileDto,
    ipAddress = '0.0.0.0',
    userAgent = 'system',
    options: { canAssignRole?: boolean } = {},
  ) {
    if (!dto || Object.keys(dto).length === 0) {
      throw new BadRequestException('No profile fields were provided.');
    }
    if (
      dto.role !== undefined &&
      !options.canAssignRole
    ) {
      throw new BadRequestException(
        'Role assignment is managed by your organization administrator.',
      );
    }
    if (dto.permissions !== undefined && !options.canAssignRole) {
      throw new BadRequestException(
        'Permission changes are managed by your organization administrator.',
      );
    }
    if (dto.allowedWorkspaces !== undefined && !options.canAssignRole) {
      throw new BadRequestException(
        'Workspace access is managed by your organization administrator.',
      );
    }
    const user = await this.loadUser(userId);
    const profile = await this.getOrCreateUserProfile(user);
    const currentRole = normalizeSaasRole(profile.roleProfileId || user.role);
    if (dto.hiddenAssets !== undefined) {
      dto.hiddenAssets = validateHiddenAssetsWithinProfile(currentRole, dto.hiddenAssets);
    }
    const professional = await this.getOrCreateProfessional(userId);

    const profileUpdates: Partial<UserProfile> = {};
    if (dto.displayName !== undefined) profileUpdates.fullName = dto.displayName.trim();
    if (dto.avatarUrl !== undefined) profileUpdates.avatarUrl = dto.avatarUrl.trim();
    if (dto.specialty !== undefined) profileUpdates.specialty = dto.specialty.trim();
    if (dto.organization !== undefined) profileUpdates.institution = dto.organization.trim();
    if (dto.organizationId !== undefined)
      profileUpdates.organizationId = dto.organizationId || null;
    if (dto.role !== undefined) profileUpdates.roleProfileId = normalizeSaasRole(dto.role);
    if (dto.country !== undefined) profileUpdates.country = dto.country.trim();
    if (dto.timezone !== undefined) profileUpdates.timezone = dto.timezone.trim();
    if (dto.licenseNumber !== undefined) profileUpdates.licenseNumber = dto.licenseNumber.trim();
    Object.assign(profile, profileUpdates);
    await this.profileRepository.save(profile);

    const professionalUpdates = {
      ...(dto.professional || {}),
      username: dto.username,
      profession: dto.profession,
      department: dto.department,
      credentials: dto.credentials,
      certifications: dto.certifications,
      specialties: dto.specialties,
      experienceLevel: dto.experienceLevel,
      clinicalInterests: dto.clinicalInterests,
      licenseRegion: dto.licenseRegion,
    };
    for (const [key, value] of Object.entries(professionalUpdates)) {
      if (value !== undefined) {
        (professional as any)[key] = typeof value === 'string' ? value.trim() : value;
      }
    }
    await this.professionalRepository.save(professional);

    const preferenceUpdate = await this.buildPreferenceUpdate(userId, dto);
    if (Object.keys(preferenceUpdate).length > 0) {
      await this.preferencesService.updatePreferences(
        userId,
        preferenceUpdate,
        ipAddress,
        userAgent,
      );
    }

    await this.auditService.log({
      userId,
      organizationId: profile.organizationId || undefined,
      action: AuditAction.PROFILE_UPDATE,
      resource: `profile/${userId}`,
      ipAddress,
      userAgent,
      phiAccessed: false,
      metadata: {
        modifiedFields: Object.keys({
          ...profileUpdates,
          ...professionalUpdates,
          ...preferenceUpdate,
        }).filter(
          (key) =>
            (professionalUpdates as any)[key] !== undefined ||
            (profileUpdates as any)[key] !== undefined ||
            (preferenceUpdate as any)[key] !== undefined,
        ),
      },
    });

    return this.getOperationalProfile(userId);
  }

  async getPreferences(userId: string) {
    return this.preferencesService.getPreferences(userId);
  }

  async updatePreferences(
    userId: string,
    dto: UpdateUserPreferencesDto,
    ipAddress = '0.0.0.0',
    userAgent = 'system',
  ) {
    return this.preferencesService.updatePreferences(userId, dto, ipAddress, userAgent);
  }

  async getActivity(userId: string) {
    return this.activityService.getActivity(userId);
  }

  async getWorkspaces(userId: string) {
    const user = await this.loadUser(userId);
    return this.workspaceService.listWorkspaces(user);
  }

  async setActiveWorkspace(
    userId: string,
    workspaceId: string,
    ipAddress = '0.0.0.0',
    userAgent = 'system',
  ) {
    const user = await this.loadUser(userId);
    return this.workspaceService.switchWorkspace(user, workspaceId, ipAddress, userAgent);
  }

  async getSecurity(userId: string) {
    const user = await this.loadUser(userId);
    return {
      userId,
      emailVerified: user.emailVerified,
      role: user.role,
      mfaEnabled: Boolean((user as any).twoFactor?.enabled),
      lastLoginAt: user.lastLoginAt,
      lastLoginIp: user.lastLoginIp ? 'recorded' : null,
      oauthLinked: Boolean((user as any).oauthAccounts?.length),
    };
  }

  private async loadUser(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile', 'subscription', 'twoFactor', 'oauthAccounts'],
    });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  private buildAccount(user: User, professional: ProfessionalProfile) {
    const profile = user.profile || ({} as UserProfile);
    return {
      userId: user.id,
      displayName: profile.fullName || user.email,
      username: professional.username,
      email: user.email,
      avatarUrl: profile.avatarUrl,
      profession: professional.profession,
      specialty: profile.specialty,
      organization: profile.institution,
      department: professional.department,
      role: user.role,
      saasRole: normalizeSaasRole(profile.roleProfileId || user.role),
      organizationId: profile.organizationId,
      organizationType: normalizeOrganizationType(
        (professional as any).organizationType ||
          (user.subscription?.metadata as any)?.organizationType,
      ),
      country: profile.country,
      timezone: profile.timezone,
      language: profile.languagePreference,
      verified: profile.verified,
      trustScore: profile.trustScore,
    };
  }

  private serializeProfessional(user: User, professional: ProfessionalProfile) {
    const profile = user.profile || ({} as UserProfile);
    return {
      credentials: professional.credentials || [],
      certifications: professional.certifications || [],
      specialties: professional.specialties?.length
        ? professional.specialties
        : profile.specialty
          ? [profile.specialty]
          : [],
      experienceLevel: professional.experienceLevel || 'mid',
      clinicalInterests: professional.clinicalInterests || [],
      licenseNumber: profile.licenseNumber,
      licenseRegion: professional.licenseRegion,
    };
  }

  private buildSaasProfile(
    user: User,
    professional: ProfessionalProfile,
    preferences: any,
    workspace: any,
    activity: any,
  ) {
    const profile = user.profile || ({} as UserProfile);
    const toolPreferences = preferences?.toolPreferences || {};
    const saasPreferences = toolPreferences.saasProfile || {};
    const aiPreferences = preferences?.aiAssistantPreferences || {};
    const subscriptionMetadata = user.subscription?.metadata || {};
    const role = normalizeSaasRole(profile.roleProfileId || saasPreferences.role || user.role);
    const catalogEntry = resolveUserProfileFromSaasRole(role);
    const permissionPreset = ROLE_PERMISSION_PRESETS[role] || DEFAULT_SAAS_PROFILE.permissions;
    const subscriptionEntitlements = uniqueStrings([
      ...(saasPreferences.subscriptionEntitlements || []),
      ...(subscriptionMetadata.entitlements || []),
      user.subscription?.tier,
      ...DEFAULT_SAAS_PROFILE.subscriptionEntitlements,
    ]);
    const enabledAssetPacks = uniqueStrings([
      ...(saasPreferences.enabledAssetPacks || []),
      ...(subscriptionMetadata.enabledAssetPacks || []),
      ...(subscriptionMetadata.assetPacks || []),
      ...DEFAULT_SAAS_PROFILE.enabledAssetPacks,
    ]);
    const pinnedAssets = uniqueStrings([
      ...(toolPreferences.pinnedAssetIds || []),
      ...(toolPreferences.pinnedToolIds || []),
      ...(saasPreferences.pinnedAssets || []),
    ]);
    const hiddenAssets = uniqueStrings([
      ...(toolPreferences.hiddenAssetIds || []),
      ...(toolPreferences.hiddenToolIds || []),
      ...(saasPreferences.hiddenAssets || []),
    ]);
    const recentAssets = uniqueStrings([
      ...(toolPreferences.recentAssetIds || []),
      ...(toolPreferences.recentToolIds || []),
      ...(saasPreferences.recentAssets || []),
      ...(activity?.recentTools || []).map((item: any) => item.toolId || item.id || item),
    ]);
    const defaultWorkspace =
      saasPreferences.defaultWorkspace ||
      workspace?.activeWorkspaceId ||
      workspace?.activeWorkspace?.id ||
      DEFAULT_SAAS_PROFILE.defaultWorkspace;
    const allowedWorkspaces = uniqueStrings([
      ...(catalogEntry?.allowedWorkspaces || []),
      ...(saasPreferences.allowedWorkspaces || []),
      ...(workspace?.workspaces || []).map((item: any) => item.id),
      defaultWorkspace,
    ]);

    return {
      userId: user.id,
      organizationId: profile.organizationId,
      organizationType: normalizeOrganizationType(
        saasPreferences.organizationType || subscriptionMetadata.organizationType,
      ),
      displayName: profile.fullName || user.email,
      email: user.email,
      role,
      specialty: profile.specialty || professional.specialties?.[0] || '',
      department: professional.department || '',
      defaultWorkspace,
      allowedWorkspaces,
      permissions: uniqueStrings([...(saasPreferences.permissions || []), ...permissionPreset]),
      subscriptionEntitlements,
      enabledAssetPacks,
      pinnedAssets,
      hiddenAssets,
      recentAssets,
      preferredAIStyle:
        saasPreferences.preferredAIStyle ||
        aiPreferences.responseStyle ||
        DEFAULT_SAAS_PROFILE.preferredAIStyle,
      themePreference: preferences?.theme || DEFAULT_SAAS_PROFILE.themePreference,
      compactMode: Boolean(preferences?.compactMode ?? DEFAULT_SAAS_PROFILE.compactMode),
      onboardingStatus: saasPreferences.onboardingStatus || DEFAULT_SAAS_PROFILE.onboardingStatus,
    };
  }

  private async buildPreferenceUpdate(userId: string, dto: UpdateOperationalProfileDto) {
    const preferences = await this.getPreferences(userId);
    const toolPreferences = { ...(preferences.toolPreferences || {}) };
    const saasProfile = { ...(toolPreferences.saasProfile || {}) };
    const aiAssistantPreferences = { ...(preferences.aiAssistantPreferences || {}) };
    const update: UpdateUserPreferencesDto = {};

    const saasFields = [
      'organizationType',
      'role',
      'defaultWorkspace',
      'allowedWorkspaces',
      'permissions',
      'subscriptionEntitlements',
      'enabledAssetPacks',
      'preferredAIStyle',
      'onboardingStatus',
    ] as const;
    for (const field of saasFields) {
      if ((dto as any)[field] !== undefined) {
        (saasProfile as any)[field] =
          field === 'role'
            ? normalizeSaasRole((dto as any)[field])
            : field === 'organizationType'
              ? normalizeOrganizationType((dto as any)[field])
              : (dto as any)[field];
      }
    }

    if (dto.pinnedAssets !== undefined) {
      toolPreferences.pinnedAssetIds = dto.pinnedAssets;
      toolPreferences.pinnedToolIds = dto.pinnedAssets;
      saasProfile.pinnedAssets = dto.pinnedAssets;
    }
    if (dto.hiddenAssets !== undefined) {
      toolPreferences.hiddenAssetIds = dto.hiddenAssets;
      toolPreferences.hiddenToolIds = dto.hiddenAssets;
      saasProfile.hiddenAssets = dto.hiddenAssets;
    }
    if (dto.recentAssets !== undefined) {
      toolPreferences.recentAssetIds = dto.recentAssets;
      toolPreferences.recentToolIds = dto.recentAssets;
      saasProfile.recentAssets = dto.recentAssets;
    }
    if (dto.preferredAIStyle !== undefined) {
      aiAssistantPreferences.responseStyle = dto.preferredAIStyle;
    }
    if (dto.themePreference !== undefined) {
      update.theme = dto.themePreference;
    }
    if (dto.compactMode !== undefined) {
      update.compactMode = dto.compactMode;
    }

    if (Object.keys(saasProfile).length > 0) {
      update.toolPreferences = {
        ...toolPreferences,
        saasProfile,
      };
    }
    if (Object.keys(aiAssistantPreferences).length > 0 && dto.preferredAIStyle !== undefined) {
      update.aiAssistantPreferences = aiAssistantPreferences;
    }

    return update;
  }

  private async getProfessionalProfile(user: User) {
    return this.getOrCreateProfessional(user.id);
  }

  private async getOrCreateProfessional(userId: string) {
    let professional = await this.professionalRepository.findOne({ where: { userId } });
    if (!professional) {
      professional = this.professionalRepository.create({
        userId,
        credentials: [],
        certifications: [],
        specialties: [],
        experienceLevel: 'mid',
        clinicalInterests: [],
      });
      professional = await this.professionalRepository.save(professional);
    }
    return professional;
  }

  private async getOrCreateUserProfile(user: User) {
    if (user.profile) return user.profile;
    const profile = this.profileRepository.create({
      userId: user.id,
      fullName: user.email,
    });
    return this.profileRepository.save(profile);
  }
}

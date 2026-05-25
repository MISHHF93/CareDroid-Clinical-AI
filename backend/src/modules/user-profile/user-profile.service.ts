import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import { PersonalizationService } from '../personalization/personalization.service';
import { UserActivityService } from '../user-activity/user-activity.service';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { UpdateOperationalProfileDto } from './dto/update-operational-profile.dto';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { ProfessionalProfile } from './entities/professional-profile.entity';
import { UserPreference } from './entities/user-preference.entity';

@Injectable()
export class UserProfileService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(UserPreference)
    private readonly preferenceRepository: Repository<UserPreference>,
    @InjectRepository(ProfessionalProfile)
    private readonly professionalRepository: Repository<ProfessionalProfile>,
    private readonly workspacesService: WorkspacesService,
    private readonly activityService: UserActivityService,
    private readonly personalizationService: PersonalizationService,
    private readonly auditService: AuditService,
  ) {}

  async getOperationalProfile(userId: string) {
    const user = await this.loadUser(userId);
    const preferences = await this.getPreferences(userId);
    const professional = await this.getProfessionalProfile(user);
    const workspace = await this.workspacesService.getActiveWorkspaceState(user);
    const activity = await this.activityService.summaryForUser(userId);
    const aiPersonalization = await this.personalizationService.getForUser(userId);
    const auditLogs = await this.auditService.findByUser(userId, 5);

    return {
      userId: user.id,
      account: this.buildAccount(user, professional),
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
  ) {
    if (!dto || Object.keys(dto).length === 0) {
      throw new BadRequestException('No profile fields were provided.');
    }
    const user = await this.loadUser(userId);
    const profile = await this.getOrCreateUserProfile(user);
    const professional = await this.getOrCreateProfessional(userId);

    const profileUpdates: Partial<UserProfile> = {};
    if (dto.displayName !== undefined) profileUpdates.fullName = dto.displayName.trim();
    if (dto.avatarUrl !== undefined) profileUpdates.avatarUrl = dto.avatarUrl.trim();
    if (dto.specialty !== undefined) profileUpdates.specialty = dto.specialty.trim();
    if (dto.organization !== undefined) profileUpdates.institution = dto.organization.trim();
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

    await this.auditService.log({
      userId,
      action: AuditAction.PROFILE_UPDATE,
      resource: `profile/${userId}`,
      ipAddress,
      userAgent,
      phiAccessed: false,
      metadata: {
        modifiedFields: Object.keys({ ...profileUpdates, ...professionalUpdates }).filter(
          (key) =>
            (professionalUpdates as any)[key] !== undefined ||
            (profileUpdates as any)[key] !== undefined,
        ),
      },
    });

    return this.getOperationalProfile(userId);
  }

  async getPreferences(userId: string) {
    const preference = await this.getOrCreatePreferences(userId);
    return this.serializePreferences(preference);
  }

  async updatePreferences(
    userId: string,
    dto: UpdateUserPreferencesDto,
    ipAddress = '0.0.0.0',
    userAgent = 'system',
  ) {
    const preference = await this.getOrCreatePreferences(userId);
    const supportedFields = [
      'theme',
      'language',
      'defaultDashboard',
      'compactMode',
      'accessibility',
      'calculatorPreferences',
      'toolPreferences',
      'aiAssistantPreferences',
      'notificationSettings',
    ];
    const modifiedFields: string[] = [];
    for (const field of supportedFields) {
      if ((dto as any)[field] !== undefined) {
        (preference as any)[field] = (dto as any)[field];
        modifiedFields.push(field);
      }
    }
    await this.preferenceRepository.save(preference);

    await this.auditService.log({
      userId,
      action: AuditAction.SECURITY_EVENT,
      resource: `profile/${userId}/preferences`,
      ipAddress,
      userAgent,
      metadata: {
        eventType: 'preference_update',
        modifiedFields,
      },
    });

    return this.serializePreferences(preference);
  }

  async getActivity(userId: string) {
    return {
      summary: await this.activityService.summaryForUser(userId),
      activities: await this.activityService.listForUser(userId, 30),
    };
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

  private async getOrCreatePreferences(userId: string) {
    let preference = await this.preferenceRepository.findOne({ where: { userId } });
    if (!preference) {
      preference = this.preferenceRepository.create({
        userId,
        theme: 'system',
        language: 'en',
        defaultDashboard: 'command',
        compactMode: false,
        accessibility: {
          reduceMotion: false,
          highContrast: false,
          fontScale: 'default',
        },
        calculatorPreferences: {
          pinnedCalculatorIds: [],
          defaultUnits: 'metric',
          rememberInputs: false,
        },
        toolPreferences: {
          favoriteToolIds: [],
          pinnedToolIds: [],
          recentToolIds: [],
        },
        aiAssistantPreferences: {
          responseStyle: 'concise',
          citationLevel: 'standard',
          safetyTone: 'standard',
        },
        notificationSettings: {
          emergencyAlerts: true,
          medicationReminders: true,
          appointmentReminders: true,
          labResults: true,
          securityAlerts: true,
          systemUpdates: true,
          marketingCommunications: false,
          pushEnabled: true,
          emailEnabled: true,
          smsEnabled: false,
          quietHoursEnabled: false,
        },
      });
      preference = await this.preferenceRepository.save(preference);
    }
    return preference;
  }

  private serializePreferences(preference: UserPreference) {
    return {
      theme: preference.theme,
      language: preference.language,
      defaultDashboard: preference.defaultDashboard,
      compactMode: preference.compactMode,
      accessibility: preference.accessibility || {},
      calculatorPreferences: preference.calculatorPreferences || {},
      toolPreferences: preference.toolPreferences || {},
      aiAssistantPreferences: preference.aiAssistantPreferences || {},
      notificationSettings: preference.notificationSettings || {},
    };
  }
}

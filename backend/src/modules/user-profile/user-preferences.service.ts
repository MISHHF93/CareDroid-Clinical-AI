import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { UserPreference } from './entities/user-preference.entity';

const DEFAULT_PREFERENCES = {
  theme: 'system' as const,
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
};

@Injectable()
export class UserPreferencesService {
  constructor(
    @InjectRepository(UserPreference)
    private readonly preferenceRepository: Repository<UserPreference>,
    private readonly auditService: AuditService,
  ) {}

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

  private async getOrCreatePreferences(userId: string) {
    let preference = await this.preferenceRepository.findOne({ where: { userId } });
    if (!preference) {
      preference = this.preferenceRepository.create({
        userId,
        ...DEFAULT_PREFERENCES,
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

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
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

  // HEAL: findOne-then-create had a TOCTOU race -- two concurrent
  // getPreferences()/updatePreferences() calls for the same never-before-seen
  // user (e.g. two tabs both loading the app right after first login) could
  // both find no row and both attempt to insert one, and the loser's
  // .save() would throw an uncaught unique-constraint QueryFailedError (500)
  // against the entity's `@Index(['userId'], { unique: true })`. orIgnore()
  // relies on that same index to make the losing insert a silent no-op, then
  // reads back whichever row actually won. Same pattern as
  // notification-preference.service.ts's HEAL-347.33 fix.
  private async getOrCreatePreferences(userId: string) {
    const preference = await this.preferenceRepository.findOne({ where: { userId } });
    if (preference) {
      return preference;
    }

    // id is @PrimaryGeneratedColumn('uuid') -- normally left for the
    // database to assign, but the orIgnore()+read-back below needs a value
    // to compare against so the winner-check can tell a genuine insert
    // apart from a losing race.
    const candidate = this.preferenceRepository.create({
      id: randomUUID(),
      userId,
      ...DEFAULT_PREFERENCES,
    });

    await this.preferenceRepository
      .createQueryBuilder()
      .insert()
      .into(UserPreference)
      .values(candidate as any)
      .orIgnore()
      .execute();

    return this.preferenceRepository.findOneOrFail({ where: { userId } });
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

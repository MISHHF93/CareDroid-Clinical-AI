import { UserPreferencesService } from './user-preferences.service';

describe('UserPreferencesService', () => {
  const buildService = (existingPreference: any = null) => {
    const preferenceRepository = {
      findOne: jest.fn().mockResolvedValue(existingPreference),
      create: jest.fn((payload) => ({ id: 'pref-1', ...payload })),
      save: jest.fn(async (payload) => ({ id: 'pref-1', ...payload })),
    };
    const auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const service = new UserPreferencesService(preferenceRepository as any, auditService as any);
    return { service, preferenceRepository, auditService };
  };

  it('creates default profile preferences for new users', async () => {
    const { service, preferenceRepository } = buildService();

    const preferences = await service.getPreferences('user-1');

    expect(preferenceRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        theme: 'system',
        defaultDashboard: 'command',
        notificationSettings: expect.objectContaining({
          emergencyAlerts: true,
          securityAlerts: true,
        }),
        aiAssistantPreferences: expect.objectContaining({
          responseStyle: 'concise',
        }),
      }),
    );
    expect(preferences).toEqual(
      expect.objectContaining({
        theme: 'system',
        defaultDashboard: 'command',
        aiAssistantPreferences: expect.objectContaining({ responseStyle: 'concise' }),
      }),
    );
  });

  it('updates preferences and records a safe audit event', async () => {
    const existingPreference = {
      userId: 'user-1',
      theme: 'system',
      language: 'en',
      defaultDashboard: 'command',
      compactMode: false,
      accessibility: {},
      calculatorPreferences: {},
      toolPreferences: {},
      aiAssistantPreferences: { responseStyle: 'concise' },
      notificationSettings: { emergencyAlerts: true },
    };
    const { service, preferenceRepository, auditService } = buildService(existingPreference);

    const preferences = await service.updatePreferences(
      'user-1',
      {
        theme: 'dark',
        aiAssistantPreferences: { responseStyle: 'teaching' },
        notificationSettings: { emergencyAlerts: true, emailEnabled: false },
      },
      '127.0.0.1',
      'jest',
    );

    expect(preferenceRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: 'dark',
        aiAssistantPreferences: { responseStyle: 'teaching' },
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        resource: 'profile/user-1/preferences',
        metadata: expect.objectContaining({
          eventType: 'preference_update',
          modifiedFields: expect.arrayContaining([
            'theme',
            'aiAssistantPreferences',
            'notificationSettings',
          ]),
        }),
      }),
    );
    expect(preferences.theme).toBe('dark');
    expect(preferences.notificationSettings.emailEnabled).toBe(false);
  });
});

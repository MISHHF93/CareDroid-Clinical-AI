import { UserPreferencesService } from './user-preferences.service';

describe('UserPreferencesService', () => {
  const buildService = (existingPreference: any = null) => {
    let pendingInsertValues: any = null;
    const insertQueryBuilder: any = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn((values: any) => {
        pendingInsertValues = values;
        return insertQueryBuilder;
      }),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const preferenceRepository = {
      findOne: jest.fn().mockResolvedValue(existingPreference),
      findOneOrFail: jest.fn(async () => pendingInsertValues),
      create: jest.fn((payload) => ({ id: 'pref-1', ...payload })),
      save: jest.fn(async (payload) => ({ id: 'pref-1', ...payload })),
      createQueryBuilder: jest.fn(() => insertQueryBuilder),
    };
    const auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const service = new UserPreferencesService(preferenceRepository as any, auditService as any);
    return { service, preferenceRepository, auditService, insertQueryBuilder };
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
    expect(preferenceRepository.createQueryBuilder).toHaveBeenCalled();
    expect(preferences).toEqual(
      expect.objectContaining({
        theme: 'system',
        defaultDashboard: 'command',
        aiAssistantPreferences: expect.objectContaining({ responseStyle: 'concise' }),
      }),
    );
  });

  it('returns the already-existing row on a losing concurrent create instead of a second duplicate', async () => {
    const { service, preferenceRepository, insertQueryBuilder } = buildService();

    // Simulate another concurrent request having already won the race: the
    // orIgnore() insert is a silent no-op, and the read-back finds the
    // winner's row (a different id than whatever this call would have
    // inserted), not the one this call attempted.
    const winningRow = {
      id: 'existing-pref-id',
      userId: 'user-1',
      theme: 'dark',
      language: 'en',
      defaultDashboard: 'command',
      compactMode: false,
      accessibility: {},
      calculatorPreferences: {},
      toolPreferences: {},
      aiAssistantPreferences: { responseStyle: 'teaching' },
      notificationSettings: {},
    };
    insertQueryBuilder.execute.mockImplementation(async () => {
      // orIgnore() means execute() never actually stores our candidate.
    });
    preferenceRepository.findOneOrFail = jest.fn(async () => winningRow);

    const preferences = await service.getPreferences('user-1');

    expect(preferences.theme).toBe('dark');
    expect(preferences.aiAssistantPreferences).toEqual({ responseStyle: 'teaching' });
  });

  it('does not re-create preferences that already exist', async () => {
    const existing = {
      userId: 'user-1',
      theme: 'system',
      language: 'en',
      defaultDashboard: 'command',
      compactMode: false,
      accessibility: {},
      calculatorPreferences: {},
      toolPreferences: {},
      aiAssistantPreferences: {},
      notificationSettings: {},
    };
    const { service, preferenceRepository } = buildService(existing);

    const preferences = await service.getPreferences('user-1');

    expect(preferences).toEqual(
      expect.objectContaining({ theme: 'system', defaultDashboard: 'command' }),
    );
    expect(preferenceRepository.createQueryBuilder).not.toHaveBeenCalled();
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

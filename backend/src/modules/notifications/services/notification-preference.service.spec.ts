import { NotificationPreferenceService } from './notification-preference.service';

/**
 * HEAL-347.33: getPreferences()/updatePreferences() both do a
 * findOne-then-create-if-missing sequence with nothing enforcing "one row
 * per user" at the database level -- no spec file existed for this
 * service at all before this fix.
 */
describe('NotificationPreferenceService', () => {
  function buildService() {
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
      findOne: jest.fn(),
      findOneOrFail: jest.fn(async () => pendingInsertValues),
      save: jest.fn(async (entity: any) => entity),
      create: jest.fn((entity: any) => entity),
      createQueryBuilder: jest.fn(() => insertQueryBuilder),
    };
    const service = new NotificationPreferenceService(preferenceRepository as any);
    return { service, preferenceRepository, insertQueryBuilder, getPending: () => pendingInsertValues };
  }

  it('creates and returns default preferences when a user has none yet', async () => {
    const { service, preferenceRepository } = buildService();
    preferenceRepository.findOne.mockResolvedValue(null);

    const result = await service.getPreferences('user-1');

    expect(result.emergencyAlerts).toBe(true);
    expect(result.pushEnabled).toBe(true);
    expect(preferenceRepository.createQueryBuilder).toHaveBeenCalled();
  });

  it('returns the already-existing row on a losing concurrent create instead of a second duplicate', async () => {
    const { service, preferenceRepository, insertQueryBuilder } = buildService();
    preferenceRepository.findOne.mockResolvedValue(null);

    // Simulate another concurrent request having already won the race: the
    // orIgnore() insert is a silent no-op, and the read-back finds the
    // winner's row (a different id than whatever this call would have
    // inserted), not the one this call attempted.
    const winningRow = { id: 'existing-pref-id', user: { id: 'user-1' }, pushEnabled: false };
    insertQueryBuilder.execute.mockImplementation(async () => {
      // orIgnore() means execute() never actually stores our candidate.
    });
    preferenceRepository.findOneOrFail = jest.fn(async () => winningRow);

    const result = await service.getPreferences('user-1');

    expect(result).toBe(winningRow);
    expect(result.pushEnabled).toBe(false);
  });

  it('does not re-create preferences that already exist', async () => {
    const { service, preferenceRepository } = buildService();
    const existing = { id: 'pref-1', user: { id: 'user-1' }, pushEnabled: true };
    preferenceRepository.findOne.mockResolvedValue(existing);

    const result = await service.getPreferences('user-1');

    expect(result).toBe(existing);
    expect(preferenceRepository.createQueryBuilder).not.toHaveBeenCalled();
  });
});

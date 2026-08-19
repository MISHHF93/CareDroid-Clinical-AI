import { LessThan } from 'typeorm';
import { KeyRotationService } from './key-rotation.service';

/**
 * HEAL-347.35: scheduleOldKeyDeletion() queried `createdAt: cutoffDate` --
 * a plain EQUALITY match in TypeORM's where clause, not "older than". This
 * ~7-year HIPAA key-retention deletion-scheduling control could only ever
 * match a key whose createdAt happened to equal the freshly-computed
 * cutoff Date object to the millisecond, so it silently never fired for
 * any real key no matter how old. Fixed to LessThan(cutoffDate).
 */
describe('KeyRotationService.scheduleOldKeyDeletion', () => {
  function buildService() {
    const keyRepository = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(async (entity: any) => entity),
    };
    const encryptionService = {} as any;
    const service = new KeyRotationService(encryptionService, keyRepository as any);
    return { service, keyRepository };
  }

  it('queries for keys older than the cutoff using LessThan, not an equality match', async () => {
    const { service, keyRepository } = buildService();

    await service.scheduleOldKeyDeletion(2555);

    expect(keyRepository.find).toHaveBeenCalledTimes(1);
    const [{ where }] = keyRepository.find.mock.calls[0];
    expect(where.isActive).toBe(false);
    expect(where.createdAt).toEqual(LessThan(expect.any(Date)));
  });

  it('schedules every key the query returns for deletion', async () => {
    const { service, keyRepository } = buildService();
    const oldKey1 = { id: 'key-1', isActive: false, status: 'active', deletionScheduledAt: null };
    const oldKey2 = { id: 'key-2', isActive: false, status: 'active', deletionScheduledAt: null };
    keyRepository.find.mockResolvedValue([oldKey1, oldKey2]);

    const result = await service.scheduleOldKeyDeletion(2555);

    expect(result.scheduledForDeletion).toBe(2);
    expect(oldKey1.status).toBe('scheduled_for_deletion');
    expect(oldKey2.status).toBe('scheduled_for_deletion');
    expect(oldKey1.deletionScheduledAt).toBeInstanceOf(Date);
    expect(keyRepository.save).toHaveBeenCalledTimes(2);
  });

  it('reports no keys eligible when none are old enough', async () => {
    const { service, keyRepository } = buildService();
    keyRepository.find.mockResolvedValue([]);

    const result = await service.scheduleOldKeyDeletion(2555);

    expect(result).toEqual({
      message: 'No keys eligible for deletion',
      scheduledForDeletion: 0,
    });
  });
});

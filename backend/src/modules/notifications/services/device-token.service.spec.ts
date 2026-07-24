import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { DeviceTokenService } from './device-token.service';
import { DeviceToken, DevicePlatform } from '../entities/device-token.entity';
import { User } from '../../users/entities/user.entity';

describe('DeviceTokenService', () => {
  let service: DeviceTokenService;
  let repo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    delete: jest.Mock;
    update: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let queryBuilder: {
    delete: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    execute: jest.Mock;
  };

  const mockUser = { id: 'user-1' } as User;

  beforeEach(async () => {
    queryBuilder = {
      delete: jest.fn(),
      where: jest.fn(),
      andWhere: jest.fn(),
      execute: jest.fn(async () => ({ affected: 3 })),
    };
    queryBuilder.delete.mockReturnValue(queryBuilder);
    queryBuilder.where.mockReturnValue(queryBuilder);
    queryBuilder.andWhere.mockReturnValue(queryBuilder);

    repo = {
      findOne: jest.fn(),
      create: jest.fn((partial) => ({ ...partial })),
      save: jest.fn(async (entity) => entity),
      find: jest.fn(async () => []),
      delete: jest.fn(async () => ({ affected: 1 })),
      update: jest.fn(async () => ({ affected: 1 })),
      createQueryBuilder: jest.fn(() => queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DeviceTokenService, { provide: getRepositoryToken(DeviceToken), useValue: repo }],
    }).compile();

    service = module.get<DeviceTokenService>(DeviceTokenService);
  });

  describe('registerDeviceToken', () => {
    it('creates a new token when none exists for this user+token pair', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.registerDeviceToken(mockUser, {
        token: 'fcm-token-1',
        platform: DevicePlatform.ANDROID,
        deviceModel: 'Pixel 8',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          token: 'fcm-token-1',
          platform: DevicePlatform.ANDROID,
          deviceModel: 'Pixel 8',
          isActive: true,
        }),
      );
      expect(repo.save).toHaveBeenCalled();
      expect(result.token).toBe('fcm-token-1');
    });

    it('updates the existing row in place (no create call) when the token already exists for this user', async () => {
      const existing = {
        id: 'dt-1',
        user: mockUser,
        token: 'fcm-token-1',
        platform: DevicePlatform.IOS,
        isActive: false,
      } as DeviceToken;
      repo.findOne.mockResolvedValue(existing);

      const result = await service.registerDeviceToken(mockUser, {
        token: 'fcm-token-1',
        platform: DevicePlatform.ANDROID,
        appVersion: '2.0.0',
      });

      expect(repo.create).not.toHaveBeenCalled();
      expect(result.platform).toBe(DevicePlatform.ANDROID);
      expect(result.appVersion).toBe('2.0.0');
      expect(result.isActive).toBe(true);
      expect(result.lastUsedAt).toBeInstanceOf(Date);
    });

    it('propagates a repository failure rather than swallowing it', async () => {
      repo.findOne.mockRejectedValue(new Error('db unavailable'));

      await expect(
        service.registerDeviceToken(mockUser, { token: 'x', platform: DevicePlatform.WEB }),
      ).rejects.toThrow('db unavailable');
    });
  });

  describe('getUserDeviceTokens / getActiveTokens', () => {
    it('queries only active tokens for the given user, newest-used first', async () => {
      repo.find.mockResolvedValue([]);

      await service.getUserDeviceTokens('user-9');

      expect(repo.find).toHaveBeenCalledWith({
        where: { user: { id: 'user-9' }, isActive: true },
        order: { lastUsedAt: 'DESC' },
      });
    });

    it('getActiveTokens returns just the token strings', async () => {
      repo.find.mockResolvedValue([
        { token: 'tok-a' } as DeviceToken,
        { token: 'tok-b' } as DeviceToken,
      ]);

      const tokens = await service.getActiveTokens('user-9');

      expect(tokens).toEqual(['tok-a', 'tok-b']);
    });
  });

  describe('deactivateToken', () => {
    it('throws NotFoundException when no matching token exists', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.deactivateToken('user-1', 'missing-token')).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('soft-deletes (isActive=false) rather than removing the row', async () => {
      const existing = { id: 'dt-1', isActive: true } as DeviceToken;
      repo.findOne.mockResolvedValue(existing);

      await service.deactivateToken('user-1', 'tok-1');

      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });

  describe('removeDeviceToken', () => {
    it('throws NotFoundException when no matching token or id exists', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.removeDeviceToken('user-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('matches by token OR by device id, and hard-deletes by the resolved row id', async () => {
      const existing = { id: 'dt-42', token: 'tok-1' } as DeviceToken;
      repo.findOne.mockResolvedValue(existing);

      await service.removeDeviceToken('user-1', 'dt-42');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: [
          { user: { id: 'user-1' }, token: 'dt-42' },
          { user: { id: 'user-1' }, id: 'dt-42' },
        ],
      });
      expect(repo.delete).toHaveBeenCalledWith({ id: 'dt-42' });
    });
  });

  describe('markTokenAsInvalid', () => {
    it('flips isActive to false for the given raw token via a direct update, no read first', async () => {
      await service.markTokenAsInvalid('some-fcm-token');

      expect(repo.update).toHaveBeenCalledWith({ token: 'some-fcm-token' }, { isActive: false });
      expect(repo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('updateLastUsed', () => {
    it('stamps lastUsedAt with a fresh Date for the given token', async () => {
      await service.updateLastUsed('tok-1');

      expect(repo.update).toHaveBeenCalledWith(
        { token: 'tok-1' },
        { lastUsedAt: expect.any(Date) },
      );
    });
  });

  describe('getTokensForUsers', () => {
    it('groups multiple active devices per user into one array each, not overwriting', async () => {
      repo.find.mockResolvedValue([
        { user: { id: 'u1' }, token: 'u1-phone' } as DeviceToken,
        { user: { id: 'u1' }, token: 'u1-tablet' } as DeviceToken,
        { user: { id: 'u2' }, token: 'u2-phone' } as DeviceToken,
      ]);

      const result = await service.getTokensForUsers(['u1', 'u2']);

      expect(result.get('u1')).toEqual(['u1-phone', 'u1-tablet']);
      expect(result.get('u2')).toEqual(['u2-phone']);
      expect(repo.find).toHaveBeenCalledWith(expect.objectContaining({ relations: ['user'] }));
    });

    it('returns an empty map when no devices are found', async () => {
      repo.find.mockResolvedValue([]);

      const result = await service.getTokensForUsers(['u1']);

      expect(result.size).toBe(0);
    });
  });

  describe('cleanupOldTokens', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-07-24T12:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('deletes only inactive tokens older than the cutoff, defaulting to 90 days', async () => {
      const affected = await service.cleanupOldTokens();

      expect(queryBuilder.where).toHaveBeenCalledWith('isActive = :isActive', {
        isActive: false,
      });
      const [, params] = queryBuilder.andWhere.mock.calls[0];
      expect(params.cutoffDate.toISOString()).toBe('2026-04-25T12:00:00.000Z');
      expect(affected).toBe(3);
    });

    it('honors a custom daysOld window', async () => {
      await service.cleanupOldTokens(30);

      const [, params] = queryBuilder.andWhere.mock.calls[0];
      expect(params.cutoffDate.toISOString()).toBe('2026-06-24T12:00:00.000Z');
    });

    it('returns 0 rather than undefined when the driver reports no affected-row count', async () => {
      queryBuilder.execute.mockResolvedValue({ affected: null });

      const affected = await service.cleanupOldTokens();

      expect(affected).toBe(0);
    });
  });
});

import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { BiometricService, EnrollBiometricDto, VerifyBiometricDto } from './biometric.service';
import { BiometricConfig, BiometricType } from '../entities/biometric-config.entity';
import { User, UserRole } from '../../users/entities/user.entity';

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

describe('BiometricService', () => {
  let service: BiometricService;
  let repo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    delete: jest.Mock;
    update: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };

  const mockUser = {
    id: 'user-1',
    email: 'clinician@caredroid.local',
    role: UserRole.PHYSICIAN,
  } as User;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn((partial) => ({ ...partial })),
      save: jest.fn(async (entity) => entity),
      find: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    };
    jwtService = { sign: jest.fn(() => 'signed.jwt.token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BiometricService,
        { provide: getRepositoryToken(BiometricConfig), useValue: repo },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<BiometricService>(BiometricService);
  });

  describe('enrollBiometric', () => {
    it('creates a new config when none exists for the device, returning a plaintext challenge token', async () => {
      repo.findOne.mockResolvedValue(null);
      const dto: EnrollBiometricDto = {
        biometricType: BiometricType.FACE,
        deviceId: 'device-1',
        deviceName: 'iPhone',
      };

      const result = await service.enrollBiometric(mockUser, dto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          isEnabled: true,
          biometricType: BiometricType.FACE,
          deviceId: 'device-1',
          deviceName: 'iPhone',
          failedAttempts: 0,
        }),
      );
      expect(repo.save).toHaveBeenCalled();
      expect(result.challengeToken).toEqual(expect.any(String));
      // The stored config never carries the plaintext token, only its hash.
      expect(result.config.challengeToken).not.toBe(result.challengeToken);
      expect(result.config.challengeToken).toBe(sha256(result.challengeToken));
    });

    it('re-enrolls an existing device in place (update, not create) and resets lockout state', async () => {
      const existing: Partial<BiometricConfig> = {
        id: 'cfg-1',
        userId: mockUser.id,
        deviceId: 'device-1',
        deviceName: 'Old Name',
        isEnabled: false,
        failedAttempts: 3,
        lockedUntil: new Date(Date.now() + 60_000),
      };
      repo.findOne.mockResolvedValue(existing);

      const result = await service.enrollBiometric(mockUser, {
        biometricType: BiometricType.FINGERPRINT,
        deviceId: 'device-1',
      });

      expect(repo.create).not.toHaveBeenCalled();
      expect(result.config.isEnabled).toBe(true);
      expect(result.config.failedAttempts).toBe(0);
      expect(result.config.lockedUntil).toBeNull();
      // No deviceName supplied on re-enroll — falls back to the existing value.
      expect(result.config.deviceName).toBe('Old Name');
    });
  });

  describe('verifyBiometric', () => {
    const deviceId = 'device-1';

    function enrolledConfig(
      overrides: Partial<BiometricConfig> = {},
      plainToken = 'correct-token',
    ) {
      return {
        id: 'cfg-1',
        userId: mockUser.id,
        deviceId,
        isEnabled: true,
        failedAttempts: 0,
        lockedUntil: null,
        usageCount: 2,
        challengeToken: sha256(plainToken),
        user: mockUser,
        ...overrides,
      } as unknown as BiometricConfig;
    }

    function verifyDto(challengeResponse: string): VerifyBiometricDto {
      return { userId: mockUser.id, deviceId, challengeResponse };
    }

    it('rejects verification when no biometric is enrolled for the device', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.verifyBiometric(verifyDto('anything'))).rejects.toThrow(
        'Biometric not enrolled for this device',
      );
    });

    it('rejects immediately when the account is currently locked, without touching failedAttempts', async () => {
      const config = enrolledConfig({ lockedUntil: new Date(Date.now() + 5 * 60_000) });
      repo.findOne.mockResolvedValue(config);

      await expect(service.verifyBiometric(verifyDto('correct-token'))).rejects.toThrow(
        /temporarily locked/,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('allows verification again once the lockout window has passed', async () => {
      const config = enrolledConfig({ lockedUntil: new Date(Date.now() - 1000) });
      repo.findOne.mockResolvedValue(config);

      const result = await service.verifyBiometric(verifyDto('correct-token'));

      expect(result.success).toBe(true);
    });

    it('on success: resets failedAttempts/lockedUntil, bumps usageCount, rotates the challenge token, and issues JWTs', async () => {
      const config = enrolledConfig({ failedAttempts: 2, usageCount: 4 });
      repo.findOne.mockResolvedValue(config);
      const originalHash = config.challengeToken;

      const result = await service.verifyBiometric(verifyDto('correct-token'));

      expect(config.failedAttempts).toBe(0);
      expect(config.lockedUntil).toBeNull();
      expect(config.usageCount).toBe(5);
      expect(config.lastUsedAt).toBeInstanceOf(Date);
      // A fresh single-use challenge token replaces the consumed one.
      expect(config.challengeToken).not.toBe(originalHash);
      expect(repo.save).toHaveBeenCalledWith(config);

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: mockUser.id, email: mockUser.email, role: mockUser.role }),
        { expiresIn: '1h' },
      );
      expect(jwtService.sign).toHaveBeenCalledWith(expect.anything(), { expiresIn: '7d' });
      expect(result).toEqual({
        success: true,
        accessToken: 'signed.jwt.token',
        refreshToken: 'signed.jwt.token',
        user: mockUser,
      });
    });

    it('on a wrong challenge response: increments failedAttempts and rejects without locking (below the threshold)', async () => {
      const config = enrolledConfig({ failedAttempts: 1 });
      repo.findOne.mockResolvedValue(config);

      await expect(service.verifyBiometric(verifyDto('wrong-token'))).rejects.toThrow(
        'Biometric verification failed',
      );

      expect(config.failedAttempts).toBe(2);
      expect(config.lockedUntil).toBeNull();
      expect(repo.save).toHaveBeenCalledWith(config);
    });

    it('locks the account once failedAttempts reaches the 5-attempt threshold', async () => {
      const config = enrolledConfig({ failedAttempts: 4 });
      repo.findOne.mockResolvedValue(config);

      await expect(service.verifyBiometric(verifyDto('wrong-token'))).rejects.toThrow(
        /Too many failed attempts/,
      );

      expect(config.failedAttempts).toBe(5);
      expect(config.lockedUntil).toBeInstanceOf(Date);
      expect(config.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    });

    it('wraps an unexpected internal error (e.g. a corrupted stored hash) in a generic UnauthorizedException rather than leaking it', async () => {
      // crypto.timingSafeEqual throws a RangeError for mismatched buffer
      // lengths — simulate a corrupted/legacy stored hash of the wrong length
      // and confirm the service fails closed with a clean message instead of
      // propagating a raw internal error to the caller.
      const config = enrolledConfig({ challengeToken: 'not-a-valid-hex-length' });
      repo.findOne.mockResolvedValue(config);

      await expect(service.verifyBiometric(verifyDto('correct-token'))).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getBiometricConfig', () => {
    it('queries by userId only when no deviceId is given', async () => {
      repo.find.mockResolvedValue([]);
      await service.getBiometricConfig(mockUser.id);

      expect(repo.find).toHaveBeenCalledWith({ where: { userId: mockUser.id, isEnabled: true } });
    });

    it('narrows to a specific device when deviceId is given', async () => {
      repo.find.mockResolvedValue([]);
      await service.getBiometricConfig(mockUser.id, 'device-1');

      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: mockUser.id, isEnabled: true, deviceId: 'device-1' },
      });
    });
  });

  describe('disableBiometric', () => {
    it('disables an existing config', async () => {
      const config = { isEnabled: true } as BiometricConfig;
      repo.findOne.mockResolvedValue(config);

      await service.disableBiometric(mockUser.id, 'device-1');

      expect(config.isEnabled).toBe(false);
      expect(repo.save).toHaveBeenCalledWith(config);
    });

    it('throws BadRequestException when the config does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.disableBiometric(mockUser.id, 'device-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteBiometricConfig', () => {
    it("deletes all of a user's devices when no deviceId is given", async () => {
      await service.deleteBiometricConfig(mockUser.id);
      expect(repo.delete).toHaveBeenCalledWith({ userId: mockUser.id });
    });

    it('deletes only the named device when a deviceId is given', async () => {
      await service.deleteBiometricConfig(mockUser.id, 'device-1');
      expect(repo.delete).toHaveBeenCalledWith({ userId: mockUser.id, deviceId: 'device-1' });
    });
  });

  describe('resetFailedAttempts', () => {
    it('clears failedAttempts and lockedUntil for the given device', async () => {
      await service.resetFailedAttempts(mockUser.id, 'device-1');

      expect(repo.update).toHaveBeenCalledWith(
        { userId: mockUser.id, deviceId: 'device-1' },
        { failedAttempts: 0, lockedUntil: null },
      );
    });
  });

  describe('getBiometricStats', () => {
    it("aggregates usage across all of a user's enrolled devices", async () => {
      const now = new Date();
      repo.find.mockResolvedValue([
        {
          deviceId: 'device-1',
          deviceName: 'iPhone',
          biometricType: BiometricType.FACE,
          usageCount: 5,
          lastUsedAt: now,
        },
        {
          deviceId: 'device-2',
          deviceName: 'iPad',
          biometricType: BiometricType.FINGERPRINT,
          usageCount: 3,
          lastUsedAt: new Date(now.getTime() - 100_000),
        },
      ]);

      const stats = await service.getBiometricStats(mockUser.id);

      expect(stats.totalDevices).toBe(2);
      expect(stats.totalUsages).toBe(8);
      expect(stats.lastUsed).toBe(now);
      expect(stats.devices).toHaveLength(2);
      expect(stats.devices[0]).toEqual({
        deviceId: 'device-1',
        deviceName: 'iPhone',
        biometricType: BiometricType.FACE,
        usageCount: 5,
        lastUsedAt: now,
      });
    });

    it('reports zero devices and a null lastUsed when nothing is enrolled', async () => {
      repo.find.mockResolvedValue([]);

      const stats = await service.getBiometricStats(mockUser.id);

      expect(stats).toEqual({ totalDevices: 0, totalUsages: 0, lastUsed: null, devices: [] });
    });
  });
});

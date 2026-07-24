import { BiometricController } from './biometric.controller';
import { BiometricType } from './entities/biometric-config.entity';

describe('BiometricController', () => {
  let controller: BiometricController;
  let service: {
    enrollBiometric: jest.Mock;
    verifyBiometric: jest.Mock;
    getBiometricConfig: jest.Mock;
    getBiometricStats: jest.Mock;
    disableBiometric: jest.Mock;
    deleteBiometricConfig: jest.Mock;
  };

  const req = { user: { id: 'user-1', email: 'clinician@caredroid.local', role: 'physician' } };

  beforeEach(() => {
    service = {
      enrollBiometric: jest.fn(),
      verifyBiometric: jest.fn(),
      getBiometricConfig: jest.fn(),
      getBiometricStats: jest.fn(),
      disableBiometric: jest.fn(),
      deleteBiometricConfig: jest.fn(),
    };
    controller = new BiometricController(service as any);
  });

  it('enrollBiometric returns the plaintext challenge token and a shaped config, forwarding the authenticated user', async () => {
    service.enrollBiometric.mockResolvedValue({
      challengeToken: 'plain-token',
      config: {
        id: 'cfg-1',
        biometricType: BiometricType.FACE,
        deviceId: 'device-1',
        deviceName: 'iPhone',
        challengeToken: 'hashed-value-not-for-client',
        failedAttempts: 0,
      },
    });
    const dto = { biometricType: BiometricType.FACE, deviceId: 'device-1' };

    const result = await controller.enrollBiometric(req as any, dto as any);

    expect(service.enrollBiometric).toHaveBeenCalledWith(req.user, dto);
    expect(result).toEqual({
      success: true,
      message: 'Biometric enrolled successfully',
      challengeToken: 'plain-token',
      config: {
        id: 'cfg-1',
        biometricType: BiometricType.FACE,
        deviceId: 'device-1',
        deviceName: 'iPhone',
      },
    });
    // The shaped response must not leak the hashed challenge token or attempt counters.
    expect(result.config).not.toHaveProperty('challengeToken');
    expect(result.config).not.toHaveProperty('failedAttempts');
  });

  it('verifyBiometric does not require the JWT guard and returns a shaped user object', async () => {
    service.verifyBiometric.mockResolvedValue({
      success: true,
      accessToken: 'access.jwt',
      refreshToken: 'refresh.jwt',
      user: {
        id: 'user-1',
        email: 'clinician@caredroid.local',
        role: 'physician',
        passwordHash: 'secret',
      },
    });
    const dto = { userId: 'user-1', deviceId: 'device-1', challengeResponse: 'resp' };

    const result = await controller.verifyBiometric(dto as any);

    expect(service.verifyBiometric).toHaveBeenCalledWith(dto);
    expect(result).toEqual({
      success: true,
      message: 'Authentication successful',
      accessToken: 'access.jwt',
      refreshToken: 'refresh.jwt',
      user: { id: 'user-1', email: 'clinician@caredroid.local', role: 'physician' },
    });
    // The shaped response must not leak the password hash from the User entity.
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('getBiometricConfig scopes to the authenticated user and shapes each config entry', async () => {
    const now = new Date();
    service.getBiometricConfig.mockResolvedValue([
      {
        id: 'cfg-1',
        biometricType: BiometricType.FINGERPRINT,
        deviceId: 'device-1',
        deviceName: 'iPhone',
        lastUsedAt: now,
        usageCount: 3,
        createdAt: now,
        challengeToken: 'hashed',
        failedAttempts: 1,
      },
    ]);

    const result = await controller.getBiometricConfig(req as any);

    expect(service.getBiometricConfig).toHaveBeenCalledWith(req.user.id);
    expect(result.configs).toEqual([
      {
        id: 'cfg-1',
        biometricType: BiometricType.FINGERPRINT,
        deviceId: 'device-1',
        deviceName: 'iPhone',
        lastUsedAt: now,
        usageCount: 3,
        createdAt: now,
      },
    ]);
  });

  it('getBiometricStats forwards the authenticated user and passes stats through unchanged', async () => {
    const stats = { totalDevices: 1, totalUsages: 4, lastUsed: new Date(), devices: [] };
    service.getBiometricStats.mockResolvedValue(stats);

    const result = await controller.getBiometricStats(req as any);

    expect(service.getBiometricStats).toHaveBeenCalledWith(req.user.id);
    expect(result).toEqual({ success: true, stats });
  });

  it('disableBiometric scopes to the authenticated user and the requested device', async () => {
    const result = await controller.disableBiometric(req as any, 'device-1');

    expect(service.disableBiometric).toHaveBeenCalledWith(req.user.id, 'device-1');
    expect(result).toEqual({ success: true, message: 'Biometric disabled successfully' });
  });

  it('deleteBiometricConfig scopes to the authenticated user and the requested device', async () => {
    const result = await controller.deleteBiometricConfig(req as any, 'device-1');

    expect(service.deleteBiometricConfig).toHaveBeenCalledWith(req.user.id, 'device-1');
    expect(result).toEqual({ success: true, message: 'Biometric configuration deleted' });
  });

  it('checkBiometricAvailable reports enrolled-device count and the 3 supported biometric types', async () => {
    service.getBiometricConfig.mockResolvedValue([{}, {}]);

    const result = await controller.checkBiometricAvailable(req as any);

    expect(result).toEqual({
      success: true,
      serverSupport: true,
      enrolledDevices: 2,
      supportedTypes: [BiometricType.FINGERPRINT, BiometricType.FACE, BiometricType.IRIS],
    });
  });
});

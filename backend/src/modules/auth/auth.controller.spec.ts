import { AuthController } from './auth.controller';

describe('AuthController enterprise identity registry', () => {
  it('returns identity providers from the registry service', async () => {
    const registry = {
      statuses: ['supported', 'planned', 'unavailable'],
      providers: [{ id: 'google-workspace', status: 'supported' }],
    };
    const controller = new AuthController(
      {} as any,
      { get: jest.fn() } as any,
      { getRegistry: jest.fn(() => registry) } as any,
    );

    await expect(controller.identityProviders()).resolves.toBe(registry);
  });
});

describe('AuthController dev-session (read-only GET)', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAllow = process.env.ALLOW_DEMO_AUTH_IN_PRODUCTION;
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalAllow === undefined) delete process.env.ALLOW_DEMO_AUTH_IN_PRODUCTION;
    else process.env.ALLOW_DEMO_AUTH_IN_PRODUCTION = originalAllow;
  });

  it('delegates to describeDevSession with the caller IP and never to createDevSession', async () => {
    process.env.NODE_ENV = 'development';
    const authService = {
      describeDevSession: jest.fn(async () => ({ exists: true, role: 'nurse' })),
      createDevSession: jest.fn(),
    };
    const controller = new AuthController(authService as any, { get: jest.fn() } as any, {} as any);

    await expect(controller.describeDevSession({ ip: '127.0.0.1' } as any)).resolves.toEqual({
      exists: true,
      role: 'nurse',
    });
    expect(authService.describeDevSession).toHaveBeenCalledWith('127.0.0.1');
    expect(authService.createDevSession).not.toHaveBeenCalled();
  });

  it('is refused in production exactly like the POST', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_DEMO_AUTH_IN_PRODUCTION;
    const authService = { describeDevSession: jest.fn(), createDevSession: jest.fn() };
    const controller = new AuthController(authService as any, { get: jest.fn() } as any, {} as any);

    await expect(controller.describeDevSession({ ip: '127.0.0.1' } as any)).rejects.toThrow(
      'not available in production',
    );
    await expect(controller.devSession({ ip: '127.0.0.1' } as any, {} as any)).rejects.toThrow(
      'not available in production',
    );
    expect(authService.describeDevSession).not.toHaveBeenCalled();
    expect(authService.createDevSession).not.toHaveBeenCalled();
  });
});

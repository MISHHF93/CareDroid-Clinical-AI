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

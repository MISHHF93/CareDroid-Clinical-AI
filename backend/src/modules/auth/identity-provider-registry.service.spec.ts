import { ConfigService } from '@nestjs/config';
import { IdentityProviderRegistryService } from './identity-provider-registry.service';

/** A registry built over the given `oauth` config block. */
const registryFor = (oauth: unknown) =>
  new IdentityProviderRegistryService({
    get: jest.fn((key: string) => (key === 'oauth' ? oauth : undefined)),
  } as unknown as ConfigService);

const googleProvider = (oauth: unknown) =>
  registryFor(oauth)
    .getRegistry()
    .providers.find((provider) => provider.id === 'google-workspace');

describe('IdentityProviderRegistryService', () => {
  it('lists enterprise identity providers with readiness statuses', () => {
    // Both halves of the client must be real for the provider to be usable;
    // the mock supplied only a clientId, which counted as configured under
    // the old Boolean(clientId) check.
    const service = registryFor({
      google: {
        clientId: '1234567890-abc.apps.googleusercontent.com',
        clientSecret: 'GOCSPX-abcdefghijklmnop',
      },
    });

    const registry = service.getRegistry();

    expect(registry.statuses).toEqual(['supported', 'planned', 'unavailable']);
    expect(registry.providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'sso', status: 'planned' }),
        expect.objectContaining({ id: 'saml', status: 'planned', entryPath: '/api/auth/saml' }),
        expect.objectContaining({ id: 'oidc', status: 'planned', entryPath: '/api/auth/oidc' }),
        expect.objectContaining({ id: 'azure-ad', status: 'planned' }),
        expect.objectContaining({ id: 'okta', status: 'planned' }),
        expect.objectContaining({ id: 'google-workspace', status: 'supported' }),
      ]),
    );
    expect(registry.summary.supported).toBe(1);
  });

  it('marks Google Workspace as planned when OAuth credentials are absent', () => {
    const service = new IdentityProviderRegistryService({
      get: jest.fn(() => ({})),
    } as unknown as ConfigService);

    const registry = service.getRegistry();

    expect(registry.providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'google-workspace', status: 'planned' }),
      ]),
    );
  });

  /**
   * The registry drove a real, user-visible claim: 'supported' means the
   * /api/auth/google button will work. Boolean(clientId) let the
   * documentation placeholder from backend/.env.example satisfy it, so a
   * developer running with the example file was told Google sign-in was
   * configured and got bounced to Google with 'your-google-client-id…'
   * (2026-09-04).
   */
  it.each([
    [
      'the documented placeholder',
      {
        clientId: 'your-google-client-id.apps.googleusercontent.com',
        clientSecret: 'your-google-client-secret',
      },
    ],
    [
      'a real id with a placeholder secret',
      {
        clientId: '1234567890-abc.apps.googleusercontent.com',
        clientSecret: 'your-google-client-secret',
      },
    ],
    ['an id with no secret at all', { clientId: '1234567890-abc.apps.googleusercontent.com' }],
    ['an empty client', {}],
  ])('does not advertise Google as supported for %s', (_label, google) => {
    const provider = googleProvider({ google });
    expect(provider?.status).toBe('planned');
    expect(provider?.notes).toContain('not configured');
    expect(provider?.capabilities).toContain('configuration-required');
  });
});

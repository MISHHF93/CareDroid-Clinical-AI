import { ConfigService } from '@nestjs/config';
import { IdentityProviderRegistryService } from './identity-provider-registry.service';

describe('IdentityProviderRegistryService', () => {
  it('lists enterprise identity providers with readiness statuses', () => {
    const service = new IdentityProviderRegistryService({
      get: jest.fn((key: string) =>
        key === 'oauth' ? { google: { clientId: 'google-client' } } : undefined,
      ),
    } as unknown as ConfigService);

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
});

import { ServiceUnavailableException } from '@nestjs/common';
import { isConfiguredCredential, isOAuthProviderConfigured } from './credentials.util';
import { OAuthProviderConfiguredGuard } from '../modules/auth/guards/oauth-provider-configured.guard';

describe('isConfiguredCredential', () => {
  it.each([
    'your-google-client-id.apps.googleusercontent.com',
    'your-linkedin-client-id',
    'your_secret',
    'changeme',
    'replace-me',
    '<client-id>',
    '${GOOGLE_CLIENT_ID}',
    '',
    '   ',
    'short',
    undefined,
    null,
    42,
  ])('rejects the placeholder or empty value %p', (value) => {
    expect(isConfiguredCredential(value)).toBe(false);
  });

  it.each([
    '1234567890-abcdefghijklmnop.apps.googleusercontent.com',
    'GOCSPX-abcdefghijklmnopqrstuvwxyz',
    '86abcd1234efgh',
  ])('accepts a real-looking value %p', (value) => {
    expect(isConfiguredCredential(value)).toBe(true);
  });
});

describe('isOAuthProviderConfigured', () => {
  it('needs both a real client id and a real secret', () => {
    const real = {
      clientId: '1234567890-abc.apps.googleusercontent.com',
      clientSecret: 'GOCSPX-abcdef',
    };
    expect(isOAuthProviderConfigured(real)).toBe(true);
    expect(isOAuthProviderConfigured({ ...real, clientSecret: 'your-google-client-secret' })).toBe(
      false,
    );
    expect(isOAuthProviderConfigured({ ...real, clientId: undefined })).toBe(false);
    expect(isOAuthProviderConfigured(null)).toBe(false);
  });
});

describe('OAuthProviderConfiguredGuard', () => {
  const guardFor = (settings: unknown) => {
    const Guard = OAuthProviderConfiguredGuard('google');
    return new Guard({ get: () => settings } as never);
  };

  it('answers 503 with a plain message when the provider carries the placeholder', () => {
    const guard = guardFor({
      clientId: 'your-google-client-id.apps.googleusercontent.com',
      clientSecret: 'your-google-client-secret',
    });
    expect(() => guard.canActivate({} as never)).toThrow(ServiceUnavailableException);
    expect(() => guard.canActivate({} as never)).toThrow(
      'Google sign-in is not configured for this environment',
    );
  });

  it('lets a configured provider through to passport', () => {
    const guard = guardFor({
      clientId: '1234567890-abc.apps.googleusercontent.com',
      clientSecret: 'GOCSPX-abcdefghijklmnop',
    });
    expect(guard.canActivate({} as never)).toBe(true);
  });
});

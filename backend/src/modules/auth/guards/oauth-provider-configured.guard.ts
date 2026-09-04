import { CanActivate, Injectable, ServiceUnavailableException, mixin, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isOAuthProviderConfigured } from '../config/oauth-credentials.util';

export type OAuthProviderName = 'google' | 'linkedin';

const PROVIDER_LABEL: Record<OAuthProviderName, string> = {
  google: 'Google',
  linkedin: 'LinkedIn',
};

/**
 * Runs BEFORE the passport AuthGuard on the OAuth entry and callback routes.
 * Passport happily redirects to the provider with whatever client id it was
 * given, placeholder included, and the user lands on the provider's error
 * page. Answering 503 with a plain message here keeps the failure on our side
 * and legible: "Google sign-in is not configured for this environment".
 *
 * Nest runs guards in the order they are listed in @UseGuards, so this must
 * come first.
 */
export function OAuthProviderConfiguredGuard(provider: OAuthProviderName): Type<CanActivate> {
  @Injectable()
  class ProviderConfiguredGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) {}

    canActivate(): boolean {
      const settings = this.configService.get<{ clientId?: string; clientSecret?: string }>(
        `oauth.${provider}`,
      );
      if (!isOAuthProviderConfigured(settings)) {
        throw new ServiceUnavailableException(
          `${PROVIDER_LABEL[provider]} sign-in is not configured for this environment`,
        );
      }
      return true;
    }
  }
  return mixin(ProviderConfiguredGuard);
}

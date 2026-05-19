import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { OAuthProvider } from '../../users/entities/oauth-account.entity';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly configService: ConfigService;
  private readonly authService: AuthService;

  constructor(configService: ConfigService, authService: AuthService) {
    const config = configService.get<any>('oauth');
    super({
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackUrl,
      scope: ['email', 'profile'],
    });
    this.configService = configService;
    this.authService = authService;
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, emails, displayName } = profile;

    const user = {
      id,
      email: emails[0].value,
      name: displayName,
    };

    const result = await this.authService.validateOAuthLogin(OAuthProvider.GOOGLE, user);

    done(null, result);
  }
}

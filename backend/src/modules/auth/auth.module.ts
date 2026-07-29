import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { BiometricController } from './biometric.controller';
import { AuthService } from './auth.service';
import { IdentityProviderRegistryService } from './identity-provider-registry.service';
import { BiometricService } from './services/biometric.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { LinkedInStrategy } from './strategies/linkedin.strategy';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { OAuthAccount } from '../users/entities/oauth-account.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { Organization } from '../workspaces/entities/organization.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { WorkspaceMembership } from '../workspaces/entities/workspace-membership.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { BiometricConfig } from './entities/biometric-config.entity';
import { UsersModule } from '../users/users.module';

import { AuditModule } from '../audit/audit.module';
import { TwoFactorModule } from '../two-factor/two-factor.module';
import { EmailModule } from '../email/email.module';
import { EncryptionModule } from '../encryption/encryption.module';
import { PlatformAssetsModule } from '../platform-assets/platform-assets.module';
import { AuthorizationGuard } from './guards/authorization.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserProfile,
      OAuthAccount,
      Subscription,
      AuditLog,
      BiometricConfig,
      Organization,
      OrganizationMembership,
      Workspace,
      WorkspaceMembership,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<any>('jwt');
        return {
          secret: config.secret,
          signOptions: {
            expiresIn: config.accessTokenExpiry,
            issuer: config.issuer,
            audience: config.audience,
          },
        };
      },
      inject: [ConfigService],
    }),
    UsersModule,
    AuditModule,
    TwoFactorModule,
    EmailModule,
    EncryptionModule,
    PlatformAssetsModule,
  ],
  controllers: [AuthController, BiometricController],
  providers: [
    AuthService,
    IdentityProviderRegistryService,
    BiometricService,
    JwtStrategy,
    AuthorizationGuard,
    {
      provide: GoogleStrategy,
      useFactory: (configService: ConfigService, authService: AuthService) => {
        const oauth = configService.get<{ google?: { clientId?: string } }>('oauth');
        const clientId = oauth?.google?.clientId;
        if (!clientId) return null;
        return new GoogleStrategy(configService, authService);
      },
      inject: [ConfigService, AuthService],
    },
    {
      provide: LinkedInStrategy,
      useFactory: (configService: ConfigService, authService: AuthService) => {
        const oauth = configService.get<{ linkedin?: { clientId?: string } }>('oauth');
        const clientId = oauth?.linkedin?.clientId;
        if (!clientId) return null;
        return new LinkedInStrategy(configService, authService);
      },
      inject: [ConfigService, AuthService],
    },
  ].filter(Boolean),
  exports: [AuthService, JwtStrategy, PassportModule, AuthorizationGuard],
})
export class AuthModule {}

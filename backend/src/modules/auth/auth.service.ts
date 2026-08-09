import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User, UserRole } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { OAuthAccount, OAuthProvider } from '../users/entities/oauth-account.entity';
import {
  Subscription,
  SubscriptionTier,
  SubscriptionStatus,
} from '../subscriptions/entities/subscription.entity';
import { Organization } from '../workspaces/entities/organization.entity';
import {
  OrganizationMembership,
  OrganizationMembershipRole,
} from '../organizations/entities/organization-membership.entity';
import { Workspace, WorkspaceType } from '../workspaces/entities/workspace.entity';
import {
  WorkspaceMembership,
  WorkspaceMembershipRole,
  WorkspaceMembershipStatus,
} from '../workspaces/entities/workspace-membership.entity';
import { OrganizationType } from '../platform-assets/enums/platform-asset.enums';
import { DEFAULT_PACKS_BY_ORGANIZATION_TYPE } from '../platform-assets/data/platform-asset-seed.data';
import { PlatformAssetsService } from '../platform-assets/platform-assets.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { TwoFactorService } from '../two-factor/two-factor.service';
import { EmailService } from '../email/email.service';
import { EncryptionService } from '../encryption/encryption.service';
import { buildAccessTokenClaims } from './config/jwt-claims.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(OAuthAccount)
    private readonly oauthRepository: Repository<OAuthAccount>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMembership)
    private readonly organizationMembershipRepository: Repository<OrganizationMembership>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMembership)
    private readonly workspaceMembershipRepository: Repository<WorkspaceMembership>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly twoFactorService: TwoFactorService,
    private readonly encryptionService: EncryptionService,
    @Optional() private readonly emailService?: EmailService,
    @Optional() private readonly platformAssetsService?: PlatformAssetsService,
  ) {}

  /**
   * Populate the encrypted at-rest copy of the user's email. The plaintext
   * `email` column is untouched and remains the source of truth for login
   * lookups (`WHERE email = ?`) — this only adds the genuine encrypted copy
   * that `emailEncrypted` was always meant to hold.
   */
  private applyEmailEncryption(user: User): void {
    user.emailEncrypted = this.encryptionService.encryptToBuffer(user.email);
    user.phiFieldsEncrypted = true;
  }

  private getFrontendBaseUrl(): string {
    const serverConfig = this.configService.get<any>('server') || {};
    const raw =
      serverConfig.frontendUrl ||
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:3000';
    return raw.replace(/\/$/, '');
  }

  private normalizeEmail(email: string): string {
    return String(email || '')
      .trim()
      .toLowerCase();
  }

  async register(registerDto: {
    email: string;
    password: string;
    fullName: string;
    role?: UserRole;
  }) {
    const email = this.normalizeEmail(registerDto.email);
    const { password, fullName } = registerDto;

    // Check if user exists
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate email verification token
    const emailVerificationToken = randomBytes(32).toString('hex');
    const emailVerificationExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Create user
    const user = this.userRepository.create({
      email,
      passwordHash,
      emailVerificationToken,
      emailVerificationExpiry,
      role: UserRole.STUDENT,
    });

    this.applyEmailEncryption(user);
    await this.userRepository.save(user);

    // Create profile
    const profile = this.profileRepository.create({
      userId: user.id,
      fullName,
    });

    await this.profileRepository.save(profile);

    // Create free subscription
    const subscription = this.subscriptionRepository.create({
      userId: user.id,
      tier: SubscriptionTier.FREE,
      status: SubscriptionStatus.ACTIVE,
    });

    await this.subscriptionRepository.save(subscription);

    // Audit log
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.REGISTRATION,
      resource: 'user',
      ipAddress: '0.0.0.0',
      userAgent: 'system',
    });

    return {
      userId: user.id,
      email: user.email,
      verificationRequired: true,
    };
  }

  async login(loginDto: { email: string; password: string }, ipAddress: string, userAgent: string) {
    const email = this.normalizeEmail(loginDto.email);
    const { password } = loginDto;

    // Find user
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['profile', 'subscription', 'twoFactor'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    user.lastLoginAt = new Date();
    user.lastLoginIp = ipAddress;
    await this.userRepository.save(user);

    // Audit log
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.LOGIN,
      resource: 'auth',
      ipAddress,
      userAgent,
    });

    // Check if 2FA is enabled
    if (user.twoFactor?.enabled) {
      return {
        requiresTwoFactor: true,
        userId: user.id,
        twoFactorChallenge: this.generateTwoFactorChallenge(user, ipAddress, userAgent),
      };
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async validateOAuthLogin(
    provider: OAuthProvider,
    profile: { id: string; email: string; name: string },
  ) {
    let user = await this.userRepository.findOne({
      where: { email: profile.email },
      relations: ['profile', 'subscription'],
    });

    if (!user) {
      // Create new user from OAuth
      const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);

      user = this.userRepository.create({
        email: profile.email,
        passwordHash,
        emailVerified: true, // OAuth providers verify emails
      });

      this.applyEmailEncryption(user);
      await this.userRepository.save(user);

      // Create profile
      const userProfile = this.profileRepository.create({
        userId: user.id,
        fullName: profile.name,
      });

      await this.profileRepository.save(userProfile);

      // Create free subscription
      const subscription = this.subscriptionRepository.create({
        userId: user.id,
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
      });

      await this.subscriptionRepository.save(subscription);

      // Audit log
      await this.auditService.log({
        userId: user.id,
        action: AuditAction.REGISTRATION,
        resource: `oauth:${provider}`,
        ipAddress: '0.0.0.0',
        userAgent: 'oauth',
      });
    }

    // Link OAuth account
    const oauthAccount = await this.oauthRepository.findOne({
      where: { userId: user.id, provider },
    });

    if (!oauthAccount) {
      const newAccount = this.oauthRepository.create({
        userId: user.id,
        provider,
        providerAccountId: profile.id,
      });

      await this.oauthRepository.save(newAccount);
    }

    // Audit log
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.LOGIN,
      resource: `oauth:${provider}`,
      ipAddress: '0.0.0.0',
      userAgent: 'oauth',
    });

    return this.generateTokens(user);
  }

  /**
   * Development-only: issue a real JWT for explicit local/demo UI access.
   */
  async createDevSession(ipAddress: string, userAgent: string) {
    const authConfig = this.configService.get<any>('auth') || {};
    const serverConfig = this.configService.get<any>('server') || {};
    const explicitDevBypassEnabled = [
      this.configService.get<string | boolean>('ENABLE_DEV_AUTH_BYPASS'),
      authConfig.enableDevAuthBypass,
      authConfig.enableViteDevAuthBypass,
    ].some((value) => String(value).toLowerCase() === 'true');
    const productionDemoAuthEnabled = [
      this.configService.get<string | boolean>('ALLOW_DEMO_AUTH_IN_PRODUCTION'),
      authConfig.allowDemoAuthInProduction,
    ].some((value) => String(value).toLowerCase() === 'true');
    const nodeEnv = serverConfig.nodeEnv || 'development';
    const isLocalDevelopment =
      nodeEnv === 'development' && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ipAddress);

    if (!explicitDevBypassEnabled && !isLocalDevelopment) {
      throw new ForbiddenException('Dev session requires ENABLE_DEV_AUTH_BYPASS=true');
    }

    if (nodeEnv === 'production' && !(explicitDevBypassEnabled && productionDemoAuthEnabled)) {
      throw new ForbiddenException(
        'Dev session is not available in production unless ALLOW_DEMO_AUTH_IN_PRODUCTION=true',
      );
    }

    const email = this.normalizeEmail(authConfig.devLoginEmail || 'dev@caredroid.local');
    let user = await this.userRepository.findOne({
      where: { email },
      relations: ['profile', 'subscription', 'twoFactor'],
    });

    if (!user) {
      const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
      user = this.userRepository.create({
        email,
        passwordHash,
        emailVerified: true,
        role: UserRole.PHYSICIAN,
        isActive: true,
      });
      this.applyEmailEncryption(user);
      await this.userRepository.save(user);

      const profile = this.profileRepository.create({
        userId: user.id,
        fullName: 'Dev Clinician',
      });
      await this.profileRepository.save(profile);

      const subscription = this.subscriptionRepository.create({
        userId: user.id,
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
      });
      await this.subscriptionRepository.save(subscription);

      user = await this.userRepository.findOne({
        where: { id: user.id },
        relations: ['profile', 'subscription', 'twoFactor'],
      });
    }

    if (!user) {
      throw new InternalServerErrorException('Failed to bootstrap dev session user');
    }

    user.lastLoginAt = new Date();
    user.lastLoginIp = ipAddress;
    await this.userRepository.save(user);

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.LOGIN,
      resource: 'auth:dev-session',
      ipAddress,
      userAgent,
      metadata: { mode: 'development' },
    });

    const tenantContext = await this.ensureDevTenantForUser(user);
    const tokens = await this.generateTokens(user);
    return {
      ...tokens,
      user: this.sanitizeUser(user),
      tenantContext,
    };
  }

  private async ensureDevTenantForUser(user: User) {
    const DEV_ORG_SLUG = 'caredroid-dev-clinic';
    const DEV_WORKSPACE_SLUG = 'caredroid-dev-emergency';

    let organization = await this.organizationRepository.findOne({ where: { slug: DEV_ORG_SLUG } });
    if (!organization) {
      organization = await this.organizationRepository.save(
        this.organizationRepository.create({
          name: 'CareDroid Dev Clinic',
          slug: DEV_ORG_SLUG,
          organizationType: OrganizationType.HOSPITAL,
          country: 'CA',
          branding: { displayName: 'CareDroid Dev Clinic' },
          settings: { source: 'dev-session-bootstrap' },
        }),
      );
    }

    let organizationMembership = await this.organizationMembershipRepository.findOne({
      where: { organizationId: organization.id, userId: user.id },
    });
    if (!organizationMembership) {
      organizationMembership = await this.organizationMembershipRepository.save(
        this.organizationMembershipRepository.create({
          organizationId: organization.id,
          userId: user.id,
          role: OrganizationMembershipRole.OWNER,
        }),
      );
    }

    await this.ensureDevOrganizationPacksInstalled(organization);

    let workspace = await this.workspaceRepository.findOne({
      where: { slug: DEV_WORKSPACE_SLUG, organizationId: organization.id },
    });
    if (!workspace) {
      workspace = await this.workspaceRepository.save(
        this.workspaceRepository.create({
          name: 'Emergency Operations',
          slug: DEV_WORKSPACE_SLUG,
          type: WorkspaceType.EMERGENCY,
          organizationId: organization.id,
          ownerUserId: user.id,
        }),
      );
    }

    let workspaceMembership = await this.workspaceMembershipRepository.findOne({
      where: { workspaceId: workspace.id, userId: user.id },
    });
    if (!workspaceMembership) {
      workspaceMembership = await this.workspaceMembershipRepository.save(
        this.workspaceMembershipRepository.create({
          workspaceId: workspace.id,
          userId: user.id,
          role: WorkspaceMembershipRole.OWNER,
          status: WorkspaceMembershipStatus.ACTIVE,
        }),
      );
    }

    const profile =
      user.profile || (await this.profileRepository.findOne({ where: { userId: user.id } }));
    if (profile && profile.organizationId !== organization.id) {
      profile.organizationId = organization.id;
      await this.profileRepository.save(profile);
    }

    const subscription =
      user.subscription ||
      (await this.subscriptionRepository.findOne({ where: { userId: user.id } }));

    return {
      organizationId: organization.id,
      organizationName: organization.name,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      userId: user.id,
      role: user.role,
      subscriptionPlan: subscription?.tier || SubscriptionTier.FREE,
      source: 'dev-session',
      isDemoTenant: true,
    };
  }

  /**
   * The dev-session org otherwise ends up with zero OrganizationEntitlement
   * rows -- unlike the real onboarding flow (OrganizationOnboardingService),
   * which always installs the org type's default packs. EntitlementService's
   * pack-required check applies whenever an organization exists at all, so a
   * dev-session user (who does have an org, just no packs) ends up more
   * locked out than an org-less self-registered user: almost every asset,
   * including FREE-tier ones like clinical-tools-core, resolves to
   * isLaunchable:false/reason:'pack-required'. installPackForOrganization is
   * idempotent, so this is safe to call on every dev-session bootstrap.
   */
  private async ensureDevOrganizationPacksInstalled(organization: Organization) {
    if (!this.platformAssetsService) return;
    const defaultPackIds = DEFAULT_PACKS_BY_ORGANIZATION_TYPE[organization.organizationType] || [];
    const packIds = new Set(defaultPackIds);
    packIds.add('core-platform');
    for (const packId of packIds) {
      try {
        await this.platformAssetsService.installPackForOrganization(organization.id, packId);
      } catch (error) {
        this.logger.warn(
          `[AuthService] Failed to install dev-session pack ${packId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  async generateTokens(user: User) {
    // Architect Mode Stage D: explicit permissions + emergencyRole claims.
    // Guards/middleware must treat `permissions` as the authority list.
    const accessPayload = buildAccessTokenClaims({
      userId: user.id,
      email: user.email,
      role: user.role,
      roleProfileId: user.profile?.roleProfileId || null,
      tokenUse: 'access',
    });

    const accessToken = this.jwtService.sign(accessPayload);

    const config = this.configService.get<any>('jwt');
    const refreshToken = this.jwtService.sign(
      {
        ...accessPayload,
        tokenUse: 'refresh' as const,
      },
      {
        expiresIn: config.refreshTokenExpiry,
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  async verifyEmail(token: string) {
    const verificationToken = String(token || '').trim();
    if (!/^[a-f0-9]{64}$/i.test(verificationToken)) {
      throw new BadRequestException('Invalid verification token');
    }

    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: verificationToken },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (!user.emailVerificationExpiry || new Date() > user.emailVerificationExpiry) {
      throw new BadRequestException('Verification token expired');
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiry = null;

    await this.userRepository.save(user);

    // Audit log
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.EMAIL_VERIFICATION,
      resource: 'user',
      ipAddress: '0.0.0.0',
      userAgent: 'system',
    });

    return { success: true };
  }

  async verifyTwoFactorLogin(
    userId: string,
    token: string,
    challengeToken: string,
    ipAddress: string,
    userAgent: string,
  ) {
    // Find user
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile', 'subscription', 'twoFactor'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }

    // Check if 2FA is enabled
    if (!user.twoFactor?.enabled) {
      throw new UnauthorizedException('2FA is not enabled for this user');
    }

    this.verifyTwoFactorChallenge(userId, challengeToken, ipAddress, userAgent);

    // Verify token
    const isValid = await this.twoFactorService.verifyToken(userId, token);
    if (!isValid) {
      // Audit failed 2FA attempt
      await this.auditService.log({
        userId,
        action: AuditAction.TWO_FACTOR_VERIFY_FAILED,
        resource: 'auth',
        ipAddress,
        userAgent,
        metadata: { reason: 'invalid_token' },
      });

      throw new UnauthorizedException('Invalid 2FA token');
    }

    // Audit successful 2FA verification
    await this.auditService.log({
      userId,
      action: AuditAction.TWO_FACTOR_VERIFY,
      resource: 'auth',
      ipAddress,
      userAgent,
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async requestMagicLink(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) {
      throw new BadRequestException('Email is required');
    }

    const user = await this.userRepository.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      return { status: 'sent' };
    }

    const config = this.configService.get<any>('jwt');
    const magicToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        tokenUse: 'magic-link',
      },
      {
        expiresIn: '15m',
        secret: config.secret,
      },
    );

    if (this.emailService) {
      await this.emailService.sendMagicLinkEmail(user.email, magicToken, this.getFrontendBaseUrl());
    }

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.LOGIN,
      resource: 'auth:magic-link',
      ipAddress: '0.0.0.0',
      userAgent: 'system',
    });

    return { status: 'sent' };
  }

  async verifyMagicLink(token: string, ipAddress: string, userAgent: string) {
    const magicToken = String(token || '').trim();
    if (!magicToken) {
      throw new BadRequestException('Magic link token is required');
    }

    try {
      const config = this.configService.get<any>('jwt');
      const payload = this.jwtService.verify(magicToken, { secret: config.secret });
      if (payload?.tokenUse !== 'magic-link' || !payload?.sub) {
        throw new UnauthorizedException('Invalid magic link');
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['profile', 'subscription', 'twoFactor'],
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid magic link');
      }

      user.lastLoginAt = new Date();
      user.lastLoginIp = ipAddress;
      await this.userRepository.save(user);

      await this.auditService.log({
        userId: user.id,
        action: AuditAction.LOGIN,
        resource: 'auth:magic-link',
        ipAddress,
        userAgent,
      });

      if (user.twoFactor?.enabled) {
        return {
          requiresTwoFactor: true,
          userId: user.id,
          twoFactorChallenge: this.generateTwoFactorChallenge(user, ipAddress, userAgent),
        };
      }

      const tokens = await this.generateTokens(user);
      return {
        ...tokens,
        user: this.sanitizeUser(user),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired magic link');
    }
  }

  async forgotPassword(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) {
      throw new BadRequestException('Email is required');
    }

    const user = await this.userRepository.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      return { status: 'sent' };
    }

    const passwordResetToken = randomBytes(32).toString('hex');
    user.passwordResetToken = passwordResetToken;
    user.passwordResetExpiry = new Date(Date.now() + 30 * 60 * 1000);
    await this.userRepository.save(user);

    if (this.emailService) {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        passwordResetToken,
        this.getFrontendBaseUrl(),
      );
    }

    return { status: 'sent' };
  }

  async resetPassword(token: string, password: string) {
    const resetToken = String(token || '').trim();
    if (!/^[a-f0-9]{64}$/i.test(resetToken)) {
      throw new BadRequestException('Invalid reset token');
    }
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const user = await this.userRepository.findOne({ where: { passwordResetToken: resetToken } });
    if (!user || !user.passwordResetExpiry) {
      throw new BadRequestException('Invalid reset token');
    }
    if (new Date() > user.passwordResetExpiry) {
      throw new BadRequestException('Reset token expired');
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.passwordResetToken = null;
    user.passwordResetExpiry = null;
    await this.userRepository.save(user);

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.PASSWORD_CHANGE,
      resource: 'auth',
      ipAddress: '0.0.0.0',
      userAgent: 'system',
    });

    return { success: true };
  }

  private generateTwoFactorChallenge(user: User, ipAddress: string, userAgent: string) {
    const config = this.configService.get<any>('jwt');
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        tokenUse: '2fa-challenge',
        ipAddress,
        userAgent,
      },
      {
        expiresIn: '5m',
        secret: config.secret,
      },
    );
  }

  private verifyTwoFactorChallenge(
    userId: string,
    challengeToken: string,
    ipAddress: string,
    userAgent: string,
  ) {
    if (!challengeToken) {
      throw new UnauthorizedException('2FA challenge is required');
    }

    try {
      const config = this.configService.get<any>('jwt');
      const payload = this.jwtService.verify(challengeToken, { secret: config.secret });
      if (
        payload?.sub !== userId ||
        payload?.tokenUse !== '2fa-challenge' ||
        payload?.ipAddress !== ipAddress ||
        payload?.userAgent !== userAgent
      ) {
        throw new UnauthorizedException('Invalid 2FA challenge');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid 2FA challenge');
    }
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      profile: user.profile,
      subscription: user.subscription,
    };
  }
}

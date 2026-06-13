import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
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
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { TwoFactorService } from '../two-factor/two-factor.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(OAuthAccount)
    private readonly oauthRepository: Repository<OAuthAccount>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  async register(registerDto: {
    email: string;
    password: string;
    fullName: string;
    role?: UserRole;
  }) {
    const { email, password, fullName, role = UserRole.STUDENT } = registerDto;

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
      role,
    });

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
      verificationToken: emailVerificationToken,
    };
  }

  async login(loginDto: { email: string; password: string }, ipAddress: string, userAgent: string) {
    const { email, password } = loginDto;

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

    const email = authConfig.devLoginEmail || 'dev@caredroid.local';
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

    const tokens = await this.generateTokens(user);
    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    const config = this.configService.get<any>('jwt');
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: config.refreshTokenExpiry,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  async verifyEmail(token: string) {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (new Date() > user.emailVerificationExpiry) {
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

  async verifyTwoFactorLogin(userId: string, token: string, ipAddress: string, userAgent: string) {
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
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('No account found for this email');
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

  private sanitizeUser(user: User) {
    const {
      passwordHash: _passwordHash,
      emailVerificationToken: _emailVerificationToken,
      passwordResetToken: _passwordResetToken,
      ...sanitized
    } = user;
    return sanitized;
  }
}

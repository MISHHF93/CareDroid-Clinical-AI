import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { OAuthAccount } from '../users/entities/oauth-account.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { Organization } from '../workspaces/entities/organization.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { WorkspaceMembership } from '../workspaces/entities/workspace-membership.entity';
import { AuditService } from '../audit/audit.service';
import { TwoFactorService } from '../two-factor/two-factor.service';
import { EmailService } from '../email/email.service';
import { EncryptionService } from '../encryption/encryption.service';
import { PlatformAssetsService } from '../platform-assets/platform-assets.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let _jwtService: JwtService;
  const originalNodeEnv = process.env.NODE_ENV;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
    isActive: true,
    role: 'user',
    emailVerified: true,
    profile: null,
    subscription: null,
    twoFactor: null,
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockProfileRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockOauthRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockSubscriptionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockTwoFactorService = {
    isTwoFactorEnabled: jest.fn().mockResolvedValue(false),
    verifyToken: jest.fn().mockResolvedValue(true),
  };

  const mockOrganizationRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockOrganizationMembershipRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockWorkspaceRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockWorkspaceMembershipRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockEmailService = {
    sendEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendVerificationEmail: jest.fn(),
  };

  const mockEncryptionService = {
    encryptToBuffer: jest.fn((plaintext: string) => Buffer.from(`encrypted:${plaintext}`)),
    decryptFromBuffer: jest.fn((buffer: Buffer) =>
      buffer.toString('utf8').replace('encrypted:', ''),
    ),
  };

  const mockPlatformAssetsService = {
    installPackForOrganization: jest.fn().mockResolvedValue({ status: 'enabled' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: mockProfileRepository,
        },
        {
          provide: getRepositoryToken(OAuthAccount),
          useValue: mockOauthRepository,
        },
        {
          provide: getRepositoryToken(Subscription),
          useValue: mockSubscriptionRepository,
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrganizationRepository,
        },
        {
          provide: getRepositoryToken(OrganizationMembership),
          useValue: mockOrganizationMembershipRepository,
        },
        {
          provide: getRepositoryToken(Workspace),
          useValue: mockWorkspaceRepository,
        },
        {
          provide: getRepositoryToken(WorkspaceMembership),
          useValue: mockWorkspaceMembershipRepository,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: TwoFactorService,
          useValue: mockTwoFactorService,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
        {
          provide: PlatformAssetsService,
          useValue: mockPlatformAssetsService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    _jwtService = module.get<JwtService>(JwtService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ENABLE_DEV_AUTH_BYPASS;
    delete process.env.VITE_ENABLE_DEV_AUTH_BYPASS;
    delete process.env.ALLOW_DEMO_AUTH_IN_PRODUCTION;
    process.env.NODE_ENV = originalNodeEnv;
    mockConfigService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'jwt':
          return {
            accessTokenExpiry: '15m',
            refreshTokenExpiry: '7d',
          };
        case 'JWT_ACCESS_SECRET':
          return 'test-access-secret';
        case 'JWT_REFRESH_SECRET':
          return 'test-refresh-secret';
        case 'JWT_ACCESS_EXPIRES_IN':
          return '15m';
        case 'JWT_REFRESH_EXPIRES_IN':
          return '7d';
        case 'auth':
          return {
            enableDevAuthBypass: process.env.ENABLE_DEV_AUTH_BYPASS === 'true',
            enableViteDevAuthBypass: process.env.VITE_ENABLE_DEV_AUTH_BYPASS === 'true',
            allowDemoAuthInProduction: process.env.ALLOW_DEMO_AUTH_IN_PRODUCTION === 'true',
            devLoginEmail: 'dev@caredroid.local',
          };
        case 'server':
          return {
            nodeEnv: process.env.NODE_ENV || 'development',
          };
        default:
          return undefined;
      }
    });
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    delete process.env.ENABLE_DEV_AUTH_BYPASS;
    delete process.env.VITE_ENABLE_DEV_AUTH_BYPASS;
    delete process.env.ALLOW_DEMO_AUTH_IN_PRODUCTION;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return access and refresh tokens', async () => {
      const loginDto = { email: 'test@example.com', password: 'testpassword' };
      const ipAddress = '192.168.1.1';
      const userAgent = 'test-agent';
      const accessToken = 'access-token';
      const refreshToken = 'refresh-token';

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValueOnce(accessToken).mockReturnValueOnce(refreshToken);

      const result = await service.login(loginDto, ipAddress, userAgent);

      expect(result).toEqual({
        accessToken,
        refreshToken,
        expiresIn: 900,
        user: expect.any(Object),
      });
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      const loginDto = { email: 'nonexistent@example.com', password: 'testpassword' };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto, '192.168.1.1', 'test-agent')).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw error when password is invalid', async () => {
      const loginDto = { email: 'test@example.com', password: 'wrongpassword' };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto, '192.168.1.1', 'test-agent')).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });

  describe('describeDevSession', () => {
    // Read by `npm run doctor`, which must stay read-only: this reports which
    // persona the ONE shared dev user currently carries so a developer seeing
    // "ACCESS DENIED as registration-clerk" on a page seeded for another role
    // learns it is someone else's persisted switch, not a race.
    it('shares the POST gate: refuses without the bypass flag', async () => {
      await expect(service.describeDevSession('127.0.0.1')).rejects.toThrow(
        'ENABLE_DEV_AUTH_BYPASS',
      );
    });

    it('shares the POST gate: refuses production even with the bypass flag set', async () => {
      process.env.ENABLE_DEV_AUTH_BYPASS = 'true';
      process.env.NODE_ENV = 'production';

      await expect(service.describeDevSession('127.0.0.1')).rejects.toThrow(
        'ALLOW_DEMO_AUTH_IN_PRODUCTION',
      );
    });

    it('reports the persisted persona without issuing a token, writing or auditing', async () => {
      process.env.ENABLE_DEV_AUTH_BYPASS = 'true';
      const lastLoginAt = new Date('2026-09-02T23:47:48.000Z');
      mockUserRepository.findOne.mockResolvedValue({
        id: 'dev-user',
        email: 'dev@caredroid.local',
        role: 'nurse',
        lastLoginAt,
        profile: { roleProfileId: 'registration_clerk', updatedAt: lastLoginAt },
      });

      const described = await service.describeDevSession('127.0.0.1');

      expect(described).toEqual({
        exists: true,
        role: 'nurse',
        roleProfileId: 'registration_clerk',
        lastLoginAt,
        personaUpdatedAt: lastLoginAt,
      });
      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mockProfileRepository.save).not.toHaveBeenCalled();
      expect(mockAuditService.log).not.toHaveBeenCalled();
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('says so when no dev user has been bootstrapped yet', async () => {
      process.env.ENABLE_DEV_AUTH_BYPASS = 'true';
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.describeDevSession('127.0.0.1')).resolves.toEqual({ exists: false });
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('createDevSession', () => {
    it('requires an explicit development bypass flag', async () => {
      await expect(service.createDevSession('127.0.0.1', 'test-agent')).rejects.toThrow(
        'ENABLE_DEV_AUTH_BYPASS',
      );
    });

    it('refuses production even when the bypass flag is set', async () => {
      process.env.ENABLE_DEV_AUTH_BYPASS = 'true';
      process.env.NODE_ENV = 'production';

      await expect(service.createDevSession('127.0.0.1', 'test-agent')).rejects.toThrow(
        'ALLOW_DEMO_AUTH_IN_PRODUCTION',
      );
    });

    it("installs the org type's default packs for a freshly-created dev org (Cycle 226 regression)", async () => {
      // Before this fix, ensureDevTenantForUser created an Organization +
      // OrganizationMembership + Workspace but never installed any pack --
      // EntitlementService's pack-required check applies whenever an
      // organization exists at all, so the dev-session user ended up MORE
      // locked out than an org-less self-registered user: almost every
      // asset, including FREE-tier ones, resolved to isLaunchable:false.
      process.env.ENABLE_DEV_AUTH_BYPASS = 'true';

      const devUser = {
        id: 'dev-user-1',
        email: 'dev@caredroid.local',
        role: 'physician',
        profile: null,
        subscription: null,
        twoFactor: null,
      };
      const organization = {
        id: 'org-1',
        organizationType: 'hospital',
      };

      mockUserRepository.findOne
        .mockResolvedValueOnce(null) // no existing dev user
        .mockResolvedValueOnce(devUser); // re-fetch with relations after create
      mockUserRepository.create.mockReturnValue(devUser);
      mockUserRepository.save.mockResolvedValue(devUser);

      mockProfileRepository.create.mockReturnValue({ userId: devUser.id });
      mockProfileRepository.save.mockResolvedValue({ userId: devUser.id });
      mockProfileRepository.findOne.mockResolvedValue(null);

      mockSubscriptionRepository.create.mockReturnValue({ userId: devUser.id, tier: 'free' });
      mockSubscriptionRepository.save.mockResolvedValue({ userId: devUser.id, tier: 'free' });
      mockSubscriptionRepository.findOne.mockResolvedValue(null);

      mockOrganizationRepository.findOne.mockResolvedValue(null); // no existing dev org
      mockOrganizationRepository.create.mockReturnValue(organization);
      mockOrganizationRepository.save.mockResolvedValue(organization);

      mockOrganizationMembershipRepository.findOne.mockResolvedValue(null);
      mockOrganizationMembershipRepository.create.mockReturnValue({});
      mockOrganizationMembershipRepository.save.mockResolvedValue({});

      mockWorkspaceRepository.findOne.mockResolvedValue(null);
      mockWorkspaceRepository.create.mockReturnValue({ id: 'ws-1', name: 'Emergency Operations' });
      mockWorkspaceRepository.save.mockResolvedValue({ id: 'ws-1', name: 'Emergency Operations' });

      mockWorkspaceMembershipRepository.findOne.mockResolvedValue(null);
      mockWorkspaceMembershipRepository.create.mockReturnValue({});
      mockWorkspaceMembershipRepository.save.mockResolvedValue({});

      mockJwtService.sign.mockReturnValue('signed-token');

      await service.createDevSession('127.0.0.1', 'test-agent');

      const installedPackIds = mockPlatformAssetsService.installPackForOrganization.mock.calls.map(
        (call) => call[1],
      );
      expect(mockPlatformAssetsService.installPackForOrganization).toHaveBeenCalled();
      expect(
        mockPlatformAssetsService.installPackForOrganization.mock.calls.every(
          (call) => call[0] === organization.id,
        ),
      ).toBe(true);
      // Matches DEFAULT_PACKS_BY_ORGANIZATION_TYPE[HOSPITAL], which already
      // includes 'core-platform' -- the fix also unconditionally adds it in
      // case a future org type's defaults ever omit it.
      expect(installedPackIds).toEqual(
        expect.arrayContaining([
          'core-platform',
          'reception-desk',
          'emergency-medicine',
          'laboratory-intelligence',
          'hospital-operations',
        ]),
      );
    });

    it('heals an unqualified dev sign-in out of the permission-less student role a persona preview left behind', async () => {
      // There is ONE singleton dev user, so the role a persona switch writes
      // sticks in the database forever. read_only_viewer/public_display both
      // map to UserRole.STUDENT, which carries no clinical permissions -- so
      // once anyone previewed the waiting-room wall, every later plain "Enter
      // CareDroid now" (which sends no roleProfileId) signed back in as that
      // permission-less user and the ED routes 403'd on every load.
      // Confirmed live before the fix: POST /api/auth/dev-session returned
      // role 'student' with a stuck roleProfileId of 'public_display'.
      process.env.ENABLE_DEV_AUTH_BYPASS = 'true';

      const profile = { userId: 'dev-user-stuck', roleProfileId: 'public_display' };
      const devUser = {
        id: 'dev-user-stuck',
        email: 'dev@caredroid.local',
        role: 'student',
        profile,
        subscription: { tier: 'enterprise' },
        twoFactor: null,
      };

      mockUserRepository.findOne.mockResolvedValue(devUser);
      mockUserRepository.save.mockImplementation(async (entity) => entity);
      mockProfileRepository.save.mockImplementation(async (entity) => entity);
      mockOrganizationRepository.findOne.mockResolvedValue({
        id: 'org-1',
        organizationType: 'hospital',
      });
      mockOrganizationMembershipRepository.findOne.mockResolvedValue({ id: 'om-1' });
      mockWorkspaceRepository.findOne.mockResolvedValue({
        id: 'ws-1',
        name: 'Emergency Operations',
      });
      mockWorkspaceMembershipRepository.findOne.mockResolvedValue({ id: 'wm-1' });
      mockJwtService.sign.mockReturnValue('signed-token');

      await service.createDevSession('127.0.0.1', 'test-agent');

      expect(devUser.role).toBe('physician');
      expect(profile.roleProfileId).toBeNull();
    });

    it('still honours an explicitly requested low-privilege persona', async () => {
      // The heal above must not make the public-wall/read-only personas
      // unreachable -- a qualified call still wins.
      process.env.ENABLE_DEV_AUTH_BYPASS = 'true';

      const profile = { userId: 'dev-user-switch', roleProfileId: 'physician' };
      const devUser = {
        id: 'dev-user-switch',
        email: 'dev@caredroid.local',
        role: 'physician',
        profile,
        subscription: { tier: 'enterprise' },
        twoFactor: null,
      };

      mockUserRepository.findOne.mockResolvedValue(devUser);
      mockUserRepository.save.mockImplementation(async (entity) => entity);
      mockProfileRepository.save.mockImplementation(async (entity) => entity);
      mockOrganizationRepository.findOne.mockResolvedValue({
        id: 'org-1',
        organizationType: 'hospital',
      });
      mockOrganizationMembershipRepository.findOne.mockResolvedValue({ id: 'om-1' });
      mockWorkspaceRepository.findOne.mockResolvedValue({
        id: 'ws-1',
        name: 'Emergency Operations',
      });
      mockWorkspaceMembershipRepository.findOne.mockResolvedValue({ id: 'wm-1' });
      mockJwtService.sign.mockReturnValue('signed-token');

      await service.createDevSession('127.0.0.1', 'test-agent', 'public_display');

      expect(devUser.role).toBe('student');
      expect(profile.roleProfileId).toBe('public_display');
    });

    it('seeds a freshly-created dev user with an Enterprise subscription, not Free (HEAL-079)', async () => {
      // Regression: the dev user was previously seeded at SubscriptionTier.FREE,
      // which caused every subscription-gated AI feature (e.g. POST /api/ai/node,
      // which requires 'professional'+) to 403 for the dev/demo bypass session --
      // a local dev session should be able to exercise every feature, not hit
      // real SaaS billing paywalls.
      process.env.ENABLE_DEV_AUTH_BYPASS = 'true';

      const devUser = {
        id: 'dev-user-3',
        email: 'dev@caredroid.local',
        role: 'physician',
        profile: null,
        subscription: null,
        twoFactor: null,
      };
      const organization = { id: 'org-3', organizationType: 'hospital' };

      mockUserRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(devUser);
      mockUserRepository.create.mockReturnValue(devUser);
      mockUserRepository.save.mockResolvedValue(devUser);
      mockProfileRepository.create.mockReturnValue({ userId: devUser.id });
      mockProfileRepository.save.mockResolvedValue({ userId: devUser.id });
      mockProfileRepository.findOne.mockResolvedValue(null);
      mockSubscriptionRepository.create.mockReturnValue({ userId: devUser.id, tier: 'enterprise' });
      mockSubscriptionRepository.save.mockResolvedValue({ userId: devUser.id, tier: 'enterprise' });
      mockSubscriptionRepository.findOne.mockResolvedValue(null);
      mockOrganizationRepository.findOne.mockResolvedValue(null);
      mockOrganizationRepository.create.mockReturnValue(organization);
      mockOrganizationRepository.save.mockResolvedValue(organization);
      mockOrganizationMembershipRepository.findOne.mockResolvedValue(null);
      mockOrganizationMembershipRepository.create.mockReturnValue({});
      mockOrganizationMembershipRepository.save.mockResolvedValue({});
      mockWorkspaceRepository.findOne.mockResolvedValue(null);
      mockWorkspaceRepository.create.mockReturnValue({ id: 'ws-3', name: 'Emergency Operations' });
      mockWorkspaceRepository.save.mockResolvedValue({ id: 'ws-3', name: 'Emergency Operations' });
      mockWorkspaceMembershipRepository.findOne.mockResolvedValue(null);
      mockWorkspaceMembershipRepository.create.mockReturnValue({});
      mockWorkspaceMembershipRepository.save.mockResolvedValue({});
      mockJwtService.sign.mockReturnValue('signed-token');

      await service.createDevSession('127.0.0.1', 'test-agent');

      expect(mockSubscriptionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: devUser.id, tier: 'enterprise' }),
      );
    });

    it('self-heals an existing dev user whose subscription is still on the old Free default', async () => {
      process.env.ENABLE_DEV_AUTH_BYPASS = 'true';

      const existingSubscription = { userId: 'dev-user-4', tier: 'free' };
      const devUser = {
        id: 'dev-user-4',
        email: 'dev@caredroid.local',
        role: 'physician',
        profile: { userId: 'dev-user-4' },
        subscription: existingSubscription,
        twoFactor: null,
      };

      mockUserRepository.findOne.mockResolvedValue(devUser);
      mockUserRepository.save.mockResolvedValue(devUser);
      mockSubscriptionRepository.save.mockImplementation((sub: any) => Promise.resolve(sub));
      mockOrganizationRepository.findOne.mockResolvedValue({
        id: 'org-4',
        organizationType: 'hospital',
      });
      mockOrganizationMembershipRepository.findOne.mockResolvedValue({ id: 'mem-4' });
      mockWorkspaceRepository.findOne.mockResolvedValue({
        id: 'ws-4',
        name: 'Emergency Operations',
      });
      mockWorkspaceMembershipRepository.findOne.mockResolvedValue({ id: 'wmem-4' });
      mockJwtService.sign.mockReturnValue('signed-token');

      await service.createDevSession('127.0.0.1', 'test-agent');

      expect(mockSubscriptionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'dev-user-4', tier: 'enterprise' }),
      );
    });

    it('does not throw when platformAssetsService is unavailable (optional dependency)', async () => {
      process.env.ENABLE_DEV_AUTH_BYPASS = 'true';

      const devUser = {
        id: 'dev-user-2',
        email: 'dev@caredroid.local',
        role: 'physician',
        profile: null,
        subscription: null,
        twoFactor: null,
      };
      const organization = { id: 'org-2', organizationType: 'hospital' };

      mockUserRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(devUser);
      mockUserRepository.create.mockReturnValue(devUser);
      mockUserRepository.save.mockResolvedValue(devUser);
      mockProfileRepository.create.mockReturnValue({ userId: devUser.id });
      mockProfileRepository.save.mockResolvedValue({ userId: devUser.id });
      mockProfileRepository.findOne.mockResolvedValue(null);
      mockSubscriptionRepository.create.mockReturnValue({ userId: devUser.id, tier: 'free' });
      mockSubscriptionRepository.save.mockResolvedValue({ userId: devUser.id, tier: 'free' });
      mockSubscriptionRepository.findOne.mockResolvedValue(null);
      mockOrganizationRepository.findOne.mockResolvedValue(null);
      mockOrganizationRepository.create.mockReturnValue(organization);
      mockOrganizationRepository.save.mockResolvedValue(organization);
      mockOrganizationMembershipRepository.findOne.mockResolvedValue(null);
      mockOrganizationMembershipRepository.create.mockReturnValue({});
      mockOrganizationMembershipRepository.save.mockResolvedValue({});
      mockWorkspaceRepository.findOne.mockResolvedValue(null);
      mockWorkspaceRepository.create.mockReturnValue({ id: 'ws-2', name: 'Emergency Operations' });
      mockWorkspaceRepository.save.mockResolvedValue({ id: 'ws-2', name: 'Emergency Operations' });
      mockWorkspaceMembershipRepository.findOne.mockResolvedValue(null);
      mockWorkspaceMembershipRepository.create.mockReturnValue({});
      mockWorkspaceMembershipRepository.save.mockResolvedValue({});
      mockJwtService.sign.mockReturnValue('signed-token');

      const withoutPlatformAssets = new (service.constructor as any)(
        mockUserRepository,
        mockProfileRepository,
        mockOauthRepository,
        mockSubscriptionRepository,
        mockOrganizationRepository,
        mockOrganizationMembershipRepository,
        mockWorkspaceRepository,
        mockWorkspaceMembershipRepository,
        mockJwtService,
        mockConfigService,
        mockAuditService,
        mockTwoFactorService,
        mockEncryptionService,
        mockEmailService,
        undefined,
      );

      await expect(
        withoutPlatformAssets.createDevSession('127.0.0.1', 'test-agent'),
      ).resolves.toBeDefined();
    });
  });

  describe('register', () => {
    it('should create new user and return tokens', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'password123',
        fullName: 'John Doe',
        role: UserRole.ADMIN,
      };

      const hashedPassword = '$2b$10$hashedpassword';
      const newUser: {
        id: string;
        email: string;
        password: string;
        emailVerified: boolean;
        isActive: boolean;
        role: string;
        emailEncrypted?: Buffer;
        phiFieldsEncrypted?: boolean;
      } = {
        id: '2',
        email: registerDto.email,
        password: hashedPassword,
        emailVerified: false,
        isActive: true,
        role: 'student',
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUserRepository.create.mockReturnValue(newUser);
      mockUserRepository.save.mockResolvedValue(newUser);
      mockProfileRepository.create.mockReturnValue({});
      mockProfileRepository.save.mockResolvedValue({});
      mockSubscriptionRepository.create.mockReturnValue({});
      mockSubscriptionRepository.save.mockResolvedValue({});
      mockJwtService.sign.mockReturnValue('test-token');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('verificationRequired', true);
      expect(result).not.toHaveProperty('verificationToken');
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.STUDENT }),
      );
      expect(mockUserRepository.save).toHaveBeenCalled();

      // Encrypted at-rest copy must be populated before save, without
      // touching the plaintext email used for login lookups.
      expect(mockEncryptionService.encryptToBuffer).toHaveBeenCalledWith(registerDto.email);
      expect(newUser.emailEncrypted).toEqual(Buffer.from(`encrypted:${registerDto.email}`));
      expect(newUser.phiFieldsEncrypted).toBe(true);
      expect(newUser.email).toBe(registerDto.email);
    });

    it('should throw error when email already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'password123',
        fullName: 'John Doe',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow('Email already registered');
    });
  });
});

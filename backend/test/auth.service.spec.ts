import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/modules/auth/auth.service';
import { UsersService } from '../src/modules/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { UserProfile } from '../src/modules/users/entities/user-profile.entity';
import { OAuthAccount } from '../src/modules/users/entities/oauth-account.entity';
import { Subscription } from '../src/modules/subscriptions/entities/subscription.entity';
import { AuditService } from '../src/modules/audit/audit.service';
import { TwoFactorService } from '../src/modules/two-factor/two-factor.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let _usersService: UsersService;
  let _jwtService: JwtService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockProfileRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockOAuthRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockSubscriptionRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('test-token'),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        JWT_ACCESS_SECRET: 'test-access-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      if (key === 'jwt') {
        return {
          accessTokenExpiry: '15m',
          refreshTokenExpiry: '7d',
        };
      }
      return values[key];
    }),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockTwoFactorService = {
    verifyToken: jest.fn().mockResolvedValue(true),
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
          useValue: mockOAuthRepository,
        },
        {
          provide: getRepositoryToken(Subscription),
          useValue: mockSubscriptionRepository,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: TwoFactorService,
          useValue: mockTwoFactorService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    _jwtService = module.get<JwtService>(JwtService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should create a new user with hashed password', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({ id: '1', ...registerDto });
      mockUserRepository.save.mockResolvedValue({ id: '1', email: registerDto.email });
      mockProfileRepository.create.mockReturnValue({});
      mockProfileRepository.save.mockResolvedValue({});
      mockSubscriptionRepository.create.mockReturnValue({});
      mockSubscriptionRepository.save.mockResolvedValue({});

      const result = await service.register(registerDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(result).toHaveProperty('userId', '1');
    });

    it('should throw error if email already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'password123',
        fullName: 'Existing User',
      };

      mockUserRepository.findOne.mockResolvedValue({ id: '1', email: registerDto.email });

      await expect(service.register(registerDto)).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should return tokens if credentials are valid', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        isActive: true,
        twoFactor: null,
      };

      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.login(
        { email: 'test@example.com', password: 'password123' },
        '127.0.0.1',
        'test-agent',
      );

      const tokenResult = result as Extract<typeof result, { accessToken: string }>;
      expect(tokenResult).toHaveProperty('accessToken');
      expect(tokenResult.user).toHaveProperty('id', '1');
      expect(tokenResult.user).not.toHaveProperty('passwordHash');
    });

    it('should return null if credentials are invalid', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login(
          { email: 'test@example.com', password: 'wrongpassword' },
          '127.0.0.1',
          'test-agent',
        ),
      ).rejects.toThrow('Invalid credentials');
    });
  });
});

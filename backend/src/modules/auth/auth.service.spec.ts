import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { OAuthAccount } from '../users/entities/oauth-account.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { AuditService } from '../audit/audit.service';
import { TwoFactorService } from '../two-factor/two-factor.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

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
  };

  const mockOauthRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockSubscriptionRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockTwoFactorService = {
    isTwoFactorEnabled: jest.fn().mockResolvedValue(false),
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
          useValue: mockOauthRepository,
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
    jwtService = module.get<JwtService>(JwtService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
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
        default:
          return undefined;
      }
    });
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

  describe('register', () => {
    it('should create new user and return tokens', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'password123',
        fullName: 'John Doe',
      };

      const hashedPassword = '$2b$10$hashedpassword';
      const newUser = {
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
      expect(result).toHaveProperty('verificationToken');
      expect(mockUserRepository.save).toHaveBeenCalled();
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

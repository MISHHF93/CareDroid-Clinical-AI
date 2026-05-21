import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/modules/auth/auth.service';
import { UsersService } from '../src/modules/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { AuditService } from '../src/modules/audit/audit.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        UsersService,
        JwtService,
        ConfigService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
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

      const result = await service.register(registerDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
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
        password: await bcrypt.hash('password123', 10),
      };

      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.login(
        { email: 'test@example.com', password: 'password123' },
        '127.0.0.1',
        'test-agent',
      );

      expect(result).toHaveProperty('id', '1');
      expect(result).not.toHaveProperty('password');
    });

    it('should return null if credentials are invalid', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.login(
        { email: 'test@example.com', password: 'wrongpassword' },
        '127.0.0.1',
        'test-agent',
      );

      expect(result).toBeNull();
    });
  });
});

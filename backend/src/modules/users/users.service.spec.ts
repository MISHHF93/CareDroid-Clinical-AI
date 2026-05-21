import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<User>;
  let profileRepository: Repository<UserProfile>;

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockProfileRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: mockProfileRepository,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    profileRepository = module.get<Repository<UserProfile>>(getRepositoryToken(UserProfile));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      const userId = '1';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        profile: { fullName: 'Test User' },
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(userId);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['profile', 'subscription'],
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const userId = '1';
      const updateData = { fullName: 'Updated Name' };
      const mockProfile = { id: '1', userId, fullName: 'Old Name' };
      const mockUpdatedProfile = { ...mockProfile, ...updateData };

      mockProfileRepository.findOne.mockResolvedValue(mockProfile);
      mockProfileRepository.save.mockResolvedValue(mockUpdatedProfile);

      const result = await service.updateProfile(userId, updateData);

      expect(mockProfileRepository.findOne).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(mockProfileRepository.save).toHaveBeenCalledWith({
        ...mockProfile,
        ...updateData,
      });
      expect(result).toEqual(mockUpdatedProfile);
    });

    it('should throw error if profile not found', async () => {
      mockProfileRepository.findOne.mockResolvedValue(null);

      await expect(service.updateProfile('non-existent', {})).rejects.toThrow('Profile not found');
    });
  });
});

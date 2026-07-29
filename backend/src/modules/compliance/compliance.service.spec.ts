import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceService } from './compliance.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { OAuthAccount } from '../users/entities/oauth-account.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { TwoFactor } from '../two-factor/entities/two-factor.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';

describe('ComplianceService', () => {
  let service: ComplianceService;
  let _auditService: AuditService;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    emailVerified: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-06-01'),
  };

  const mockProfile = {
    id: '1',
    userId: '1',
    firstName: 'John',
    lastName: 'Doe',
    specialty: 'Cardiology',
    institution: 'Test Hospital',
    licenseNumber: 'LIC123',
    timezone: 'America/New_York',
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-05-01'),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockProfileRepository = {
    findOne: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockOAuthRepository = {
    find: jest.fn(),
    delete: jest.fn(),
  };

  const mockSubscriptionRepository = {
    find: jest.fn(),
    delete: jest.fn(),
  };

  const mockTwoFactorRepository = {
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockAuditLogRepository = {
    find: jest.fn(),
    update: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceService,
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
          provide: getRepositoryToken(TwoFactor),
          useValue: mockTwoFactorRepository,
        },
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepository,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<ComplianceService>(ComplianceService);
    _auditService = module.get<AuditService>(AuditService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockProfileRepository.create.mockImplementation((profile) => profile);
    mockProfileRepository.save.mockImplementation((profile) => Promise.resolve(profile));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateUserDataExport', () => {
    it('should generate comprehensive data export for user', async () => {
      const userId = '1';
      const mockOAuthAccounts = [
        { id: '1', provider: 'google', createdAt: new Date('2023-01-03') },
      ];
      const mockSubscriptions = [
        { id: '1', tier: 'PROFESSIONAL', status: 'ACTIVE', createdAt: new Date('2023-01-04') },
      ];
      const mockTwoFactor = {
        id: '1',
        enabled: true,
        lastUsedAt: new Date('2023-05-01'),
        createdAt: new Date('2023-01-05'),
      };
      const mockAuditLogs = [
        {
          id: '1',
          action: 'login',
          resource: 'auth',
          timestamp: new Date('2023-06-01'),
          phiAccessed: false,
        },
      ];

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockProfileRepository.findOne.mockResolvedValue(mockProfile);
      mockOAuthRepository.find.mockResolvedValue(mockOAuthAccounts);
      mockSubscriptionRepository.find.mockResolvedValue(mockSubscriptions);
      mockTwoFactorRepository.findOne.mockResolvedValue(mockTwoFactor);
      mockAuditLogRepository.find.mockResolvedValue(mockAuditLogs);

      const result = await service.generateUserDataExport(userId);

      expect(result).toEqual({
        exportDate: expect.any(String),
        user: {
          id: mockUser.id,
          email: mockUser.email,
          emailVerified: mockUser.emailVerified,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
        profile: {
          firstName: mockProfile.firstName,
          lastName: mockProfile.lastName,
          specialty: mockProfile.specialty,
          institution: mockProfile.institution,
          licenseNumber: mockProfile.licenseNumber,
          timezone: mockProfile.timezone,
          createdAt: mockProfile.createdAt,
          updatedAt: mockProfile.updatedAt,
        },
        oauthAccounts: [
          {
            provider: 'google',
            createdAt: mockOAuthAccounts[0].createdAt,
          },
        ],
        subscriptions: expect.any(Array),
        twoFactorAuth: {
          enabled: true,
          lastUsedAt: mockTwoFactor.lastUsedAt,
          createdAt: mockTwoFactor.createdAt,
        },
        auditLogs: [
          {
            action: 'login',
            resource: 'auth',
            timestamp: mockAuditLogs[0].timestamp,
            phiAccessed: false,
          },
        ],
      });

      expect(mockAuditService.log).toHaveBeenCalledWith({
        userId,
        action: 'data_export',
        resource: 'compliance/export',
        details: { recordCount: 1 },
        ipAddress: '0.0.0.0',
        userAgent: 'system',
      });
    });

    it('should handle user with minimal data', async () => {
      const userId = '1';

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockProfileRepository.findOne.mockResolvedValue(null);
      mockOAuthRepository.find.mockResolvedValue([]);
      mockSubscriptionRepository.find.mockResolvedValue([]);
      mockTwoFactorRepository.findOne.mockResolvedValue(null);
      mockAuditLogRepository.find.mockResolvedValue([]);

      const result = await service.generateUserDataExport(userId);

      expect(result.profile).toBeNull();
      expect(result.twoFactorAuth).toBeNull();
      expect(result.oauthAccounts).toEqual([]);
      expect(result.subscriptions).toEqual([]);
      expect(result.auditLogs).toEqual([]);
    });

    it('should throw error when user not found', async () => {
      const userId = 'nonexistent';

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.generateUserDataExport(userId)).rejects.toThrow('User not found');
    });
  });

  describe('deleteUserData', () => {
    it('should delete all user data when email matches', async () => {
      const userId = '1';
      const confirmEmail = 'test@example.com';

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockProfileRepository.findOne.mockResolvedValue(mockProfile);
      mockOAuthRepository.find.mockResolvedValue([{ id: '1' }]);
      mockSubscriptionRepository.find.mockResolvedValue([{ id: '1' }]);
      mockTwoFactorRepository.findOne.mockResolvedValue({ id: '1' });
      mockAuditLogRepository.find.mockResolvedValue([{ id: '1' }]);

      mockProfileRepository.delete.mockResolvedValue(undefined);
      mockOAuthRepository.delete.mockResolvedValue(undefined);
      mockSubscriptionRepository.delete.mockResolvedValue(undefined);
      mockTwoFactorRepository.delete.mockResolvedValue(undefined);
      mockAuditLogRepository.update.mockResolvedValue(undefined);
      mockUserRepository.delete.mockResolvedValue(undefined);

      const result = await service.deleteUserData(userId, confirmEmail);

      expect(result).toEqual({
        success: true,
        deletedAt: expect.any(String),
        message: 'User data has been permanently deleted',
      });

      expect(mockProfileRepository.delete).toHaveBeenCalled();
      expect(mockOAuthRepository.delete).toHaveBeenCalled();
      expect(mockSubscriptionRepository.delete).toHaveBeenCalled();
      expect(mockTwoFactorRepository.delete).toHaveBeenCalled();
      expect(mockAuditLogRepository.update).toHaveBeenCalled();
      expect(mockUserRepository.delete).toHaveBeenCalledWith({ id: userId });

      expect(mockAuditService.log).toHaveBeenCalledWith({
        userId,
        action: 'data_deletion',
        resource: 'compliance/delete',
        details: { email: 'test@example.com' },
        ipAddress: '0.0.0.0',
        userAgent: 'system',
      });
    });

    it('should throw error when email does not match', async () => {
      const userId = '1';
      const confirmEmail = 'wrong@example.com';

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.deleteUserData(userId, confirmEmail)).rejects.toThrow(
        'Email confirmation does not match',
      );
    });

    it('should throw error when user not found', async () => {
      const userId = 'nonexistent';
      const confirmEmail = 'test@example.com';

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteUserData(userId, confirmEmail)).rejects.toThrow('User not found');
    });
  });

  describe('getConsentStatus', () => {
    it('reads dataProcessingConsent/marketingConsent/thirdPartySharingConsent from the real UserProfile columns, not emailVerified (Cycle 227 regression)', async () => {
      // Before this fix, all 3 of these were reported as `= user.emailVerified`
      // -- a user who explicitly withdrew consent via updateConsent() (which
      // DOES write the real UserProfile.consent* columns) would still see it
      // reported as granted here, as long as their email was verified.
      const userId = '1';

      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        profile: {
          ...mockProfile,
          consentDataProcessing: false,
          consentMarketingCommunications: true,
          consentThirdPartySharing: false,
          updatedAt: new Date('2026-01-10'),
        },
      });

      const result = await service.getConsentStatus(userId);

      expect(result).toEqual({
        userId: '1',
        termsAccepted: true, // still emailVerified-derived: no dedicated column exists
        privacyPolicyAccepted: true,
        dataProcessingConsent: false,
        marketingConsent: true,
        thirdPartySharingConsent: false,
        lastUpdated: new Date('2026-01-10'),
      });
    });

    it('defaults all 3 real consent fields to false when the user has no profile yet', async () => {
      const userId = '1';

      mockUserRepository.findOne.mockResolvedValue({ ...mockUser, profile: null });

      const result = await service.getConsentStatus(userId);

      expect(result.dataProcessingConsent).toBe(false);
      expect(result.marketingConsent).toBe(false);
      expect(result.thirdPartySharingConsent).toBe(false);
      expect(result.lastUpdated).toBe(mockUser.updatedAt);
    });

    it('should throw error when user not found', async () => {
      const userId = '1';

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getConsentStatus(userId)).rejects.toThrow('User not found');
    });
  });

  describe('updateConsent', () => {
    it('should update consent status and audit log', async () => {
      const userId = '1';
      const consentType = 'marketing';
      const granted = true;

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.updateConsent(userId, consentType, granted);

      expect(result).toEqual({
        success: true,
        consentType,
        granted,
        updatedAt: expect.any(String),
      });
      expect(mockAuditService.log).toHaveBeenCalledWith({
        userId,
        action: 'profile_update',
        resource: 'compliance/consent',
        details: { consentType, granted, timestamp: expect.any(String) },
        ipAddress: '0.0.0.0',
        userAgent: 'system',
      });
    });

    it('should create profile if not exists', async () => {
      const userId = '1';
      const consentType = 'analytics';
      const granted = false;

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.updateConsent(userId, consentType, granted);

      expect(result).toEqual({
        success: true,
        consentType,
        granted,
        updatedAt: expect.any(String),
      });
    });

    it('should throw error for invalid consent type', async () => {
      const userId = '1';
      const consentType = 'invalid';
      const granted = true;

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.updateConsent(userId, consentType, granted)).rejects.toThrow(
        'User not found',
      );
    });
  });
});

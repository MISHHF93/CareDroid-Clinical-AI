import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';

describe('AuditService', () => {
  let service: AuditService;
  let mockUpdateQueryBuilder: {
    update: jest.Mock;
    set: jest.Mock;
    execute: jest.Mock;
  };

  const mockAuditRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockAuditLog = {
    id: '1',
    userId: '1',
    action: AuditAction.LOGIN,
    resource: 'auth',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    timestamp: new Date(),
    phiAccessed: false,
    metadata: { sessionId: 'test123' },
    details: { userAgent: 'Chrome' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditRepository,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuditRepository.find.mockResolvedValue([]);
    mockUpdateQueryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
    };
    mockAuditRepository.createQueryBuilder.mockReturnValue(mockUpdateQueryBuilder);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create and save audit log entry', async () => {
      const logData = {
        userId: '1',
        action: AuditAction.LOGIN,
        resource: 'auth',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        phiAccessed: false,
        metadata: { sessionId: 'test123' },
        details: { userAgent: 'Chrome' },
      };

      mockAuditRepository.create.mockReturnValue({
        ...logData,
        timestamp: expect.any(Date),
      });
      mockAuditRepository.save.mockResolvedValue(mockAuditLog);

      const result = await service.log(logData);

      expect(mockAuditRepository.create).toHaveBeenCalledWith({
        ...logData,
        timestamp: expect.any(Date),
        hash: expect.any(String),
        previousHash: '0',
        integrityVerified: true,
      });
      expect(mockAuditRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockAuditLog);
    });

    it('should create audit log without optional fields', async () => {
      const logData = {
        action: AuditAction.SECURITY_EVENT,
        resource: 'system',
        ipAddress: '0.0.0.0',
        userAgent: 'system',
      };

      mockAuditRepository.create.mockReturnValue({
        ...logData,
        timestamp: expect.any(Date),
      });
      mockAuditRepository.save.mockResolvedValue({
        ...logData,
        timestamp: new Date(),
      });

      const result = await service.log(logData);

      expect(mockAuditRepository.create).toHaveBeenCalledWith({
        ...logData,
        timestamp: expect.any(Date),
        hash: expect.any(String),
        previousHash: '0',
        integrityVerified: true,
      });
      expect(result).toBeDefined();
    });

    it('should handle PHI access logging', async () => {
      const logData = {
        userId: '1',
        action: AuditAction.PHI_ACCESS,
        resource: 'patient/123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        phiAccessed: true,
        metadata: { patientId: '123' },
      };

      mockAuditRepository.create.mockReturnValue({
        ...logData,
        timestamp: expect.any(Date),
      });
      mockAuditRepository.save.mockResolvedValue({
        ...mockAuditLog,
        ...logData,
      });

      const result = await service.log(logData);

      expect(mockAuditRepository.create).toHaveBeenCalledWith({
        ...logData,
        timestamp: expect.any(Date),
        hash: expect.any(String),
        previousHash: '0',
        integrityVerified: true,
      });
      expect(result.phiAccessed).toBe(true);
    });
  });

  describe('findByUser', () => {
    it('should find audit logs for a user with default limit', async () => {
      const userId = '1';
      const mockLogs = [mockAuditLog];

      mockAuditRepository.find.mockResolvedValue(mockLogs);

      const result = await service.findByUser(userId);

      expect(mockAuditRepository.find).toHaveBeenCalledWith({
        where: { userId },
        order: { timestamp: 'DESC' },
        take: 100,
      });
      expect(result).toEqual(mockLogs);
    });

    it('should find audit logs for a user with custom limit', async () => {
      const userId = '1';
      const limit = 50;
      const mockLogs = [mockAuditLog];

      mockAuditRepository.find.mockResolvedValue(mockLogs);

      const result = await service.findByUser(userId, limit);

      expect(mockAuditRepository.find).toHaveBeenCalledWith({
        where: { userId },
        order: { timestamp: 'DESC' },
        take: limit,
      });
      expect(result).toEqual(mockLogs);
    });

    it('should scope audit logs for a user by organization when provided', async () => {
      const userId = '1';
      const organizationId = 'org-a';
      const mockLogs = [{ ...mockAuditLog, organizationId }];

      mockAuditRepository.find.mockResolvedValue(mockLogs);

      const result = await service.findByUser(userId, 100, organizationId);

      expect(mockAuditRepository.find).toHaveBeenCalledWith({
        where: { userId, organizationId },
        order: { timestamp: 'DESC' },
        take: 100,
      });
      expect(result).toEqual(mockLogs);
    });

    it('should return empty array when no logs found', async () => {
      const userId = 'nonexistent';

      mockAuditRepository.find.mockResolvedValue([]);

      const result = await service.findByUser(userId);

      expect(result).toEqual([]);
    });
  });

  describe('findPhiAccess', () => {
    it('should find PHI access logs within date range', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');
      const mockPhiLogs = [
        {
          ...mockAuditLog,
          action: AuditAction.PHI_ACCESS,
          phiAccessed: true,
        },
      ];

      mockAuditRepository.find.mockResolvedValue(mockPhiLogs);

      const result = await service.findPhiAccess(startDate, endDate);

      expect(mockAuditRepository.find).toHaveBeenCalledWith({
        where: {
          phiAccessed: true,
        },
        order: { timestamp: 'DESC' },
      });
      expect(result).toEqual(mockPhiLogs);
    });

    it('should return empty array when no PHI access found', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      mockAuditRepository.find.mockResolvedValue([]);

      const result = await service.findPhiAccess(startDate, endDate);

      expect(result).toEqual([]);
    });

    it('should scope PHI access logs by organization when provided', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');
      const organizationId = 'org-a';

      mockAuditRepository.find.mockResolvedValue([]);

      await service.findPhiAccess(startDate, endDate, organizationId);

      expect(mockAuditRepository.find).toHaveBeenCalledWith({
        where: {
          phiAccessed: true,
          organizationId,
        },
        order: { timestamp: 'DESC' },
      });
    });
  });

  describe('audit action types', () => {
    it('should handle all audit action types', async () => {
      const actions = [
        AuditAction.LOGIN,
        AuditAction.LOGOUT,
        AuditAction.REGISTRATION,
        AuditAction.PASSWORD_CHANGE,
        AuditAction.EMAIL_VERIFICATION,
        AuditAction.TWO_FACTOR_ENABLE,
        AuditAction.TWO_FACTOR_DISABLE,
        AuditAction.SUBSCRIPTION_CHANGE,
        AuditAction.DATA_EXPORT,
        AuditAction.DATA_DELETION,
        AuditAction.PHI_ACCESS,
        AuditAction.AI_QUERY,
        AuditAction.CLINICAL_DATA_ACCESS,
        AuditAction.SECURITY_EVENT,
        AuditAction.PROFILE_UPDATE,
      ];

      for (const action of actions) {
        const logData = {
          userId: '1',
          action,
          resource: 'test',
          ipAddress: '192.168.1.1',
          userAgent: 'test',
        };

        mockAuditRepository.create.mockReturnValue({
          ...logData,
          timestamp: expect.any(Date),
        });
        mockAuditRepository.save.mockResolvedValue({
          ...logData,
          timestamp: new Date(),
        });

        await service.log(logData);

        expect(mockAuditRepository.create).toHaveBeenCalledWith({
          ...logData,
          timestamp: expect.any(Date),
          hash: expect.any(String),
          previousHash: '0',
          integrityVerified: true,
        });
      }
    });
  });

  describe('hash chaining and integrity verification', () => {
    it('should calculate hash for audit log entries', async () => {
      const logData = {
        userId: '1',
        action: AuditAction.LOGIN,
        resource: 'auth',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      // Mock the create and save to include hash fields
      const timestamp = new Date();
      const logWithHash = {
        ...logData,
        timestamp,
        hash: expect.any(String),
        previousHash: '0', // Genesis block
        integrityVerified: true,
      };

      mockAuditRepository.find.mockResolvedValue([]); // No previous log
      mockAuditRepository.create.mockReturnValue(logWithHash);
      mockAuditRepository.save.mockResolvedValue(logWithHash);

      const result = await service.log(logData);

      expect(result.hash).toBeDefined();
      expect(result.previousHash).toBe('0'); // First entry
      expect(result.integrityVerified).toBe(true);
    });

    it('should chain hashes from previous audit log', async () => {
      const previousLog = {
        id: '1',
        hash: 'abc123def456',
        timestamp: new Date(),
      };

      const newLogData = {
        userId: '2',
        action: AuditAction.LOGIN,
        resource: 'auth',
        ipAddress: '192.168.1.2',
        userAgent: 'Chrome',
      };

      mockAuditRepository.find.mockResolvedValue([previousLog]);
      mockAuditRepository.create.mockImplementation((data) => data);
      mockAuditRepository.save.mockImplementation((log) =>
        Promise.resolve({
          ...log,
          id: '2',
        }),
      );

      const result = await service.log(newLogData);

      expect(result.previousHash).toBe(previousLog.hash);
      expect(result.hash).toBeDefined();
    });

    it('should verify integrity returns valid when no tampering', async () => {
      const timestamp1 = new Date('2023-01-01T10:00:00Z');
      const timestamp2 = new Date('2023-01-01T10:01:00Z');

      const hash1 = (service as any).calculateHash({
        userId: '1',
        action: AuditAction.LOGIN,
        resource: 'auth',
        ipAddress: '192.168.1.1',
        timestamp: timestamp1,
        previousHash: '0',
        metadata: {},
      });
      const hash2 = (service as any).calculateHash({
        userId: '1',
        action: AuditAction.LOGOUT,
        resource: 'auth',
        ipAddress: '192.168.1.1',
        timestamp: timestamp2,
        previousHash: hash1,
        metadata: {},
      });

      // Create mock logs with valid hashes
      const logs = [
        {
          id: '1',
          userId: '1',
          action: AuditAction.LOGIN,
          resource: 'auth',
          ipAddress: '192.168.1.1',
          timestamp: timestamp1,
          hash: hash1,
          previousHash: '0',
          metadata: {},
        },
        {
          id: '2',
          userId: '1',
          action: AuditAction.LOGOUT,
          resource: 'auth',
          ipAddress: '192.168.1.1',
          timestamp: timestamp2,
          hash: hash2,
          previousHash: hash1,
          metadata: {},
        },
      ];

      mockAuditRepository.find.mockResolvedValue(logs);

      const result = await service.verifyIntegrity();

      expect(result.isValid).toBe(true);
      expect(result.tamperedLogs).toEqual([]);
      expect(result.message).toContain('verified successfully');
    });

    it('should detect tampering when hash is modified', async () => {
      const timestamp = new Date('2023-01-01T10:00:00Z');

      // Create mock logs where one has been tampered with
      const logs = [
        {
          id: '1',
          userId: '1',
          action: AuditAction.LOGIN,
          resource: 'auth',
          ipAddress: '192.168.1.1',
          timestamp,
          hash: 'original_hash_123',
          previousHash: '0',
          metadata: {},
        },
        {
          id: '2',
          userId: '1',
          action: AuditAction.LOGOUT,
          resource: 'auth',
          ipAddress: '192.168.1.1',
          timestamp: new Date(timestamp.getTime() + 60000),
          hash: 'tampered_hash_456', // Modified hash
          previousHash: 'original_hash_123',
          metadata: {},
        },
      ];

      mockAuditRepository.find.mockResolvedValue(logs);

      const result = await service.verifyIntegrity();

      // The result will detect tampering due to hash mismatch
      expect(result.tamperedLogs.length).toBeGreaterThan(0);
      expect(result.message).toContain('Tampering detected');
    });

    it('should detect broken chain when previousHash does not match', async () => {
      const timestamp = new Date('2023-01-01T10:00:00Z');

      const logs = [
        {
          id: '1',
          userId: '1',
          action: AuditAction.LOGIN,
          resource: 'auth',
          ipAddress: '192.168.1.1',
          timestamp,
          hash: 'hash_1',
          previousHash: '0',
          metadata: {},
        },
        {
          id: '2',
          userId: '1',
          action: AuditAction.LOGOUT,
          resource: 'auth',
          ipAddress: '192.168.1.1',
          timestamp: new Date(timestamp.getTime() + 60000),
          hash: 'hash_2',
          previousHash: 'wrong_previous_hash', // Should be hash_1
          metadata: {},
        },
      ];

      mockAuditRepository.find.mockResolvedValue(logs);

      const result = await service.verifyIntegrity();

      expect(result.tamperedLogs.length).toBeGreaterThan(0);
      expect(result.message).toContain('Tampering detected');
    });

    it('should handle empty audit log chain', async () => {
      mockAuditRepository.find.mockResolvedValue([]);

      const result = await service.verifyIntegrity();

      expect(result.isValid).toBe(true);
      expect(result.totalLogs).toBe(0);
      expect(result.message).toContain('No audit logs');
    });

    it('should mark all logs as unverified when chain is broken', async () => {
      const timestamp = new Date('2023-01-01T10:00:00Z');

      const logs = [
        {
          id: '1',
          timestamp,
          hash: 'hash_1',
          previousHash: '0',
          metadata: {},
        },
        {
          id: '2',
          timestamp: new Date(timestamp.getTime() + 60000),
          hash: 'hash_2',
          previousHash: 'invalid', // Chain broken
          metadata: {},
        },
      ];

      mockAuditRepository.find.mockResolvedValue(logs);

      await service.verifyIntegrity();

      expect(mockUpdateQueryBuilder.update).toHaveBeenCalledWith(AuditLog);
      expect(mockUpdateQueryBuilder.set).toHaveBeenCalledWith({ integrityVerified: false });
      expect(mockUpdateQueryBuilder.execute).toHaveBeenCalled();
    });

    it('should mark all logs as verified when chain is valid', async () => {
      const timestamp = new Date('2023-01-01T10:00:00Z');

      const logs = [
        {
          id: '1',
          userId: '1',
          action: AuditAction.LOGIN,
          resource: 'auth',
          ipAddress: '192.168.1.1',
          timestamp,
          hash: 'valid_hash_1',
          previousHash: '0',
          metadata: {},
        },
      ];

      mockAuditRepository.find.mockResolvedValue(logs);

      const result = await service.verifyIntegrity();

      if (result.isValid) {
        expect(mockUpdateQueryBuilder.update).toHaveBeenCalledWith(AuditLog);
        expect(mockUpdateQueryBuilder.set).toHaveBeenCalledWith({ integrityVerified: true });
        expect(mockUpdateQueryBuilder.execute).toHaveBeenCalled();
      }
    });

    it('should return detailed tampering report', async () => {
      const timestamp = new Date('2023-01-01T10:00:00Z');

      const logs = [
        {
          id: '1',
          userId: '1',
          action: AuditAction.LOGIN,
          resource: 'auth',
          ipAddress: '192.168.1.1',
          timestamp,
          hash: 'hash_1',
          previousHash: '0',
          metadata: {},
        },
        {
          id: '2',
          userId: '1',
          action: AuditAction.LOGOUT,
          resource: 'auth',
          ipAddress: '192.168.1.1',
          timestamp: new Date(timestamp.getTime() + 60000),
          hash: 'wrong_hash', // Tampered
          previousHash: 'hash_1',
          metadata: {},
        },
      ];

      mockAuditRepository.find.mockResolvedValue(logs);

      const result = await service.verifyIntegrity();

      if (!result.isValid) {
        expect(result.tamperedLogs).toBeDefined();
        expect(Array.isArray(result.tamperedLogs)).toBe(true);
        expect(result.tamperedLogs.length).toBeGreaterThan(0);
        expect(result.tamperedLogs[0]).toContain('Log ID');
      }
    });
  });

  describe('findByAction', () => {
    it('should find logs by action type', async () => {
      const action = AuditAction.PHI_ACCESS;
      const mockLogs = [{ ...mockAuditLog, action: AuditAction.PHI_ACCESS }];

      mockAuditRepository.find.mockResolvedValue(mockLogs);

      const result = await service.findByAction(action);

      expect(mockAuditRepository.find).toHaveBeenCalledWith({
        where: { action },
        order: { timestamp: 'DESC' },
        take: 100,
      });
      expect(result).toEqual(mockLogs);
    });

    it('should find logs by action with custom limit', async () => {
      const action = AuditAction.SECURITY_EVENT;
      const limit = 50;

      mockAuditRepository.find.mockResolvedValue([]);

      await service.findByAction(action, limit);

      expect(mockAuditRepository.find).toHaveBeenCalledWith({
        where: { action },
        order: { timestamp: 'DESC' },
        take: limit,
      });
    });
  });

  describe('findByDateRange', () => {
    it('should find logs within date range', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      mockAuditRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockAuditLog]),
      });

      const result = await service.findByDateRange(startDate, endDate);

      expect(result).toBeDefined();
    });

    it('should add an organization filter for date range queries when provided', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');
      const organizationId = 'org-a';
      const query = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockAuditLog]),
      };

      mockAuditRepository.createQueryBuilder.mockReturnValue(query);

      await service.findByDateRange(startDate, endDate, organizationId);

      expect(query.andWhere).toHaveBeenCalledWith('log.organizationId = :organizationId', {
        organizationId,
      });
    });
  });

  describe('findByUserAndDateRange', () => {
    it('should find logs for user within date range', async () => {
      const userId = '1';
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      mockAuditRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockAuditLog]),
      });

      const result = await service.findByUserAndDateRange(userId, startDate, endDate);

      expect(result).toBeDefined();
    });
  });
});

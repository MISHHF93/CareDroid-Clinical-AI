import { Test, TestingModule } from '@nestjs/testing';
import { TwoFactorService } from './two-factor.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TwoFactor } from './entities/two-factor.entity';
import { User } from '../users/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';

jest.mock('speakeasy');
jest.mock('qrcode');
jest.mock('bcrypt');

describe('TwoFactorService', () => {
  let service: TwoFactorService;
  let _auditService: AuditService;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
  };

  const mockTwoFactor = {
    id: '1',
    userId: '1',
    secret: 'encrypted_secret',
    backupCodes: 'encrypted_backup_codes',
    enabled: true,
    lastUsedAt: new Date(),
  };

  const mockEntityManager = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  let pendingInsertValues: any = null;
  const insertQueryBuilder: any = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn((values: any) => {
      pendingInsertValues = values;
      return insertQueryBuilder;
    }),
    orIgnore: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
  };

  const mockTwoFactorRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(async () => pendingInsertValues),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => insertQueryBuilder),
    manager: {
      transaction: jest.fn(async (callback) => callback(mockEntityManager)),
    },
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        {
          provide: getRepositoryToken(TwoFactor),
          useValue: mockTwoFactorRepository,
        },
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

    service = module.get<TwoFactorService>(TwoFactorService);
    _auditService = module.get<AuditService>(AuditService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    pendingInsertValues = null;
    insertQueryBuilder.execute.mockResolvedValue(undefined);
    mockTwoFactorRepository.manager.transaction.mockImplementation(async (callback) =>
      callback(mockEntityManager),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSecret', () => {
    it('should generate secret and QR code for user', async () => {
      const userId = '1';
      const mockSecret = {
        base32: 'test_secret',
        otpauth_url:
          'otpauth://totp/CareDroid:test@example.com?secret=test_secret&issuer=CareDroid',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (speakeasy.generateSecret as jest.Mock).mockReturnValue(mockSecret);
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,test_qr_code');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_secret');

      mockTwoFactorRepository.findOne.mockResolvedValue(null);
      mockTwoFactorRepository.create.mockReturnValue({
        userId,
        secret: 'hashed_secret',
        enabled: false,
      });
      mockTwoFactorRepository.save.mockResolvedValue({
        userId,
        secret: 'hashed_secret',
        enabled: false,
      });

      const result = await service.generateSecret(userId);

      expect(result).toEqual({
        secret: mockSecret.base32,
        qrCode: 'data:image/png;base64,test_qr_code',
        otpauthUrl: mockSecret.otpauth_url,
      });
      const speakerEasyName = `CareDroid (${mockUser.email})`;
      expect(speakeasy.generateSecret).toHaveBeenCalledWith({
        name: speakerEasyName,
        issuer: 'CareDroid',
        length: 32,
        otpauth_url: true,
      });
    });

    it('should throw error when user not found', async () => {
      const userId = 'nonexistent';

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.generateSecret(userId)).rejects.toThrow('User not found');
    });

    it('should update existing 2FA record', async () => {
      const userId = '1';
      const mockSecret = {
        ascii: 'test_secret',
        otpauth_url:
          'otpauth://totp/CareDroid:test@example.com?secret=test_secret&issuer=CareDroid',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTwoFactorRepository.findOne.mockResolvedValue(mockTwoFactor);
      (speakeasy.generateSecret as jest.Mock).mockReturnValue(mockSecret);
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,test_qr_code');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_secret');
      mockTwoFactorRepository.save.mockResolvedValue({
        ...mockTwoFactor,
        secret: 'hashed_secret',
        enabled: false,
      });

      const result = await service.generateSecret(userId);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid TOTP token', async () => {
      const userId = '1';
      const token = '123456';

      mockTwoFactorRepository.findOne.mockResolvedValue(mockTwoFactor);
      (bcrypt.compare as jest.Mock).mockImplementation((plain, hash) => {
        if (hash === 'encrypted_secret') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      const result = await service.verifyToken(userId, token);

      expect(result).toBe(true);
      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        secret: mockTwoFactor.secret,
        encoding: 'base32',
        token,
        window: 2,
      });
      expect(mockTwoFactorRepository.save).toHaveBeenCalledWith({
        ...mockTwoFactor,
        lastUsedAt: expect.any(Date),
      });
    });

    it('should verify valid backup code', async () => {
      const userId = '1';
      const backupCode = 'backup123';
      const twoFactorWithBackup = {
        ...mockTwoFactor,
        backupCodes: ['hashed_backup1', 'hashed_backup2'],
      };

      mockTwoFactorRepository.findOne.mockResolvedValue(twoFactorWithBackup);
      mockEntityManager.findOne.mockResolvedValue({
        ...mockTwoFactor,
        backupCodes: ['hashed_backup1', 'hashed_backup2'],
      });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);
      (bcrypt.compare as jest.Mock).mockImplementation((plain, hash) => {
        return Promise.resolve(hash === 'hashed_backup1' && plain === backupCode);
      });

      const result = await service.verifyToken(userId, backupCode);

      expect(result).toBe(true);
      expect(mockEntityManager.save).toHaveBeenCalledWith(
        expect.objectContaining({ backupCodes: ['hashed_backup2'] }),
      );
    });

    it('HEAL-231: two truly concurrent verifications of the same backup code -- only one succeeds', async () => {
      // Must actually overlap the two calls (Promise.all, not sequential
      // awaits) to exercise the race at all -- two sequential calls would
      // "pass" even against the original buggy code, since the first
      // call's save always completes before the second even starts.
      //
      // manager.transaction is modeled as a serializing queue: each call
      // waits for the PREVIOUS transaction's callback to finish before its
      // own starts, exactly the ordering guarantee a real DB pessimistic
      // write lock provides. That guarantee itself is TypeORM/Postgres's
      // job, not something to reimplement here -- this test verifies the
      // application logic is correct GIVEN that guarantee: the backup-code
      // check re-reads via the transactional manager (not the outer,
      // pre-transaction `twoFactor` snapshot), so the second-to-acquire
      // transaction sees the code already removed.
      const userId = '1';
      const backupCode = 'backup123';
      let currentBackupCodes = ['hashed_backup1', 'hashed_backup2'];

      let transactionQueue = Promise.resolve();
      mockTwoFactorRepository.manager.transaction.mockImplementation((callback) => {
        const result = transactionQueue.then(() => callback(mockEntityManager));
        transactionQueue = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      });

      mockTwoFactorRepository.findOne.mockImplementation(async () => ({
        ...mockTwoFactor,
        backupCodes: currentBackupCodes,
      }));
      mockEntityManager.findOne.mockImplementation(async () => ({
        ...mockTwoFactor,
        backupCodes: currentBackupCodes,
      }));
      mockEntityManager.save.mockImplementation(async (entity) => {
        currentBackupCodes = entity.backupCodes;
        return entity;
      });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);
      (bcrypt.compare as jest.Mock).mockImplementation((plain, hash) =>
        Promise.resolve(hash === 'hashed_backup1' && plain === backupCode),
      );

      const [first, second] = await Promise.all([
        service.verifyToken(userId, backupCode),
        service.verifyToken(userId, backupCode),
      ]);

      expect([first, second].filter(Boolean)).toHaveLength(1);
      expect(currentBackupCodes).toEqual(['hashed_backup2']);
    });

    it('should return false for invalid token', async () => {
      const userId = '1';
      const token = 'invalid';

      mockTwoFactorRepository.findOne.mockResolvedValue(mockTwoFactor);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      const result = await service.verifyToken(userId, token);

      expect(result).toBe(false);
    });

    it('should return false when 2FA not enabled', async () => {
      const userId = '1';
      const token = '123456';

      mockTwoFactorRepository.findOne.mockResolvedValue(null);

      const result = await service.verifyToken(userId, token);

      expect(result).toBe(false);
    });
  });

  describe('enable', () => {
    it('should enable 2FA with valid token', async () => {
      const userId = '1';
      const token = '123456';

      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      // Mock backup code generation
      jest.spyOn(service as any, 'generateBackupCodes').mockReturnValue(['code1', 'code2']);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_backup_code');

      mockTwoFactorRepository.findOne.mockResolvedValue(null);

      const result = await service.enable(userId, 'test_secret', token);

      expect(result).toEqual({
        backupCodes: ['code1', 'code2'],
      });
      expect(mockTwoFactorRepository.createQueryBuilder).toHaveBeenCalled();
      expect(insertQueryBuilder.orIgnore).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should throw error with invalid token', async () => {
      const userId = '1';
      const token = 'invalid';

      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(service.enable(userId, 'test_secret', token)).rejects.toThrow(
        'Invalid verification code',
      );
    });

    it('should throw error when 2FA not set up', async () => {
      const userId = '1';
      const token = '123456';

      // This test doesn't make sense because enable creates 2FA, let me change it
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(service.enable(userId, 'test_secret', token)).rejects.toThrow(
        'Invalid verification code',
      );
    });

    it('updates the existing row in place when one is already present (not yet enabled)', async () => {
      const userId = '1';
      const token = '123456';

      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      jest.spyOn(service as any, 'generateBackupCodes').mockReturnValue(['code1', 'code2']);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_backup_code');

      const existingRow = { id: 'existing-id', userId, enabled: false, secret: null };
      mockTwoFactorRepository.findOne.mockResolvedValue(existingRow);
      mockTwoFactorRepository.save.mockResolvedValue({
        ...existingRow,
        enabled: true,
        secret: 'test_secret',
      });

      const result = await service.enable(userId, 'test_secret', token);

      expect(result).toEqual({ backupCodes: ['code1', 'code2'] });
      expect(mockTwoFactorRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId, enabled: true, secret: 'test_secret' }),
      );
      expect(mockTwoFactorRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    // HEAL: findOne-then-create had a TOCTOU race -- two concurrent enable()
    // calls for a user with no existing row (e.g. a double-submitted enable
    // request) could both find no row and both attempt to insert. Before
    // the new `@Index(['userId'], { unique: true })` + orIgnore()+read-back
    // fix, the loser's .save() would throw an uncaught unique-constraint
    // QueryFailedError. Now the loser's insert is a silent no-op and the
    // read-back finds the winner's row -- since only the winner's bcrypt
    // HASHES are persisted, the loser cannot honestly return working
    // plaintext codes, so it must fail the same way a second synchronous
    // call would, rather than pretend to have succeeded.
    it('fails cleanly on the losing side of a concurrent first-time enable() race', async () => {
      const userId = '1';
      const token = '123456';

      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      jest.spyOn(service as any, 'generateBackupCodes').mockReturnValue(['code1', 'code2']);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_backup_code');

      mockTwoFactorRepository.findOne.mockResolvedValue(null);
      const winningRow = {
        id: 'winning-row-id',
        userId,
        enabled: true,
        secret: 'someone-elses-secret',
      };
      insertQueryBuilder.execute.mockImplementationOnce(async () => {
        // orIgnore() means execute() never actually stores our candidate.
      });
      mockTwoFactorRepository.findOneOrFail.mockResolvedValueOnce(winningRow);

      await expect(service.enable(userId, 'test_secret', token)).rejects.toThrow(
        '2FA is already enabled',
      );
    });
  });

  describe('disable', () => {
    it('should disable 2FA with valid token', async () => {
      const userId = '1';
      const token = '123456';

      mockTwoFactorRepository.findOne.mockResolvedValue(mockTwoFactor);
      jest.spyOn(service, 'verifyToken').mockResolvedValue(true);
      mockTwoFactorRepository.remove.mockResolvedValue(undefined);

      const result = await service.disable(userId, token);

      expect(result).toEqual({ success: true });
      expect(mockTwoFactorRepository.save).toHaveBeenCalledWith({
        ...mockTwoFactor,
        enabled: false,
        secret: null,
        backupCodes: null,
      });
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should throw error with invalid token', async () => {
      const userId = '1';
      const token = 'invalid';

      mockTwoFactorRepository.findOne.mockResolvedValue({ ...mockTwoFactor, enabled: false });
      jest.spyOn(service, 'verifyToken').mockResolvedValue(false);

      await expect(service.disable(userId, token)).rejects.toThrow('2FA is not enabled');
    });

    it('should throw error when 2FA not enabled', async () => {
      const userId = '1';
      const token = '123456';

      mockTwoFactorRepository.findOne.mockResolvedValue(null);

      await expect(service.disable(userId, token)).rejects.toThrow('2FA is not enabled');
    });
  });

  describe('getStatus', () => {
    it('should return enabled status', async () => {
      const userId = '1';

      mockTwoFactorRepository.findOne.mockResolvedValue({ ...mockTwoFactor, enabled: true });

      const result = await service.getStatus(userId);

      expect(result).toEqual({
        enabled: true,
        backupCodesRemaining: 0,
        lastUsedAt: mockTwoFactor.lastUsedAt,
      });
    });

    it('should return disabled status when not set up', async () => {
      const userId = '1';

      mockTwoFactorRepository.findOne.mockResolvedValue(null);

      const result = await service.getStatus(userId);

      expect(result).toEqual({
        enabled: false,
        backupCodesRemaining: 0,
        lastUsedAt: null,
      });
    });
  });

  // HEAL-347.28: backup codes are a real second authentication factor
  // (bcrypt-hashed, single-use verified) that previously came from
  // Math.random() -- V8's non-cryptographic PRNG, whose state is
  // recoverable from a handful of observed outputs. This doesn't prove
  // cryptographic strength directly (that's crypto.randomInt's own
  // guarantee), but it pins the output contract other tests mock past:
  // 8-char uppercase alphanumeric, and no collisions across a batch large
  // enough that Math.random()-or-worse would be likely to repeat.
  describe('generateBackupCodes', () => {
    it('produces 8-character uppercase alphanumeric codes with no collisions across a large batch', () => {
      const codes: string[] = (service as any).generateBackupCodes(500);

      expect(codes).toHaveLength(500);
      for (const code of codes) {
        expect(code).toMatch(/^[0-9A-Z]{8}$/);
      }
      expect(new Set(codes).size).toBe(500);
    });
  });
});

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { randomInt, randomUUID } from 'crypto';
import { TwoFactor } from './entities/two-factor.entity';
import { User } from '../users/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

@Injectable()
export class TwoFactorService {
  constructor(
    @InjectRepository(TwoFactor)
    private readonly twoFactorRepository: Repository<TwoFactor>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  async generateSecret(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const secret = speakeasy.generateSecret({
      name: `CareDroid (${user.email})`,
      issuer: 'CareDroid',
      length: 32,
      otpauth_url: true,
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      otpauthUrl: secret.otpauth_url,
    };
  }

  async enable(userId: string, secret: string, token: string) {
    // Verify the token first
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(10);
    const hashedBackupCodes = await Promise.all(backupCodes.map((code) => bcrypt.hash(code, 10)));

    const twoFactor = await this.twoFactorRepository.findOne({ where: { userId } });

    if (twoFactor) {
      if (twoFactor.enabled) {
        throw new BadRequestException('2FA is already enabled');
      }
      twoFactor.enabled = true;
      twoFactor.secret = secret;
      twoFactor.backupCodes = hashedBackupCodes;
      await this.twoFactorRepository.save(twoFactor);
    } else {
      // HEAL: findOne-then-create above had a TOCTOU race -- two concurrent
      // enable() calls for a user with no existing row (e.g. a
      // double-submitted enable request) could both find no row and both
      // attempt to insert, and the loser's .save() would throw an uncaught
      // unique-constraint QueryFailedError (500) against the entity's new
      // `@Index(['userId'], { unique: true })`. orIgnore() relies on that
      // same index to make the losing insert a silent no-op, then reads back
      // whichever row actually won. Same pattern as
      // workspaces.service.ts's getOrCreateState.
      //
      // Unlike that idempotent get-or-create pattern, the loser here cannot
      // honestly report success: only the bcrypt HASHES of the winning
      // call's backup codes are ever persisted, so a losing call has no way
      // to return plaintext codes that would actually verify later. Fail the
      // same way a second synchronous call above would.
      const candidateId = randomUUID();
      await this.twoFactorRepository
        .createQueryBuilder()
        .insert()
        .into(TwoFactor)
        .values({
          id: candidateId,
          userId,
          enabled: true,
          secret,
          backupCodes: hashedBackupCodes,
        } as any)
        .orIgnore()
        .execute();

      const savedTwoFactor = await this.twoFactorRepository.findOneOrFail({ where: { userId } });
      if (savedTwoFactor.id !== candidateId) {
        throw new BadRequestException('2FA is already enabled');
      }
    }

    // Audit log
    await this.auditService.log({
      userId,
      action: AuditAction.TWO_FACTOR_ENABLE,
      resource: '2fa',
      ipAddress: '0.0.0.0',
      userAgent: 'system',
    });

    return { backupCodes }; // Return backup codes only once
  }

  async disable(userId: string, token: string) {
    const twoFactor = await this.twoFactorRepository.findOne({ where: { userId } });
    if (!twoFactor || !twoFactor.enabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    // Verify token before disabling
    const isValid = await this.verifyToken(userId, token);
    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    twoFactor.enabled = false;
    twoFactor.secret = null;
    twoFactor.backupCodes = null;

    await this.twoFactorRepository.save(twoFactor);

    // Audit log
    await this.auditService.log({
      userId,
      action: AuditAction.TWO_FACTOR_DISABLE,
      resource: '2fa',
      ipAddress: '0.0.0.0',
      userAgent: 'system',
    });

    return { success: true };
  }

  async verifyToken(userId: string, token: string): Promise<boolean> {
    const twoFactor = await this.twoFactorRepository.findOne({ where: { userId } });
    if (!twoFactor || !twoFactor.enabled || !twoFactor.secret) {
      return false;
    }

    // Try TOTP verification
    const isValidTotp = speakeasy.totp.verify({
      secret: twoFactor.secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (isValidTotp) {
      twoFactor.lastUsedAt = new Date();
      await this.twoFactorRepository.save(twoFactor);
      return true;
    }

    // Try backup codes. HEAL-231: this used to read `twoFactor` (fetched
    // above, before this point), bcrypt-compare against its in-memory
    // backupCodes, splice, then save -- a classic check-then-act race.
    // Two concurrent requests presenting the SAME single-use backup code
    // each fetch their own copy of the row, both find the code still
    // present and both bcrypt.compare succeeds, so both return true
    // *before* either request's removal is persisted -- a single-use
    // backup code could authenticate more than once. Wrapping the
    // read-check-remove-save sequence in a transaction with a
    // pessimistic write lock on the row forces the second concurrent
    // request to block until the first commits, then re-read the
    // already-updated row, so it correctly fails the bcrypt check against
    // a code that's genuinely gone.
    if (twoFactor.backupCodes && twoFactor.backupCodes.length > 0) {
      return this.twoFactorRepository.manager.transaction(async (manager) => {
        // SQLite (development, e2e) has no row locks: TypeORM throws
        // LockNotSupportedOnGivenDriverError, which surfaced as a 500 on
        // every invalid-token and backup-code login in development. SQLite
        // serialises writers on its single connection, so the transaction
        // alone gives the same single-use guarantee there; the row lock is
        // what Postgres needs under real concurrency.
        const driverType = manager.connection?.options?.type;
        const supportsRowLocks =
          driverType === 'postgres' ||
          driverType === 'cockroachdb' ||
          driverType === 'mysql' ||
          driverType === 'mariadb' ||
          driverType === 'mssql' ||
          driverType === 'oracle';
        const locked = await manager.findOne(TwoFactor, {
          where: { userId },
          ...(supportsRowLocks ? { lock: { mode: 'pessimistic_write' as const } } : {}),
        });
        if (!locked?.backupCodes?.length) return false;

        for (let i = 0; i < locked.backupCodes.length; i++) {
          const isValidBackup = await bcrypt.compare(token, locked.backupCodes[i]);
          if (isValidBackup) {
            locked.backupCodes.splice(i, 1);
            locked.lastUsedAt = new Date();
            await manager.save(locked);
            return true;
          }
        }
        return false;
      });
    }

    return false;
  }

  async getStatus(userId: string) {
    const twoFactor = await this.twoFactorRepository.findOne({ where: { userId } });
    return {
      enabled: twoFactor?.enabled || false,
      backupCodesRemaining: twoFactor?.backupCodes?.length || 0,
      lastUsedAt: twoFactor?.lastUsedAt || null,
    };
  }

  private static readonly BACKUP_CODE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // HEAL-347.28: Math.random() is V8's non-cryptographic xorshift128+ PRNG --
  // its internal state is recoverable from a handful of observed outputs
  // (published state-recovery attacks exist), making future backup codes
  // predictable rather than requiring the intended ~8-character keyspace
  // brute force. These codes are a real second authentication factor
  // (bcrypt-hashed and single-use verified in verifyToken below), so they
  // need the same CSPRNG this backend already uses for other credential-
  // grade tokens (auth.service.ts's randomBytes-based verification/reset
  // tokens) -- crypto.randomInt() per character instead.
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      let code = '';
      for (let j = 0; j < 8; j++) {
        code +=
          TwoFactorService.BACKUP_CODE_ALPHABET[
            randomInt(TwoFactorService.BACKUP_CODE_ALPHABET.length)
          ];
      }
      codes.push(code);
    }
    return codes;
  }
}

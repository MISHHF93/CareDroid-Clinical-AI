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
import { randomInt } from 'crypto';
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

    let twoFactor = await this.twoFactorRepository.findOne({ where: { userId } });

    if (twoFactor) {
      if (twoFactor.enabled) {
        throw new BadRequestException('2FA is already enabled');
      }
      twoFactor.enabled = true;
      twoFactor.secret = secret;
      twoFactor.backupCodes = hashedBackupCodes;
    } else {
      twoFactor = this.twoFactorRepository.create({
        userId,
        enabled: true,
        secret,
        backupCodes: hashedBackupCodes,
      });
    }

    await this.twoFactorRepository.save(twoFactor);

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
        const locked = await manager.findOne(TwoFactor, {
          where: { userId },
          lock: { mode: 'pessimistic_write' },
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
        code += TwoFactorService.BACKUP_CODE_ALPHABET[randomInt(TwoFactorService.BACKUP_CODE_ALPHABET.length)];
      }
      codes.push(code);
    }
    return codes;
  }
}

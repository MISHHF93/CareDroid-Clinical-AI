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

    // Try backup codes
    if (twoFactor.backupCodes && twoFactor.backupCodes.length > 0) {
      for (let i = 0; i < twoFactor.backupCodes.length; i++) {
        const isValidBackup = await bcrypt.compare(token, twoFactor.backupCodes[i]);
        if (isValidBackup) {
          // Remove used backup code
          twoFactor.backupCodes.splice(i, 1);
          twoFactor.lastUsedAt = new Date();
          await this.twoFactorRepository.save(twoFactor);
          return true;
        }
      }
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

  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/entities/audit-log.entity';

/**
 * Emergency Access Service
 *
 * Allows users with saved emergency bypass codes to access their account
 * when 2FA device is unavailable (phone lost, etc.)
 *
 * Bypass codes:
 * - Generated during 2FA setup
 * - Pre-hashed in database
 * - One-time use only
 * - Logged to audit trail
 */
@Injectable()
export class EmergencyAccessService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Verify using an emergency bypass code during login
   * Returns the bypass codes remaining after use
   */
  async verifyEmergencyCode(
    userId: string,
    code: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<number> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['twoFactor'],
    });

    if (!user || !user.twoFactor?.enabled) {
      throw new Error('Emergency access not available');
    }

    const backupCodes = user.twoFactor.backupCodes || [];
    const codeIndex = backupCodes.findIndex((c) => c === code);

    if (codeIndex === -1) {
      // Log failed attempt
      await this.auditService.log({
        userId,
        action: AuditAction.EMERGENCY_ACCESS_FAILED,
        resource: 'auth',
        ipAddress,
        userAgent,
        metadata: { reason: 'invalid_backup_code' },
      });

      throw new Error('Invalid backup code');
    }

    // Remove used code
    backupCodes.splice(codeIndex, 1);
    user.twoFactor.backupCodes = backupCodes;

    // Update last used
    user.twoFactor.lastUsedAt = new Date();

    await this.userRepository.save(user);

    // Log successful emergency access
    await this.auditService.log({
      userId,
      action: AuditAction.EMERGENCY_ACCESS_SUCCESS,
      resource: 'auth',
      ipAddress,
      userAgent,
      metadata: {
        codesRemaining: backupCodes.length,
      },
    });

    return backupCodes.length;
  }

  /**
   * Count remaining backup codes for a user
   */
  async getBackupCodeCount(userId: string): Promise<number> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['twoFactor'],
    });

    return user?.twoFactor?.backupCodes?.length || 0;
  }

  /**
   * Alert when backup codes running low (< 3 remaining)
   */
  async shouldAlertAboutBackupCodes(userId: string): Promise<boolean> {
    const count = await this.getBackupCodeCount(userId);
    return count > 0 && count < 3;
  }
}

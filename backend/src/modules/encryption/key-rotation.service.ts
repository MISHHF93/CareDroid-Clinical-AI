import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { EncryptionService } from './encryption.service';
import { EncryptionKey } from './entities/encryption-key.entity';

/**
 * Key Rotation Service
 * Manages encryption key rotation without requiring downtime
 *
 * Process:
 * 1. Generate new master key
 * 2. Create EncryptionKey record with new key (marked as active: false)
 * 3. Re-encrypt all PHI records in background
 * 4. Monitor progress
 * 5. Once complete, mark new key as active
 * 6. Optionally archive/delete old key after retention period
 */
@Injectable()
export class KeyRotationService {
  private readonly logger = new Logger(KeyRotationService.name);
  private keyVersionSeed = 0;

  constructor(
    private readonly encryptionService: EncryptionService,
    @InjectRepository(EncryptionKey)
    private readonly keyRepository: Repository<EncryptionKey>,
  ) {}

  /**
   * Initiate a new key rotation
   * Creates a new encryption key record but doesn't activate it yet
   *
   * @param reason - Reason for rotation (e.g., 'scheduled', 'compromise')
   * @returns New encryption key record
   */
  async initiateKeyRotation(reason: string = 'scheduled') {
    try {
      const [latestKey] = await this.keyRepository.find({
        order: { keyVersion: 'DESC' },
        take: 1,
      });
      const nextKeyVersion = Math.max(this.keyVersionSeed, latestKey?.keyVersion || 0) + 1;
      this.keyVersionSeed = nextKeyVersion;

      // Generate new master key
      const newKeyMaterial = EncryptionService.generateNewMasterKey();

      // Create new key record
      const newKey = this.keyRepository.create({
        keyVersion: nextKeyVersion,
        keyMaterial: newKeyMaterial, // Should be stored securely (AWS KMS, Vault, etc.)
        algorithm: latestKey?.algorithm || 'aes-256-gcm',
        isActive: false,
        createdAt: new Date(),
        rotationReason: reason,
        status: 'pending_rotation',
      });

      await this.keyRepository.save(newKey);

      this.logger.log(
        `✅ Key rotation initiated: Version ${newKey.keyVersion} (reason: ${reason})`,
      );

      return {
        newKeyVersion: newKey.keyVersion,
        keyVersion: newKey.keyVersion,
        status: 'pending',
        isActive: newKey.isActive,
        rotationReason: newKey.rotationReason,
        message: 'New key created. Start re-encryption process with: service.startReEncryption()',
      };
    } catch (error) {
      this.logger.error(
        `Failed to initiate key rotation: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error('Failed to initiate key rotation');
    }
  }

  /**
   * Get current encryption key status
   *
   * @returns Active and pending keys info
   */
  async getKeyStatus() {
    try {
      const activeKey = await this.keyRepository.findOne({
        where: { isActive: true },
      });

      const pendingKeys = await this.keyRepository.find({
        where: { isActive: false },
        order: { createdAt: 'DESC' },
      });

      const pendingRotations = pendingKeys.map((k) => ({
        version: k.keyVersion,
        keyVersion: k.keyVersion,
        status: k.status === 'pending_rotation' ? 'pending' : k.status,
        createdAt: k.createdAt,
        rotationReason: k.rotationReason,
        progressPercentage: k.progressPercentage || 0,
        recordsProcessed: k.recordsProcessed || 0,
      }));

      return {
        activeKey: activeKey
          ? {
              version: activeKey.keyVersion,
              algorithm: activeKey.algorithm,
              createdAt: activeKey.createdAt,
            }
          : null,
        pendingRotations,
        pendingKey: pendingRotations[0] || null,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get key status: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error('Failed to get key status');
    }
  }

  /**
   * Activate a rotated key (mark it as the active key)
   * Should only be done after all data has been re-encrypted
   *
   * @param keyVersion - Version of the key to activate
   */
  async activateRotatedKey(keyVersion: number) {
    try {
      const key = await this.keyRepository.findOne({
        where: { keyVersion },
      });

      if (!key) {
        throw new Error(`Encryption key version ${keyVersion} not found`);
      }

      if (key.status !== 're_encryption_complete') {
        throw new Error(
          `Cannot activate key in status '${key.status}'. ` +
            `Re-encryption must be complete before activation.`,
        );
      }

      // Deactivate previous key
      await this.keyRepository.update({ isActive: true }, { isActive: false });

      // Activate new key
      key.isActive = true;
      key.activatedAt = new Date();
      await this.keyRepository.save(key);

      this.logger.log(`✅ Key version ${keyVersion} activated`);

      return {
        message: `Key version ${keyVersion} is now active`,
        activatedAt: key.activatedAt,
        isActive: key.isActive,
      };
    } catch (error) {
      this.logger.error(
        `Failed to activate key: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error('Failed to activate rotated key');
    }
  }

  /**
   * Schedule a key rotation for a specific time
   * Useful for maintenance windows
   *
   * @param scheduledTime - When to rotate (ISO string)
   * @param reason - Reason for rotation
   */
  async scheduleKeyRotation(scheduledTime: string, reason: string = 'scheduled') {
    try {
      const rotation = this.keyRepository.create({
        keyVersion: (await this.getNextKeyVersion()) + 1,
        algorithm: 'aes-256-gcm',
        isActive: false,
        status: 'scheduled',
        rotationReason: reason,
        scheduledTime: new Date(scheduledTime),
      });

      await this.keyRepository.save(rotation);

      this.logger.log(`✅ Key rotation scheduled for ${scheduledTime}`);

      return {
        scheduledTime,
        reason,
        message: 'Key rotation scheduled',
      };
    } catch (error) {
      this.logger.error(
        `Failed to schedule key rotation: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error('Failed to schedule key rotation');
    }
  }

  /**
   * Get the next available key version number
   */
  private async getNextKeyVersion(): Promise<number> {
    const [lastKey] = await this.keyRepository.find({
      order: { keyVersion: 'DESC' },
      take: 1,
    });

    return (lastKey?.keyVersion || 0) + 1;
  }

  /**
   * Get historical key records (for audit purposes)
   *
   * @param limit - Number of keys to retrieve
   */
  async getKeyHistory(limit: number = 10) {
    try {
      const keys = await this.keyRepository.find({
        order: { createdAt: 'DESC' },
        take: limit,
      });

      return keys.map((key) => ({
        version: key.keyVersion,
        algorithm: key.algorithm,
        isActive: key.isActive,
        status: key.status,
        createdAt: key.createdAt,
        activatedAt: key.activatedAt,
        rotationReason: key.rotationReason,
        progressPercentage: key.progressPercentage || 0,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get key history: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error('Failed to get key history');
    }
  }

  /**
   * Mark old keys for deletion after retention period
   * HIPAA typically requires key retention for 7+ years
   * This schedules deletion but doesn't immediately delete
   *
   * @param olderThanDays - Delete keys older than this many days
   */
  async scheduleOldKeyDeletion(olderThanDays: number = 2555) {
    // ~7 years
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // HEAL-347.35: plain `createdAt: cutoffDate` is an EQUALITY match in
      // TypeORM's where clause, not "older than" -- this could only ever
      // match a key whose createdAt happens to equal the freshly-computed
      // cutoff Date object to the millisecond, so this ~7-year HIPAA
      // key-retention deletion-scheduling control silently never fired for
      // any real key, no matter how old. LessThan is the actual "older
      // than the cutoff" comparison.
      const keysToDelete = await this.keyRepository.find({
        where: {
          isActive: false,
          createdAt: LessThan(cutoffDate),
        },
      });

      if (keysToDelete.length === 0) {
        return {
          message: 'No keys eligible for deletion',
          scheduledForDeletion: 0,
        };
      }

      // Mark for deletion but don't actually delete
      for (const key of keysToDelete) {
        key.status = 'scheduled_for_deletion';
        key.deletionScheduledAt = new Date();
        await this.keyRepository.save(key);
      }

      this.logger.log(`✅ Scheduled ${keysToDelete.length} keys for deletion`);

      return {
        message: `${keysToDelete.length} keys scheduled for deletion`,
        scheduledForDeletion: keysToDelete.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to schedule key deletion: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error('Failed to schedule key deletion');
    }
  }

  /**
   * Update rotation progress
   * Called during re-encryption process
   *
   * @param keyVersion - Key version being rotated
   * @param percentage - Progress percentage (0-100)
   * @param recordsProcessed - Number of records processed
   */
  async updateRotationProgress(keyVersion: number, percentage: number, recordsProcessed: number) {
    try {
      const key = await this.keyRepository.findOne({
        where: { keyVersion },
      });

      if (!key) {
        throw new Error(`Key version ${keyVersion} not found`);
      }

      key.progressPercentage = percentage;
      key.recordsProcessed = recordsProcessed;

      if (percentage === 100) {
        key.status = 're_encryption_complete';
      }

      await this.keyRepository.save(key);

      if (percentage % 10 === 0) {
        this.logger.log(`🔄 Key rotation progress: ${percentage}% (${recordsProcessed} records)`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to update rotation progress: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

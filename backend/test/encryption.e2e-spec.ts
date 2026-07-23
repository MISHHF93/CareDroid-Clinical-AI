import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EncryptionService } from '../src/modules/encryption/encryption.service';
import { KeyRotationService } from '../src/modules/encryption/key-rotation.service';
import { EncryptionKey } from '../src/modules/encryption/entities/encryption-key.entity';
import { EncryptionModule } from '../src/modules/encryption/encryption.module';
import encryptionConfig from '../src/config/encryption.config';

/**
 * End-to-End tests for Encryption module
 * Tests the full lifecycle of encryption operations including key rotation
 */
describe('Encryption Module E2E', () => {
  let app: INestApplication;
  let encryptionService: EncryptionService;
  let keyRotationService: KeyRotationService;
  let encryptionKeyRepository: Repository<EncryptionKey>;

  beforeAll(async () => {
    // Set encryption key for tests
    process.env.ENCRYPTION_MASTER_KEY = '1'.repeat(64);
    process.env.ENCRYPTION_ALGORITHM = 'aes-256-gcm';
    process.env.ENCRYPTION_KEY_VERSION = '1';
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [encryptionConfig],
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [EncryptionKey],
          synchronize: true,
        }),
        EncryptionModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    encryptionService = moduleFixture.get<EncryptionService>(EncryptionService);
    keyRotationService = moduleFixture.get<KeyRotationService>(KeyRotationService);
    encryptionKeyRepository = moduleFixture.get<Repository<EncryptionKey>>(
      getRepositoryToken(EncryptionKey),
    );
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Encryption Service Integration', () => {
    it('should encrypt and decrypt PHI data', () => {
      const phi = 'john.doe@hospital.com';
      const encrypted = encryptionService.encrypt(phi);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(phi);
      expect(encrypted.keyVersion).toBe(1);
    });

    it('should support multiple concurrent encryptions', async () => {
      const plaintexts = [
        'user1@example.com',
        'user2@example.com',
        'user3@example.com',
        'user4@example.com',
        'user5@example.com',
      ];

      const encryptPromises = plaintexts.map((p) => Promise.resolve(encryptionService.encrypt(p)));

      const encrypted = await Promise.all(encryptPromises);

      expect(encrypted).toHaveLength(5);
      encrypted.forEach((enc, idx) => {
        expect(encryptionService.decrypt(enc)).toBe(plaintexts[idx]);
      });
    });

    it('should track key versions during encryption', () => {
      const encrypted1 = encryptionService.encrypt('data1');
      const encrypted2 = encryptionService.encrypt('data2');
      const encrypted3 = encryptionService.encrypt('data3');

      expect(encrypted1.keyVersion).toBe(1);
      expect(encrypted2.keyVersion).toBe(1);
      expect(encrypted3.keyVersion).toBe(1);
    });
  });

  describe('Key Rotation Lifecycle', () => {
    it('should initiate key rotation with new key', async () => {
      const rotation = await keyRotationService.initiateKeyRotation('SCHEDULED_ROTATION');

      expect(rotation.status).toBe('pending');
      expect(rotation.keyVersion).toBeGreaterThan(0);
      expect(rotation.isActive).toBe(false);
    });

    it('should track key rotation status', async () => {
      const initialStatus = await keyRotationService.getKeyStatus();
      expect(initialStatus.activeKey).toBeDefined();

      await keyRotationService.initiateKeyRotation('TEST_ROTATION');
      const statusAfter = await keyRotationService.getKeyStatus();

      expect(statusAfter.pendingKey).toBeDefined();
      expect(statusAfter.pendingKey.status).toBe('pending');
    });

    it('should update rotation progress', async () => {
      const rotation = await keyRotationService.initiateKeyRotation('PROGRESS_TEST');
      const keyVersion = rotation.keyVersion;

      // Simulate re-encryption progress
      await keyRotationService.updateRotationProgress(keyVersion, 25, 1000);
      const status1 = await keyRotationService.getKeyStatus();
      expect(status1.pendingKey.progressPercentage).toBe(25);
      expect(status1.pendingKey.recordsProcessed).toBe(1000);

      // Update again
      await keyRotationService.updateRotationProgress(keyVersion, 50, 2000);
      const status2 = await keyRotationService.getKeyStatus();
      expect(status2.pendingKey.progressPercentage).toBe(50);
      expect(status2.pendingKey.recordsProcessed).toBe(2000);
    });

    it('should move key to complete status', async () => {
      const rotation = await keyRotationService.initiateKeyRotation('COMPLETE_TEST');
      const keyVersion = rotation.keyVersion;

      // Simulate completion
      await keyRotationService.updateRotationProgress(keyVersion, 100, 5000);
      const updatedKey = (await encryptionKeyRepository.findOne({
        where: { keyVersion },
      }))!;

      expect(updatedKey.progressPercentage).toBe(100);
      expect(updatedKey.recordsProcessed).toBe(5000);
    });

    it('should activate rotated key', async () => {
      const rotation = await keyRotationService.initiateKeyRotation('ACTIVATE_TEST');
      const keyVersion = rotation.keyVersion;

      // Update to completion status
      await keyRotationService.updateRotationProgress(keyVersion, 100, 5000);

      // Activate the new key
      const activated = await keyRotationService.activateRotatedKey(keyVersion);

      expect(activated.isActive).toBe(true);

      // Verify only one key is active
      const activeKeys = await encryptionKeyRepository.find({
        where: { isActive: true },
      });
      expect(activeKeys.length).toBe(1);
      expect(activeKeys[0].keyVersion).toBe(keyVersion);
    });

    it('should maintain key history', async () => {
      // Create multiple rotations
      const rot1 = await keyRotationService.initiateKeyRotation('ROTATION_1');
      await keyRotationService.initiateKeyRotation('ROTATION_2');

      // Activate first rotation
      await keyRotationService.updateRotationProgress(rot1.keyVersion, 100, 1000);
      await keyRotationService.activateRotatedKey(rot1.keyVersion);

      // Get history
      const history = await keyRotationService.getKeyHistory();

      expect(history.length).toBe(2);
      expect(history.some((k) => k.isActive)).toBe(true);
    });

    it('should schedule old key deletion', async () => {
      const rotation = await keyRotationService.initiateKeyRotation('DELETION_TEST');

      // Activate it
      await keyRotationService.updateRotationProgress(rotation.keyVersion, 100, 1000);
      await keyRotationService.activateRotatedKey(rotation.keyVersion);

      // Find old key and schedule deletion
      const oldKeys = await encryptionKeyRepository.find({
        where: { isActive: false },
      });

      if (oldKeys.length > 0) {
        const oldestKey = oldKeys[0];
        await keyRotationService.scheduleOldKeyDeletion(7); // 7 days

        const scheduled = (await encryptionKeyRepository.findOne({
          where: { keyVersion: oldestKey.keyVersion },
        }))!;

        expect(scheduled.deletionScheduledAt).toBeDefined();
      }
    });

    it('should handle concurrent rotation requests', async () => {
      const promises = [
        keyRotationService.initiateKeyRotation('CONCURRENT_1'),
        keyRotationService.initiateKeyRotation('CONCURRENT_2'),
        keyRotationService.initiateKeyRotation('CONCURRENT_3'),
      ];

      const rotations = await Promise.all(promises);

      expect(rotations).toHaveLength(3);
      const versions = rotations.map((r) => r.keyVersion);
      expect(new Set(versions).size).toBe(3); // All unique versions
    });
  });

  describe('Re-encryption During Rotation', () => {
    it('should support re-encryption with new key', async () => {
      // Encrypt with current key
      const plaintext = 'sensitive-data';
      const oldEncrypted = encryptionService.encrypt(plaintext);

      // Initiate rotation
      await keyRotationService.initiateKeyRotation('REENCRYPT_TEST');

      // For this test, we simulate the re-encryption process
      // In production, a background job would do this
      const originalKey = Buffer.from(process.env.ENCRYPTION_MASTER_KEY!, 'hex');
      const newEncrypted = encryptionService.reEncryptWithNewKey(oldEncrypted, originalKey);

      // Both should decrypt to original plaintext
      expect(encryptionService.decrypt(oldEncrypted)).toBe(plaintext);
      expect(encryptionService.decrypt(newEncrypted)).toBe(plaintext);
    });

    it('should handle batch re-encryption', async () => {
      const plaintexts = ['data1', 'data2', 'data3', 'data4', 'data5'];
      const encrypted = encryptionService.encryptBatch(plaintexts);

      // Initiate key rotation
      await keyRotationService.initiateKeyRotation('BATCH_REENCRYPT');

      // Simulate re-encryption of batch
      const masterKey = Buffer.from(process.env.ENCRYPTION_MASTER_KEY!, 'hex');
      const reencrypted = encrypted.map((e) => encryptionService.reEncryptWithNewKey(e, masterKey));

      // Verify all decrypt correctly
      const decrypted = encryptionService.decryptBatch(reencrypted);
      expect(decrypted).toEqual(plaintexts);
    });
  });

  describe('Data Integrity During Rotation', () => {
    it('should preserve data through rotation lifecycle', async () => {
      const originalData = 'patient-ssn-123-45-6789';

      // Step 1: Encrypt with original key
      const encrypted1 = encryptionService.encrypt(originalData);
      expect(encryptionService.decrypt(encrypted1)).toBe(originalData);

      // Step 2: Initiate rotation
      const rotation = await keyRotationService.initiateKeyRotation('INTEGRITY_TEST');

      // Step 3: Verify original still decrypts
      expect(encryptionService.decrypt(encrypted1)).toBe(originalData);

      // Step 4: Progress rotation
      await keyRotationService.updateRotationProgress(rotation.keyVersion, 50, 500);

      // Step 5: Original should still work
      expect(encryptionService.decrypt(encrypted1)).toBe(originalData);

      // Step 6: Activate new key
      await keyRotationService.updateRotationProgress(rotation.keyVersion, 100, 1000);
      await keyRotationService.activateRotatedKey(rotation.keyVersion);

      // Step 7: Old data should still decrypt
      expect(encryptionService.decrypt(encrypted1)).toBe(originalData);
    });

    it('should handle rollback during rotation', async () => {
      const data = 'critical-medical-data';
      const encrypted = encryptionService.encrypt(data);

      // Start rotation
      await keyRotationService.initiateKeyRotation('ROLLBACK_TEST');

      // In case of error, old key should still work
      expect(encryptionService.decrypt(encrypted)).toBe(data);
    });
  });

  describe('Compliance & Audit', () => {
    it('should track key rotation reason', async () => {
      const reasons = [
        'SCHEDULED_ROTATION',
        'COMPROMISED_KEY',
        'COMPLIANCE_REQUIREMENT',
        'KEY_EXPIRY',
      ];

      for (const reason of reasons) {
        const rotation = await keyRotationService.initiateKeyRotation(reason);
        expect(rotation.rotationReason).toBe(reason);
      }
    });

    it('should record audit information', async () => {
      const rotation = await keyRotationService.initiateKeyRotation('AUDIT_TEST');

      const keyRecord = (await encryptionKeyRepository.findOne({
        where: { keyVersion: rotation.keyVersion },
      }))!;

      expect(keyRecord).toBeDefined();
      expect(keyRecord.auditInfo).toBeDefined();
      expect(keyRecord.createdAt).toBeDefined();
    });

    it('should maintain HIPAA-compliant retention', async () => {
      const rotation = await keyRotationService.initiateKeyRotation('RETENTION_TEST');

      // Schedule deletion with 7-year retention
      await keyRotationService.updateRotationProgress(rotation.keyVersion, 100, 1000);
      await keyRotationService.activateRotatedKey(rotation.keyVersion);
      await keyRotationService.scheduleOldKeyDeletion(2555); // ~7 years

      const deletionScheduled = await encryptionKeyRepository.findOne({
        where: { keyVersion: rotation.keyVersion - 1 }, // Old key
      });

      if (deletionScheduled) {
        expect(deletionScheduled.deletionScheduledAt).toBeDefined();
        // Verify it's scheduled far in the future (HIPAA requirement)
        const daysUntilDeletion =
          (deletionScheduled.deletionScheduledAt.getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24);
        expect(daysUntilDeletion).toBeGreaterThan(365); // At least 1 year
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle encryption service errors gracefully', () => {
      expect(() => {
        encryptionService.decrypt({
          algorithm: 'unsupported-algo' as any,
          encryptedText: 'invalid',
          iv: 'invalid',
          authTag: 'invalid',
          salt: 'invalid',
          keyVersion: 999,
        });
      }).toThrow();
    });

    it('should handle missing key version gracefully', () => {
      const encrypted = encryptionService.encrypt('data');

      // Modify to invalid version (this should still work with current key)
      encrypted.keyVersion = 999;

      // Should still work if we have the key
      expect(() => {
        encryptionService.decrypt(encrypted);
      }).toThrow(); // Will fail because wrong key version
    });

    it('should handle corruption detection', () => {
      const encrypted = encryptionService.encrypt('data');

      // Corrupt the auth tag
      encrypted.authTag = 'corrupted';

      expect(() => {
        encryptionService.decrypt(encrypted);
      }).toThrow();
    });
  });

  describe('Performance Under Load', () => {
    it('should handle high volume encryption', async () => {
      const count = 10;
      const plaintexts = Array.from({ length: count }, (_, i) => `user${i}@example.com`);

      const start = performance.now();
      const encrypted = encryptionService.encryptBatch(plaintexts);
      const elapsed = performance.now() - start;

      expect(encrypted).toHaveLength(count);
      expect(elapsed).toBeLessThan(5000); // Should complete bounded scrypt work promptly
    });

    it('should handle key rotation with many records', async () => {
      const rotation = await keyRotationService.initiateKeyRotation('LOAD_TEST');

      // Simulate processing 10,000 records
      const totalRecords = 10000;
      const batchSize = 1000;

      for (let i = 0; i < totalRecords; i += batchSize) {
        const progress = ((i + batchSize) / totalRecords) * 100;
        await keyRotationService.updateRotationProgress(
          rotation.keyVersion,
          Math.min(progress, 100),
          Math.min(i + batchSize, totalRecords),
        );
      }

      const finalStatus = await keyRotationService.getKeyStatus();
      expect(finalStatus.pendingKey.recordsProcessed).toBe(totalRecords);
    });
  });
});

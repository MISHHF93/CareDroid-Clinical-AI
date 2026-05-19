import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService, EncryptionAlgorithm } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeAll(async () => {
    // Set encryption key for tests
    process.env.ENCRYPTION_MASTER_KEY = '0'.repeat(64); // 32 bytes in hex = 64 chars
    process.env.ENCRYPTION_ALGORITHM = EncryptionAlgorithm.AES_256_GCM;
    process.env.ENCRYPTION_KEY_VERSION = '1';
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EncryptionService],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Encryption & Decryption', () => {
    it('should encrypt plaintext data', () => {
      const plaintext = 'sensitive@example.com';
      const encrypted = service.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted.algorithm).toBe(EncryptionAlgorithm.AES_256_GCM);
      expect(encrypted.encryptedText).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.salt).toBeDefined();
      expect(encrypted.keyVersion).toBe(1);
      expect(encrypted.encryptedText).not.toBe(plaintext);
    });

    it('should decrypt encrypted data', () => {
      const plaintext = 'user@hospital.com';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle JSON serialization of encrypted data', () => {
      const plaintext = '+1-555-0123';
      const encrypted = service.encrypt(plaintext);
      const jsonString = JSON.stringify(encrypted);
      const decrypted = service.decrypt(jsonString);

      expect(decrypted).toBe(plaintext);
    });

    it('should fail decryption with modified ciphertext', () => {
      const plaintext = 'secret-token-123';
      const encrypted = service.encrypt(plaintext);

      // Modify the ciphertext
      encrypted.encryptedText =
        encrypted.encryptedText.substring(0, encrypted.encryptedText.length - 2) + 'xx';

      expect(() => {
        service.decrypt(encrypted);
      }).toThrow();
    });

    it('should fail decryption with modified auth tag', () => {
      const plaintext = 'medical-record-id';
      const encrypted = service.encrypt(plaintext);

      // Modify the auth tag (GCM provides authentication)
      encrypted.authTag = encrypted.authTag.substring(0, encrypted.authTag.length - 2) + 'ff';

      expect(() => {
        service.decrypt(encrypted);
      }).toThrow();
    });

    it('should fail decryption with modified IV', () => {
      const plaintext = 'patient-ssn-123-45-6789';
      const encrypted = service.encrypt(plaintext);

      // Modify the IV
      encrypted.iv = encrypted.iv.substring(0, encrypted.iv.length - 2) + 'aa';

      expect(() => {
        service.decrypt(encrypted);
      }).toThrow();
    });

    it('should fail decryption with different salt', () => {
      const plaintext = 'license-number-xyz';
      const encrypted = service.encrypt(plaintext);

      // Modify the salt (this changes the derived key)
      encrypted.salt = encrypted.salt.substring(0, encrypted.salt.length - 2) + 'bb';

      expect(() => {
        service.decrypt(encrypted);
      }).toThrow();
    });

    it('should produce different ciphertexts for same plaintext', () => {
      const plaintext = 'same-data';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      // Should produce different ciphertexts due to random IV
      expect(encrypted1.encryptedText).not.toBe(encrypted2.encryptedText);

      // But both should decrypt to the same plaintext
      expect(service.decrypt(encrypted1)).toBe(plaintext);
      expect(service.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const plaintext = '';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'A'.repeat(10000); // 10KB of data
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters and Unicode', () => {
      const plaintext = '你好世界 🔐 مرحبا بالعالم';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle medical data with special characters', () => {
      const plaintext =
        "Patient: John O'Brien, Allergy: Penicillin/Cephalosporin; Contact: +1 (555) 123-4567";
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Batch Operations', () => {
    it('should encrypt multiple values', () => {
      const plaintexts = ['email@example.com', '+1-555-0123', 'License#ABC123XY'];

      const encrypted = service.encryptBatch(plaintexts);

      expect(encrypted).toHaveLength(3);
      expect(encrypted.every((e) => e.encryptedText)).toBe(true);
      expect(encrypted.every((e) => e.authTag)).toBe(true);
    });

    it('should decrypt multiple values', () => {
      const plaintexts = ['user@hospital.com', '+1-555-9876', 'SSN: 123-45-6789'];

      const encrypted = service.encryptBatch(plaintexts);
      const decrypted = service.decryptBatch(encrypted);

      expect(decrypted).toEqual(plaintexts);
    });

    it('should handle batch of single item', () => {
      const plaintexts = ['single-value'];
      const encrypted = service.encryptBatch(plaintexts);
      const decrypted = service.decryptBatch(encrypted);

      expect(decrypted).toEqual(plaintexts);
    });

    it('should handle batch with empty items', () => {
      const plaintexts = ['data1', '', 'data3', ''];
      const encrypted = service.encryptBatch(plaintexts);
      const decrypted = service.decryptBatch(encrypted);

      expect(decrypted).toEqual(plaintexts);
    });
  });

  describe('Hash Operations', () => {
    it('should hash a value consistently', () => {
      const value = 'user@example.com';
      const hash1 = service.hashValue(value);
      const hash2 = service.hashValue(value);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different values', () => {
      const value1 = 'user1@example.com';
      const value2 = 'user2@example.com';

      const hash1 = service.hashValue(value1);
      const hash2 = service.hashValue(value2);

      expect(hash1).not.toBe(hash2);
    });

    it('should verify hash match', () => {
      const value = 'data-to-verify';
      const hash = service.hashValue(value);

      expect(service.verifyHash(value, hash)).toBe(true);
    });

    it('should fail hash verification for wrong value', () => {
      const value = 'original-data';
      const hash = service.hashValue(value);

      expect(service.verifyHash('different-data', hash)).toBe(false);
    });

    it('should handle case sensitivity in hashing', () => {
      const hash1 = service.hashValue('Email@Example.COM');
      const hash2 = service.hashValue('email@example.com');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Encryption Status', () => {
    it('should return encryption status', () => {
      const status = service.getStatus();

      expect(status.algorithm).toBe(EncryptionAlgorithm.AES_256_GCM);
      expect(status.keyVersion).toBe(1);
      expect(status.masterKeyLoaded).toBe(true);
    });

    it('should show correct algorithm in status', () => {
      const status = service.getStatus();
      expect(['aes-256-gcm', 'aes-128-gcm']).toContain(status.algorithm);
    });
  });

  describe('Edge Cases', () => {
    it('should handle decryption of own encrypted format', () => {
      const plaintext = 'complex-data-123!@#$%^&*()';
      const encrypted = service.encrypt(plaintext);

      // Ensure all required fields are present
      expect(encrypted.algorithm).toBeDefined();
      expect(encrypted.encryptedText).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.salt).toBeDefined();
      expect(encrypted.keyVersion).toBeDefined();

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle rapid consecutive encryption/decryption', () => {
      const plaintext = 'repeated-test-data';

      for (let i = 0; i < 100; i++) {
        const encrypted = service.encrypt(plaintext);
        const decrypted = service.decrypt(encrypted);
        expect(decrypted).toBe(plaintext);
      }
    });

    it('should preserve data integrity with encryption', () => {
      const sensitiveData = {
        email: 'doctor@hospital.com',
        licenseNumber: 'MD123456',
        ssn: '123-45-6789',
      };

      const json = JSON.stringify(sensitiveData);
      const encrypted = service.encrypt(json);
      const decrypted = service.decrypt(encrypted);
      const parsed = JSON.parse(decrypted);

      expect(parsed).toEqual(sensitiveData);
    });
  });

  describe('Security Properties', () => {
    it('should use authenticated encryption (GCM mode)', () => {
      const encrypted = service.encrypt('test-data');

      // GCM mode includes authentication tag
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.authTag.length).toBeGreaterThan(0);
    });

    it('should have random IV for each encryption', () => {
      const plaintext = 'data';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      // IVs should be different (random)
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should have random salt for each encryption', () => {
      const plaintext = 'data';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      // Salts should be different (random)
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
    });

    it('should use key version for tracking', () => {
      const encrypted = service.encrypt('data');

      expect(encrypted.keyVersion).toBe(1);
    });

    it('should support multiple algorithms', () => {
      const status = service.getStatus();
      expect(['aes-256-gcm', 'aes-128-gcm']).toContain(status.algorithm);
    });
  });

  describe('Key Management', () => {
    it('should generate new master key', () => {
      const key1 = EncryptionService.generateNewMasterKey();
      const key2 = EncryptionService.generateNewMasterKey();

      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
      expect(key1).not.toBe(key2);
      expect(key1.length).toBe(64); // 32 bytes in hex
      expect(key2.length).toBe(64);
    });

    it('should generate valid hex keys', () => {
      const key = EncryptionService.generateNewMasterKey();

      // Should be valid hex
      expect(/^[a-f0-9]{64}$/.test(key)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should encrypt data quickly', () => {
      const plaintext = 'A'.repeat(1000);
      const iterations = 100;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        service.encrypt(plaintext);
      }
      const elapsed = performance.now() - start;

      // Should complete 100 encryptions in < 1 second
      expect(elapsed).toBeLessThan(1000);
    });

    it('should decrypt data quickly', () => {
      const plaintext = 'test-data-for-decryption';
      const encrypted = service.encrypt(plaintext);
      const iterations = 100;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        service.decrypt(encrypted);
      }
      const elapsed = performance.now() - start;

      // Should complete 100 decryptions in < 1 second
      expect(elapsed).toBeLessThan(1000);
    });

    it('should hash values quickly', () => {
      const value = 'value-to-hash';
      const iterations = 1000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        service.hashValue(value);
      }
      const elapsed = performance.now() - start;

      // Should complete 1000 hashes in < 100ms
      expect(elapsed).toBeLessThan(100);
    });
  });
});

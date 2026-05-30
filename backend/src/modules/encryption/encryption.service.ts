import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, createHash, scryptSync } from 'crypto';

/**
 * Encryption algorithms supported
 * AES-256-GCM: Recommended for production - provides authenticated encryption
 * AES-128-GCM: Alternative for resource-constrained environments
 */
export enum EncryptionAlgorithm {
  AES_256_GCM = 'aes-256-gcm',
  AES_128_GCM = 'aes-128-gcm',
}

/**
 * Encrypted data structure
 * Contains all information needed to decrypt the data
 */
export interface EncryptedData {
  algorithm: EncryptionAlgorithm;
  encryptedText: string;
  iv: string;
  authTag: string;
  salt: string;
  keyVersion: number; // Which key version was used (for rotation)
}

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly masterKey: Buffer;
  private readonly algorithm: EncryptionAlgorithm;
  private readonly keyVersion: number;

  constructor(private readonly configService: ConfigService) {
    // Get encryption key from environment
    const encryptionConfig = this.configService.get<any>('encryption');
    const configuredKey = encryptionConfig?.masterKey || process.env.ENCRYPTION_MASTER_KEY;
    const isDevelopment = (process.env.NODE_ENV || 'development') === 'development';
    const keyString =
      configuredKey ||
      (isDevelopment ? '0000000000000000000000000000000000000000000000000000000000000000' : '');
    if (!keyString) {
      throw new Error(
        'ENCRYPTION_MASTER_KEY environment variable not set. ' +
          "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }

    if (!configuredKey && isDevelopment) {
      this.logger.warn(
        'ENCRYPTION_MASTER_KEY not set. Using insecure local development fallback key.',
      );
    }

    // Validate key is 64 characters (32 bytes in hex)
    if (keyString.length !== 64) {
      throw new Error('ENCRYPTION_MASTER_KEY must be 64 hex characters (32 bytes)');
    }

    this.masterKey = Buffer.from(keyString, 'hex');
    this.algorithm = encryptionConfig?.algorithm || EncryptionAlgorithm.AES_256_GCM;
    this.keyVersion =
      encryptionConfig?.keyVersion || parseInt(process.env.ENCRYPTION_KEY_VERSION || '1', 10);

    this.logger.log(`✅ Encryption service initialized with ${this.algorithm}`);
  }

  /**
   * Encrypt data using AES-GCM with authenticated encryption
   * GCM mode provides both confidentiality and authenticity
   *
   * @param plaintext - Data to encrypt
   * @returns Encrypted data object with all necessary decryption parameters
   */
  encrypt(plaintext: string): EncryptedData {
    try {
      // Generate random IV (initialization vector)
      // Length depends on algorithm: 12 bytes for AES-GCM (recommended)
      const iv = randomBytes(12);

      // Generate random salt for key derivation
      const salt = randomBytes(16);

      // Derive encryption key from master key + data-specific salt
      // This provides per-record key derivation
      const derivedKey = this.deriveKey(this.masterKey, salt);

      // Create cipher
      const cipher = createCipheriv(this.algorithm, derivedKey, iv);

      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag (for GCM mode)
      const authTag = cipher.getAuthTag().toString('hex');

      return {
        algorithm: this.algorithm,
        encryptedText: encrypted,
        iv: iv.toString('hex'),
        authTag,
        salt: salt.toString('hex'),
        keyVersion: this.keyVersion,
      };
    } catch (error) {
      this.logger.error(
        `Encryption failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data encrypted with encrypt()
   *
   * @param encryptedData - Encrypted data object from encrypt()
   * @returns Decrypted plaintext
   */
  decrypt(encryptedData: EncryptedData | string): string {
    try {
      // Handle both EncryptedData object and JSON string
      const data = typeof encryptedData === 'string' ? JSON.parse(encryptedData) : encryptedData;

      // Validate key version (fail if data was encrypted with newer key version)
      if (data.keyVersion > this.keyVersion) {
        throw new Error(
          `Cannot decrypt data encrypted with key version ${data.keyVersion} ` +
            `using key version ${this.keyVersion}. ` +
            `Please load the correct encryption key.`,
        );
      }

      // Reconstruct buffers from hex strings
      const iv = Buffer.from(data.iv, 'hex');
      const salt = Buffer.from(data.salt, 'hex');
      const authTag = Buffer.from(data.authTag, 'hex');
      const encryptedText = Buffer.from(data.encryptedText, 'hex');

      // Derive the same key using the stored salt
      const derivedKey = this.deriveKey(this.masterKey, salt);

      // Create decipher
      const decipher = createDecipheriv(data.algorithm, derivedKey, iv);

      // Set authentication tag for verification
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.error(
        `Decryption failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error(
        'Failed to decrypt data. Data may be corrupted or encrypted with different key.',
      );
    }
  }

  /**
   * Derive a key from master key and salt using scrypt
   * Scrypt is memory-hard, resisting GPU/ASIC attacks
   *
   * @param masterKey - Master encryption key
   * @param salt - Salt for key derivation
   * @returns Derived key buffer (32 bytes for AES-256, 16 bytes for AES-128)
   */
  private deriveKey(masterKey: Buffer, salt: Buffer): Buffer {
    try {
      const keyLength = this.algorithm === EncryptionAlgorithm.AES_256_GCM ? 32 : 16;

      return scryptSync(masterKey, salt, keyLength, {
        N: 16384, // CPU/memory cost parameter (2^14)
        r: 8, // Block size parameter
        p: 1, // Parallelization parameter
        maxmem: 128 * 1024 * 1024, // 128MB max memory
      });
    } catch (error) {
      this.logger.error(
        `Key derivation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error('Failed to derive encryption key');
    }
  }

  /**
   * Hash a value for comparison (e.g., for searchable encryption)
   * Uses SHA-256 with salt for consistency
   *
   * @param value - Value to hash
   * @returns Hex-encoded hash
   */
  hashValue(value: string): string {
    return createHash('sha256')
      .update(value + this.masterKey.toString('hex'))
      .digest('hex');
  }

  /**
   * Check if a value matches a hash
   *
   * @param value - Value to check
   * @param hash - Expected hash
   * @returns True if value matches hash
   */
  verifyHash(value: string, hash: string): boolean {
    return this.hashValue(value) === hash;
  }

  /**
   * Encrypt a batch of values
   *
   * @param plaintexts - Array of strings to encrypt
   * @returns Array of encrypted data objects
   */
  encryptBatch(plaintexts: string[]): EncryptedData[] {
    return plaintexts.map((plaintext) => this.encrypt(plaintext));
  }

  /**
   * Decrypt a batch of values
   *
   * @param encryptedDataArray - Array of encrypted data objects
   * @returns Array of decrypted strings
   */
  decryptBatch(encryptedDataArray: (EncryptedData | string)[]): string[] {
    return encryptedDataArray.map((encryptedData) => this.decrypt(encryptedData));
  }

  /**
   * Re-encrypt data with a new key (for key rotation)
   * This is used when rotating to a new master key
   *
   * @param encryptedData - Data encrypted with old key
   * @param newMasterKey - New master key (should be set in environment before calling)
   * @returns Data re-encrypted with new key
   */
  reEncryptWithNewKey(encryptedData: EncryptedData, currentMasterKey: Buffer): EncryptedData {
    try {
      // Decrypt with old key
      const decrypted = this.decryptWithSpecificKey(encryptedData, currentMasterKey);

      // Re-encrypt with current master key (which is the new one)
      return this.encrypt(decrypted);
    } catch (error) {
      this.logger.error(
        `Re-encryption failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error('Failed to re-encrypt data during key rotation');
    }
  }

  /**
   * Decrypt using a specific key (for key rotation scenarios)
   *
   * @param encryptedData - Encrypted data
   * @param masterKey - Specific master key to use for decryption
   * @returns Decrypted plaintext
   */
  private decryptWithSpecificKey(encryptedData: EncryptedData, masterKey: Buffer): string {
    try {
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const salt = Buffer.from(encryptedData.salt, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      const encryptedText = Buffer.from(encryptedData.encryptedText, 'hex');

      const derivedKey = this.deriveKey(masterKey, salt);

      const decipher = createDecipheriv(encryptedData.algorithm, derivedKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.error(
        `Decryption with specific key failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error('Failed to decrypt with specific key');
    }
  }

  /**
   * Generate a new master key (for key rotation initialization)
   * Should be called by admin/management operations
   *
   * @returns New master key as hex string
   */
  static generateNewMasterKey(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Get current encryption status
   *
   * @returns Encryption configuration info
   */
  getStatus(): {
    algorithm: EncryptionAlgorithm;
    keyVersion: number;
    masterKeyLoaded: boolean;
  } {
    return {
      algorithm: this.algorithm,
      keyVersion: this.keyVersion,
      masterKeyLoaded: Boolean(this.masterKey),
    };
  }
}

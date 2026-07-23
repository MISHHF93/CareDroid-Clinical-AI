import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BiometricConfig, BiometricType } from '../entities/biometric-config.entity';
import { User } from '../../users/entities/user.entity';

export class EnrollBiometricDto {
  @IsEnum(BiometricType)
  biometricType: BiometricType;

  @IsString()
  deviceId: string;

  @IsOptional()
  @IsString()
  deviceName?: string;
}

export class VerifyBiometricDto {
  @IsString()
  userId: string;

  @IsString()
  deviceId: string;

  @IsString()
  challengeResponse: string;
}

@Injectable()
export class BiometricService {
  private readonly logger = new Logger(BiometricService.name);
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  constructor(
    @InjectRepository(BiometricConfig)
    private biometricRepository: Repository<BiometricConfig>,
    private jwtService: JwtService,
  ) {}

  /**
   * Enroll biometric authentication for a user
   */
  async enrollBiometric(
    user: User,
    dto: EnrollBiometricDto,
  ): Promise<{ challengeToken: string; config: BiometricConfig }> {
    try {
      // Check if biometric already enrolled for this device
      let config = await this.biometricRepository.findOne({
        where: {
          userId: user.id,
          deviceId: dto.deviceId,
        },
      });

      // Generate challenge token
      const challengeToken = this.generateChallengeToken();
      const hashedToken = await this.hashToken(challengeToken);

      if (config) {
        // Update existing configuration
        config.isEnabled = true;
        config.biometricType = dto.biometricType;
        config.deviceName = dto.deviceName || config.deviceName;
        config.challengeToken = hashedToken;
        config.failedAttempts = 0;
        config.lockedUntil = null;
      } else {
        // Create new configuration
        config = this.biometricRepository.create({
          userId: user.id,
          user,
          isEnabled: true,
          biometricType: dto.biometricType,
          deviceId: dto.deviceId,
          deviceName: dto.deviceName,
          challengeToken: hashedToken,
          failedAttempts: 0,
        });
      }

      await this.biometricRepository.save(config);

      this.logger.log(`Biometric enrolled for user ${user.id} on device ${dto.deviceId}`);

      return {
        challengeToken, // Return plaintext token to client (only once)
        config,
      };
    } catch (error) {
      this.logger.error('Failed to enroll biometric:', error);
      throw error;
    }
  }

  /**
   * Verify biometric authentication
   */
  async verifyBiometric(dto: VerifyBiometricDto): Promise<{
    success: true;
    accessToken: string;
    refreshToken: string;
    user: User;
  }> {
    try {
      const config = await this.biometricRepository.findOne({
        where: {
          userId: dto.userId,
          deviceId: dto.deviceId,
          isEnabled: true,
        },
        relations: ['user'],
      });

      if (!config) {
        throw new UnauthorizedException('Biometric not enrolled for this device');
      }

      // Check if account is locked
      if (config.lockedUntil && config.lockedUntil > new Date()) {
        const remainingTime = Math.ceil((config.lockedUntil.getTime() - Date.now()) / 60000);
        throw new UnauthorizedException(
          `Account temporarily locked. Try again in ${remainingTime} minutes.`,
        );
      }

      // Verify challenge response
      const isValid = await this.verifyToken(dto.challengeResponse, config.challengeToken);

      if (!isValid) {
        // Increment failed attempts
        config.failedAttempts += 1;

        if (config.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
          // Lock the account
          config.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MS);
          await this.biometricRepository.save(config);

          this.logger.warn(
            `Biometric locked for user ${dto.userId} due to ${config.failedAttempts} failed attempts`,
          );

          throw new UnauthorizedException(
            `Too many failed attempts. Account locked for 15 minutes.`,
          );
        }

        await this.biometricRepository.save(config);

        throw new UnauthorizedException('Biometric verification failed');
      }

      // Success - reset failed attempts and update usage
      config.failedAttempts = 0;
      config.lockedUntil = null;
      config.lastUsedAt = new Date();
      config.usageCount += 1;

      // Generate new challenge token for next authentication
      const newChallengeToken = this.generateChallengeToken();
      config.challengeToken = await this.hashToken(newChallengeToken);

      await this.biometricRepository.save(config);

      // Generate JWT tokens
      const payload = {
        sub: config.user.id,
        email: config.user.email,
        role: config.user.role,
      };

      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      this.logger.log(`Biometric authentication successful for user ${dto.userId}`);

      return {
        success: true,
        accessToken,
        refreshToken,
        user: config.user,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Biometric verification failed:', error);
      throw new UnauthorizedException('Biometric verification failed');
    }
  }

  /**
   * Get biometric configuration for user
   */
  async getBiometricConfig(userId: string, deviceId?: string): Promise<BiometricConfig[]> {
    const where: any = { userId, isEnabled: true };
    if (deviceId) {
      where.deviceId = deviceId;
    }

    return await this.biometricRepository.find({ where });
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometric(userId: string, deviceId: string): Promise<void> {
    const config = await this.biometricRepository.findOne({
      where: { userId, deviceId },
    });

    if (!config) {
      throw new BadRequestException('Biometric configuration not found');
    }

    config.isEnabled = false;
    await this.biometricRepository.save(config);

    this.logger.log(`Biometric disabled for user ${userId} on device ${deviceId}`);
  }

  /**
   * Delete biometric configuration (GDPR compliance)
   */
  async deleteBiometricConfig(userId: string, deviceId?: string): Promise<void> {
    const where: any = { userId };
    if (deviceId) {
      where.deviceId = deviceId;
    }

    await this.biometricRepository.delete(where);

    this.logger.log(`Deleted biometric config for user ${userId}`);
  }

  /**
   * Reset failed attempts (admin function)
   */
  async resetFailedAttempts(userId: string, deviceId: string): Promise<void> {
    await this.biometricRepository.update(
      { userId, deviceId },
      {
        failedAttempts: 0,
        lockedUntil: null,
      },
    );

    this.logger.log(`Reset failed attempts for user ${userId} on device ${deviceId}`);
  }

  /**
   * Generate a random challenge token
   */
  private generateChallengeToken(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  /**
   * Hash a token using SHA-256
   */
  private async hashToken(token: string): Promise<string> {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Verify token against stored hash
   */
  private async verifyToken(token: string, hashedToken: string): Promise<boolean> {
    const hash = await this.hashToken(token);
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashedToken));
  }

  /**
   * Get biometric usage statistics
   */
  async getBiometricStats(userId: string): Promise<{
    totalDevices: number;
    totalUsages: number;
    lastUsed: Date | null;
    devices: Array<{
      deviceId: string;
      deviceName: string;
      biometricType: BiometricType;
      usageCount: number;
      lastUsedAt: Date;
    }>;
  }> {
    const configs = await this.biometricRepository.find({
      where: { userId, isEnabled: true },
      order: { lastUsedAt: 'DESC' },
    });

    const totalUsages = configs.reduce((sum, config) => sum + config.usageCount, 0);
    const lastUsed = configs.length > 0 ? configs[0].lastUsedAt : null;

    return {
      totalDevices: configs.length,
      totalUsages,
      lastUsed,
      devices: configs.map((config) => ({
        deviceId: config.deviceId,
        deviceName: config.deviceName,
        biometricType: config.biometricType,
        usageCount: config.usageCount,
        lastUsedAt: config.lastUsedAt,
      })),
    };
  }
}

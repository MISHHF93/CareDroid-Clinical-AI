import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DeviceToken, DevicePlatform } from '../entities/device-token.entity';
import { User } from '../../users/entities/user.entity';

export class RegisterDeviceDto {
  @IsString()
  token: string;

  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @IsOptional()
  @IsString()
  deviceModel?: string;

  @IsOptional()
  @IsString()
  osVersion?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;
}

@Injectable()
export class DeviceTokenService {
  private readonly logger = new Logger(DeviceTokenService.name);

  constructor(
    @InjectRepository(DeviceToken)
    private deviceTokenRepository: Repository<DeviceToken>,
  ) {}

  /**
   * Register or update a device token for a user
   */
  async registerDeviceToken(user: User, dto: RegisterDeviceDto): Promise<DeviceToken> {
    try {
      // Check if token already exists for this user
      let deviceToken = await this.deviceTokenRepository.findOne({
        where: {
          user: { id: user.id },
          token: dto.token,
        },
      });

      if (deviceToken) {
        // Update existing token
        deviceToken.platform = dto.platform;
        deviceToken.deviceModel = dto.deviceModel;
        deviceToken.osVersion = dto.osVersion;
        deviceToken.appVersion = dto.appVersion;
        deviceToken.isActive = true;
        deviceToken.lastUsedAt = new Date();

        this.logger.log(`Updated device token for user ${user.id}`);
      } else {
        // Create new token
        deviceToken = this.deviceTokenRepository.create({
          user,
          token: dto.token,
          platform: dto.platform,
          deviceModel: dto.deviceModel,
          osVersion: dto.osVersion,
          appVersion: dto.appVersion,
          isActive: true,
          lastUsedAt: new Date(),
        });

        this.logger.log(`Registered new device token for user ${user.id}`);
      }

      return await this.deviceTokenRepository.save(deviceToken);
    } catch (error) {
      this.logger.error(`Failed to register device token:`, error);
      throw error;
    }
  }

  /**
   * Get all active device tokens for a user
   */
  async getUserDeviceTokens(userId: string): Promise<DeviceToken[]> {
    return await this.deviceTokenRepository.find({
      where: {
        user: { id: userId },
        isActive: true,
      },
      order: {
        lastUsedAt: 'DESC',
      },
    });
  }

  /**
   * Get all active tokens (for user)
   */
  async getActiveTokens(userId: string): Promise<string[]> {
    const devices = await this.getUserDeviceTokens(userId);
    return devices.map((device) => device.token);
  }

  /**
   * Mark a token as inactive (soft delete)
   */
  async deactivateToken(userId: string, token: string): Promise<void> {
    const deviceToken = await this.deviceTokenRepository.findOne({
      where: {
        user: { id: userId },
        token,
      },
    });

    if (!deviceToken) {
      throw new NotFoundException('Device token not found');
    }

    deviceToken.isActive = false;
    await this.deviceTokenRepository.save(deviceToken);

    this.logger.log(`Deactivated token for user ${userId}`);
  }

  /**
   * Remove a device token completely
   */
  async removeDeviceToken(userId: string, tokenOrDeviceId: string): Promise<void> {
    const deviceToken = await this.deviceTokenRepository.findOne({
      where: [
        { user: { id: userId }, token: tokenOrDeviceId },
        { user: { id: userId }, id: tokenOrDeviceId },
      ],
    });

    if (!deviceToken) {
      throw new NotFoundException('Device token not found');
    }

    await this.deviceTokenRepository.delete({ id: deviceToken.id });

    this.logger.log(`Removed device token for user ${userId}`);
  }

  /**
   * Mark token as invalid (e.g., FCM reports invalid token)
   */
  async markTokenAsInvalid(token: string): Promise<void> {
    await this.deviceTokenRepository.update({ token }, { isActive: false });

    this.logger.log(`Marked token as invalid: ${token.substring(0, 20)}...`);
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(token: string): Promise<void> {
    await this.deviceTokenRepository.update({ token }, { lastUsedAt: new Date() });
  }

  /**
   * Get all tokens for multiple users
   */
  async getTokensForUsers(userIds: string[]): Promise<Map<string, string[]>> {
    const devices = await this.deviceTokenRepository.find({
      where: {
        user: { id: In(userIds) } as any,
        isActive: true,
      },
      relations: ['user'],
    });

    const tokenMap = new Map<string, string[]>();

    devices.forEach((device) => {
      const userId = device.user.id;
      if (!tokenMap.has(userId)) {
        tokenMap.set(userId, []);
      }
      tokenMap.get(userId).push(device.token);
    });

    return tokenMap;
  }

  /**
   * Clean up old inactive tokens (run periodically)
   */
  async cleanupOldTokens(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.deviceTokenRepository
      .createQueryBuilder()
      .delete()
      .where('isActive = :isActive', { isActive: false })
      .andWhere('updatedAt < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(`Cleaned up ${result.affected} old device tokens`);

    return result.affected || 0;
  }
}

// Helper import
import { In } from 'typeorm';

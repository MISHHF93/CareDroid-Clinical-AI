import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import {
  BiometricService,
  EnrollBiometricDto,
  VerifyBiometricDto,
} from './services/biometric.service';
import { BiometricType } from './entities/biometric-config.entity';

@ApiTags('auth/biometric')
@Controller('auth/biometric')
export class BiometricController {
  constructor(private biometricService: BiometricService) {}

  /**
   * Enroll biometric authentication
   */
  @Post('enroll')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enroll biometric authentication' })
  @ApiResponse({ status: 201, description: 'Biometric enrolled successfully' })
  async enrollBiometric(@Request() req, @Body() dto: EnrollBiometricDto) {
    const { challengeToken, config } = await this.biometricService.enrollBiometric(req.user, dto);

    return {
      success: true,
      message: 'Biometric enrolled successfully',
      challengeToken, // Client must store this securely
      config: {
        id: config.id,
        biometricType: config.biometricType,
        deviceId: config.deviceId,
        deviceName: config.deviceName,
      },
    };
  }

  /**
   * Verify biometric and authenticate
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify biometric and authenticate' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Authentication failed' })
  async verifyBiometric(@Body() dto: VerifyBiometricDto) {
    const result = await this.biometricService.verifyBiometric(dto);

    return {
      success: true,
      message: 'Authentication successful',
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
      },
    };
  }

  /**
   * Get biometric configuration
   */
  @Get('config')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get biometric configuration' })
  async getBiometricConfig(@Request() req) {
    const configs = await this.biometricService.getBiometricConfig(req.user.id);

    return {
      success: true,
      configs: configs.map((config) => ({
        id: config.id,
        biometricType: config.biometricType,
        deviceId: config.deviceId,
        deviceName: config.deviceName,
        lastUsedAt: config.lastUsedAt,
        usageCount: config.usageCount,
        createdAt: config.createdAt,
      })),
    };
  }

  /**
   * Get biometric usage statistics
   */
  @Get('stats')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get biometric usage statistics' })
  async getBiometricStats(@Request() req) {
    const stats = await this.biometricService.getBiometricStats(req.user.id);

    return {
      success: true,
      stats,
    };
  }

  /**
   * Disable biometric for a device
   */
  @Delete('disable/:deviceId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disable biometric authentication' })
  async disableBiometric(@Request() req, @Param('deviceId') deviceId: string) {
    await this.biometricService.disableBiometric(req.user.id, deviceId);

    return {
      success: true,
      message: 'Biometric disabled successfully',
    };
  }

  /**
   * Delete biometric configuration
   */
  @Delete('delete/:deviceId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete biometric configuration' })
  async deleteBiometricConfig(@Request() req, @Param('deviceId') deviceId: string) {
    await this.biometricService.deleteBiometricConfig(req.user.id, deviceId);

    return {
      success: true,
      message: 'Biometric configuration deleted',
    };
  }

  /**
   * Check biometric availability
   */
  @Get('available')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if biometric is available for device' })
  async checkBiometricAvailable(@Request() req) {
    // This endpoint is primarily for client-side to check server-side support
    // Actual biometric availability is checked on the client device

    const configs = await this.biometricService.getBiometricConfig(req.user.id);

    return {
      success: true,
      serverSupport: true,
      enrolledDevices: configs.length,
      supportedTypes: [BiometricType.FINGERPRINT, BiometricType.FACE, BiometricType.IRIS],
    };
  }
}

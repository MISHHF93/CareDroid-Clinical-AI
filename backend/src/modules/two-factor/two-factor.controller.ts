import { Controller, Post, Get, Body, UseGuards, Req, Delete, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { TwoFactorService } from './two-factor.service';
import { EnableTwoFactorDto, VerifyTwoFactorDto } from './dto/two-factor.dto';
import { SkipTenantIsolation } from '../tenant-context/tenant-scope.decorator';

// Same ceiling as auth.controller.ts's login/register/verify-2fa brute-force
// guard -- these routes accept a TOTP/backup-code guess from an authenticated
// session, so an attacker holding a stolen/hijacked JWT but not the victim's
// authenticator app must face the same throttle a pre-session guesser does.
const TWO_FACTOR_GUARD_LIMIT = { default: { limit: 10, ttl: 60000 } };

/**
 * Every route here operates purely on req.user.id (the caller's own 2FA
 * settings) with no organization/workspace-scoped data, so this controller
 * is exempt from tenant isolation -- users must be able to manage their own
 * 2FA before joining or creating any organization, matching the same
 * bootstrap-safety reasoning already applied to /organizations (current/
 * create) and /auth/me.
 */
@ApiTags('two-factor')
@Controller('two-factor')
@UseGuards(AuthGuard('jwt'))
@SkipTenantIsolation()
@ApiBearerAuth()
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @Get('generate')
  @ApiOperation({ summary: 'Generate 2FA secret and QR code' })
  @ApiResponse({ status: 200, description: 'Secret and QR code generated' })
  async generateSecret(@Req() req: any) {
    return this.twoFactorService.generateSecret(req.user.id);
  }

  @Post('enable')
  @HttpCode(200)
  @ApiOperation({ summary: 'Enable 2FA with verification' })
  @ApiResponse({ status: 200, description: '2FA enabled successfully' })
  async enable(@Req() req: any, @Body() dto: EnableTwoFactorDto) {
    return this.twoFactorService.enable(req.user.id, dto.secret, dto.token);
  }

  @Delete('disable')
  @UseGuards(ThrottlerGuard)
  @Throttle(TWO_FACTOR_GUARD_LIMIT)
  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  async disable(@Req() req: any, @Body() dto: VerifyTwoFactorDto) {
    return this.twoFactorService.disable(req.user.id, dto.token);
  }

  @Post('verify')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle(TWO_FACTOR_GUARD_LIMIT)
  @ApiOperation({ summary: 'Verify 2FA token' })
  @ApiResponse({ status: 200, description: 'Token verified' })
  async verify(@Req() req: any, @Body() dto: VerifyTwoFactorDto) {
    const isValid = await this.twoFactorService.verifyToken(req.user.id, dto.token);
    return { valid: isValid };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get 2FA status' })
  @ApiResponse({ status: 200, description: '2FA status' })
  async getStatus(@Req() req: any) {
    return this.twoFactorService.getStatus(req.user.id);
  }
}

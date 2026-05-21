import { Controller, Post, Get, Body, UseGuards, Req, Delete, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TwoFactorService } from './two-factor.service';
import { EnableTwoFactorDto, VerifyTwoFactorDto } from './dto/two-factor.dto';

@ApiTags('two-factor')
@Controller('two-factor')
@UseGuards(AuthGuard('jwt'))
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
  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  async disable(@Req() req: any, @Body() dto: VerifyTwoFactorDto) {
    return this.twoFactorService.disable(req.user.id, dto.token);
  }

  @Post('verify')
  @HttpCode(200)
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

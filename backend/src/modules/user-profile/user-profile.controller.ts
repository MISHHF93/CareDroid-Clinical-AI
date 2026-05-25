import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UpdateOperationalProfileDto } from './dto/update-operational-profile.dto';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { UserProfileService } from './user-profile.service';

@ApiTags('profile')
@Controller('profile')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current-user operational profile' })
  async me(@Req() req: any) {
    return this.userProfileService.getOperationalProfile(req.user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current-user operational profile' })
  async update(@Req() req: any, @Body() dto: UpdateOperationalProfileDto) {
    return this.userProfileService.updateOperationalProfile(
      req.user.id,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get('me/preferences')
  @ApiOperation({ summary: 'Get current-user profile preferences' })
  async preferences(@Req() req: any) {
    return this.userProfileService.getPreferences(req.user.id);
  }

  @Patch('me/preferences')
  @ApiOperation({ summary: 'Update current-user profile preferences' })
  async updatePreferences(@Req() req: any, @Body() dto: UpdateUserPreferencesDto) {
    return this.userProfileService.updatePreferences(
      req.user.id,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get('me/activity')
  @ApiOperation({ summary: 'Get current-user safe profile activity' })
  async activity(@Req() req: any) {
    return this.userProfileService.getActivity(req.user.id);
  }

  @Get('me/security')
  @ApiOperation({ summary: 'Get current-user profile security summary' })
  async security(@Req() req: any) {
    return this.userProfileService.getSecurity(req.user.id);
  }
}

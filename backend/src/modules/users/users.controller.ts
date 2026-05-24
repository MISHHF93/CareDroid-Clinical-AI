import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Req() req: any) {
    return this.usersService.findById(req.user.id, req.user.id, req.ip, req.headers['user-agent']);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @RequirePermission(Permission.WRITE_PHI)
  async updateProfile(@Req() req: any, @Body() updates: UpdateProfileDto) {
    return this.usersService.updateProfile(
      req.user.id,
      updates,
      req.user.id,
      req.ip,
      req.headers['user-agent'],
    );
  }
}

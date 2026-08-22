import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { UpdateProfileDto } from './dto/update-profile.dto';

// HEAL follow-up (mass-assignment/excessive-exposure audit): User.passwordHash,
// emailEncrypted, phoneEncrypted, ssnEncrypted, emailVerificationToken, and
// passwordResetToken are all @Exclude()'d on the entity, but that annotation
// is dead metadata without ClassSerializerInterceptor actually running --
// this controller returned the raw entity from findById()/updateProfile(),
// serializing every one of those fields verbatim (including a currently-
// PENDING password-reset token) to any authenticated caller. Scoped to this
// controller rather than registered globally in main.ts to avoid touching
// this session's own SSE stream fix (emergency-realtime.controller.ts's
// @Sse() route) or any other response shape with zero test coverage for
// that interaction.
@ApiTags('users')
@Controller('users')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@UseInterceptors(ClassSerializerInterceptor)
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

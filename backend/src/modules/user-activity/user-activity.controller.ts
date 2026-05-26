import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RecordUserActivityDto } from './dto/record-user-activity.dto';
import { UserActivityService } from './user-activity.service';

@ApiTags('activity')
@Controller('activity')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class UserActivityController {
  constructor(private readonly activityService: UserActivityService) {}

  @Post()
  @ApiOperation({ summary: 'Record safe current-user activity metadata' })
  async record(@Req() req: any, @Body() dto: RecordUserActivityDto) {
    return this.activityService.record(req.user.id, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'List safe current-user activity' })
  async mine(@Req() req: any, @Query('limit') limit?: string) {
    return {
      activities: await this.activityService.listForUser(req.user.id, Number(limit) || 30),
    };
  }

  @Get('me/summary')
  @ApiOperation({ summary: 'Get current-user activity summary buckets' })
  async summary(@Req() req: any) {
    return this.activityService.summaryForUser(req.user.id);
  }

  @Get('workspaces/:workspaceId')
  @ApiOperation({ summary: 'List safe activity for a workspace' })
  async workspace(@Param('workspaceId') workspaceId: string, @Query('limit') limit?: string) {
    return {
      activities: await this.activityService.listForWorkspace(workspaceId, Number(limit) || 30),
    };
  }
}

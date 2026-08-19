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
    // HEAL-347.31: dto.workspaceId is client-supplied and was trusted
    // verbatim -- any authenticated user (of ANY workspace) could POST an
    // arbitrary other workspace's UUID and have a fabricated entry appear
    // in that workspace's real members' activity feed, since GET
    // /activity/workspaces/:workspaceId (below) only checks membership on
    // read, not on write. Same check the sibling read route already has.
    if (dto.workspaceId) {
      await this.activityService.assertWorkspaceMember(req.user.id, dto.workspaceId);
    }
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
  async workspace(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Query('limit') limit?: string,
  ) {
    await this.activityService.assertWorkspaceMember(req.user.id, workspaceId);
    return {
      activities: await this.activityService.listForWorkspace(workspaceId, Number(limit) || 30),
    };
  }
}

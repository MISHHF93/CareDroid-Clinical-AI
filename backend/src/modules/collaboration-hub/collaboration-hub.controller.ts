import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipTenantIsolation } from '../tenant-context/tenant-scope.decorator';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { CollaborationHubService } from './collaboration-hub.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { PostMessageDto } from './dto/post-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { AddReactionDto } from './dto/add-reaction.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UploadAttachmentDto } from './dto/upload-attachment.dto';
import { LinkExternalProviderDto } from './dto/link-external-provider.dto';
import { CollaborationExternalProvider } from './entities/collaboration-external-link.entity';

/**
 * All endpoints are @SkipTenantIsolation() because none carry an
 * :organizationId/:workspaceId path parameter for TenantIsolationGuard's
 * cross-tenant path-matching to validate — request.tenantContext is still
 * populated by the global TenantContextInterceptor regardless of this
 * decorator (see backend/src/modules/tenant-context/tenant-context.interceptor.ts),
 * so req.tenantContext.organizationId below is always available. Authorization
 * within an organization is enforced at the channel-membership level in
 * CollaborationHubService (see assertAccess()), the same way Slack/Teams scope
 * access by channel membership rather than by path-parameter tenant matching.
 */
@ApiTags('collaboration')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@SkipTenantIsolation()
@Controller('collaboration')
export class CollaborationHubController {
  constructor(private readonly collaborationHubService: CollaborationHubService) {}

  private context(req: any) {
    return { ipAddress: req.ip || '0.0.0.0', userAgent: req.headers?.['user-agent'] || 'unknown' };
  }

  private organizationId(req: any): string {
    return req.tenantContext?.organizationId;
  }

  @Get('channels')
  @ApiOperation({
    summary: 'List channels the current user belongs to, auto-joining department channels',
  })
  async listChannels(@Req() req: any) {
    return this.collaborationHubService.listChannelsForUser(req.user.id, this.organizationId(req));
  }

  @Post('channels')
  @ApiOperation({ summary: 'Create a channel (direct message, announcement, or ad hoc)' })
  async createChannel(@Req() req: any, @Body() dto: CreateChannelDto) {
    return this.collaborationHubService.createChannel(
      req.user.id,
      this.organizationId(req),
      req.tenantContext?.workspaceId || null,
      dto,
    );
  }

  @Post('channels/:channelId/archive')
  @ApiOperation({ summary: 'Archive a channel' })
  async archiveChannel(@Req() req: any, @Param('channelId') channelId: string) {
    return this.collaborationHubService.archiveChannel(
      this.organizationId(req),
      channelId,
      req.user.id,
    );
  }

  @Get('channels/:channelId/messages')
  @ApiOperation({ summary: 'List messages for a channel (or a thread within it)' })
  async listMessages(
    @Req() req: any,
    @Param('channelId') channelId: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
    @Query('threadRootId') threadRootId?: string,
  ) {
    return this.collaborationHubService.listMessages(
      req.user.id,
      this.organizationId(req),
      channelId,
      {
        before,
        limit: limit ? Number(limit) : undefined,
        threadRootId,
      },
    );
  }

  @Post('channels/:channelId/messages')
  @ApiOperation({ summary: 'Post a message into a channel or thread' })
  async postMessage(
    @Req() req: any,
    @Param('channelId') channelId: string,
    @Body() dto: PostMessageDto,
  ) {
    return this.collaborationHubService.postMessage(
      req.user.id,
      this.organizationId(req),
      channelId,
      dto,
      this.context(req),
    );
  }

  @Patch('messages/:messageId')
  @ApiOperation({ summary: 'Edit a message you sent' })
  async editMessage(
    @Req() req: any,
    @Param('messageId') messageId: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.collaborationHubService.editMessage(req.user.id, messageId, dto, this.context(req));
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Soft-delete a message you sent (or moderate as channel owner)' })
  async deleteMessage(@Req() req: any, @Param('messageId') messageId: string) {
    await this.collaborationHubService.deleteMessage(req.user.id, messageId, this.context(req));
    return { ok: true };
  }

  @Post('messages/:messageId/reactions')
  @ApiOperation({ summary: 'React to a message' })
  async addReaction(
    @Req() req: any,
    @Param('messageId') messageId: string,
    @Body() dto: AddReactionDto,
  ) {
    return this.collaborationHubService.addReaction(
      req.user.id,
      this.organizationId(req),
      messageId,
      dto.emoji,
    );
  }

  @Delete('messages/:messageId/reactions/:emoji')
  @ApiOperation({ summary: 'Remove your reaction from a message' })
  async removeReaction(
    @Req() req: any,
    @Param('messageId') messageId: string,
    @Param('emoji') emoji: string,
  ) {
    await this.collaborationHubService.removeReaction(
      req.user.id,
      this.organizationId(req),
      messageId,
      emoji,
    );
    return { ok: true };
  }

  @Post('messages/:messageId/pin')
  @ApiOperation({ summary: 'Pin a message' })
  async pinMessage(@Req() req: any, @Param('messageId') messageId: string) {
    return this.collaborationHubService.pinMessage(
      req.user.id,
      this.organizationId(req),
      messageId,
    );
  }

  @Delete('messages/:messageId/pin')
  @ApiOperation({ summary: 'Unpin a message' })
  async unpinMessage(@Req() req: any, @Param('messageId') messageId: string) {
    return this.collaborationHubService.unpinMessage(
      req.user.id,
      this.organizationId(req),
      messageId,
    );
  }

  @Get('channels/:channelId/pinned')
  @ApiOperation({ summary: 'List pinned messages in a channel' })
  async listPinned(@Req() req: any, @Param('channelId') channelId: string) {
    return this.collaborationHubService.listPinnedMessages(
      req.user.id,
      this.organizationId(req),
      channelId,
    );
  }

  @Post('channels/:channelId/read')
  @ApiOperation({ summary: 'Advance your read cursor for a channel' })
  async markRead(@Req() req: any, @Param('channelId') channelId: string, @Body() dto: MarkReadDto) {
    return this.collaborationHubService.markRead(
      req.user.id,
      this.organizationId(req),
      channelId,
      dto,
    );
  }

  @Patch('channels/:channelId/membership')
  @ApiOperation({ summary: 'Update your notification preference for a channel' })
  async updateMembership(
    @Req() req: any,
    @Param('channelId') channelId: string,
    @Body() dto: UpdateMembershipDto,
  ) {
    return this.collaborationHubService.updateMembershipPreference(
      req.user.id,
      this.organizationId(req),
      channelId,
      dto,
    );
  }

  @Post('channels/:channelId/typing')
  @ApiOperation({ summary: 'Broadcast a typing indicator (ephemeral, not persisted)' })
  async typing(
    @Req() req: any,
    @Param('channelId') channelId: string,
    @Body() body: { isTyping: boolean },
  ) {
    this.collaborationHubService.broadcastTyping(channelId, req.user.id, Boolean(body?.isTyping));
    return { ok: true };
  }

  @Post('messages/:messageId/attachments')
  @ApiOperation({ summary: 'Attach a file to a message (base64-encoded payload)' })
  async uploadAttachment(
    @Req() req: any,
    @Param('messageId') messageId: string,
    @Body() dto: UploadAttachmentDto,
  ) {
    return this.collaborationHubService.uploadAttachment(
      req.user.id,
      this.organizationId(req),
      messageId,
      dto,
    );
  }

  @Post('channels/:channelId/external-links')
  @ApiOperation({ summary: 'Link a channel to an external provider (e.g. Slack)' })
  async linkExternalProvider(
    @Req() req: any,
    @Param('channelId') channelId: string,
    @Body() dto: LinkExternalProviderDto,
  ) {
    return this.collaborationHubService.linkExternalProvider(
      req.user.id,
      this.organizationId(req),
      channelId,
      dto,
    );
  }

  @Delete('channels/:channelId/external-links/:provider')
  @ApiOperation({ summary: 'Remove an external provider mirror from a channel' })
  async unlinkExternalProvider(
    @Req() req: any,
    @Param('channelId') channelId: string,
    @Param('provider') provider: CollaborationExternalProvider,
  ) {
    await this.collaborationHubService.unlinkExternalProvider(
      req.user.id,
      this.organizationId(req),
      channelId,
      provider,
    );
    return { ok: true };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search message history across channels you belong to' })
  async search(@Req() req: any, @Query('query') query: string) {
    return this.collaborationHubService.searchMessages(
      req.user.id,
      this.organizationId(req),
      query || '',
    );
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('patients/:patientId/thread')
  @ApiOperation({ summary: "Get or create the patient's auto-thread and join it" })
  async getPatientThread(@Req() req: any, @Param('patientId') patientId: string) {
    return this.collaborationHubService.getOrCreatePatientThread(
      this.organizationId(req),
      patientId,
      req.tenantContext?.workspaceId || null,
      req.user.id,
    );
  }

  @Post('incidents')
  @ApiOperation({
    summary: 'Manually open an incident channel (mass casualty, code blue, operational emergency)',
  })
  async createIncident(@Req() req: any, @Body() dto: CreateIncidentDto) {
    const { channel, created } = await this.collaborationHubService.createIncidentChannel(
      this.organizationId(req),
      { ...dto, createdByUserId: req.user.id },
    );
    if (created) {
      await this.collaborationHubService.postSystemMessage(channel.id, {
        body: `Incident channel opened: ${dto.title} (${dto.severity}). ${dto.description || ''}`.trim(),
      });
    }
    return channel;
  }

  @Post('incidents/:channelId/resolve')
  @ApiOperation({ summary: 'Resolve and archive an incident channel' })
  async resolveIncident(@Req() req: any, @Param('channelId') channelId: string) {
    return this.collaborationHubService.resolveIncidentChannel(
      this.organizationId(req),
      channelId,
      req.user.id,
    );
  }

  @RequirePermission(Permission.VIEW_ANALYTICS)
  @Get('analytics/summary')
  @ApiOperation({
    summary:
      'Communication analytics: volume, unresolved mentions, incident resolution time, first-reply latency',
  })
  async analyticsSummary(@Req() req: any, @Query('windowDays') windowDays?: string) {
    return this.collaborationHubService.getAnalyticsSummary(
      this.organizationId(req),
      windowDays ? Number(windowDays) : undefined,
    );
  }
}

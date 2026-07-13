import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/services/notification.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import {
  CollaborationChannel,
  CollaborationChannelStatus,
  CollaborationChannelType,
  CollaborationDepartmentKey,
} from './entities/collaboration-channel.entity';
import {
  CollaborationChannelMembership,
  CollaborationChannelMembershipRole,
  CollaborationChannelMembershipStatus,
  CollaborationNotificationPreference,
} from './entities/collaboration-channel-membership.entity';
import {
  CollaborationMessage,
  CollaborationMessageSenderType,
  CollaborationMessageSourceType,
} from './entities/collaboration-message.entity';
import { CollaborationMessageReaction } from './entities/collaboration-message-reaction.entity';
import {
  CollaborationAttachment,
  CollaborationAttachmentKind,
} from './entities/collaboration-attachment.entity';
import {
  CollaborationExternalLink,
  CollaborationExternalProvider,
} from './entities/collaboration-external-link.entity';
import { CollaborationRealtimeService } from './collaboration-realtime.service';
import { CollaborationProviderRegistry } from './providers/collaboration-provider.registry';
import { LocalDiskAttachmentStorageProvider } from './providers/attachment-storage.provider';
import { CreateChannelDto } from './dto/create-channel.dto';
import { PostMessageDto } from './dto/post-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { UploadAttachmentDto } from './dto/upload-attachment.dto';
import { LinkExternalProviderDto } from './dto/link-external-provider.dto';

export interface RequestContext {
  ipAddress: string;
  userAgent: string;
}

const DEPARTMENT_CHANNEL_NAMES: Record<CollaborationDepartmentKey, string> = {
  [CollaborationDepartmentKey.EMERGENCY_DEPARTMENT]: 'Emergency Department',
  [CollaborationDepartmentKey.RECEPTION]: 'Reception',
  [CollaborationDepartmentKey.TRIAGE]: 'Triage',
  [CollaborationDepartmentKey.EMS]: 'EMS',
  [CollaborationDepartmentKey.CHARGE_NURSES]: 'Charge Nurses',
  [CollaborationDepartmentKey.PHYSICIANS]: 'Physicians',
  [CollaborationDepartmentKey.LABORATORY]: 'Laboratory',
  [CollaborationDepartmentKey.RADIOLOGY]: 'Radiology',
  [CollaborationDepartmentKey.PHARMACY]: 'Pharmacy',
  [CollaborationDepartmentKey.PATIENT_FLOW]: 'Patient Flow',
  [CollaborationDepartmentKey.HOSPITAL_OPERATIONS]: 'Hospital Operations',
  [CollaborationDepartmentKey.ADMINISTRATION]: 'Administration',
  [CollaborationDepartmentKey.IT_OPERATIONS]: 'IT Operations',
  [CollaborationDepartmentKey.QUALITY_SAFETY]: 'Quality & Safety',
  [CollaborationDepartmentKey.INCIDENT_RESPONSE]: 'Incident Response',
};

export interface AnalyticsSummary {
  windowDays: number;
  collaborationVolume: { totalMessages: number; byChannelType: Record<string, number> };
  unresolvedMentions: number;
  incidentChannels: { created: number; resolved: number; averageResolutionMinutes: number | null };
  averageFirstReplyMinutes: number | null;
  generatedAt: string;
}

@Injectable()
export class CollaborationHubService {
  private readonly logger = new Logger(CollaborationHubService.name);

  constructor(
    @InjectRepository(CollaborationChannel)
    private readonly channelRepo: Repository<CollaborationChannel>,
    @InjectRepository(CollaborationChannelMembership)
    private readonly membershipRepo: Repository<CollaborationChannelMembership>,
    @InjectRepository(CollaborationMessage)
    private readonly messageRepo: Repository<CollaborationMessage>,
    @InjectRepository(CollaborationMessageReaction)
    private readonly reactionRepo: Repository<CollaborationMessageReaction>,
    @InjectRepository(CollaborationAttachment)
    private readonly attachmentRepo: Repository<CollaborationAttachment>,
    @InjectRepository(CollaborationExternalLink)
    private readonly externalLinkRepo: Repository<CollaborationExternalLink>,
    private readonly realtimeService: CollaborationRealtimeService,
    private readonly providerRegistry: CollaborationProviderRegistry,
    private readonly attachmentStorage: LocalDiskAttachmentStorageProvider,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
  ) {}

  // ---------------------------------------------------------------------
  // Department channel seeding
  // ---------------------------------------------------------------------

  async ensureDefaultDepartmentChannels(organizationId: string): Promise<CollaborationChannel[]> {
    const existing = await this.channelRepo.find({
      where: { organizationId, type: CollaborationChannelType.DEPARTMENT },
    });
    const existingKeys = new Set(existing.map((channel) => channel.departmentKey));

    const missing = Object.values(CollaborationDepartmentKey).filter(
      (key) => !existingKeys.has(key),
    );
    if (missing.length === 0) return existing;

    const created = await this.channelRepo.save(
      missing.map((departmentKey) =>
        this.channelRepo.create({
          organizationId,
          type: CollaborationChannelType.DEPARTMENT,
          name: DEPARTMENT_CHANNEL_NAMES[departmentKey],
          departmentKey,
          isSystemManaged: true,
          status: CollaborationChannelStatus.ACTIVE,
        }),
      ),
    );

    return [...existing, ...created];
  }

  // ---------------------------------------------------------------------
  // Channel listing / membership
  // ---------------------------------------------------------------------

  /**
   * Batched by design: the original version ran ensureMembership() (a
   * findOne + maybe save) once per department channel on every single call,
   * i.e. up to 15 sequential round-trips per request — and this endpoint is
   * hit on every page load plus every realtime poll cycle. This version does
   * a fixed 3-4 queries regardless of department count, and performs zero
   * writes once a user is already a member of every department channel
   * (the steady-state case for almost every call after the first).
   */
  async listChannelsForUser(userId: string, organizationId: string) {
    const departmentChannels = await this.ensureDefaultDepartmentChannels(organizationId);

    const memberships = await this.membershipRepo.find({
      where: { userId, status: CollaborationChannelMembershipStatus.ACTIVE },
    });
    const memberChannelIds = new Set(memberships.map((m) => m.channelId));

    const missingDepartmentChannels = departmentChannels.filter(
      (channel) =>
        channel.status === CollaborationChannelStatus.ACTIVE && !memberChannelIds.has(channel.id),
    );
    if (missingDepartmentChannels.length > 0) {
      const newMemberships = await this.membershipRepo.save(
        missingDepartmentChannels.map((channel) =>
          this.membershipRepo.create({
            channelId: channel.id,
            userId,
            role: CollaborationChannelMembershipRole.MEMBER,
            status: CollaborationChannelMembershipStatus.ACTIVE,
            notificationPreference: CollaborationNotificationPreference.ALL,
            joinedAt: new Date(),
          }),
        ),
      );
      memberships.push(...newMemberships);
    }

    const channelIds = memberships.map((membership) => membership.channelId);
    if (channelIds.length === 0) return [];

    const channels = await this.channelRepo.find({
      where: { id: In(channelIds), organizationId },
    });
    const membershipByChannel = new Map(memberships.map((m) => [m.channelId, m]));

    return channels
      .filter((channel) => channel.status === CollaborationChannelStatus.ACTIVE)
      .map((channel) => ({ channel, membership: membershipByChannel.get(channel.id) }));
  }

  async listMemberChannelIds(userId: string): Promise<Set<string>> {
    if (!userId) return new Set();
    const memberships = await this.membershipRepo.find({
      where: { userId, status: CollaborationChannelMembershipStatus.ACTIVE },
    });
    return new Set(memberships.map((m) => m.channelId));
  }

  /**
   * Every user-facing lookup MUST go through this (org-scoped), not a bare
   * findOne — a channelId/messageId alone is not enough to prove the caller's
   * organization owns it. Without the organizationId filter here, assertAccess()
   * still "works" per its own membership logic, but for DEPARTMENT channels it
   * auto-joins on first reference regardless of org, which previously let any
   * authenticated user from ANY hospital org join, read, and post into another
   * hospital's department channel just by knowing/guessing its channel id.
   * Internal system paths that already own a trusted channelId (e.g.
   * postSystemMessage, called only with channels the calling service just
   * created or fetched itself) use findChannelByIdUnscoped instead.
   */
  async getChannel(channelId: string, organizationId: string): Promise<CollaborationChannel> {
    const channel = await this.channelRepo.findOne({ where: { id: channelId, organizationId } });
    if (!channel) throw new NotFoundException('Channel not found.');
    return channel;
  }

  private async findChannelByIdUnscoped(channelId: string): Promise<CollaborationChannel> {
    const channel = await this.channelRepo.findOne({ where: { id: channelId } });
    if (!channel) throw new NotFoundException('Channel not found.');
    return channel;
  }

  private async ensureMembership(
    channelId: string,
    userId: string,
    role: CollaborationChannelMembershipRole = CollaborationChannelMembershipRole.MEMBER,
  ): Promise<CollaborationChannelMembership> {
    const existing = await this.membershipRepo.findOne({ where: { channelId, userId } });
    if (existing) {
      if (existing.status === CollaborationChannelMembershipStatus.REMOVED) {
        existing.status = CollaborationChannelMembershipStatus.ACTIVE;
        return this.membershipRepo.save(existing);
      }
      return existing;
    }
    return this.membershipRepo.save(
      this.membershipRepo.create({
        channelId,
        userId,
        role,
        status: CollaborationChannelMembershipStatus.ACTIVE,
        notificationPreference: CollaborationNotificationPreference.ALL,
        joinedAt: new Date(),
      }),
    );
  }

  /** Department channels auto-join on first reference; every other channel type requires explicit membership. */
  private async assertAccess(channel: CollaborationChannel, userId: string): Promise<void> {
    if (channel.type === CollaborationChannelType.DEPARTMENT) {
      await this.ensureMembership(channel.id, userId);
      return;
    }
    const membership = await this.membershipRepo.findOne({
      where: { channelId: channel.id, userId },
    });
    if (!membership || membership.status !== CollaborationChannelMembershipStatus.ACTIVE) {
      throw new ForbiddenException('You are not a member of this channel.');
    }
  }

  // ---------------------------------------------------------------------
  // Channel creation
  // ---------------------------------------------------------------------

  async createChannel(
    userId: string,
    organizationId: string,
    workspaceId: string | null,
    dto: CreateChannelDto,
  ): Promise<CollaborationChannel> {
    const channel = await this.channelRepo.save(
      this.channelRepo.create({
        organizationId,
        workspaceId: dto.workspaceId || workspaceId,
        type: dto.type,
        name: dto.name,
        description: dto.description || null,
        departmentKey: dto.departmentKey || null,
        patientId: dto.patientId || null,
        createdByUserId: userId,
        isSystemManaged: false,
      }),
    );
    await this.ensureMembership(channel.id, userId, CollaborationChannelMembershipRole.OWNER);

    await this.auditService.log({
      userId,
      action: AuditAction.CHANNEL_CREATED,
      resource: `collaboration/channel/${channel.id}`,
      metadata: { type: channel.type, name: channel.name },
      ipAddress: '0.0.0.0',
      userAgent: 'app',
    });

    return channel;
  }

  async getOrCreatePatientThread(
    organizationId: string,
    patientId: string,
    workspaceId: string | null = null,
    actorUserId?: string,
  ): Promise<CollaborationChannel> {
    let channel = await this.channelRepo.findOne({
      where: { organizationId, patientId, type: CollaborationChannelType.PATIENT_THREAD },
    });
    if (!channel) {
      channel = await this.channelRepo.save(
        this.channelRepo.create({
          organizationId,
          workspaceId,
          type: CollaborationChannelType.PATIENT_THREAD,
          name: `Patient ${patientId}`,
          patientId,
          isSystemManaged: true,
        }),
      );
    }
    if (actorUserId)
      await this.ensureMembership(
        channel.id,
        actorUserId,
        CollaborationChannelMembershipRole.MEMBER,
      );
    return channel;
  }

  /**
   * Idempotent when sourceId is provided: reuses the existing active incident
   * channel for that source instead of creating a duplicate (e.g. re-listing a
   * critical alert should not spawn a new channel every time it's fetched).
   * Callers should only post an initiating message when `created` is true.
   */
  async getOrCreateAiChiefChannel(organizationId: string): Promise<CollaborationChannel> {
    let channel = await this.channelRepo.findOne({
      where: { organizationId, type: CollaborationChannelType.AI_CHIEF },
    });
    if (!channel) {
      channel = await this.channelRepo.save(
        this.channelRepo.create({
          organizationId,
          type: CollaborationChannelType.AI_CHIEF,
          name: 'AI Chief',
          description: 'AI-generated recommendations that require human clinician review.',
          isSystemManaged: true,
        }),
      );
    }
    return channel;
  }

  async createIncidentChannel(
    organizationId: string,
    input: {
      title: string;
      description?: string;
      severity: string;
      triggerType: string;
      patientId?: string;
      sourceId?: string;
      createdByUserId?: string;
    },
  ): Promise<{ channel: CollaborationChannel; created: boolean }> {
    if (input.sourceId) {
      const existing = await this.channelRepo.findOne({
        where: {
          organizationId,
          type: CollaborationChannelType.INCIDENT,
          incidentSourceId: input.sourceId,
          status: CollaborationChannelStatus.ACTIVE,
        },
      });
      if (existing) return { channel: existing, created: false };
    }

    const channel = await this.channelRepo.save(
      this.channelRepo.create({
        organizationId,
        type: CollaborationChannelType.INCIDENT,
        name: input.title,
        description: input.description || null,
        patientId: input.patientId || null,
        isSystemManaged: true,
        incidentSeverity: input.severity,
        incidentTriggerType: input.triggerType,
        incidentSourceId: input.sourceId || null,
        createdByUserId: input.createdByUserId || null,
      }),
    );

    if (input.createdByUserId) {
      await this.ensureMembership(
        channel.id,
        input.createdByUserId,
        CollaborationChannelMembershipRole.OWNER,
      );
    }

    await this.auditService.log({
      userId: input.createdByUserId,
      action: AuditAction.CHANNEL_CREATED,
      resource: `collaboration/channel/${channel.id}`,
      metadata: { type: 'incident', severity: input.severity, triggerType: input.triggerType },
      ipAddress: '0.0.0.0',
      userAgent: 'system',
    });

    return { channel, created: true };
  }

  async resolveIncidentChannel(
    organizationId: string,
    channelId: string,
    resolvedByUserId: string,
  ): Promise<CollaborationChannel> {
    const channel = await this.getChannel(channelId, organizationId);
    await this.assertAccess(channel, resolvedByUserId);
    channel.resolvedAt = new Date();
    channel.status = CollaborationChannelStatus.ARCHIVED;
    channel.archivedAt = new Date();
    const saved = await this.channelRepo.save(channel);

    await this.postSystemMessage(channelId, {
      body: 'This incident has been marked resolved and the channel is now archived.',
      sourceType: CollaborationMessageSourceType.WORKFLOW_EVENT,
    });

    await this.auditService.log({
      userId: resolvedByUserId,
      action: AuditAction.CHANNEL_ARCHIVED,
      resource: `collaboration/channel/${channelId}`,
      metadata: { reason: 'incident_resolved' },
      ipAddress: '0.0.0.0',
      userAgent: resolvedByUserId ? 'app' : 'system',
    });

    return saved;
  }

  async archivePatientThread(
    organizationId: string,
    patientId: string,
    reason = 'discharge',
  ): Promise<void> {
    const channel = await this.channelRepo.findOne({
      where: { organizationId, patientId, type: CollaborationChannelType.PATIENT_THREAD },
    });
    if (!channel || channel.status === CollaborationChannelStatus.ARCHIVED) return;

    channel.status = CollaborationChannelStatus.ARCHIVED;
    channel.archivedAt = new Date();
    await this.channelRepo.save(channel);

    await this.postSystemMessage(channel.id, {
      body: `This patient thread has been archived (${reason}).`,
      sourceType: CollaborationMessageSourceType.WORKFLOW_EVENT,
    });

    await this.auditService.log({
      action: AuditAction.CHANNEL_ARCHIVED,
      resource: `collaboration/channel/${channel.id}`,
      metadata: { reason, patientId },
      ipAddress: '0.0.0.0',
      userAgent: 'system',
    });
  }

  async archiveChannel(
    organizationId: string,
    channelId: string,
    actorUserId: string,
  ): Promise<CollaborationChannel> {
    const channel = await this.getChannel(channelId, organizationId);
    await this.assertAccess(channel, actorUserId);
    channel.status = CollaborationChannelStatus.ARCHIVED;
    channel.archivedAt = new Date();
    const saved = await this.channelRepo.save(channel);

    await this.auditService.log({
      userId: actorUserId,
      action: AuditAction.CHANNEL_ARCHIVED,
      resource: `collaboration/channel/${channelId}`,
      metadata: {},
      ipAddress: '0.0.0.0',
      userAgent: actorUserId ? 'app' : 'system',
    });

    return saved;
  }

  // ---------------------------------------------------------------------
  // Messages
  // ---------------------------------------------------------------------

  async postMessage(
    userId: string,
    organizationId: string,
    channelId: string,
    dto: PostMessageDto,
    context: RequestContext,
  ): Promise<CollaborationMessage> {
    const channel = await this.getChannel(channelId, organizationId);
    await this.assertAccess(channel, userId);

    const message = await this.messageRepo.save(
      this.messageRepo.create({
        channelId,
        threadRootId: dto.threadRootId || null,
        senderId: userId,
        senderType: CollaborationMessageSenderType.USER,
        body: dto.body,
        mentionedUserIds: dto.mentionedUserIds || null,
        sourceType: dto.sourceType || CollaborationMessageSourceType.MANUAL,
        sourceId: dto.sourceId || null,
      }),
    );

    await this.auditService.log({
      userId,
      action: AuditAction.MESSAGE_SENT,
      resource: `collaboration/message/${message.id}`,
      metadata: { channelId, threadRootId: message.threadRootId },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    this.realtimeService.publish({ type: 'message_created', payload: { channelId, message } });
    // Notification fan-out and external mirroring are side effects, not part
    // of "did the message send" — fire-and-forget so a channel with many
    // members (or a slow external provider) never adds latency to the
    // send/reply request itself. Both are already internally resilient
    // (per-member try/catch, Promise.allSettled).
    void this.notifyChannelMembers(channel, message, userId).catch((error) => {
      this.logger.warn(
        `notifyChannelMembers failed for message ${message.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
    void this.mirrorToExternalProviders(channel, message, userId).catch((error) => {
      this.logger.warn(
        `mirrorToExternalProviders failed for message ${message.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });

    return message;
  }

  async postSystemMessage(
    channelId: string,
    input: {
      body: string;
      senderType?: CollaborationMessageSenderType;
      sourceType?: CollaborationMessageSourceType;
      sourceId?: string;
      mentionedUserIds?: string[];
      threadRootId?: string;
    },
  ): Promise<CollaborationMessage> {
    // Unscoped: only called internally with a channelId the calling service
    // already created/fetched itself (patient thread, incident, AI Chief
    // channel) — never derived from arbitrary user/request input.
    const channel = await this.findChannelByIdUnscoped(channelId);
    const message = await this.messageRepo.save(
      this.messageRepo.create({
        channelId,
        threadRootId: input.threadRootId || null,
        senderId: null,
        senderType: input.senderType || CollaborationMessageSenderType.SYSTEM,
        body: input.body,
        mentionedUserIds: input.mentionedUserIds || null,
        sourceType: input.sourceType || CollaborationMessageSourceType.WORKFLOW_EVENT,
        sourceId: input.sourceId || null,
      }),
    );

    this.realtimeService.publish({ type: 'message_created', payload: { channelId, message } });
    void this.notifyChannelMembers(channel, message, null).catch((error) => {
      this.logger.warn(
        `notifyChannelMembers failed for message ${message.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
    void this.mirrorToExternalProviders(channel, message, null).catch((error) => {
      this.logger.warn(
        `mirrorToExternalProviders failed for message ${message.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });

    return message;
  }

  async editMessage(
    userId: string,
    messageId: string,
    dto: UpdateMessageDto,
    context: RequestContext,
  ): Promise<CollaborationMessage> {
    const message = await this.getOwnedMessage(messageId, userId);
    message.body = dto.body;
    message.editedAt = new Date();
    const saved = await this.messageRepo.save(message);

    await this.auditService.log({
      userId,
      action: AuditAction.MESSAGE_EDITED,
      resource: `collaboration/message/${messageId}`,
      metadata: {},
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    this.realtimeService.publish({
      type: 'message_updated',
      payload: { channelId: saved.channelId, message: saved },
    });
    return saved;
  }

  async deleteMessage(userId: string, messageId: string, context: RequestContext): Promise<void> {
    const message = await this.getOwnedMessage(messageId, userId);
    message.deletedAt = new Date();
    message.deletedByUserId = userId;
    await this.messageRepo.save(message);

    await this.auditService.log({
      userId,
      action: AuditAction.MESSAGE_DELETED,
      resource: `collaboration/message/${messageId}`,
      metadata: {},
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    this.realtimeService.publish({
      type: 'message_deleted',
      payload: { channelId: message.channelId, messageId },
    });
  }

  private async getOwnedMessage(messageId: string, userId: string): Promise<CollaborationMessage> {
    const message = await this.messageRepo.findOne({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found.');
    if (message.senderId !== userId) {
      const membership = await this.membershipRepo.findOne({
        where: { channelId: message.channelId, userId },
      });
      const canModerate =
        membership?.role === CollaborationChannelMembershipRole.OWNER ||
        membership?.role === CollaborationChannelMembershipRole.MODERATOR;
      if (!canModerate)
        throw new ForbiddenException('You can only edit or delete your own messages.');
    }
    return message;
  }

  async listMessages(
    userId: string,
    organizationId: string,
    channelId: string,
    query: { before?: string; limit?: number; threadRootId?: string },
  ): Promise<CollaborationMessage[]> {
    const channel = await this.getChannel(channelId, organizationId);
    await this.assertAccess(channel, userId);

    const qb = this.messageRepo
      .createQueryBuilder('message')
      .where('message.channelId = :channelId', { channelId })
      .andWhere('message.deletedAt IS NULL')
      .orderBy('message.createdAt', 'DESC')
      .limit(Math.min(query.limit || 50, 200));

    if (query.threadRootId) {
      qb.andWhere('message.threadRootId = :threadRootId', { threadRootId: query.threadRootId });
    } else {
      qb.andWhere('message.threadRootId IS NULL');
    }
    if (query.before) {
      qb.andWhere('message.createdAt < :before', { before: new Date(query.before) });
    }

    const messages = await qb.getMany();
    return messages.reverse();
  }

  async searchMessages(
    userId: string,
    organizationId: string,
    query: string,
  ): Promise<CollaborationMessage[]> {
    const memberChannelIds = Array.from(await this.listMemberChannelIds(userId));
    if (memberChannelIds.length === 0 || !query.trim()) return [];

    return this.messageRepo
      .createQueryBuilder('message')
      .where('message.channelId IN (:...channelIds)', { channelIds: memberChannelIds })
      .andWhere('message.deletedAt IS NULL')
      .andWhere('LOWER(message.body) LIKE :query', { query: `%${query.toLowerCase()}%` })
      .orderBy('message.createdAt', 'DESC')
      .limit(50)
      .getMany();
  }

  // ---------------------------------------------------------------------
  // Reactions & pins
  // ---------------------------------------------------------------------

  /** Every message-scoped mutation must resolve the owning channel through the
   * org-scoped getChannel() before touching the message — otherwise a
   * messageId alone lets any authenticated user (any org) react to, pin, or
   * attach files to a message that isn't theirs to touch. */
  private async getMessageWithChannel(
    messageId: string,
    organizationId: string,
  ): Promise<{ message: CollaborationMessage; channel: CollaborationChannel }> {
    const message = await this.messageRepo.findOne({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found.');
    const channel = await this.getChannel(message.channelId, organizationId);
    return { message, channel };
  }

  async addReaction(
    userId: string,
    organizationId: string,
    messageId: string,
    emoji: string,
  ): Promise<CollaborationMessageReaction> {
    const { message, channel } = await this.getMessageWithChannel(messageId, organizationId);
    await this.assertAccess(channel, userId);

    const existing = await this.reactionRepo.findOne({ where: { messageId, userId, emoji } });
    if (existing) return existing;

    const reaction = await this.reactionRepo.save(
      this.reactionRepo.create({ messageId, userId, emoji }),
    );
    this.realtimeService.publish({
      type: 'reaction_added',
      payload: { channelId: message.channelId, messageId, reaction },
    });
    return reaction;
  }

  async removeReaction(
    userId: string,
    organizationId: string,
    messageId: string,
    emoji: string,
  ): Promise<void> {
    const { message, channel } = await this.getMessageWithChannel(messageId, organizationId);
    await this.assertAccess(channel, userId);
    await this.reactionRepo.delete({ messageId, userId, emoji });
    this.realtimeService.publish({
      type: 'reaction_removed',
      payload: { channelId: message.channelId, messageId, userId, emoji },
    });
  }

  async pinMessage(
    userId: string,
    organizationId: string,
    messageId: string,
  ): Promise<CollaborationMessage> {
    const { message, channel } = await this.getMessageWithChannel(messageId, organizationId);
    await this.assertAccess(channel, userId);
    message.pinnedAt = new Date();
    message.pinnedByUserId = userId;
    const saved = await this.messageRepo.save(message);
    this.realtimeService.publish({
      type: 'message_pinned',
      payload: { channelId: message.channelId, message: saved },
    });
    return saved;
  }

  async unpinMessage(
    userId: string,
    organizationId: string,
    messageId: string,
  ): Promise<CollaborationMessage> {
    const { message, channel } = await this.getMessageWithChannel(messageId, organizationId);
    await this.assertAccess(channel, userId);
    message.pinnedAt = null;
    message.pinnedByUserId = null;
    const saved = await this.messageRepo.save(message);
    this.realtimeService.publish({
      type: 'message_unpinned',
      payload: { channelId: message.channelId, message: saved },
    });
    return saved;
  }

  async listPinnedMessages(
    userId: string,
    organizationId: string,
    channelId: string,
  ): Promise<CollaborationMessage[]> {
    const channel = await this.getChannel(channelId, organizationId);
    await this.assertAccess(channel, userId);
    return this.messageRepo
      .find({
        where: { channelId },
        order: { pinnedAt: 'DESC' },
      })
      .then((messages) => messages.filter((m) => m.pinnedAt));
  }

  // ---------------------------------------------------------------------
  // Read state / membership preferences
  // ---------------------------------------------------------------------

  async markRead(
    userId: string,
    organizationId: string,
    channelId: string,
    dto: MarkReadDto,
  ): Promise<CollaborationChannelMembership> {
    await this.getChannel(channelId, organizationId);
    const membership = await this.membershipRepo.findOne({ where: { channelId, userId } });
    if (!membership) throw new NotFoundException('Membership not found.');
    membership.lastReadMessageId = dto.lastReadMessageId;
    membership.lastReadAt = new Date();
    return this.membershipRepo.save(membership);
  }

  async updateMembershipPreference(
    userId: string,
    organizationId: string,
    channelId: string,
    dto: UpdateMembershipDto,
  ): Promise<CollaborationChannelMembership> {
    await this.getChannel(channelId, organizationId);
    const membership = await this.membershipRepo.findOne({ where: { channelId, userId } });
    if (!membership) throw new NotFoundException('Membership not found.');
    if (dto.notificationPreference) membership.notificationPreference = dto.notificationPreference;
    return this.membershipRepo.save(membership);
  }

  broadcastTyping(channelId: string, userId: string, isTyping: boolean): void {
    this.realtimeService.publish({ type: 'typing', payload: { channelId, userId, isTyping } });
  }

  // ---------------------------------------------------------------------
  // Attachments
  // ---------------------------------------------------------------------

  async uploadAttachment(
    userId: string,
    organizationId: string,
    messageId: string,
    dto: UploadAttachmentDto,
  ): Promise<CollaborationAttachment> {
    const { message, channel } = await this.getMessageWithChannel(messageId, organizationId);
    await this.assertAccess(channel, userId);

    const buffer = Buffer.from(dto.dataBase64, 'base64');
    const stored = await this.attachmentStorage.store({
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      buffer,
    });

    const attachment = await this.attachmentRepo.save(
      this.attachmentRepo.create({
        messageId,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        kind: dto.mimeType.startsWith('image/')
          ? CollaborationAttachmentKind.IMAGE
          : dto.mimeType.startsWith('audio/')
            ? CollaborationAttachmentKind.AUDIO
            : CollaborationAttachmentKind.FILE,
        sizeBytes: buffer.byteLength,
        storageProvider: stored.storageProvider,
        storageKey: stored.storageKey,
        url: stored.url,
        uploadedByUserId: userId,
      }),
    );

    this.realtimeService.publish({
      type: 'attachment_added',
      payload: { channelId: message.channelId, messageId, attachment },
    });

    return attachment;
  }

  // ---------------------------------------------------------------------
  // External provider links
  // ---------------------------------------------------------------------

  async linkExternalProvider(
    userId: string,
    organizationId: string,
    channelId: string,
    dto: LinkExternalProviderDto,
  ): Promise<CollaborationExternalLink> {
    // Mirroring a channel to an external provider (e.g. Slack) can leak every
    // future message in it outside CareDroid, so this needs the same
    // membership check as posting/reading, not just "does the channel exist".
    const channel = await this.getChannel(channelId, organizationId);
    await this.assertAccess(channel, userId);
    const existing = await this.externalLinkRepo.findOne({
      where: { channelId, provider: dto.provider },
    });
    if (existing) {
      existing.externalChannelId = dto.externalChannelId ?? existing.externalChannelId;
      existing.config = dto.config ?? existing.config;
      existing.enabled = true;
      return this.externalLinkRepo.save(existing);
    }
    return this.externalLinkRepo.save(
      this.externalLinkRepo.create({
        channelId,
        provider: dto.provider,
        externalChannelId: dto.externalChannelId || null,
        config: dto.config || null,
        enabled: true,
      }),
    );
  }

  async unlinkExternalProvider(
    userId: string,
    organizationId: string,
    channelId: string,
    provider: CollaborationExternalProvider,
  ): Promise<void> {
    const channel = await this.getChannel(channelId, organizationId);
    await this.assertAccess(channel, userId);
    await this.externalLinkRepo.delete({ channelId, provider });
  }

  private async mirrorToExternalProviders(
    channel: CollaborationChannel,
    message: CollaborationMessage,
    senderId: string | null,
  ): Promise<void> {
    const links = await this.externalLinkRepo.find({
      where: { channelId: channel.id, enabled: true },
    });
    if (links.length === 0) return;

    await this.providerRegistry.dispatch(
      {
        channelId: channel.id,
        channelName: channel.name,
        organizationId: channel.organizationId,
        body: message.body,
        senderDisplayName: senderId ? 'CareDroid user' : 'CareDroid',
        senderType: message.senderType,
        createdAt: message.createdAt?.toISOString?.() || new Date().toISOString(),
      },
      links,
    );
  }

  // ---------------------------------------------------------------------
  // Notifications (reuses NotificationService — no parallel delivery path)
  // ---------------------------------------------------------------------

  private async notifyChannelMembers(
    channel: CollaborationChannel,
    message: CollaborationMessage,
    senderId: string | null,
  ): Promise<void> {
    const memberships = await this.membershipRepo.find({
      where: { channelId: channel.id, status: CollaborationChannelMembershipStatus.ACTIVE },
    });
    const mentioned = new Set(message.mentionedUserIds || []);

    for (const membership of memberships) {
      if (membership.userId === senderId) continue;
      const isMentioned = mentioned.has(membership.userId);
      if (
        !isMentioned &&
        membership.notificationPreference !== CollaborationNotificationPreference.ALL
      ) {
        continue;
      }
      if (
        !isMentioned &&
        membership.notificationPreference === CollaborationNotificationPreference.NONE
      ) {
        continue;
      }

      try {
        await this.notificationService.sendNotification({
          userId: membership.userId,
          type: isMentioned
            ? NotificationType.COLLABORATION_MENTION
            : NotificationType.COLLABORATION_MESSAGE,
          title: isMentioned ? `You were mentioned in ${channel.name}` : channel.name,
          body: message.body.slice(0, 200),
          data: { channelId: channel.id, messageId: message.id },
        });
        if (isMentioned) {
          await this.auditService.log({
            userId: membership.userId,
            action: AuditAction.MENTION_CREATED,
            resource: `collaboration/message/${message.id}`,
            metadata: { channelId: channel.id },
            ipAddress: '0.0.0.0',
            userAgent: 'system',
          });
        }
      } catch (error) {
        this.logger.warn(
          `Failed to notify ${membership.userId} for message ${message.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  // ---------------------------------------------------------------------
  // Analytics
  // ---------------------------------------------------------------------

  async getAnalyticsSummary(organizationId: string, windowDays = 7): Promise<AnalyticsSummary> {
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const channels = await this.channelRepo.find({ where: { organizationId } });
    const channelIds = channels.map((c) => c.id);
    const channelById = new Map(channels.map((c) => [c.id, c]));

    const messages = channelIds.length
      ? await this.messageRepo
          .createQueryBuilder('message')
          .where('message.channelId IN (:...channelIds)', { channelIds })
          .andWhere('message.createdAt >= :since', { since })
          .andWhere('message.deletedAt IS NULL')
          .getMany()
      : [];

    const byChannelType: Record<string, number> = {};
    let unresolvedMentions = 0;
    const memberships = await this.membershipRepo.find({
      where: { channelId: In(channelIds.length ? channelIds : ['none']) },
    });
    const membershipsByUser = new Map<string, CollaborationChannelMembership[]>();
    for (const m of memberships) {
      const list = membershipsByUser.get(m.userId) || [];
      list.push(m);
      membershipsByUser.set(m.userId, list);
    }

    for (const message of messages) {
      const channel = channelById.get(message.channelId);
      if (channel) byChannelType[channel.type] = (byChannelType[channel.type] || 0) + 1;

      for (const mentionedUserId of message.mentionedUserIds || []) {
        const membership = (membershipsByUser.get(mentionedUserId) || []).find(
          (m) => m.channelId === message.channelId,
        );
        const seen = membership?.lastReadAt && membership.lastReadAt >= message.createdAt;
        if (!seen) unresolvedMentions += 1;
      }
    }

    const incidentChannels = channels.filter((c) => c.type === CollaborationChannelType.INCIDENT);
    const incidentsInWindow = incidentChannels.filter((c) => c.createdAt >= since);
    const resolvedIncidents = incidentsInWindow.filter((c) => c.resolvedAt);
    const averageResolutionMinutes =
      resolvedIncidents.length > 0
        ? resolvedIncidents.reduce(
            (sum, c) => sum + (c.resolvedAt!.getTime() - c.createdAt.getTime()) / 60000,
            0,
          ) / resolvedIncidents.length
        : null;

    const firstReplyDurations: number[] = [];
    const systemMessages = messages.filter(
      (m) =>
        m.senderType !== CollaborationMessageSenderType.USER &&
        (m.sourceType === CollaborationMessageSourceType.WORKFLOW_EVENT ||
          m.sourceType === CollaborationMessageSourceType.ESCALATION ||
          m.sourceType === CollaborationMessageSourceType.ALERT),
    );
    for (const systemMessage of systemMessages) {
      const firstReply = messages
        .filter(
          (m) =>
            m.channelId === systemMessage.channelId &&
            m.senderType === CollaborationMessageSenderType.USER &&
            m.createdAt > systemMessage.createdAt,
        )
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
      if (firstReply) {
        firstReplyDurations.push(
          (firstReply.createdAt.getTime() - systemMessage.createdAt.getTime()) / 60000,
        );
      }
    }
    const averageFirstReplyMinutes =
      firstReplyDurations.length > 0
        ? firstReplyDurations.reduce((sum, v) => sum + v, 0) / firstReplyDurations.length
        : null;

    return {
      windowDays,
      collaborationVolume: { totalMessages: messages.length, byChannelType },
      unresolvedMentions,
      incidentChannels: {
        created: incidentsInWindow.length,
        resolved: resolvedIncidents.length,
        averageResolutionMinutes,
      },
      averageFirstReplyMinutes,
      generatedAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------
  // Retention
  // ---------------------------------------------------------------------

  async purgeExpiredMessages(): Promise<number> {
    const channelsWithRetention = await this.channelRepo.find({
      where: { retentionPolicyDays: Not(IsNull()) },
    });
    let purged = 0;
    for (const channel of channelsWithRetention) {
      if (!channel.retentionPolicyDays) continue;
      const cutoff = new Date(Date.now() - channel.retentionPolicyDays * 24 * 60 * 60 * 1000);
      const result = await this.messageRepo
        .createQueryBuilder()
        .update(CollaborationMessage)
        .set({ deletedAt: new Date() })
        .where('channelId = :channelId', { channelId: channel.id })
        .andWhere('createdAt < :cutoff', { cutoff })
        .andWhere('deletedAt IS NULL')
        .execute();
      purged += result.affected || 0;
    }
    return purged;
  }
}

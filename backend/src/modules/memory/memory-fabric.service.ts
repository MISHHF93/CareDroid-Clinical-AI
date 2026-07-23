import { Injectable, Logger } from '@nestjs/common';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { AssetAccessState } from '../platform-assets/enums/platform-asset.enums';
import { AssetAccessService } from '../platform-assets/asset-access.service';
import { PersonalizationService } from '../personalization/personalization.service';
import { UserActivityService } from '../user-activity/user-activity.service';
import { LongMemoryType } from './entities/long-memory-entry.entity';
import { ShortMemoryType } from './entities/short-memory-entry.entity';
import { LongMemoryService } from './long-memory.service';
import {
  MemoryFabricScope,
  MemoryFabricSignalType,
  MEMORY_FABRIC_TAG,
} from './memory-fabric.constants';
import { RecordMemoryFabricSignalDto } from './dto/record-memory-fabric-signal.dto';
import { ShortMemoryService } from './short-memory.service';

type TenantContextLike = {
  organizationId?: string | null;
  workspaceId?: string | null;
  userId?: string | null;
  role?: string | null;
  subscriptionPlan?: string | null;
  source?: string | null;
};

const SAFE_CONTENT_KEYS = new Set([
  'activeCalculator',
  'activeConversation',
  'activeDashboard',
  'assetId',
  'artifactId',
  'category',
  'completed',
  'content',
  'count',
  'defaultDashboard',
  'filter',
  'hasSearch',
  'id',
  'kind',
  'label',
  'limit',
  'mode',
  'preferredAssetIds',
  'preferredBehavior',
  'pinnedAssetIds',
  'pinnedToolIds',
  'recentAiChats',
  'recentAssetIds',
  'recentToolIds',
  'resultCount',
  'role',
  'roleLabel',
  'roleProfileId',
  'route',
  'scope',
  'searchLength',
  'signalType',
  'source',
  'status',
  'suggestedTools',
  'tag',
  'tags',
  'title',
  'toolId',
  'type',
  'updatedAt',
  'version',
  'workflowId',
  'workspaceId',
]);

const BLOCKED_CONTENT_KEYS = new Set([
  'message',
  'messages',
  'note',
  'notes',
  'patientId',
  'patientName',
  'prompt',
  'query',
  'queryText',
  'rawInput',
  'search',
  'text',
]);

const ACCESSIBLE_ASSET_STATES = new Set([
  AssetAccessState.ALLOWED,
  AssetAccessState.DEMO_ONLY,
  AssetAccessState.REQUIRES_REVIEW,
]);

@Injectable()
export class MemoryFabricService {
  private readonly logger = new Logger(MemoryFabricService.name);

  constructor(
    private readonly shortMemoryService: ShortMemoryService,
    private readonly longMemoryService: LongMemoryService,
    private readonly userActivityService: UserActivityService,
    private readonly personalizationService: PersonalizationService,
    private readonly artifactsService: ArtifactsService,
    private readonly assetAccessService: AssetAccessService,
    private readonly auditService: AuditService,
  ) {}

  async getContext(input: {
    user: any;
    tenantContext?: TenantContextLike;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const userId = input.user?.id || input.user?.userId || input.user?.sub;
    const tenant = this.normalizeTenant(input.tenantContext, userId);
    const [shortTerm, longTerm, activity, personalization, artifacts, assetAccess] =
      await Promise.all([
        this.shortMemoryService.getActiveContext(userId),
        this.longMemoryService.getContext(userId),
        this.userActivityService.summaryForUser(userId),
        this.personalizationService.getForUser(userId),
        this.getArtifactReferences(),
        this.getAssetAccess(input.user),
      ]);

    const accessibleAssetIds = this.resolveAccessibleAssetIds(assetAccess);
    const pinnedAssets = this.filterAssetIds(
      [
        ...(assetAccess?.pinnedAssetIds || []),
        ...(longTerm.savedTools || []).map(
          (entry) => entry.content?.assetId || entry.content?.toolId,
        ),
      ],
      accessibleAssetIds,
    );
    const recentAssets = this.filterAssetIds(
      [
        ...(activity.recentTools || []).map(
          (item) => item.metadata?.toolId || item.metadata?.assetId,
        ),
        ...(activity.recentCalculators || []).map(
          (item) => item.metadata?.calculatorId || item.metadata?.toolId,
        ),
        ...(longTerm.savedTools || []).map(
          (entry) => entry.content?.assetId || entry.content?.toolId,
        ),
      ],
      accessibleAssetIds,
    );
    const successfulWorkflows = this.filterMemoryEntries(
      [
        ...(await this.longMemoryService.savedWorkflowsForUser(userId)),
        ...(personalization.recommendedWorkflows || []).map((workflow) => ({
          id: workflow.id,
          title: workflow.title,
          content: {
            workflowId: workflow.id,
            toolId: workflow.toolId,
            reason: workflow.reason,
          },
          tags: ['workflow'],
        })),
      ],
      tenant,
      accessibleAssetIds,
    ).slice(0, 10);
    const commonSearches = this.extractCommonSearches(longTerm.history, tenant).slice(0, 10);

    const context = {
      generatedAt: new Date().toISOString(),
      tenant: {
        organizationId: tenant.organizationId,
        workspaceId: tenant.workspaceId,
        userId,
        role: tenant.role || input.user?.role,
        subscriptionPlan: tenant.subscriptionPlan,
        source: tenant.source,
      },
      organizationMemory: {
        organizationId: tenant.organizationId,
        enabledPackCount: assetAccess?.entitledPackIds?.length || 0,
        accessibleAssetCount: accessibleAssetIds.size,
        commonSearches,
        successfulWorkflows,
      },
      workspaceMemory: {
        workspaceId: tenant.workspaceId || assetAccess?.workspace,
        recentAssets,
        visibleAssetIds: [...accessibleAssetIds].slice(0, 50),
      },
      roleMemory: {
        role: tenant.role || input.user?.role,
        roleProfileId: assetAccess?.roleProfile?.id,
        roleLabel: assetAccess?.roleProfile?.label,
        preferredAssetIds: this.filterAssetIds(
          assetAccess?.roleProfile?.preferredAssetIds || [],
          accessibleAssetIds,
        ),
      },
      userMemory: {
        preferences: this.sanitizeContent({
          preferredBehavior: personalization.preferredBehavior,
          suggestedTools: personalization.suggestedTools,
          preferences: longTerm.preferences,
        }),
        pinnedAssets,
        recentAssets,
        savedWorkflows: successfulWorkflows,
      },
      aiMemory: {
        shortTerm: this.sanitizeContent(shortTerm),
        recentAiChats: (activity.recentAiChats || [])
          .slice(0, 5)
          .map((item) => this.sanitizeActivity(item)),
        savedPromptCount: personalization.savedPrompts?.length || 0,
        recentPromptCount: personalization.recentPrompts?.length || 0,
      },
      artifactMemory: {
        references: artifacts,
      },
      rules: {
        tenantIsolated: true,
        permissionAware: true,
        auditable: true,
        rawPromptIncluded: false,
        rawSearchIncluded: false,
      },
    };

    await this.audit(input, AuditAction.MEMORY_READ, 'memory/fabric/context', {
      memoryScopes: Object.values(MemoryFabricScope),
      organizationId: tenant.organizationId,
      workspaceId: tenant.workspaceId,
      returnedAssetCount: context.workspaceMemory.visibleAssetIds.length,
      returnedArtifactCount: artifacts.length,
    });

    return context;
  }

  async recordSignal(input: {
    user: any;
    dto: RecordMemoryFabricSignalDto;
    tenantContext?: TenantContextLike;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const userId = input.user?.id || input.user?.userId || input.user?.sub;
    const tenant = this.normalizeTenant(input.tenantContext, userId);
    const content = this.sanitizeContent({
      ...(input.dto.content || {}),
      scope: input.dto.scope,
      signalType: input.dto.signalType,
      organizationId: tenant.organizationId,
      workspaceId: input.dto.workspaceId || tenant.workspaceId,
      role: tenant.role || input.user?.role,
      assetId: input.dto.assetId,
      workflowId: input.dto.workflowId,
      artifactId: input.dto.artifactId,
    });
    const tags = [
      MEMORY_FABRIC_TAG,
      input.dto.scope,
      input.dto.signalType,
      ...(input.dto.tags || []),
    ];
    const workspaceId = input.dto.workspaceId || tenant.workspaceId || undefined;

    const memory =
      input.dto.signalType === MemoryFabricSignalType.AI_CONTEXT
        ? await this.shortMemoryService.remember(userId, {
            type: ShortMemoryType.ACTIVE_CONVERSATION,
            title: input.dto.title,
            workspaceId,
            content,
          })
        : await this.longMemoryService.remember(userId, {
            type: this.resolveLongMemoryType(input.dto.signalType),
            title: input.dto.title,
            workspaceId,
            content,
            tags,
          });

    await this.audit(input, AuditAction.MEMORY_WRITE, `memory/fabric/${memory.id}`, {
      scope: input.dto.scope,
      signalType: input.dto.signalType,
      organizationId: tenant.organizationId,
      workspaceId,
      assetId: input.dto.assetId,
      workflowId: input.dto.workflowId,
      artifactId: input.dto.artifactId,
    });

    return {
      status: 'recorded',
      memory,
      scope: input.dto.scope,
      signalType: input.dto.signalType,
    };
  }

  private normalizeTenant(
    tenantContext: TenantContextLike = {},
    userId?: string,
  ): TenantContextLike {
    return {
      organizationId: tenantContext?.organizationId || null,
      workspaceId: tenantContext?.workspaceId || null,
      userId: tenantContext?.userId || userId || null,
      role: tenantContext?.role || null,
      subscriptionPlan: tenantContext?.subscriptionPlan || null,
      source: tenantContext?.source || 'request',
    };
  }

  private async getAssetAccess(user: any) {
    try {
      return await this.assetAccessService.getUserAssetAccess(user);
    } catch (error) {
      this.logger.warn(
        `Memory fabric asset access unavailable: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private resolveAccessibleAssetIds(assetAccess: any): Set<string> {
    return new Set(
      (assetAccess?.access || [])
        .filter((row) => ACCESSIBLE_ASSET_STATES.has(row.accessState))
        .map((row) => row.assetId),
    );
  }

  private filterAssetIds(assetIds: any[] = [], accessibleAssetIds: Set<string>) {
    const ids = [...new Set(assetIds.filter(Boolean).map((value) => String(value)))];
    if (accessibleAssetIds.size === 0) return ids.slice(0, 20);
    return ids.filter((assetId) => accessibleAssetIds.has(assetId)).slice(0, 20);
  }

  private filterMemoryEntries(
    entries: any[] = [],
    tenant: TenantContextLike,
    accessibleAssetIds: Set<string>,
  ) {
    return entries
      .filter((entry) => this.matchesTenant(entry, tenant))
      .filter((entry) => {
        const content = entry.content || {};
        const assetId = content.assetId || content.toolId || content.workflowId;
        return !assetId || accessibleAssetIds.size === 0 || accessibleAssetIds.has(assetId);
      })
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        content: this.sanitizeContent(entry.content || {}),
        tags: entry.tags || [],
        updatedAt: entry.updatedAt,
      }));
  }

  private extractCommonSearches(entries: any[] = [], tenant: TenantContextLike) {
    return entries
      .filter((entry) => this.matchesTenant(entry, tenant))
      .filter((entry) => {
        const content = entry.content || {};
        return (
          entry.tags?.includes('common-search') ||
          content.kind === 'search' ||
          content.signalType === MemoryFabricSignalType.COMMON_SEARCH
        );
      })
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        content: this.sanitizeContent(entry.content || {}),
        updatedAt: entry.updatedAt,
      }));
  }

  private matchesTenant(entry: any, tenant: TenantContextLike) {
    const content = entry.content || {};
    if (content.organizationId && tenant.organizationId) {
      return content.organizationId === tenant.organizationId;
    }
    return true;
  }

  private sanitizeActivity(item: any) {
    return {
      id: item.id,
      category: item.category,
      label: item.label,
      route: item.route,
      workspaceId: item.workspaceId,
      occurredAt: item.occurredAt,
      metadata: this.sanitizeContent(item.metadata || {}),
    };
  }

  private sanitizeContent(value: any): any {
    if (Array.isArray(value)) {
      return value.slice(0, 20).map((item) => this.sanitizeContent(item));
    }
    if (!value || typeof value !== 'object') {
      return ['string', 'number', 'boolean'].includes(typeof value) || value == null
        ? value
        : undefined;
    }
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !BLOCKED_CONTENT_KEYS.has(key))
        .filter(([key]) => SAFE_CONTENT_KEYS.has(key) || key.endsWith('Id') || key.endsWith('Ids'))
        .map(([key, item]) => [key, this.sanitizeContent(item)]),
    );
  }

  private async getArtifactReferences() {
    try {
      const result = await this.artifactsService.list({});
      return (result.artifacts || []).slice(0, 12).map((artifact) => ({
        id: artifact.id,
        type: artifact.type,
        title: artifact.title,
        version: artifact.version,
        tags: artifact.tags || [],
        relationships: (artifact.relationships || []).slice(0, 5).map((relationship) => ({
          artifactId: relationship.artifactId,
          type: relationship.type,
          label: relationship.label,
        })),
      }));
    } catch (error) {
      this.logger.warn(
        `Memory fabric artifact context unavailable: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  private resolveLongMemoryType(signalType: MemoryFabricSignalType): LongMemoryType {
    if (signalType === MemoryFabricSignalType.PREFERENCES) return LongMemoryType.PREFERENCES;
    if (
      signalType === MemoryFabricSignalType.PINNED_ASSET ||
      signalType === MemoryFabricSignalType.RECENT_ASSET ||
      signalType === MemoryFabricSignalType.SUCCESSFUL_WORKFLOW ||
      signalType === MemoryFabricSignalType.ARTIFACT_REFERENCE
    ) {
      return LongMemoryType.SAVED_TOOLS;
    }
    return LongMemoryType.HISTORY;
  }

  private async audit(
    input: { user: any; tenantContext?: TenantContextLike; ipAddress?: string; userAgent?: string },
    action: AuditAction,
    resource: string,
    metadata: Record<string, any>,
  ) {
    await this.auditService.log({
      userId: input.user?.id || input.user?.userId || input.user?.sub,
      organizationId: input.tenantContext?.organizationId ?? undefined,
      workspaceId: input.tenantContext?.workspaceId ?? undefined,
      action,
      resource,
      ipAddress: input.ipAddress || '0.0.0.0',
      userAgent: input.userAgent || 'unknown',
      phiAccessed: false,
      metadata: this.sanitizeContent(metadata),
    });
  }
}

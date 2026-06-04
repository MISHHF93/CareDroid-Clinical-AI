import { Injectable } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { PlatformContextService } from './platform-context.service';
import { AssetAccessService } from './asset-access.service';
import { AssetAccessState } from './enums/platform-asset.enums';

const ROLE_RECOMMENDATIONS: Record<string, string[]> = {
  'emergency-physician': [
    'qsofa',
    'news2',
    'heart-score',
    'nihss',
    'sofa-score',
    'simulation-suite',
    'protocols',
  ],
  nurse: ['news2', 'mews', 'protocols', 'lab-interp'],
  pharmacist: ['drug-check', 'lab-interp', 'laboratory'],
  'fleet-operator': ['fleet-dashboard', 'fleet-live-map', 'dispatch-ai', 'route-optimizer'],
  'biomedical-engineer': [
    'telemetry-monitoring',
    'device-fleet-management',
    'device-maintenance',
    'medical-iot',
  ],
  administrator: ['audit-logs', 'analytics', 'system-config', 'ai-explainability'],
  researcher: ['guideline-rag', 'research-evidence-hub', 'differential-ai'],
  'medical-student': ['calculators', 'simulation-suite', 'guideline-rag'],
};

const WORKSPACE_RECOMMENDATIONS: Record<string, string[]> = {
  emergency: ['qsofa', 'news2', 'nihss', 'protocols'],
  hospital: ['hospital-map', 'digital-twin', 'lab-interp'],
  fleet: ['fleet-dashboard', 'fleet-live-map', 'dispatch-ai'],
  research: ['guideline-rag', 'research-evidence-hub'],
  admin: ['audit-logs', 'analytics'],
};

@Injectable()
export class AssetRecommendationService {
  constructor(
    private readonly platformContextService: PlatformContextService,
    private readonly assetAccessService: AssetAccessService,
  ) {}

  async getRecommendationsForUser(user: User, limit = 12) {
    const ctx = await this.platformContextService.getContextForUser(user);
    const access = await this.assetAccessService.getUserAssetAccess(user);
    const allowed = new Set(
      access.access
        .filter((row) => row.accessState === AssetAccessState.ALLOWED || row.accessState === AssetAccessState.DEMO_ONLY)
        .map((row) => row.assetId),
    );

    const roleKey = ctx.roleProfile?.id || 'emergency-physician';
    const workspaceType =
      (ctx.workspace as any)?.workspaces?.find(
        (w: { id: string }) => w.id === ctx.workspace?.activeWorkspaceId,
      )?.type || 'personal';

    const candidates = [
      ...(ctx.roleProfile?.preferredAssetIds || []),
      ...(ROLE_RECOMMENDATIONS[roleKey] || ROLE_RECOMMENDATIONS['emergency-physician']),
      ...(WORKSPACE_RECOMMENDATIONS[workspaceType] || []),
      ...(ctx.entitledAssetIds || []).slice(0, 20),
    ];

    const seen = new Set<string>();
    const recommendations = [];
    for (const assetId of candidates) {
      if (seen.has(assetId) || !allowed.has(assetId)) continue;
      seen.add(assetId);
      recommendations.push({
        assetId,
        reason: ctx.roleProfile?.preferredAssetIds?.includes(assetId)
          ? 'role-profile'
          : ROLE_RECOMMENDATIONS[roleKey]?.includes(assetId)
            ? 'role'
            : 'workspace',
      });
      if (recommendations.length >= limit) break;
    }

    return {
      roleProfileId: roleKey,
      workspaceType,
      defaultAiAgentId: ctx.defaultAiAgentId,
      recommendations,
    };
  }
}

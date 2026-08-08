import { z } from 'zod';

/**
 * Canonical Workspace contract (backend is the tenant-authority source, per
 * docs/duplicate-system-audit.md's "Workspace configs" section). Before this
 * contract existed, the two backend serializers for the same `Workspace`
 * entity -- WorkspacesService.serializeWorkspace() (list/get/create/update-tools
 * endpoints) and WorkspaceContextService.buildContext() (the /context
 * endpoints) -- produced genuinely different shapes for the same entity:
 * serializeWorkspace() never flattened `assistantContext`/`shortcuts`/
 * `workspaceKey`/`routePath`/`description`/`defaultDashboard` at all, while
 * buildContext() did. Both are now required to conform to this one schema.
 *
 * Real UI consumers (ProfileWorkspaces.tsx, ProfileSummaryCard.tsx, Profile.tsx,
 * organizationIntelligenceProfile.ts) read `branding.displayName` and
 * `settings.enabledToolIds`/`settings.enabledModules` directly, bypassing the
 * normalized top-level fields entirely -- so `branding` and `settings` stay in
 * the contract as real, validated fields, not stripped as "internal-only."
 */

export const WorkspaceShortcutSchema = z.object({
  id: z.string(),
  label: z.string(),
  path: z.string(),
  description: z.string(),
  assetId: z.string().optional(),
});
export type WorkspaceShortcut = z.infer<typeof WorkspaceShortcutSchema>;

export const WorkspaceProfileSchema = z.object({
  workspaceId: z.string(),
  name: z.string(),
  description: z.string(),
  allowedRoles: z.array(z.string()).default([]),
  intendedDepartments: z.array(z.string()).default([]),
  defaultAssets: z.array(z.string()).default([]),
  recommendedAssetPacks: z.array(z.string()).default([]),
  defaultDashboardWidgets: z.array(z.string()).default([]),
  recommendedAIAgents: z.array(z.string()).default([]),
  visibleNavigationGroups: z.array(z.string()).default([]),
  restrictedAssets: z.array(z.string()).default([]),
  defaultFilters: z.record(z.string(), z.string()).default({}),
  allowedOrganizationTypes: z.array(z.string()).default([]),
  subscriptionTier: z.string().optional(),
  status: z.string().optional(),
});
export type WorkspaceProfile = z.infer<typeof WorkspaceProfileSchema>;

export const WorkspaceSchema = z.object({
  id: z.string(),
  // Stable, human-readable identifier (== WorkspaceType) used for routing and
  // client-side matching. The entity's own `id` is a UUID and must never be
  // used interchangeably with this -- confirmed as a real, latent bug in the
  // frontend's old workspaceKeyFromContext() fallback chain, which checked the
  // raw backend `id` as a last-resort "key," a UUID that could never actually
  // match `activeWorkspaceId` (always a workspaceKey-shaped string).
  workspaceKey: z.string(),
  type: z.string(),
  name: z.string(),
  slug: z.string().optional(),
  organizationId: z.string().nullable().optional(),
  parentWorkspaceId: z.string().nullable().optional(),
  routePath: z.string(),
  description: z.string(),
  assistantContext: z.string(),
  defaultDashboard: z.string().optional(),
  branding: z.record(z.string(), z.any()),
  settings: z.record(z.string(), z.any()),
  enabledToolIds: z.array(z.string()).default([]),
  enabledModules: z.array(z.string()).default([]),
  shortcuts: z.array(WorkspaceShortcutSchema).default([]),
  workspaceProfile: WorkspaceProfileSchema,
  defaultDashboardWidgets: z.array(z.string()).default([]),
  defaultFilters: z.record(z.string(), z.string()).default({}),
  restrictedAssets: z.array(z.string()).default([]),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const WorkspaceMembershipSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  userId: z.string(),
  role: z.string(),
  permissions: z.array(z.string()).default([]),
  teams: z.array(z.string()).default([]),
  department: z.string().optional(),
  status: z.string(),
  joinedAt: z.union([z.string(), z.date()]).optional(),
  lastAccessedAt: z.union([z.string(), z.date()]).optional(),
});
export type WorkspaceMembershipContract = z.infer<typeof WorkspaceMembershipSchema>;

// GET /api/workspaces/context and GET /api/workspaces/:workspaceId/context.
// Deliberately does NOT repeat enabledToolIds/defaultDashboardWidgets/
// defaultFilters/restrictedAssets/assistantContext/shortcuts at the envelope
// root -- confirmed via whole-repo grep that the only real consumer
// (WorkspaceContext.tsx's own value memo) can read them from `workspace.*`
// instead, and `enabledToolIds` specifically had zero consumers at the root
// at all. Every one of those values now has exactly one place to live.
export const WorkspaceContextEnvelopeSchema = z.object({
  workspace: WorkspaceSchema,
  workspaceState: z.record(z.string(), z.any()),
  membership: WorkspaceMembershipSchema.nullable().optional(),
  effectivePermissions: z.array(z.string()).default([]),
  organization: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      organizationType: z.string().optional(),
      branding: z.record(z.string(), z.any()).nullable().optional(),
    })
    .nullable()
    .optional(),
  visibleAssetIds: z.array(z.string()).default([]),
  entitledPackIds: z.array(z.string()).default([]),
  assetAccessDecisions: z.record(z.string(), z.any()).default({}),
  recommendations: z.array(z.record(z.string(), z.any())).default([]),
  workspaceTypes: z.array(z.string()).default([]),
});
export type WorkspaceContextEnvelope = z.infer<typeof WorkspaceContextEnvelopeSchema>;

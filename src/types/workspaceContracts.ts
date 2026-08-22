import { z } from 'zod';

/**
 * Canonical Workspace contract, hand-mirrored from
 * backend/src/modules/workspaces/workspace.contracts.ts (the backend is the
 * tenant-authority per docs/duplicate-system-audit.md's "Workspace configs"
 * section). Not a shared import: the backend's Docker build context is
 * `./backend` (docker-compose.yml/docker-compose.app.yml), which does not
 * copy the repo-root `lib/` directory, so a real cross-stack import would
 * silently break in a production container even though it compiles fine in
 * this dev sandbox. Field-for-field parity between the two schema files is
 * instead enforced by workspaceContracts.parity.test.ts, which reads the
 * backend schema source directly (the same pattern this codebase already
 * uses in src/data/executorMappingAudit.test.ts).
 *
 * Used to validate real /api/workspaces* responses at the trust boundary in
 * WorkspaceContext.tsx -- replacing long defensive `a || b || c || d`
 * fallback chains (2 of which checked fields the backend never actually
 * sent) with a single explicit parse against the one real shape.
 */

export const WorkspaceShortcutContractSchema = z.object({
  id: z.string(),
  label: z.string(),
  path: z.string(),
  description: z.string(),
  assetId: z.string().optional(),
});
export type WorkspaceShortcutContract = z.infer<typeof WorkspaceShortcutContractSchema>;

export const WorkspaceProfileContractSchema = z.object({
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
export type WorkspaceProfileContract = z.infer<typeof WorkspaceProfileContractSchema>;

export const WorkspaceContractSchema = z.object({
  id: z.string(),
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
  shortcuts: z.array(WorkspaceShortcutContractSchema).default([]),
  workspaceProfile: WorkspaceProfileContractSchema,
  defaultDashboardWidgets: z.array(z.string()).default([]),
  defaultFilters: z.record(z.string(), z.string()).default({}),
  restrictedAssets: z.array(z.string()).default([]),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
});
export type WorkspaceContract = z.infer<typeof WorkspaceContractSchema>;

export const WorkspaceMembershipContractSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  userId: z.string(),
  role: z.string(),
  permissions: z.array(z.string()).default([]),
  teams: z.array(z.string()).default([]),
  // Real, intentional DB columns (backend/src/modules/workspaces/entities/
  // workspace-membership.entity.ts: `@Column({ nullable: true })`) -- the
  // backend genuinely sends `null` here, not just "field omitted", for a
  // membership with no assigned department or that was never accessed
  // through a normal join flow. `.optional()` alone rejects an explicit
  // `null`; every real workspace-context response was failing this
  // validation until `.nullable()` was added to match.
  department: z.string().nullable().optional(),
  status: z.string(),
  joinedAt: z.union([z.string(), z.date()]).nullable().optional(),
  lastAccessedAt: z.union([z.string(), z.date()]).nullable().optional(),
});
export type WorkspaceMembershipContract = z.infer<typeof WorkspaceMembershipContractSchema>;

export const WorkspaceContextEnvelopeContractSchema = z.object({
  workspace: WorkspaceContractSchema,
  workspaceState: z.record(z.string(), z.any()),
  membership: WorkspaceMembershipContractSchema.nullable().optional(),
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
export type WorkspaceContextEnvelopeContract = z.infer<typeof WorkspaceContextEnvelopeContractSchema>;

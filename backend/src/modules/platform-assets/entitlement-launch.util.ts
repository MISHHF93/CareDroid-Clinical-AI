import type { EntitlementService } from './entitlement.service';

export type EntitlementLaunchRequest = {
  user?: {
    id?: string;
    userId?: string;
    sub?: string;
    role?: string;
    organizationId?: string;
    subscription?: { tier?: string };
  };
  tenantContext?: {
    organizationId?: string;
    workspaceId?: string;
    userId?: string;
    role?: string;
    subscriptionPlan?: string;
  };
};

export async function assertEntitlementLaunchFromRequest(
  entitlementService: EntitlementService,
  req: EntitlementLaunchRequest | undefined,
  assetId: string,
): Promise<void> {
  const tenant = req?.tenantContext;
  const user = req?.user;
  await entitlementService.assertLaunchAllowed({
    assetId,
    organizationId: tenant?.organizationId || user?.organizationId,
    workspaceId: tenant?.workspaceId,
    userId: tenant?.userId || user?.id || user?.userId || user?.sub,
    userRole: tenant?.role || user?.role,
    subscriptionPlan: tenant?.subscriptionPlan || user?.subscription?.tier,
    strictEntitlements: true,
  });
}

export function resolveToolCallingAssetId(toolId?: string): string {
  if (!toolId) return 'agent-clinical';
  const normalized = toolId.toLowerCase();
  if (normalized.includes('fleet') || normalized.startsWith('dispatch')) return 'fleet-dashboard';
  if (normalized.includes('lab') || normalized.includes('potassium')) return 'agent-lab';
  if (normalized.includes('simulation')) return 'simulation-suite';
  if (
    normalized.includes('calculator') ||
    normalized.includes('qsofa') ||
    normalized.includes('news2') ||
    normalized.includes('sofa')
  ) {
    return 'calculators';
  }
  return 'agent-clinical';
}
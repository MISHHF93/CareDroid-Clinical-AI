import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { PlatformGovernanceController } from './platform-governance.controller';

/**
 * createReviewItem/decideReviewItem (creating and adjudicating a governance
 * review item -- policy exceptions, release-gate overrides) were gated by
 * Permission.VIEW_AUDIT_LOGS alone: a read-tier permission granted to both
 * PHYSICIAN and ADMIN base roles, letting any physician create and decide
 * governance review items despite REVIEW_GOVERNANCE existing as the
 * purpose-built, ADMIN-only, 'critical'-riskLevel permission for exactly this
 * ("Review governance release gates and policy exceptions", role-permissions
 * .config.ts). Found via a targeted RBAC controller-inventory sweep.
 */
describe('PlatformGovernanceController — review-item write routes require REVIEW_GOVERNANCE', () => {
  it('createReviewItem requires REVIEW_GOVERNANCE, not merely VIEW_AUDIT_LOGS', () => {
    const metadata = Reflect.getMetadata(
      PERMISSIONS_KEY,
      PlatformGovernanceController.prototype.createReviewItem,
    );
    expect(metadata).toEqual([Permission.REVIEW_GOVERNANCE]);
  });

  it('decideReviewItem requires REVIEW_GOVERNANCE, not merely VIEW_AUDIT_LOGS', () => {
    const metadata = Reflect.getMetadata(
      PERMISSIONS_KEY,
      PlatformGovernanceController.prototype.decideReviewItem,
    );
    expect(metadata).toEqual([Permission.REVIEW_GOVERNANCE]);
  });
});

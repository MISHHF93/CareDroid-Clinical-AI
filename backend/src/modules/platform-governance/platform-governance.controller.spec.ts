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

/**
 * HEAL-347.22: createReviewItem was the only write route on this controller
 * that didn't derive organizationId from req.tenantContext -- it trusted
 * CreateReviewItemDto's own optional, client-settable organizationId field
 * verbatim, letting any REVIEW_GOVERNANCE holder stamp a review item with
 * another org's id (or omit it, making the item invisible to the org-scoped
 * read on GET /review/items). Sibling routes (getReviewItems, decideReviewItem)
 * already got this right.
 */
describe('PlatformGovernanceController — createReviewItem organizationId scoping', () => {
  it('always uses req.tenantContext.organizationId, ignoring whatever the client sent in the body', () => {
    const createReviewItem = jest.fn().mockResolvedValue({ id: 'item-1' });
    const controller = new PlatformGovernanceController({ createReviewItem } as any);

    controller.createReviewItem(
      { organizationId: 'attacker-org', reviewType: 'clinical_ai' } as any,
      { tenantContext: { organizationId: 'real-org' } },
    );

    expect(createReviewItem).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'real-org', reviewType: 'clinical_ai' }),
    );
  });

  it('does not fall back to a client-supplied organizationId when tenantContext is missing', () => {
    const createReviewItem = jest.fn().mockResolvedValue({ id: 'item-1' });
    const controller = new PlatformGovernanceController({ createReviewItem } as any);

    controller.createReviewItem({ organizationId: 'attacker-org' } as any, {});

    expect(createReviewItem).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: undefined }),
    );
  });
});

/**
 * getSourceProvenance never forwarded req.tenantContext.organizationId to the
 * service at all -- getSourceProvenance() itself was hardened (see its own
 * doc comment) to require organizationId to scope the lookup to the caller's
 * own org's rows, but this route always called it with organizationId
 * undefined, so a sourceId collision with another org's real synced record
 * returned that org's provenance data (including patientId) verbatim. The
 * sibling route on integrations.controller.ts already forwarded it correctly.
 */
describe('PlatformGovernanceController — getSourceProvenance organizationId scoping', () => {
  it('forwards req.tenantContext.organizationId to the service', () => {
    const getSourceProvenance = jest.fn().mockResolvedValue({ id: 'source-1' });
    const controller = new PlatformGovernanceController({ getSourceProvenance } as any);

    controller.getSourceProvenance('source-1', { tenantContext: { organizationId: 'org-a' } });

    expect(getSourceProvenance).toHaveBeenCalledWith('source-1', 'org-a');
  });

  it('passes undefined, not a client-controlled value, when tenantContext is missing', () => {
    const getSourceProvenance = jest.fn().mockResolvedValue({ id: 'source-1' });
    const controller = new PlatformGovernanceController({ getSourceProvenance } as any);

    controller.getSourceProvenance('source-1', {});

    expect(getSourceProvenance).toHaveBeenCalledWith('source-1', undefined);
  });
});

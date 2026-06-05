import { ForbiddenException } from '@nestjs/common';
import { ProductCatalogController } from './product-catalog.controller';

describe('ProductCatalogController tenant scope', () => {
  const req = { user: { id: 'user-1' } };

  function buildController() {
    const productCatalogService = {
      getProductAssets: jest.fn().mockResolvedValue({ assets: [] }),
      getProductBuilderGraph: jest.fn().mockResolvedValue([]),
      getAssetPackBuilderGraph: jest.fn().mockResolvedValue([]),
      reconcileOrganizationCommercialPlan: jest.fn().mockResolvedValue({
        organizationId: 'org-1',
        commercialPlanId: 'enterprise',
      }),
    };
    const maturityAssessmentService = {
      submitAssessment: jest.fn().mockResolvedValue({ overallScore: 80 }),
    };
    const outcomesService = {};
    const organizationsService = {
      assertMemberForUser: jest.fn().mockResolvedValue({ organizationId: 'org-1' }),
      assertAdminForUser: jest.fn().mockResolvedValue({ organizationId: 'org-1' }),
    };

    const controller = new ProductCatalogController(
      productCatalogService as any,
      maturityAssessmentService as any,
      outcomesService as any,
      organizationsService as any,
    );

    return {
      controller,
      productCatalogService,
      maturityAssessmentService,
      organizationsService,
    };
  }

  it('checks organization membership before resolving organization-filtered product assets', async () => {
    const { controller, productCatalogService, organizationsService } = buildController();

    await controller.getProductAssets(req, 'icu-suite', 'org-1');

    expect(organizationsService.assertMemberForUser).toHaveBeenCalledWith('user-1', 'org-1');
    expect(productCatalogService.getProductAssets).toHaveBeenCalledWith('icu-suite', 'org-1', {
      userRole: undefined,
      subscriptionPlan: undefined,
    });
  });

  it('resolves product builder graphs with organization and tenant access context', async () => {
    const { controller, productCatalogService, organizationsService } = buildController();
    const tenantReq = {
      user: { id: 'user-1', role: 'admin' },
      tenantContext: { organizationId: 'org-1', role: 'owner', subscriptionPlan: 'institutional' },
    };

    await controller.productBuilder(tenantReq, 'org-1');

    expect(organizationsService.assertMemberForUser).toHaveBeenCalledWith('user-1', 'org-1');
    expect(productCatalogService.getProductBuilderGraph).toHaveBeenCalledWith(undefined, 'org-1', {
      userRole: 'owner',
      subscriptionPlan: 'institutional',
    });
  });

  it('resolves asset pack builder graphs for active tenant organization', async () => {
    const { controller, productCatalogService } = buildController();
    const tenantReq = {
      user: { id: 'user-1', role: 'admin' },
      tenantContext: { organizationId: 'org-1', role: 'admin', subscriptionPlan: 'professional' },
    };

    await controller.assetPackBuilder(tenantReq);

    expect(productCatalogService.getAssetPackBuilderGraph).toHaveBeenCalledWith('org-1', {
      userRole: 'admin',
      subscriptionPlan: 'professional',
    });
  });

  it('does not require membership for public product asset reads without organization scope', async () => {
    const { controller, productCatalogService, organizationsService } = buildController();

    await controller.getProductAssets(req, 'icu-suite');

    expect(organizationsService.assertMemberForUser).not.toHaveBeenCalled();
    expect(productCatalogService.getProductAssets).toHaveBeenCalledWith('icu-suite', undefined, {
      userRole: undefined,
      subscriptionPlan: undefined,
    });
  });

  it('does not resolve product assets when organization membership is denied', async () => {
    const { controller, productCatalogService, organizationsService } = buildController();
    organizationsService.assertMemberForUser.mockRejectedValue(
      new ForbiddenException('Not a member of this organization'),
    );

    await expect(controller.getProductAssets(req, 'icu-suite', 'org-2')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(productCatalogService.getProductAssets).not.toHaveBeenCalled();
  });

  it('checks organization membership before persisting maturity assessment results', async () => {
    const { controller, maturityAssessmentService, organizationsService } = buildController();
    const dto = { organizationId: 'org-1', answers: [] };

    await controller.submitMaturity(req, dto);

    expect(organizationsService.assertMemberForUser).toHaveBeenCalledWith('user-1', 'org-1');
    expect(maturityAssessmentService.submitAssessment).toHaveBeenCalledWith(dto);
  });

  it('does not require membership for maturity assessment recommendations without persistence', async () => {
    const { controller, maturityAssessmentService, organizationsService } = buildController();
    const dto = { answers: [] };

    await controller.submitMaturity(req, dto);

    expect(organizationsService.assertMemberForUser).not.toHaveBeenCalled();
    expect(maturityAssessmentService.submitAssessment).toHaveBeenCalledWith(dto);
  });

  it('does not persist maturity assessment results when organization membership is denied', async () => {
    const { controller, maturityAssessmentService, organizationsService } = buildController();
    organizationsService.assertMemberForUser.mockRejectedValue(
      new ForbiddenException('Not a member of this organization'),
    );

    await expect(
      controller.submitMaturity(req, { organizationId: 'org-2', answers: [] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(maturityAssessmentService.submitAssessment).not.toHaveBeenCalled();
  });

  it('requires organization admin access before reconciling commercial plan entitlements', async () => {
    const { controller, productCatalogService, organizationsService } = buildController();

    await controller.reconcileCommercialPlan(req, 'org-1', 'enterprise', false);

    expect(organizationsService.assertAdminForUser).toHaveBeenCalledWith('user-1', 'org-1');
    expect(productCatalogService.reconcileOrganizationCommercialPlan).toHaveBeenCalledWith(
      'org-1',
      'enterprise',
      { disableRemovedPacks: false },
    );
  });

  it('does not reconcile commercial plan entitlements when admin access is denied', async () => {
    const { controller, productCatalogService, organizationsService } = buildController();
    organizationsService.assertAdminForUser.mockRejectedValue(
      new ForbiddenException('Organization admin access required'),
    );

    await expect(controller.reconcileCommercialPlan(req, 'org-2', 'enterprise')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(productCatalogService.reconcileOrganizationCommercialPlan).not.toHaveBeenCalled();
  });
});

import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from '../organizations/organizations.service';
import { AssetDependencyGraphService } from './asset-dependency-graph.service';
import { SubmitMaturityAssessmentDto } from './dto/submit-maturity-assessment.dto';
import { UpdateOrganizationConfigurationDto } from './dto/update-organization-configuration.dto';
import { MaturityAssessmentService } from './maturity-assessment.service';
import { OutcomesService } from './outcomes.service';
import { ProductCatalogService } from './product-catalog.service';
import { IntegrationCategory } from './enums/product-catalog.enums';

@ApiTags('products')
@Controller()
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ProductCatalogController {
  constructor(
    private readonly productCatalogService: ProductCatalogService,
    private readonly assetDependencyGraphService: AssetDependencyGraphService,
    private readonly maturityAssessmentService: MaturityAssessmentService,
    private readonly outcomesService: OutcomesService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Get('products')
  @ApiOperation({ summary: 'List sellable CareDroid products' })
  listProducts() {
    return this.productCatalogService.listProducts();
  }

  @Get('products/pack-map')
  @ApiOperation({ summary: 'Map asset pack ids to parent products' })
  packProductMap() {
    return this.productCatalogService.getPackToProductMap();
  }

  @Get('products/builder')
  @ApiOperation({ summary: 'List product builder graphs with packs, assets, routes, and services' })
  async productBuilder(@Req() req: any, @Query('organizationId') organizationId?: string) {
    if (organizationId) {
      await this.organizationsService.assertMemberForUser(req.user.id, organizationId);
    }
    return this.productCatalogService.getProductBuilderGraph(
      undefined,
      organizationId || req.tenantContext?.organizationId,
      {
        userRole: req.tenantContext?.role || req.user?.role,
        subscriptionPlan: req.tenantContext?.subscriptionPlan || req.user?.subscription?.tier,
      },
    );
  }

  @Get('products/:slug')
  @ApiOperation({ summary: 'Get product by slug' })
  getProduct(@Param('slug') slug: string) {
    return this.productCatalogService.getProductBySlug(slug);
  }

  @Get('products/:slug/builder')
  @ApiOperation({ summary: 'Get product builder graph with packs, assets, routes, and services' })
  async productBuilderDetail(
    @Req() req: any,
    @Param('slug') slug: string,
    @Query('organizationId') organizationId?: string,
  ) {
    if (organizationId) {
      await this.organizationsService.assertMemberForUser(req.user.id, organizationId);
    }
    return this.productCatalogService.getProductBuilderGraph(
      slug,
      organizationId || req.tenantContext?.organizationId,
      {
        userRole: req.tenantContext?.role || req.user?.role,
        subscriptionPlan: req.tenantContext?.subscriptionPlan || req.user?.subscription?.tier,
      },
    );
  }

  @Get('asset-packs')
  @ApiOperation({ summary: 'List asset pack builder graphs with products and assets' })
  async assetPackBuilder(@Req() req: any, @Query('organizationId') organizationId?: string) {
    if (organizationId) {
      await this.organizationsService.assertMemberForUser(req.user.id, organizationId);
    }
    return this.productCatalogService.getAssetPackBuilderGraph(
      organizationId || req.tenantContext?.organizationId,
      {
        userRole: req.tenantContext?.role || req.user?.role,
        subscriptionPlan: req.tenantContext?.subscriptionPlan || req.user?.subscription?.tier,
      },
    );
  }

  @Get('products/:slug/assets')
  @ApiOperation({ summary: 'Resolve product assets via packs' })
  async getProductAssets(
    @Req() req: any,
    @Param('slug') slug: string,
    @Query('organizationId') organizationId?: string,
  ) {
    if (organizationId) {
      await this.organizationsService.assertMemberForUser(req.user.id, organizationId);
    }
    return this.productCatalogService.getProductAssets(
      slug,
      organizationId || req.tenantContext?.organizationId,
      {
        userRole: req.tenantContext?.role || req.user?.role,
        subscriptionPlan: req.tenantContext?.subscriptionPlan || req.user?.subscription?.tier,
      },
    );
  }

  @Get('commercial-plans')
  @ApiOperation({ summary: 'List commercial plans' })
  listPlans() {
    return this.productCatalogService.listCommercialPlans();
  }

  @Get('commercial-plans/:id')
  @ApiOperation({ summary: 'Get commercial plan with products' })
  getPlan(@Param('id') id: string) {
    return this.productCatalogService.getCommercialPlan(id);
  }

  @Get('specialties')
  @ApiOperation({ summary: 'List specialty marketplace categories' })
  listSpecialties() {
    return this.productCatalogService.listSpecialties();
  }

  @Get('specialties/:slug')
  @ApiOperation({ summary: 'Get specialty with mapped assets' })
  getSpecialty(@Param('slug') slug: string) {
    return this.productCatalogService.getSpecialtyBySlug(slug);
  }

  @Get('specialties/:slug/assets')
  @ApiOperation({ summary: 'Get specialty assets' })
  getSpecialtyAssets(@Param('slug') slug: string) {
    return this.productCatalogService.getSpecialtyBySlug(slug);
  }

  @Get('care-pathways')
  @ApiOperation({ summary: 'List care pathways' })
  listPathways() {
    return this.productCatalogService.listCarePathways();
  }

  @Get('care-pathways/:slug')
  @ApiOperation({ summary: 'Get care pathway with steps' })
  getPathway(@Param('slug') slug: string) {
    return this.productCatalogService.getCarePathwayBySlug(slug);
  }

  @Get('agents')
  @ApiOperation({ summary: 'List AI agent registry' })
  listAgents() {
    return this.productCatalogService.listAgents();
  }

  @Get('integrations-marketplace')
  @ApiOperation({ summary: 'List integration marketplace offerings' })
  listIntegrations(@Query('category') category?: IntegrationCategory) {
    return this.productCatalogService.listIntegrations(category);
  }

  @Get('integration-readiness')
  @ApiOperation({ summary: 'List integration readiness status by integration category' })
  integrationReadiness() {
    return this.productCatalogService.getIntegrationReadiness();
  }

  @Get('dependency-graph')
  @ApiOperation({ summary: 'Project asset dependency graph across products, packs, assets, routes, services, and integrations' })
  dependencyGraph() {
    return this.assetDependencyGraphService.getGraph();
  }

  @Get('maturity-assessments/questionnaire')
  @ApiOperation({ summary: 'Get maturity assessment questionnaire' })
  getQuestionnaire() {
    return this.maturityAssessmentService.getQuestionnaire();
  }

  @Post('maturity-assessments')
  @ApiOperation({ summary: 'Submit maturity assessment and get product recommendations' })
  async submitMaturity(@Req() req: any, @Body() dto: SubmitMaturityAssessmentDto) {
    if (dto.organizationId) {
      await this.organizationsService.assertMemberForUser(req.user.id, dto.organizationId);
    }
    return this.maturityAssessmentService.submitAssessment(dto);
  }

  @Get('organizations/:organizationId/outcomes')
  @ApiOperation({ summary: 'Organization outcome metrics for leadership' })
  async outcomes(@Req() req: any, @Param('organizationId') organizationId: string) {
    await this.organizationsService.assertMemberForUser(req.user.id, organizationId);
    return this.outcomesService.getOrganizationOutcomes(organizationId);
  }

  @Patch('organizations/:organizationId/configuration')
  @ApiOperation({ summary: 'Update organization platform configuration' })
  async updateConfiguration(
    @Req() req: any,
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateOrganizationConfigurationDto,
  ) {
    return this.organizationsService.updateConfiguration(
      req.user,
      organizationId,
      dto as Record<string, unknown>,
    );
  }

  @Patch('organizations/:organizationId/commercial-plan')
  @ApiOperation({ summary: 'Reconcile organization entitlements from a commercial plan' })
  async reconcileCommercialPlan(
    @Req() req: any,
    @Param('organizationId') organizationId: string,
    @Body('commercialPlanId') commercialPlanId: string,
    @Body('disableRemovedPacks') disableRemovedPacks?: boolean,
  ) {
    await this.organizationsService.assertAdminForUser(req.user.id, organizationId);
    return this.productCatalogService.reconcileOrganizationCommercialPlan(
      organizationId,
      commercialPlanId,
      { disableRemovedPacks },
    );
  }

  @Post('organizations/:organizationId/integrations/request')
  @ApiOperation({ summary: 'Request integration enablement' })
  async requestIntegration(
    @Req() req: any,
    @Param('organizationId') organizationId: string,
    @Body('integrationSlug') integrationSlug: string,
  ) {
    return this.organizationsService.requestIntegration(req.user, organizationId, integrationSlug);
  }
}

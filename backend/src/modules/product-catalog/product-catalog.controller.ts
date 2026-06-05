import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from '../organizations/organizations.service';
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

  @Get('products/:slug')
  @ApiOperation({ summary: 'Get product by slug' })
  getProduct(@Param('slug') slug: string) {
    return this.productCatalogService.getProductBySlug(slug);
  }

  @Get('products/:slug/assets')
  @ApiOperation({ summary: 'Resolve product assets via packs' })
  getProductAssets(@Param('slug') slug: string, @Query('organizationId') organizationId?: string) {
    return this.productCatalogService.getProductAssets(slug, organizationId);
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

  @Get('maturity-assessments/questionnaire')
  @ApiOperation({ summary: 'Get maturity assessment questionnaire' })
  getQuestionnaire() {
    return this.maturityAssessmentService.getQuestionnaire();
  }

  @Post('maturity-assessments')
  @ApiOperation({ summary: 'Submit maturity assessment and get product recommendations' })
  submitMaturity(@Body() dto: SubmitMaturityAssessmentDto) {
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

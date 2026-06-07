import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '../auth/enums/permission.enum';
import { OrganizationOnboardingDto } from '../product-catalog/dto/organization-onboarding.dto';
import { TenantIsolationGuard } from '../tenant-context/tenant-isolation.guard';
import { OrganizationScoped, SkipTenantIsolation } from '../tenant-context/tenant-scope.decorator';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationOnboardingService } from './organization-onboarding.service';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(AuthGuard('jwt'), TenantIsolationGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly organizationOnboardingService: OrganizationOnboardingService,
  ) {}

  @Get()
  @SkipTenantIsolation()
  @ApiOperation({ summary: 'List organizations for current user' })
  async list(@Req() req: any) {
    return this.organizationsService.listForUser(req.user.id);
  }

  @Get('current')
  @SkipTenantIsolation()
  @ApiOperation({ summary: 'Get current user primary organization' })
  async current(@Req() req: any) {
    return this.organizationsService.getCurrentForUser(req.user);
  }

  @Get('current/engine')
  @SkipTenantIsolation()
  @ApiOperation({ summary: 'Get current organization and tenant engine context' })
  async currentEngine(@Req() req: any) {
    return this.organizationsService.getCurrentEngineForUser(req.user);
  }

  @Post()
  @SkipTenantIsolation()
  @ApiOperation({ summary: 'Create organization and assign default packs' })
  async create(@Req() req: any, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(req.user, dto);
  }

  @Post('onboarding')
  @SkipTenantIsolation()
  @ApiOperation({ summary: 'Complete organization onboarding wizard' })
  async onboarding(@Req() req: any, @Body() dto: OrganizationOnboardingDto) {
    return this.organizationOnboardingService.completeOnboarding(req.user, dto);
  }

  @Get(':organizationId')
  @OrganizationScoped()
  @ApiOperation({ summary: 'Get organization with entitlements' })
  async getOne(@Req() req: any, @Param('organizationId') organizationId: string) {
    this.assertTenantOrganization(req, organizationId);
    return this.organizationsService.getForUser(req.user, organizationId);
  }

  @Get(':organizationId/engine')
  @OrganizationScoped()
  @ApiOperation({
    summary: 'Get organization engine model: tenant, branding, subscription, integrations',
  })
  async getEngine(@Req() req: any, @Param('organizationId') organizationId: string) {
    this.assertTenantOrganization(req, organizationId);
    return this.organizationsService.getEngineForUser(req.user, organizationId);
  }

  @Get(':organizationId/tenant-admin')
  @OrganizationScoped()
  @ApiOperation({ summary: 'Get tenant administration center model for the organization' })
  async getTenantAdministration(@Req() req: any, @Param('organizationId') organizationId: string) {
    this.assertTenantOrganization(req, organizationId);
    return this.organizationsService.getTenantAdministration(req.user, organizationId);
  }

  @Patch(':organizationId/tenant-admin')
  @OrganizationScoped({ admin: 'organization' })
  @ApiOperation({ summary: 'Update tenant-scoped administration settings without code changes' })
  async updateTenantAdministration(
    @Req() req: any,
    @Param('organizationId') organizationId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    this.assertTenantOrganization(req, organizationId);
    return this.organizationsService.updateTenantAdministration(req.user, organizationId, dto);
  }

  @Get(':organizationId/feature-flags')
  @OrganizationScoped()
  @ApiOperation({ summary: 'Get tenant-scoped feature flag rollout controls' })
  async getFeatureFlags(@Req() req: any, @Param('organizationId') organizationId: string) {
    this.assertTenantOrganization(req, organizationId);
    return this.organizationsService.getFeatureFlagAdministration(req.user, organizationId);
  }

  @Patch(':organizationId/feature-flags')
  @OrganizationScoped({ admin: 'organization', permissions: [Permission.CONFIGURE_SYSTEM] })
  @ApiOperation({ summary: 'Update a tenant, workspace, role, beta, or internal feature flag' })
  async updateFeatureFlags(
    @Req() req: any,
    @Param('organizationId') organizationId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    this.assertTenantOrganization(req, organizationId);
    return this.organizationsService.updateFeatureFlagAdministration(
      req.user,
      organizationId,
      dto as any,
    );
  }

  @Patch(':organizationId')
  @OrganizationScoped({ admin: 'organization' })
  @ApiOperation({ summary: 'Update organization settings' })
  async update(
    @Req() req: any,
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    this.assertTenantOrganization(req, organizationId);
    return this.organizationsService.update(req.user, organizationId, dto);
  }

  @Patch(':organizationId/settings')
  @OrganizationScoped({ admin: 'organization' })
  @ApiOperation({ summary: 'Update organization engine settings' })
  async updateSettings(
    @Req() req: any,
    @Param('organizationId') organizationId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    this.assertTenantOrganization(req, organizationId);
    return this.organizationsService.updateOrganizationSettings(req.user, organizationId, dto);
  }

  private assertTenantOrganization(req: any, organizationId: string) {
    if (req.tenantContext?.organizationId && req.tenantContext.organizationId !== organizationId) {
      throw new ForbiddenException('Requested organization does not match tenant context.');
    }
  }
}

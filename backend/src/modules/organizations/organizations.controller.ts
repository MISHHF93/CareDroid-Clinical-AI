import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationOnboardingDto } from '../product-catalog/dto/organization-onboarding.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationOnboardingService } from './organization-onboarding.service';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly organizationOnboardingService: OrganizationOnboardingService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List organizations for current user' })
  async list(@Req() req: any) {
    return this.organizationsService.listForUser(req.user.id);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current user primary organization' })
  async current(@Req() req: any) {
    return this.organizationsService.getCurrentForUser(req.user);
  }

  @Post()
  @ApiOperation({ summary: 'Create organization and assign default packs' })
  async create(@Req() req: any, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(req.user, dto);
  }

  @Post('onboarding')
  @ApiOperation({ summary: 'Complete organization onboarding wizard' })
  async onboarding(@Req() req: any, @Body() dto: OrganizationOnboardingDto) {
    return this.organizationOnboardingService.completeOnboarding(req.user, dto);
  }

  @Get(':organizationId')
  @ApiOperation({ summary: 'Get organization with entitlements' })
  async getOne(@Req() req: any, @Param('organizationId') organizationId: string) {
    return this.organizationsService.getForUser(req.user, organizationId);
  }

  @Patch(':organizationId')
  @ApiOperation({ summary: 'Update organization settings' })
  async update(
    @Req() req: any,
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(req.user, organizationId, dto);
  }
}

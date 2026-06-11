import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '../auth/enums/permission.enum';
import { TenantIsolationGuard } from '../tenant-context/tenant-isolation.guard';
import { TenantScoped } from '../tenant-context/tenant-scope.decorator';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { OrganizationsService } from './organizations.service';

@ApiTags('settings')
@Controller('settings/features')
@UseGuards(AuthGuard('jwt'), TenantIsolationGuard)
@ApiBearerAuth()
export class SettingsFeaturesController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @TenantScoped({ requireWorkspaceId: false })
  @ApiOperation({ summary: 'Get Emergency OS feature flags for the current tenant' })
  async getFeatureSettings(@Req() req: any) {
    return this.organizationsService.getEmergencyFeatureSettings(
      req.user,
      req.tenantContext.organizationId,
    );
  }

  @Patch()
  @TenantScoped({
    requireWorkspaceId: false,
    admin: 'organization',
    permissions: [Permission.CONFIGURE_SYSTEM],
  })
  @ApiOperation({ summary: 'Update an Emergency OS feature flag for the current tenant' })
  async updateFeatureSettings(@Req() req: any, @Body() body: Record<string, any>) {
    const result = await this.organizationsService.updateEmergencyFeatureSetting(
      req.user,
      req.tenantContext.organizationId,
      body,
    );

    const changed = result.changed;
    await this.auditService.log({
      userId: req.user?.id,
      actorUserId: req.user?.id,
      organizationId: req.tenantContext?.organizationId,
      workspaceId: req.tenantContext?.workspaceId,
      action: AuditAction.SECURITY_EVENT,
      resource: `feature:${changed.featureId}`,
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers?.['user-agent'] || 'unknown',
      metadata: {
        eventType: 'feature_toggle',
        featureId: changed.featureId,
        enabled: changed.enabled,
        staffId: req.user?.id,
        changedBy: changed.changedBy,
        timestamp: changed.timestamp,
        tier: result.tier,
      },
    });

    return result;
  }
}

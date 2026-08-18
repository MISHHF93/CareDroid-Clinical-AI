import { Body, Controller, Get, Injectable, Module, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PlatformGovernanceModule, PlatformGovernanceService } from '../platform-governance';

@Injectable()
export class PrivacyService {
  constructor(private readonly platformGovernance: PlatformGovernanceService) {}

  // Was the most exposed of the 3 controllers sharing these unscoped
  // service methods (see PlatformPrivacyRequest/PlatformObservabilityEvent's
  // organizationId doc comments): zero @Req() at all, gated only by
  // VIEW_PRIVACY_CENTER/REQUEST_DATA_EXPORT -- any holder of those got every
  // org's export/delete requests AND the full PHI-access audit log via a
  // single GET /privacy/summary.
  async getSummary(organizationId?: string) {
    return {
      consentManagement: await this.platformGovernance.getConsent('demo-patient', organizationId),
      retentionPolicy: { status: 'configured_by_policy', defaultMode: 'minimum_necessary' },
      exportData: await this.platformGovernance.listPrivacyRequests(undefined, organizationId),
      deleteData: await this.platformGovernance.listPrivacyRequests(undefined, organizationId),
      auditAccess: await this.platformGovernance.getPrivacyAccessLog(undefined, organizationId),
    };
  }

  createRequest(body: Record<string, any>, organizationId?: string) {
    return this.platformGovernance.createPrivacyRequest(
      String(body.patientId || 'demo-patient'),
      String(body.requestType || 'export'),
      body,
      organizationId,
    );
  }
}

@Controller('privacy')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class PrivacyCenterController {
  constructor(private readonly privacy: PrivacyService) {}

  @Get('summary')
  @Permissions(Permission.VIEW_PRIVACY_CENTER)
  getSummary(@Req() req: any) {
    return this.privacy.getSummary(req.tenantContext?.organizationId);
  }

  @Post('requests')
  @Permissions(Permission.REQUEST_DATA_EXPORT)
  createRequest(@Body() body: Record<string, unknown>, @Req() req: any) {
    return this.privacy.createRequest(body, req.tenantContext?.organizationId);
  }
}

@Module({
  imports: [PlatformGovernanceModule],
  controllers: [PrivacyCenterController],
  providers: [PrivacyService],
  exports: [PrivacyService],
})
export class PrivacyCenterModule {}

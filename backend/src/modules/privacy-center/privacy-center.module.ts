import { Body, Controller, Get, Injectable, Module, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PlatformGovernanceModule, PlatformGovernanceService } from '../platform-governance';

@Injectable()
export class PrivacyService {
  constructor(private readonly platformGovernance: PlatformGovernanceService) {}

  async getSummary() {
    return {
      consentManagement: await this.platformGovernance.getConsent('demo-patient'),
      retentionPolicy: { status: 'configured_by_policy', defaultMode: 'minimum_necessary' },
      exportData: await this.platformGovernance.listPrivacyRequests(),
      deleteData: await this.platformGovernance.listPrivacyRequests(),
      auditAccess: await this.platformGovernance.getPrivacyAccessLog(),
    };
  }

  createRequest(body: Record<string, any>) {
    return this.platformGovernance.createPrivacyRequest(
      String(body.patientId || 'demo-patient'),
      String(body.requestType || 'export'),
      body,
    );
  }
}

@Controller('privacy')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class PrivacyCenterController {
  constructor(private readonly privacy: PrivacyService) {}

  @Get('summary')
  @Permissions(Permission.VIEW_PRIVACY_CENTER)
  getSummary() {
    return this.privacy.getSummary();
  }

  @Post('requests')
  @Permissions(Permission.REQUEST_DATA_EXPORT)
  createRequest(@Body() body: Record<string, unknown>) {
    return this.privacy.createRequest(body);
  }
}

@Module({
  imports: [PlatformGovernanceModule],
  controllers: [PrivacyCenterController],
  providers: [PrivacyService],
  exports: [PrivacyService],
})
export class PrivacyCenterModule {}

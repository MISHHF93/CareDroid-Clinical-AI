import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { EntitlementService } from '../platform-assets/entitlement.service';
import { assertEntitlementLaunchFromRequest } from '../platform-assets/entitlement-launch.util';
import { NativeAiService } from './native-ai.service';
import type { Patient } from '../../../../src/types/emergency';

@ApiTags('native-ai')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@Controller('native-ai')
export class NativeAiController {
  constructor(
    private readonly nativeAiService: NativeAiService,
    private readonly entitlementService: EntitlementService,
  ) {}

  private async assertNativeAiAccess(req: any) {
    await assertEntitlementLaunchFromRequest(this.entitlementService, req, 'agent-clinical');
  }

  @RequirePermission(Permission.VIEW_OBSERVABILITY)
  @Get('registry')
  getRegistry() {
    return this.nativeAiService.getRegistrySummary();
  }

  @RequirePermission(Permission.VIEW_OBSERVABILITY)
  @Get('drift')
  async getDrift(@Req() req: any) {
    await this.assertNativeAiAccess(req);
    return this.nativeAiService.getDriftEnvelope();
  }

  @RequirePermission(Permission.VIEW_OBSERVABILITY)
  @Post('drift/evaluate')
  async evaluateDrift(@Req() req: any) {
    await this.assertNativeAiAccess(req);
    return this.nativeAiService.evaluateDrift();
  }

  @RequirePermission(Permission.READ_PHI)
  @Post('route')
  async routePatient(@Body() body: { patient: Patient }, @Req() req: any) {
    await this.assertNativeAiAccess(req);
    return this.nativeAiService.routePatient(body.patient);
  }

  @RequirePermission(Permission.READ_PHI)
  @Post('clinical-acuity')
  async getClinicalAcuity(@Body() body: { patients: Patient[] }, @Req() req: any) {
    await this.assertNativeAiAccess(req);
    return this.nativeAiService.getClinicalAcuity(body.patients || []);
  }

  @RequirePermission(Permission.VIEW_GOVERNANCE)
  @Get('triage-rules')
  async listTriageRules(@Req() req: any) {
    await this.assertNativeAiAccess(req);
    return this.nativeAiService.listTriageRules();
  }

  @RequirePermission(Permission.MANAGE_CLINICAL_POLICY)
  @Post('triage-rules')
  async addTriageRule(
    @Body() body: { naturalLanguage: string; createdBy?: string },
    @Req() req: any,
  ) {
    await this.assertNativeAiAccess(req);
    return this.nativeAiService.addTriageRule(body.naturalLanguage, body.createdBy);
  }

  @RequirePermission(Permission.READ_PHI)
  @Post('triage-rules/evaluate')
  async evaluateTriage(@Body() body: { patient: Patient }, @Req() req: any) {
    await this.assertNativeAiAccess(req);
    return this.nativeAiService.evaluateTriage(body.patient);
  }

  @RequirePermission(Permission.READ_PHI)
  @Post('specialists/infer')
  async inferSpecialists(@Body() body: { patient: Patient }, @Req() req: any) {
    await this.assertNativeAiAccess(req);
    return this.nativeAiService.inferSpecialists(body.patient);
  }
}

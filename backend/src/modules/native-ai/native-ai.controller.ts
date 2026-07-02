import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
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

  @Get('registry')
  getRegistry() {
    return this.nativeAiService.getRegistrySummary();
  }

  @Get('drift')
  async getDrift(@Req() req: any) {
    await this.assertNativeAiAccess(req);
    return this.nativeAiService.getDriftEnvelope();
  }

  @Post('drift/evaluate')
  async evaluateDrift(@Req() req: any) {
    await this.assertNativeAiAccess(req);
    return this.nativeAiService.evaluateDrift();
  }

  @Post('route')
  async routePatient(@Body() body: { patient: Patient }, @Req() req: any) {
    await this.assertNativeAiAccess(req);
    return this.nativeAiService.routePatient(body.patient);
  }

  @Post('clinical-acuity')
  async getClinicalAcuity(@Body() body: { patients: Patient[] }, @Req() req: any) {
    await this.assertNativeAiAccess(req);
    return this.nativeAiService.getClinicalAcuity(body.patients || []);
  }

  @Get('triage-rules')
  async listTriageRules(@Req() req: any) {
    await this.assertNativeAiAccess(req);
    return this.nativeAiService.listTriageRules();
  }

  @Post('triage-rules')
  async addTriageRule(
    @Body() body: { naturalLanguage: string; createdBy?: string },
    @Req() req: any,
  ) {
    await this.assertNativeAiAccess(req);
    return this.nativeAiService.addTriageRule(body.naturalLanguage, body.createdBy);
  }

  @Post('triage-rules/evaluate')
  async evaluateTriage(@Body() body: { patient: Patient }, @Req() req: any) {
    await this.assertNativeAiAccess(req);
    return this.nativeAiService.evaluateTriage(body.patient);
  }

  @Post('specialists/infer')
  async inferSpecialists(@Body() body: { patient: Patient }, @Req() req: any) {
    await this.assertNativeAiAccess(req);
    return this.nativeAiService.inferSpecialists(body.patient);
  }
}

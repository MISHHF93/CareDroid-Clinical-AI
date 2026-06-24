import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { NativeAiService } from './native-ai.service';
import type { Patient } from '../../../../src/types/emergency';

@ApiTags('native-ai')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@Controller('native-ai')
export class NativeAiController {
  constructor(private readonly nativeAiService: NativeAiService) {}

  @Get('registry')
  getRegistry() {
    return this.nativeAiService.getRegistrySummary();
  }

  @Get('drift')
  getDrift() {
    return this.nativeAiService.getDriftEnvelope();
  }

  @Post('drift/evaluate')
  evaluateDrift() {
    return this.nativeAiService.evaluateDrift();
  }

  @Post('route')
  routePatient(@Body() body: { patient: Patient }) {
    return this.nativeAiService.routePatient(body.patient);
  }

  @Post('clinical-acuity')
  getClinicalAcuity(@Body() body: { patients: Patient[] }) {
    return this.nativeAiService.getClinicalAcuity(body.patients || []);
  }

  @Get('triage-rules')
  listTriageRules() {
    return this.nativeAiService.listTriageRules();
  }

  @Post('triage-rules')
  addTriageRule(@Body() body: { naturalLanguage: string; createdBy?: string }) {
    return this.nativeAiService.addTriageRule(body.naturalLanguage, body.createdBy);
  }

  @Post('triage-rules/evaluate')
  evaluateTriage(@Body() body: { patient: Patient }) {
    return this.nativeAiService.evaluateTriage(body.patient);
  }

  @Post('specialists/infer')
  inferSpecialists(@Body() body: { patient: Patient }) {
    return this.nativeAiService.inferSpecialists(body.patient);
  }
}
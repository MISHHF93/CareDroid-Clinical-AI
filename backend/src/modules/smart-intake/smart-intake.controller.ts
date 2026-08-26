import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import mongoose from 'mongoose';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { TenantContext } from '../tenant-context/tenant-context.decorator';
import type { TenantContext as TenantContextValue } from '../tenant-context/tenant-context.types';
import { SmartIntakeService } from '../../services/smart-intake.service';
import type { VerificationDecision } from '../../models/SmartIntake';
import {
  CreateSmartIntakeSessionDto,
  SmartIntakeBiometricConsentDto,
  SmartIntakeContinueUnknownDto,
  SmartIntakeCreatePatientDto,
  SmartIntakeDocumentDto,
  SmartIntakeEmsEvidenceDto,
  SmartIntakeLinkPatientDto,
  SmartIntakeManualEntryDto,
  SmartIntakeMatchDto,
  SmartIntakeOcrResultDto,
  SmartIntakeReconcileUnknownDto,
  SmartIntakeVerifyFieldDto,
  SmartIntakeWithdrawBiometricConsentDto,
} from './dto/smart-intake-actions.dto';

function assertMongoReady(): void {
  if (mongoose.connection.readyState !== 1) {
    throw new ServiceUnavailableException(
      'Smart Intake requires MongoDB (set ENABLE_MONGOOSE_EMERGENCY_OS=true and MONGODB_URI).',
    );
  }
}

/** Mirrors the legacy Express smartIntakeErrorStatus() classifier exactly. */
function rethrowAsHttpException(error: unknown): never {
  const message = String((error as { message?: string })?.message || '');
  if (/not found|missing session|session.*missing/i.test(message)) {
    throw new NotFoundException(message);
  }
  if (/already|state|pending|resolved|duplicate|reconcile/i.test(message)) {
    throw new ConflictException(message);
  }
  if (/invalid|required|consent|field|decision|patientId/i.test(message)) {
    throw new BadRequestException(message);
  }
  throw error;
}

interface ActorFields {
  staff?: string;
  clinician?: string;
}

@ApiTags('smart-intake')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@Controller('emergency/intake')
export class SmartIntakeController {
  constructor(private readonly smartIntakeService: SmartIntakeService) {}

  private actor(body: ActorFields, caredroidUserId?: string): string {
    return body?.staff || body?.clinician || caredroidUserId || 'unknown-staff';
  }

  @Post('sessions')
  @HttpCode(201)
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Create a new Smart Intake identity session' })
  async createSession(
    @Body() body: CreateSmartIntakeSessionDto,
    @Headers('x-caredroid-user-id') caredroidUserId?: string,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    assertMongoReady();
    try {
      const session = (await this.smartIntakeService.createSession(
        this.actor(body, caredroidUserId),
        tenantContext?.organizationId,
      )) as unknown as { _id: unknown };
      return { sessionId: session._id, session };
    } catch (error) {
      rethrowAsHttpException(error);
    }
  }

  @Post(':id/manual-entry')
  @HttpCode(200)
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Submit manually-entered demographics for an intake session' })
  async manualEntry(
    @Param('id') id: string,
    @Body() body: SmartIntakeManualEntryDto,
    @Headers('x-caredroid-user-id') caredroidUserId?: string,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    assertMongoReady();
    try {
      return await this.smartIntakeService.addManualEntry(
        id,
        (body.manual || {}) as never,
        this.actor(body, caredroidUserId),
        tenantContext?.organizationId,
      );
    } catch (error) {
      rethrowAsHttpException(error);
    }
  }

  @Post(':id/documents')
  @HttpCode(201)
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Attach a scanned document to an intake session' })
  async documents(
    @Param('id') id: string,
    @Body() body: SmartIntakeDocumentDto,
    @Headers('x-caredroid-user-id') caredroidUserId?: string,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    assertMongoReady();
    try {
      return await this.smartIntakeService.addDocument(
        id,
        (body.document || {}) as never,
        this.actor(body, caredroidUserId),
        tenantContext?.organizationId,
      );
    } catch (error) {
      rethrowAsHttpException(error);
    }
  }

  @Post(':id/ocr-results')
  @HttpCode(200)
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Ingest OCR extraction results for an intake session' })
  async ocrResults(
    @Param('id') id: string,
    @Body() body: SmartIntakeOcrResultDto,
    @Headers('x-caredroid-user-id') caredroidUserId?: string,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    assertMongoReady();
    try {
      return await this.smartIntakeService.ingestOcrResult(
        id,
        body,
        this.actor(body, caredroidUserId),
        tenantContext?.organizationId,
      );
    } catch (error) {
      rethrowAsHttpException(error);
    }
  }

  @Post(':id/ems-evidence')
  @HttpCode(200)
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Attach EMS pre-arrival evidence to an intake session' })
  async emsEvidence(
    @Param('id') id: string,
    @Body() body: SmartIntakeEmsEvidenceDto,
    @Headers('x-caredroid-user-id') caredroidUserId?: string,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    assertMongoReady();
    try {
      return await this.smartIntakeService.addEMSEvidence(
        id,
        (body.ems || {}) as never,
        this.actor(body, caredroidUserId),
        tenantContext?.organizationId,
      );
    } catch (error) {
      rethrowAsHttpException(error);
    }
  }

  @Post(':id/match')
  @HttpCode(200)
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Run patient-matching candidates for an intake session' })
  async match(
    @Param('id') id: string,
    @Body() body: SmartIntakeMatchDto,
    @Headers('x-caredroid-user-id') caredroidUserId?: string,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    assertMongoReady();
    try {
      return await this.smartIntakeService.match(
        id,
        this.actor(body, caredroidUserId),
        tenantContext?.organizationId,
      );
    } catch (error) {
      rethrowAsHttpException(error);
    }
  }

  @Post(':id/verify-field')
  @HttpCode(200)
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Record staff verification of a single extracted field' })
  async verifyField(
    @Param('id') id: string,
    @Body() body: SmartIntakeVerifyFieldDto,
    @Headers('x-caredroid-user-id') caredroidUserId?: string,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    assertMongoReady();
    if (!body.field || !body.decision) {
      throw new BadRequestException('field and decision are required');
    }
    try {
      return await this.smartIntakeService.verifyField(
        id,
        body.field,
        body.decision as VerificationDecision,
        this.actor(body, caredroidUserId),
        body.edited_value,
        tenantContext?.organizationId,
      );
    } catch (error) {
      rethrowAsHttpException(error);
    }
  }

  @Post(':id/link-patient')
  @HttpCode(200)
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Link an intake session to an existing matched patient' })
  async linkPatient(
    @Param('id') id: string,
    @Body() body: SmartIntakeLinkPatientDto,
    @Headers('x-caredroid-user-id') caredroidUserId?: string,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    assertMongoReady();
    if (!body.patientId) {
      throw new BadRequestException('patientId is required');
    }
    try {
      return await this.smartIntakeService.linkPatient(
        id,
        body.patientId,
        this.actor(body, caredroidUserId),
        tenantContext?.organizationId,
      );
    } catch (error) {
      rethrowAsHttpException(error);
    }
  }

  @Post(':id/create-patient')
  @HttpCode(201)
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Create a new patient record from a verified intake session' })
  async createPatient(
    @Param('id') id: string,
    @Body() body: SmartIntakeCreatePatientDto,
    @Headers('x-caredroid-user-id') caredroidUserId?: string,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    assertMongoReady();
    try {
      return await this.smartIntakeService.createPatient(
        id,
        this.actor(body, caredroidUserId),
        tenantContext?.organizationId,
      );
    } catch (error) {
      rethrowAsHttpException(error);
    }
  }

  @Post(':id/continue-unknown')
  @HttpCode(201)
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Continue an intake session as an unidentified patient' })
  async continueUnknown(
    @Param('id') id: string,
    @Body() body: SmartIntakeContinueUnknownDto,
    @Headers('x-caredroid-user-id') caredroidUserId?: string,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    assertMongoReady();
    try {
      return await this.smartIntakeService.continueUnknown(
        id,
        (body.label as never) || 'Unknown Patient',
        this.actor(body, caredroidUserId),
        tenantContext?.organizationId,
      );
    } catch (error) {
      rethrowAsHttpException(error);
    }
  }

  @Post(':id/reconcile-unknown')
  @HttpCode(200)
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Reconcile a previously-unknown patient to a real identity' })
  async reconcileUnknown(
    @Param('id') id: string,
    @Body() body: SmartIntakeReconcileUnknownDto,
    @Headers('x-caredroid-user-id') caredroidUserId?: string,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    assertMongoReady();
    if (!body.patientId) {
      throw new BadRequestException('patientId is required');
    }
    try {
      return await this.smartIntakeService.reconcileUnknown(
        id,
        body.patientId,
        this.actor(body, caredroidUserId),
        tenantContext?.organizationId,
      );
    } catch (error) {
      rethrowAsHttpException(error);
    }
  }

  @Post(':id/biometric-consent')
  @HttpCode(200)
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Capture biometric consent for an intake session' })
  async biometricConsent(
    @Param('id') id: string,
    @Body() body: SmartIntakeBiometricConsentDto,
    @Headers('x-caredroid-user-id') caredroidUserId?: string,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    assertMongoReady();
    try {
      return await this.smartIntakeService.captureBiometricConsent(
        id,
        body,
        this.actor(body, caredroidUserId),
        tenantContext?.organizationId,
      );
    } catch (error) {
      rethrowAsHttpException(error);
    }
  }

  @Post(':id/biometric-consent/withdraw')
  @HttpCode(200)
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Withdraw previously-captured biometric consent' })
  async withdrawBiometricConsent(
    @Param('id') id: string,
    @Body() body: SmartIntakeWithdrawBiometricConsentDto,
    @Headers('x-caredroid-user-id') caredroidUserId?: string,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    assertMongoReady();
    try {
      return await this.smartIntakeService.withdrawBiometricConsent(
        id,
        this.actor(body, caredroidUserId),
        tenantContext?.organizationId,
      );
    } catch (error) {
      rethrowAsHttpException(error);
    }
  }

  @Get(':id/audit-log')
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'Fetch the identity-verification audit log for an intake session' })
  async auditLog(@Param('id') id: string, @TenantContext() tenantContext?: TenantContextValue) {
    assertMongoReady();
    try {
      const auditLog = await this.smartIntakeService.getAuditLog(id, tenantContext?.organizationId);
      return { count: auditLog.length, auditLog };
    } catch (error) {
      rethrowAsHttpException(error);
    }
  }
}

import {
  Body,
  Controller,
  Get,
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
import { BoardingService } from '../../services/boarding.service';
import { DischargePredictionService } from '../../services/discharge-prediction.service';
import { TrackDecisionDto } from './dto/track-decision.dto';

function assertMongoReady(): void {
  if (mongoose.connection.readyState !== 1) {
    throw new ServiceUnavailableException(
      'Boarding runtime requires MongoDB (set ENABLE_MONGOOSE_EMERGENCY_OS=true and MONGODB_URI).',
    );
  }
}

/** Mirrors this program own "not found" -> 404 error-status convention. */
function rethrowAsHttpException(error: unknown): never {
  const message = String((error as { message?: string })?.message || '');
  if (/not found/i.test(message)) throw new NotFoundException(message);
  throw error;
}

@ApiTags('boarding')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@Controller('emergency/boarding')
export class BoardingController {
  constructor(
    private readonly boardingService: BoardingService,
    private readonly dischargePredictionService: DischargePredictionService,
  ) {}

  @Post('track-decision')
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Track a decision-to-admit event, starting the boarding clock' })
  async trackDecision(
    @Body() body: TrackDecisionDto,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    assertMongoReady();
    try {
      const decision = await this.boardingService.trackDecisionToAdmit(
        body.patientId,
        body.clinicianId,
        tenantContext?.organizationId,
      );
      return { success: true, message: 'Decision to admit tracked', ...decision };
    } catch (error) {
      rethrowAsHttpException(error);
    }
  }

  @Get('metrics')
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'Boarding time metrics against benchmark thresholds' })
  async metrics(@TenantContext() tenantContext?: TenantContextValue) {
    assertMongoReady();
    return this.boardingService.calculateBoardMetrics(tenantContext?.organizationId);
  }

  @Get('report')
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'Full boarding report with recommendations' })
  async report(@TenantContext() tenantContext?: TenantContextValue) {
    assertMongoReady();
    return this.boardingService.generateBoardReport(tenantContext?.organizationId);
  }

  @Get('boarded')
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'List currently boarded patients' })
  async boarded(@TenantContext() tenantContext?: TenantContextValue) {
    assertMongoReady();
    return this.boardingService.getBoardedPatients(tenantContext?.organizationId);
  }

  @Get('discharge-readiness/:patientId')
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'Discharge readiness score for a patient' })
  async dischargeReadiness(
    @Param('patientId') patientId: string,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    assertMongoReady();
    try {
      return await this.dischargePredictionService.calculateDischargeReadiness(
        patientId,
        tenantContext?.organizationId,
      );
    } catch (error) {
      rethrowAsHttpException(error);
    }
  }

  @Get('same-day-discharges')
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'Midday reverse-triage sweep for same-day discharge candidates' })
  async sameDayDischarges(@TenantContext() tenantContext?: TenantContextValue) {
    assertMongoReady();
    const discharges = await this.dischargePredictionService.identifySameDayDischarges(
      tenantContext?.organizationId,
    );
    return { count: discharges.length, patients: discharges };
  }
}

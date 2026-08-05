import {
  BadRequestException,
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
import { ReassessmentService } from '../../services/reassessment.service';
import { DismissReassessmentDto, ReassessPatientDto } from './dto/reassessment-actions.dto';

function assertMongoReady(): void {
  if (mongoose.connection.readyState !== 1) {
    throw new ServiceUnavailableException(
      'Reassessment queue requires MongoDB (set ENABLE_MONGOOSE_EMERGENCY_OS=true and MONGODB_URI).',
    );
  }
}

/** Mirrors the legacy Express reassessmentErrorStatus() classifier exactly. */
function rethrowAsHttpException(error: unknown): never {
  const message = String((error as { message?: string })?.message || '');
  if (/not found/i.test(message)) throw new NotFoundException(message);
  if (/invalid|required|reason|score|clinician|notes/i.test(message)) {
    throw new BadRequestException(message);
  }
  throw error;
}

@ApiTags('reassessment')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@Controller('emergency/reassessment')
export class ReassessmentController {
  constructor(private readonly reassessmentService: ReassessmentService) {}

  @Get('due')
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'List patients currently due for reassessment' })
  async due() {
    assertMongoReady();
    const patients = await this.reassessmentService.getPatientsNeedingReassessment();
    return { count: patients.length, patients };
  }

  @Post(':patientId/reassess')
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Record a reassessment for a patient' })
  async reassess(@Param('patientId') patientId: string, @Body() body: ReassessPatientDto) {
    assertMongoReady();
    try {
      const patient = await this.reassessmentService.reassessPatient(
        patientId,
        body.new_dps_score ?? null,
        body.notes,
        body.findings,
        body.clinician,
      );
      return { message: 'Reassessment recorded', patient };
    } catch (error) {
      rethrowAsHttpException(error);
    }
  }

  @Post(':patientId/dismiss')
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Dismiss a pending reassessment for a patient' })
  async dismiss(@Param('patientId') patientId: string, @Body() body: DismissReassessmentDto) {
    assertMongoReady();
    try {
      const patient = await this.reassessmentService.dismissReassessment(
        patientId,
        body.reason,
        body.clinician,
      );
      return { message: 'Reassessment dismissed', patient };
    } catch (error) {
      rethrowAsHttpException(error);
    }
  }
}

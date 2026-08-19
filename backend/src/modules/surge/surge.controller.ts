import {
  Body,
  Controller,
  Get,
  NotFoundException,
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
import { SurgeCapacityService } from '../../services/surge-capacity.service';
import { ActivateSurgeDto } from './dto/activate-surge.dto';
import { BatchEmsIntakeDto } from './dto/batch-ems-intake.dto';
import { DeactivateSurgeDto } from './dto/deactivate-surge.dto';

/**
 * Real logic (activateSurgeMode/batchEMSIntake/etc. in SurgeCapacityService)
 * requires a live Mongoose connection. Return a clean 503 rather than an
 * unhandled 500 when it isn't configured/connected, instead of gating route
 * *existence* behind ENABLE_MONGOOSE_EMERGENCY_OS the way the legacy Express
 * mount did.
 */
function assertMongoReady(): void {
  if (mongoose.connection.readyState !== 1) {
    throw new ServiceUnavailableException(
      'Surge capacity service requires MongoDB (set ENABLE_MONGOOSE_EMERGENCY_OS=true and MONGODB_URI).',
    );
  }
}

@ApiTags('surge')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@Controller('emergency/surge')
export class SurgeController {
  constructor(private readonly surgeCapacityService: SurgeCapacityService) {}

  @Post('activate')
  @RequirePermission(Permission.ACTIVATE_SURGE_MODE)
  @ApiOperation({ summary: 'Activate a hospital-wide mass-casualty / disaster surge event' })
  async activate(@Body() body: ActivateSurgeDto) {
    assertMongoReady();
    const surgeEvent = await this.surgeCapacityService.activateSurgeMode({
      ...body,
      // SurgeEventInput's actualPatientCount is typed as required, but
      // activateSurgeMode's own implementation already defaults it to 0 --
      // matching that real fallback here rather than the stricter type.
      actualPatientCount: body.actualPatientCount ?? 0,
    });
    return { success: true, surgeEvent };
  }

  @Post('batch-ems-intake')
  @RequirePermission(Permission.INGEST_SURGE_PATIENTS)
  @ApiOperation({ summary: 'Batch-create patient records from EMS mass-casualty intake' })
  async batchEmsIntake(
    @Body() body: BatchEmsIntakeDto,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    assertMongoReady();
    const patients = await this.surgeCapacityService.batchEMSIntake(
      body.patients,
      body.surgeEventId,
      tenantContext?.organizationId,
    );
    return { success: true, patients };
  }

  @Get('bottlenecks')
  @RequirePermission(Permission.VIEW_SURGE_COMMAND)
  @ApiOperation({ summary: 'Assess resource bottlenecks for the active surge event' })
  async bottlenecks() {
    assertMongoReady();
    return this.surgeCapacityService.assessResourceBottlenecks();
  }

  @Post('deactivate')
  @RequirePermission(Permission.ACTIVATE_SURGE_MODE)
  @ApiOperation({ summary: 'Deactivate an active surge event' })
  async deactivate(@Body() body: DeactivateSurgeDto) {
    assertMongoReady();
    const surgeEvent = await this.surgeCapacityService.deactivateSurgeMode(
      body.surgeEventId,
      body.debriefNotes || 'No debrief notes provided',
    );
    if (!surgeEvent) {
      throw new NotFoundException('Surge event not found');
    }
    return { success: true, surgeEvent };
  }

  @Get('status')
  @RequirePermission(Permission.VIEW_SURGE_COMMAND)
  @ApiOperation({ summary: 'Current surge status and resource bottlenecks' })
  async status() {
    assertMongoReady();
    return this.surgeCapacityService.getCurrentSurgeStatus();
  }
}

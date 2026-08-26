import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { HttpAdapterHost } from '@nestjs/core';
import mongoose from 'mongoose';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { TenantContext } from '../tenant-context/tenant-context.decorator';
import type { TenantContext as TenantContextValue } from '../tenant-context/tenant-context.types';
import { EMSService } from '../../services/ems.service';
import { EmsAlertDto, EmsArrivalDto, EmsStatusUpdateDto } from './dto/ems-actions.dto';

type EMSLifecycleStatus = 'dispatched' | 'on_scene' | 'en_route' | 'arrived';

const EMS_STATUS_ALIASES: Record<string, EMSLifecycleStatus> = {
  dispatched: 'dispatched',
  on_scene: 'on_scene',
  en_route: 'en_route',
  arrived: 'arrived',
  Inbound: 'en_route',
  Arrived: 'arrived',
  Handoff: 'arrived',
  Complete: 'arrived',
};

function normalizeEMSStatus(status: unknown): EMSLifecycleStatus | null {
  if (typeof status !== 'string') return null;
  return EMS_STATUS_ALIASES[status] || EMS_STATUS_ALIASES[status.toLowerCase()] || null;
}

function assertMongoReady(): void {
  if (mongoose.connection.readyState !== 1) {
    throw new ServiceUnavailableException(
      'EMS runtime requires MongoDB (set ENABLE_MONGOOSE_EMERGENCY_OS=true and MONGODB_URI).',
    );
  }
}

@ApiTags('ems')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@Controller('emergency/ems')
export class EmsController {
  constructor(
    private readonly emsService: EMSService,
    private readonly httpAdapterHost: HttpAdapterHost,
  ) {}

  private emitToWhiteboard(event: string, payload: unknown): void {
    try {
      const expressApp = this.httpAdapterHost.httpAdapter?.getInstance?.();
      const io = expressApp?.get?.('io') as
        | { to?: (room: string) => { emit?: (event: string, payload: unknown) => void } }
        | undefined;
      io?.to?.('whiteboard')?.emit?.(event, payload);
    } catch {
      // best-effort — never fails the request
    }
  }

  private async dualWriteSentinelInbound(body: Record<string, unknown>): Promise<void> {
    try {
      const { getSentinelRuntimeConfig } = await import('../sentinel/sentinel.config');
      if (!getSentinelRuntimeConfig().enabled) return;
      this.emitToWhiteboard('sentinel_ems_dual_write', {
        unitId: body.ems_unit_id || body.unitId,
        at: new Date().toISOString(),
        source: 'legacy-ems-alert',
      });
    } catch {
      // swallow — dual-write is optional
    }
  }

  @Post('alert')
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Record a prehospital EMS alert' })
  async alert(@Body() body: EmsAlertDto, @TenantContext() tenantContext?: TenantContextValue) {
    assertMongoReady();
    if (!body?.ems_unit_id && !body?.unitId) {
      throw new BadRequestException('ems_unit_id is required');
    }
    if (body?.eta_minutes !== undefined && !Number.isFinite(Number(body.eta_minutes))) {
      throw new BadRequestException('eta_minutes must be numeric');
    }
    if (!body?.triage_code && !body?.priority) {
      throw new BadRequestException('triage_code is required');
    }

    const patient = await this.emsService.createPrehospitalAlert(
      body as never,
      tenantContext?.organizationId,
    );
    this.emitToWhiteboard('ems_alert_received', patient);
    await this.dualWriteSentinelInbound(body as Record<string, unknown>);
    return { message: 'EMS alert received', patient };
  }

  @Patch('status/:emsUnitId')
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Update EMS unit lifecycle status' })
  async status(
    @Param('emsUnitId') emsUnitId: string,
    @Body() body: EmsStatusUpdateDto,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    assertMongoReady();
    const normalizedStatus = normalizeEMSStatus(body.status);
    if (!normalizedStatus) {
      throw new BadRequestException('status is invalid');
    }
    if (body.eta_minutes !== undefined && !Number.isFinite(Number(body.eta_minutes))) {
      throw new BadRequestException('eta_minutes must be numeric');
    }

    const patient = await this.emsService.updateEMSStatus(
      emsUnitId,
      normalizedStatus,
      body.eta_minutes,
      tenantContext?.organizationId,
    );
    if (!patient) {
      throw new NotFoundException('EMS unit not found');
    }

    this.emitToWhiteboard('ems_status_updated', patient);
    return { message: 'EMS status updated', patient };
  }

  @Post('arrive/:emsUnitId')
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Confirm EMS unit arrival' })
  async arrive(
    @Param('emsUnitId') emsUnitId: string,
    @Body() body: EmsArrivalDto,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    assertMongoReady();
    const patient = await this.emsService.confirmArrival(
      emsUnitId,
      body.real_name,
      body.real_age,
      tenantContext?.organizationId,
    );
    if (!patient) {
      throw new NotFoundException('EMS unit not found');
    }

    this.emitToWhiteboard('ems_arrival_confirmed', patient);
    return { message: 'EMS arrival confirmed', patient };
  }

  @Get('incoming')
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'List incoming EMS units' })
  async incoming(@TenantContext() tenantContext?: TenantContextValue) {
    assertMongoReady();
    const incoming = await this.emsService.getIncomingEMS(tenantContext?.organizationId);
    return { count: incoming.length, patients: incoming };
  }
}

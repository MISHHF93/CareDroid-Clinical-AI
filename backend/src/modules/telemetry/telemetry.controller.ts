import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AnyPermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { AlertService } from './alert.service';
import { DeviceRegistryService } from './device-registry.service';
import { TELEMETRY_SOURCE } from './telemetry.data';
import { TelemetryService } from './telemetry.service';
import { TelemetryRequestLike } from './telemetry.types';

const TELEMETRY_VIEW_PERMISSIONS = [
  Permission.READ_PHI,
  Permission.VIEW_ANALYTICS,
  Permission.CONFIGURE_SYSTEM,
];

function envelope<T>(data: T, message: string) {
  return {
    success: true,
    ...TELEMETRY_SOURCE,
    generatedAt:
      typeof data === 'object' && data && 'generatedAt' in data
        ? (data.generatedAt as string)
        : new Date().toISOString(),
    message,
    data,
  };
}

@ApiTags('telemetry')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@AnyPermission(...TELEMETRY_VIEW_PERMISSIONS)
@Controller()
export class TelemetryController {
  constructor(
    private readonly telemetryService: TelemetryService,
    private readonly deviceRegistryService: DeviceRegistryService,
    private readonly alertService: AlertService,
  ) {}

  @Get('devices/live')
  @ApiOperation({ summary: 'Get demo-backed Medical IoT device registry' })
  async getDevicesLive(@Req() req: TelemetryRequestLike) {
    return envelope(
      await this.deviceRegistryService.getLiveDevices(req),
      'Backend demo device registry returned. Not live patient telemetry.',
    );
  }

  @Get('telemetry/live')
  @ApiOperation({ summary: 'Get demo-backed Medical IoT telemetry and trend charts' })
  async getTelemetryLive(@Req() req: TelemetryRequestLike) {
    return envelope(
      await this.telemetryService.getLiveTelemetry(req),
      'Backend demo telemetry returned. Monitoring support only.',
    );
  }

  @Get('alerts/devices')
  @ApiOperation({ summary: 'Get demo-backed Medical IoT device alerts' })
  async getDeviceAlerts(@Req() req: TelemetryRequestLike) {
    return envelope(
      await this.alertService.getDeviceAlerts(req),
      'Backend demo device alerts returned. Not a clinical alarm source.',
    );
  }

  @Get('medical-iot/snapshot')
  @ApiOperation({ summary: 'Get combined Medical IoT dashboard snapshot' })
  async getMedicalIotSnapshot(@Req() req: TelemetryRequestLike) {
    return envelope(
      await this.telemetryService.getSnapshot(req),
      'Backend demo Medical IoT snapshot returned. Verify clinical values in source systems.',
    );
  }
}

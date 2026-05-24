import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AnyPermission } from '../auth/decorators/permissions.decorator';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { LiveTrackingBaseController, TRACKING_VIEW_PERMISSIONS } from './live-tracking.controller';

@ApiTags('live-tracking')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@AnyPermission(...TRACKING_VIEW_PERMISSIONS)
@ApiBearerAuth()
@Controller()
export class DeviceLiveTrackingController extends LiveTrackingBaseController {
  @Get('devices/live')
  @ApiOperation({ summary: 'Get demo-backed medical device location contract' })
  getDevicesLive(@Req() req: any) {
    return this.liveTrackingService.getDevicesLive(req);
  }

  @Get('telemetry/live')
  @ApiOperation({ summary: 'Get demo-backed medical telemetry contract' })
  getTelemetryLive(@Req() req: any) {
    return this.liveTrackingService.getTelemetryLive(req);
  }

  @Get('alerts/devices')
  @ApiOperation({ summary: 'Get demo-backed medical device alert contract' })
  getDeviceAlerts(@Req() req: any) {
    return this.liveTrackingService.getDeviceAlerts(req);
  }
}

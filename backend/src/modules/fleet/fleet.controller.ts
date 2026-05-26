import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AnyPermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { FLEET_SOURCE } from './fleet.data';
import { FleetService } from './fleet.service';
import { FleetRequestLike } from './fleet.types';
import { VehicleTrackingService } from './vehicle-tracking.service';

const FLEET_VIEW_PERMISSIONS = [
  Permission.READ_PHI,
  Permission.VIEW_ANALYTICS,
  Permission.CONFIGURE_SYSTEM,
];

function envelope<T>(data: T, message: string) {
  return {
    success: true,
    ...FLEET_SOURCE,
    generatedAt: new Date().toISOString(),
    message,
    data,
  };
}

@ApiTags('fleet')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@AnyPermission(...FLEET_VIEW_PERMISSIONS)
@Controller('fleet')
export class FleetController {
  constructor(
    private readonly fleetService: FleetService,
    private readonly vehicleTrackingService: VehicleTrackingService,
  ) {}

  @Get('vehicles/live')
  @ApiOperation({
    summary: 'Get demo-backed fleet vehicle markers, ETAs, statuses, and utilization',
  })
  async getFleetVehicles(@Req() req: FleetRequestLike) {
    return envelope(
      await this.vehicleTrackingService.getLiveVehicles(req),
      'Backend demo fleet vehicles returned. Not a live GPS feed.',
    );
  }

  @Get('routes/active')
  @ApiOperation({ summary: 'Get demo-backed active fleet route lines' })
  async getFleetRoutes(@Req() req: FleetRequestLike) {
    return envelope(
      await this.fleetService.getActiveRoutes(req),
      'Backend demo active routes returned. Verify dispatch status in the system of record.',
    );
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get demo-backed fleet alerts' })
  async getFleetAlerts(@Req() req: FleetRequestLike) {
    return envelope(
      await this.fleetService.getFleetAlerts(req),
      'Backend demo fleet alerts returned. Verify operational alarms in the system of record.',
    );
  }

  @Get('snapshot')
  @ApiOperation({ summary: 'Get combined demo-backed fleet live tracking snapshot' })
  async getFleetSnapshot(@Req() req: FleetRequestLike) {
    return envelope(
      await this.fleetService.getFleetSnapshot(req),
      'Backend demo fleet live tracking snapshot returned.',
    );
  }
}

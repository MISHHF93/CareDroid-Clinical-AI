import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { LiveTrackingService } from './live-tracking.service';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { AnyPermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';

export const TRACKING_VIEW_PERMISSIONS = [
  Permission.READ_PHI,
  Permission.VIEW_ANALYTICS,
  Permission.CONFIGURE_SYSTEM,
];

export class LiveTrackingBaseController {
  constructor(protected readonly liveTrackingService: LiveTrackingService) {}
}

@ApiTags('live-tracking')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@AnyPermission(...TRACKING_VIEW_PERMISSIONS)
@ApiBearerAuth()
@Controller('fleet')
export class FleetLiveTrackingController extends LiveTrackingBaseController {
  @Get('vehicles/live')
  @ApiOperation({ summary: 'Get demo-backed fleet live vehicle contract' })
  getFleetVehicles(@Req() req: any) {
    return this.liveTrackingService.getFleetVehicles(req);
  }

  @Get('routes/active')
  @ApiOperation({ summary: 'Get demo-backed fleet active route contract' })
  getFleetRoutes(@Req() req: any) {
    return this.liveTrackingService.getFleetRoutes(req);
  }
}

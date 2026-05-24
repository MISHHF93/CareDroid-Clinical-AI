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
@Controller('hospital-map')
export class HospitalLiveTrackingController extends LiveTrackingBaseController {
  @Get('floors')
  @ApiOperation({ summary: 'Get demo-backed hospital floor map contract' })
  getHospitalFloors(@Req() req: any) {
    return this.liveTrackingService.getHospitalFloors(req);
  }

  @Get('devices')
  @ApiOperation({ summary: 'Get demo-backed hospital device map contract' })
  getHospitalDevices(@Req() req: any) {
    return this.liveTrackingService.getHospitalDevices(req);
  }
}

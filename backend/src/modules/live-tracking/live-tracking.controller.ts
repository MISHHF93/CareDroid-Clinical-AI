import { LiveTrackingService } from './live-tracking.service';
import { Permission } from '../auth/enums/permission.enum';

export const TRACKING_VIEW_PERMISSIONS = [
  Permission.READ_PHI,
  Permission.VIEW_ANALYTICS,
  Permission.CONFIGURE_SYSTEM,
];

export class LiveTrackingBaseController {
  constructor(protected readonly liveTrackingService: LiveTrackingService) {}
}

/**
 * Legacy adapter kept for source compatibility only.
 * Active fleet HTTP routes live on `FleetController`.
 */
export class FleetLiveTrackingController extends LiveTrackingBaseController {
  getFleetVehicles(req: any) {
    return this.liveTrackingService.getFleetVehicles(req);
  }

  getFleetRoutes(req: any) {
    return this.liveTrackingService.getFleetRoutes(req);
  }
}

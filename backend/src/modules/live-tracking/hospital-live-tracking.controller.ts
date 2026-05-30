import { LiveTrackingBaseController } from './live-tracking.controller';

/**
 * Legacy adapter kept for source compatibility only.
 * Active hospital-map HTTP routes live on `HospitalMapController`.
 */
export class HospitalLiveTrackingController extends LiveTrackingBaseController {
  getHospitalFloors(req: any) {
    return this.liveTrackingService.getHospitalFloors(req);
  }

  getHospitalDevices(req: any) {
    return this.liveTrackingService.getHospitalDevices(req);
  }
}

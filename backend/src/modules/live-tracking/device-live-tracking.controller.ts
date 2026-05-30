import { LiveTrackingBaseController } from './live-tracking.controller';

/**
 * Legacy adapter kept for source compatibility only.
 * Active device/telemetry HTTP routes live on `TelemetryController`.
 */
export class DeviceLiveTrackingController extends LiveTrackingBaseController {
  getDevicesLive(req: any) {
    return this.liveTrackingService.getDevicesLive(req);
  }

  getTelemetryLive(req: any) {
    return this.liveTrackingService.getTelemetryLive(req);
  }

  getDeviceAlerts(req: any) {
    return this.liveTrackingService.getDeviceAlerts(req);
  }
}

import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FleetLiveTrackingController } from './live-tracking.controller';
import { DeviceLiveTrackingController } from './device-live-tracking.controller';
import { LiveTrackingService } from './live-tracking.service';

@Module({
  imports: [AuditModule],
  controllers: [
    FleetLiveTrackingController,
    DeviceLiveTrackingController,
  ],
  providers: [LiveTrackingService],
  exports: [LiveTrackingService],
})
export class LiveTrackingModule {}

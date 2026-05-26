import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FleetLiveTrackingController } from './live-tracking.controller';
import { LiveTrackingService } from './live-tracking.service';

@Module({
  imports: [AuditModule],
  controllers: [
    FleetLiveTrackingController,
  ],
  providers: [LiveTrackingService],
  exports: [LiveTrackingService],
})
export class LiveTrackingModule {}

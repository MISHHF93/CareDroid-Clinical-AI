import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { LiveTrackingService } from './live-tracking.service';

@Module({
  imports: [AuditModule],
  controllers: [],
  providers: [LiveTrackingService],
  exports: [LiveTrackingService],
})
export class LiveTrackingModule {}

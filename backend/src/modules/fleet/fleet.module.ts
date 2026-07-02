import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PlatformAssetsModule } from '../platform-assets/platform-assets.module';
import { FleetAuditService } from './fleet-audit.service';
import { FleetController } from './fleet.controller';
import { FleetService } from './fleet.service';
import { VehicleTrackingService } from './vehicle-tracking.service';

@Module({
  imports: [AuditModule, PlatformAssetsModule],
  controllers: [FleetController],
  providers: [FleetAuditService, FleetService, VehicleTrackingService],
  exports: [FleetService, VehicleTrackingService],
})
export class FleetModule {}

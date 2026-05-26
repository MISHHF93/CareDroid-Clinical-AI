import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AlertService } from './alert.service';
import { DeviceRegistryService } from './device-registry.service';
import { TelemetryAuditService } from './telemetry-audit.service';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';

@Module({
  imports: [AuditModule],
  controllers: [TelemetryController],
  providers: [TelemetryAuditService, TelemetryService, DeviceRegistryService, AlertService],
  exports: [TelemetryService, DeviceRegistryService, AlertService],
})
export class TelemetryModule {}

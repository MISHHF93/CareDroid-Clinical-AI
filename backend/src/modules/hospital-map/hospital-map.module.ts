import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DeviceLocationService } from './device-location.service';
import { FloorService } from './floor.service';
import { HospitalMapController } from './hospital-map.controller';
import { RoomService } from './room.service';

@Module({
  imports: [AuditModule],
  controllers: [HospitalMapController],
  providers: [FloorService, RoomService, DeviceLocationService],
  exports: [FloorService, RoomService, DeviceLocationService],
})
export class HospitalMapModule {}

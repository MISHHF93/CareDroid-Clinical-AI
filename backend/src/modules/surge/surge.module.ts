import { Module } from '@nestjs/common';
import { SurgeCapacityService } from '../../services/surge-capacity.service';
import { SurgeController } from './surge.controller';

@Module({
  controllers: [SurgeController],
  providers: [SurgeCapacityService],
  exports: [SurgeCapacityService],
})
export class SurgeModule {}

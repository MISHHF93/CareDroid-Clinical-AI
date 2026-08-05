import { Module } from '@nestjs/common';
import { CapacityService } from '../../services/capacity.service';
import { CapacityController } from './capacity.controller';

@Module({
  controllers: [CapacityController],
  providers: [CapacityService],
  exports: [CapacityService],
})
export class CapacityModule {}

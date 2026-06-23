import { Module } from '@nestjs/common';
import { SurveillanceController } from './surveillance.controller';
import { SurveillanceService } from './surveillance.service';

@Module({
  controllers: [SurveillanceController],
  providers: [SurveillanceService],
  exports: [SurveillanceService],
})
export class SurveillanceModule {}

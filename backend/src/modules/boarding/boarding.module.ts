import { Module } from '@nestjs/common';
import { BoardingController } from './boarding.controller';
import { BoardingService } from '../../services/boarding.service';
import { DischargePredictionService } from '../../services/discharge-prediction.service';

@Module({
  controllers: [BoardingController],
  providers: [BoardingService, DischargePredictionService],
  exports: [BoardingService, DischargePredictionService],
})
export class BoardingModule {}

import { Module } from '@nestjs/common';
import { DeteriorationController } from './deterioration.controller';
import { DeteriorationPredictionV3Service } from '../../services/deterioration-prediction-v3.service';

@Module({
  controllers: [DeteriorationController],
  providers: [DeteriorationPredictionV3Service],
  exports: [DeteriorationPredictionV3Service],
})
export class DeteriorationModule {}

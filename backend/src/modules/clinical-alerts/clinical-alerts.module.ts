import { Module } from '@nestjs/common';
import { ClinicalAlertsController } from './clinical-alerts.controller';
import { ClinicalAlertsService } from './clinical-alerts.service';

@Module({
  controllers: [ClinicalAlertsController],
  providers: [ClinicalAlertsService],
  exports: [ClinicalAlertsService],
})
export class ClinicalAlertsModule {}

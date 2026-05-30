import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ClinicalAlertsController } from './clinical-alerts.controller';
import { ClinicalAlertsService } from './clinical-alerts.service';

@Module({
  imports: [AuditModule],
  controllers: [ClinicalAlertsController],
  providers: [ClinicalAlertsService],
  exports: [ClinicalAlertsService],
})
export class ClinicalAlertsModule {}

import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CollaborationHubModule } from '../collaboration-hub/collaboration-hub.module';
import { ClinicalAlertsController } from './clinical-alerts.controller';
import { ClinicalAlertsService } from './clinical-alerts.service';

@Module({
  imports: [AuditModule, CollaborationHubModule],
  controllers: [ClinicalAlertsController],
  providers: [ClinicalAlertsService],
  exports: [ClinicalAlertsService],
})
export class ClinicalAlertsModule {}

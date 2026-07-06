import { Module } from '@nestjs/common';
import { EmergencyEscalationService } from './emergency-escalation.service';
import { AuditModule } from '../../audit/audit.module';
import { MetricsModule } from '../../metrics/metrics.module';
import { CollaborationHubModule } from '../../collaboration-hub/collaboration-hub.module';

@Module({
  imports: [AuditModule, MetricsModule, CollaborationHubModule],
  providers: [EmergencyEscalationService],
  exports: [EmergencyEscalationService],
})
export class EmergencyEscalationModule {}

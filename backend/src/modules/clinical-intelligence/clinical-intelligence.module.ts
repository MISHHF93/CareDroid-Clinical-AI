import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RAGModule } from '../rag/rag.module';
import { ClinicalIntelligenceController } from './clinical-intelligence.controller';
import { ClinicalIntelligenceService } from './clinical-intelligence.service';
import { TimelineService } from './timeline.service';
import { PlatformGovernanceModule } from '../platform-governance';

@Module({
  imports: [AuditModule, RAGModule, PlatformGovernanceModule],
  controllers: [ClinicalIntelligenceController],
  providers: [ClinicalIntelligenceService, TimelineService],
  exports: [ClinicalIntelligenceService, TimelineService],
})
export class ClinicalIntelligenceModule {}

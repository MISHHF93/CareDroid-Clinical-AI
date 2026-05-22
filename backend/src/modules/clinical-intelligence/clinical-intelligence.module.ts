import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RAGModule } from '../rag/rag.module';
import { ClinicalIntelligenceController } from './clinical-intelligence.controller';
import { ClinicalIntelligenceService } from './clinical-intelligence.service';

@Module({
  imports: [AuditModule, RAGModule],
  controllers: [ClinicalIntelligenceController],
  providers: [ClinicalIntelligenceService],
  exports: [ClinicalIntelligenceService],
})
export class ClinicalIntelligenceModule {}

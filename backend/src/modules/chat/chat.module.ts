import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AiModule } from '../ai/ai.module';
import { IntentClassifierModule } from '../medical-control-plane/intent-classifier/intent-classifier.module';
import { ToolOrchestratorModule } from '../medical-control-plane/tool-orchestrator/tool-orchestrator.module';
import { EmergencyEscalationModule } from '../medical-control-plane/emergency-escalation/emergency-escalation.module';
import { AuditModule } from '../audit/audit.module';
import { RAGModule } from '../rag/rag.module';
import { MetricsModule } from '../metrics/metrics.module';
import { CalculatorRecommenderService } from './calculator-recommender.service';
import { AIGatewayModule } from '../ai-gateway';
import { MoERouterModule } from '../moe-router';

@Module({
  imports: [
    AiModule,
    IntentClassifierModule,
    ToolOrchestratorModule,
    EmergencyEscalationModule,
    AuditModule,
    RAGModule,
    MetricsModule,
    AIGatewayModule,
    MoERouterModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, CalculatorRecommenderService],
  exports: [ChatService],
})
export class ChatModule {}

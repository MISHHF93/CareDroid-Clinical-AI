import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { EmergencyAIController } from './emergency-ai.controller';
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
import { ToolCallingModule } from '../tool-calling/tool-calling.module';
import { CostOptimizerModule } from '../cost-optimizer/cost-optimizer.module';
import { MemoryModule } from '../memory/memory.module';
import { ArtifactsModule } from '../artifacts/artifacts.module';
import { EvaluationModule } from '../evaluation/evaluation.module';
import { PlatformGovernanceModule } from '../platform-governance';
import { PlatformAssetsModule } from '../platform-assets/platform-assets.module';

@Module({
  imports: [
    AiModule,
    PlatformAssetsModule,
    IntentClassifierModule,
    ToolOrchestratorModule,
    EmergencyEscalationModule,
    AuditModule,
    RAGModule,
    MetricsModule,
    AIGatewayModule,
    MoERouterModule,
    ToolCallingModule,
    CostOptimizerModule,
    MemoryModule,
    ArtifactsModule,
    EvaluationModule,
    PlatformGovernanceModule,
  ],
  controllers: [ChatController, EmergencyAIController],
  providers: [ChatService, CalculatorRecommenderService],
  exports: [ChatService],
})
export class ChatModule {}

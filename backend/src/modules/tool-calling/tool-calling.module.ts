import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { IntentClassifierModule } from '../medical-control-plane/intent-classifier/intent-classifier.module';
import { ToolOrchestratorModule } from '../medical-control-plane/tool-orchestrator/tool-orchestrator.module';
import { LiveTrackingModule } from '../live-tracking/live-tracking.module';
import { PlatformSystemsModule } from '../platform-systems/platform-systems.module';
import { ParameterCollectorService } from './parameter-collector.service';
import { ToolCallingController } from './tool-calling.controller';
import { ToolExecutionService } from './tool-execution.service';
import { ToolResolverService } from './tool-resolver.service';
import { ValidationService } from './validation.service';

@Module({
  imports: [
    AiModule,
    IntentClassifierModule,
    ToolOrchestratorModule,
    LiveTrackingModule,
    PlatformSystemsModule,
  ],
  controllers: [ToolCallingController],
  providers: [
    ToolResolverService,
    ParameterCollectorService,
    ValidationService,
    ToolExecutionService,
  ],
  exports: [
    ToolResolverService,
    ParameterCollectorService,
    ValidationService,
    ToolExecutionService,
  ],
})
export class ToolCallingModule {}

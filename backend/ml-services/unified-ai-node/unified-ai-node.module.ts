import { Module } from '@nestjs/common';
import { NluModule } from '../nlu/nlu.module';
import { ArtifactRouterService } from './artifact-router.service';
import { UnifiedAiNodeController } from './unified-ai-node.controller';
import { UnifiedAiNodeService } from './unified-ai-node.service';

@Module({
  imports: [NluModule],
  controllers: [UnifiedAiNodeController],
  providers: [ArtifactRouterService, UnifiedAiNodeService],
  exports: [UnifiedAiNodeService, ArtifactRouterService],
})
export class UnifiedAiNodeModule {}
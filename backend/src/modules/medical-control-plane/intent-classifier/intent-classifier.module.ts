/**
 * Intent Classifier Module
 */

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IntentClassifierService } from './intent-classifier.service';
import { AiModule } from '../../ai/ai.module';
import { MetricsModule } from '../../metrics/metrics.module';
import { UnifiedAiNodeModule } from '../../../../ml-services/unified-ai-node/unified-ai-node.module';

@Module({
  imports: [forwardRef(() => AiModule), ConfigModule, MetricsModule, UnifiedAiNodeModule],
  providers: [IntentClassifierService],
  exports: [IntentClassifierService],
})
export class IntentClassifierModule {}

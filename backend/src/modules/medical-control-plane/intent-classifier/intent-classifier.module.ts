/**
 * Intent Classifier Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IntentClassifierService } from './intent-classifier.service';
import { AiModule } from '../../ai/ai.module';
import { MetricsModule } from '../../metrics/metrics.module';
import { NluModule } from '../../../../ml-services/nlu/nlu.module';

@Module({
  imports: [AiModule, ConfigModule, MetricsModule, NluModule],
  providers: [IntentClassifierService],
  exports: [IntentClassifierService],
})
export class IntentClassifierModule {}

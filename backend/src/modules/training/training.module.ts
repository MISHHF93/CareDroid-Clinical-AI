import { Module } from '@nestjs/common';
import { MoERouterModule } from '../moe-router';
import { RAGModule } from '../rag/rag.module';
import { MetricsModule } from '../metrics/metrics.module';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';

@Module({
  imports: [MoERouterModule, RAGModule, MetricsModule],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService],
})
export class TrainingModule {}

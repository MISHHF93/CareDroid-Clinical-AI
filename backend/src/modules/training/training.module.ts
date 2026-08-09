import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MoERouterModule } from '../moe-router';
import { RAGModule } from '../rag/rag.module';
import { MetricsModule } from '../metrics/metrics.module';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';

@Module({
  imports: [AuthModule, MoERouterModule, RAGModule, MetricsModule],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService],
})
export class TrainingModule {}

import { Module } from '@nestjs/common';
import { MetricsModule } from '../metrics/metrics.module';
import { CacheService } from './cache.service';
import { ComplexityScorerService } from './complexity-scorer.service';
import { CostOptimizerController } from './cost-optimizer.controller';
import { CostPredictionService } from './cost-prediction.service';
import { RoutingOptimizerService } from './routing-optimizer.service';

@Module({
  imports: [MetricsModule],
  controllers: [CostOptimizerController],
  providers: [CostPredictionService, ComplexityScorerService, CacheService, RoutingOptimizerService],
  exports: [CostPredictionService, ComplexityScorerService, CacheService, RoutingOptimizerService],
})
export class CostOptimizerModule {}

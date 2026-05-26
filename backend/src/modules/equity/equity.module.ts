import { Controller, Get, Injectable, Module, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PlatformGovernanceModule, PlatformGovernanceService } from '../platform-governance';

@Injectable()
export class BiasMonitorService {
  async getMetrics(platformGovernance: PlatformGovernanceService) {
    const summary = await platformGovernance.getSummary();
    return {
      modelPerformance: { status: 'baseline', sampleSize: 0 },
      demographicTrends: { status: 'minimum_cell_suppression_enabled' },
      languageTrends: { status: 'baseline_pending' },
      workflowTrends: { status: 'review_outcomes_monitored' },
      specialtyTrends: { status: 'baseline_pending' },
      metrics: {
        falsePositiveRate: null,
        falseNegativeRate: null,
        fairnessMetrics: 'baseline_required_before_scale',
        performanceDrift: 'not_enough_live_samples',
      },
      readiness: summary.readiness,
    };
  }
}

@Controller('equity')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class EquityController {
  constructor(
    private readonly biasMonitor: BiasMonitorService,
    private readonly platformGovernance: PlatformGovernanceService,
  ) {}

  @Get('summary')
  @Permissions(Permission.VIEW_EQUITY_METRICS)
  getSummary() {
    return this.biasMonitor.getMetrics(this.platformGovernance);
  }
}

@Module({
  imports: [PlatformGovernanceModule],
  controllers: [EquityController],
  providers: [BiasMonitorService],
  exports: [BiasMonitorService],
})
export class EquityModule {}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CompetencyService } from './competency.service';
import { SimulationOutcomeService } from './simulation-outcome.service';
import { SimulationRunService } from './simulation-run.service';
import { SimulationScenarioService } from './simulation-scenario.service';
import {
  CompleteSimulationDto,
  StartSimulationDto,
  SubmitSimulationStepDto,
} from './simulation.types';
import { TenantContext } from '../tenant-context/tenant-context.decorator';
import type { TenantContext as TenantContextValue } from '../tenant-context/tenant-context.types';

@Controller('simulation')
@UseGuards(AuthGuard('jwt'))
export class SimulationController {
  constructor(
    private readonly scenarios: SimulationScenarioService,
    private readonly runs: SimulationRunService,
    private readonly outcomes: SimulationOutcomeService,
    private readonly competencies: CompetencyService,
  ) {}

  @Get('scenarios')
  @HttpCode(HttpStatus.OK)
  getScenarios() {
    return this.scenarios.getScenarios();
  }

  @Get('scenarios/:id')
  @HttpCode(HttpStatus.OK)
  getScenario(@Param('id') id: string) {
    return this.scenarios.getScenario(id);
  }

  @Post('runs')
  @HttpCode(HttpStatus.OK)
  startRun(@Body() body: StartSimulationDto, @TenantContext() tenantContext?: TenantContextValue) {
    return this.runs.startRun(body, tenantContext?.userId, tenantContext?.organizationId);
  }

  @Post('runs/:id/steps')
  @HttpCode(HttpStatus.OK)
  submitStep(
    @Param('id') id: string,
    @Body() body: SubmitSimulationStepDto,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.runs.submitStep(id, body, tenantContext?.organizationId);
  }

  @Post('runs/:id/complete')
  @HttpCode(HttpStatus.OK)
  completeRun(
    @Param('id') id: string,
    @Body() body: CompleteSimulationDto,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.runs.completeRun(id, body, tenantContext?.organizationId);
  }

  @Get('outcomes')
  @HttpCode(HttpStatus.OK)
  getOutcomes(@TenantContext() tenantContext?: TenantContextValue) {
    return {
      ...this.outcomes.getOutcomes(tenantContext?.organizationId),
      competencyCoverage: this.competencies.getCoverage().competencies,
    };
  }

  @Get('recommendations')
  @HttpCode(HttpStatus.OK)
  getRecommendations(@Query('role') role?: string) {
    return this.scenarios.recommend(role);
  }
}

import { Module } from '@nestjs/common';
import { CompetencyService } from './competency.service';
import { DebriefService } from './debrief.service';
import { SimulationController } from './simulation.controller';
import { SimulationOutcomeService } from './simulation-outcome.service';
import { SimulationRunService } from './simulation-run.service';
import { SimulationScenarioService } from './simulation-scenario.service';

@Module({
  controllers: [SimulationController],
  providers: [
    SimulationScenarioService,
    SimulationRunService,
    SimulationOutcomeService,
    DebriefService,
    CompetencyService,
  ],
  exports: [SimulationScenarioService, SimulationRunService, SimulationOutcomeService],
})
export class SimulationModule {}

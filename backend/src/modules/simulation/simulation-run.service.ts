import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DebriefService } from './debrief.service';
import { SimulationOutcomeService } from './simulation-outcome.service';
import { SimulationScenarioService } from './simulation-scenario.service';
import {
  CompleteSimulationDto,
  SimulationRun,
  StartSimulationDto,
  SubmitSimulationStepDto,
} from './simulation.types';

@Injectable()
export class SimulationRunService {
  private readonly runs: SimulationRun[] = [];

  constructor(
    private readonly scenarios: SimulationScenarioService,
    private readonly debriefs: DebriefService,
    private readonly outcomes: SimulationOutcomeService,
  ) {}

  startRun(dto: StartSimulationDto) {
    const scenario = this.scenarios.findScenario(dto.scenarioId);
    if (!scenario) throw new NotFoundException(`Simulation scenario not found: ${dto.scenarioId}`);
    const run: SimulationRun = {
      id: randomUUID(),
      scenarioId: scenario.id,
      status: 'in-progress',
      sourceStatus: 'demo-local-state',
      startedAt: new Date().toISOString(),
      steps: [],
    };
    this.runs.unshift(run);
    return { run, scenario };
  }

  submitStep(runId: string, dto: SubmitSimulationStepDto) {
    const run = this.getRunOrThrow(runId);
    const step = {
      stepId: dto.stepId,
      decision: dto.decision,
      selectedActions: dto.selectedActions || [],
      submittedAt: new Date().toISOString(),
    };
    run.steps.push(step);
    return { run, step };
  }

  completeRun(runId: string, dto: CompleteSimulationDto) {
    const run = this.getRunOrThrow(runId);
    const scenario = this.scenarios.findScenario(run.scenarioId);
    if (!scenario) throw new NotFoundException(`Simulation scenario not found: ${run.scenarioId}`);

    run.status = 'completed';
    run.completedAt = new Date().toISOString();
    const debrief = this.debriefs.buildDebrief(scenario, dto.selectedActions || []);
    const outcome = this.outcomes.createOutcome({
      runId: run.id,
      scenarioId: run.scenarioId,
      missedCriticalActions: debrief.missedCriticalActions,
      safetyScore: debrief.scores.safetyScore,
    });
    return { run, scenario, debrief, outcome };
  }

  private getRunOrThrow(runId: string) {
    const run = this.runs.find((item) => item.id === runId);
    if (!run) throw new NotFoundException(`Simulation run not found: ${runId}`);
    return run;
  }
}

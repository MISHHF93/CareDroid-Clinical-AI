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

  startRun(dto: StartSimulationDto, userId?: string, organizationId?: string) {
    const scenario = this.scenarios.findScenario(dto.scenarioId);
    if (!scenario) throw new NotFoundException(`Simulation scenario not found: ${dto.scenarioId}`);
    const run: SimulationRun = {
      id: randomUUID(),
      scenarioId: scenario.id,
      status: 'in-progress',
      sourceStatus: 'demo-local-state',
      startedAt: new Date().toISOString(),
      steps: [],
      userId,
      organizationId,
    };
    this.runs.unshift(run);
    return { run, scenario };
  }

  submitStep(runId: string, dto: SubmitSimulationStepDto, organizationId?: string) {
    const run = this.getRunOrThrow(runId, organizationId);
    const step = {
      stepId: dto.stepId,
      decision: dto.decision,
      selectedActions: dto.selectedActions || [],
      submittedAt: new Date().toISOString(),
    };
    run.steps.push(step);
    return { run, step };
  }

  completeRun(runId: string, dto: CompleteSimulationDto, organizationId?: string) {
    const run = this.getRunOrThrow(runId, organizationId);
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
      organizationId: run.organizationId,
    });
    return { run, scenario, debrief, outcome };
  }

  // HEAL-347.91: this in-memory array had no owner/tenant concept at all -- any
  // authenticated user of any org who knew/observed a runId could submit steps to
  // or complete another org's in-progress training exercise. Org-scoped lookup,
  // same "not found" shape as every other cross-org access attempt in this
  // codebase (see emergency-os.services.ts) -- doesn't confirm the run exists.
  // Legacy runs started before this fix have no organizationId, so they remain
  // accessible to everyone (no owner to enforce against), same broadcast-to-all
  // fallback used by the realtime buses fixed in the same pass.
  private getRunOrThrow(runId: string, organizationId?: string) {
    const run = this.runs.find((item) => item.id === runId);
    if (!run) throw new NotFoundException(`Simulation run not found: ${runId}`);
    if (run.organizationId && organizationId && run.organizationId !== organizationId) {
      throw new NotFoundException(`Simulation run not found: ${runId}`);
    }
    return run;
  }
}

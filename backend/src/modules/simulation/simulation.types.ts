export type SimulationScenarioType =
  | 'virtual-patient-case'
  | 'branching-decision-scenario'
  | 'timed-emergency-drill'
  | 'team-based-simulation'
  | 'procedural-checklist'
  | 'lab-interpretation-simulation'
  | 'device-alarm-simulation'
  | 'hospital-operations-simulation'
  | 'disaster-mass-casualty-scenario'
  | 'ai-tutor-guided-case';

export interface SimulationScenario {
  id: string;
  title: string;
  specialty: string;
  category: string;
  type: SimulationScenarioType;
  difficulty: string;
  estimatedDurationMinutes: number;
  learningObjectives: string[];
  requiredTools: string[];
  targetRoles: string[];
  status: 'demo-ready' | 'live-ready';
  dataMode: string;
  caseStem: string;
  criticalActions: string[];
}

export interface SimulationRun {
  id: string;
  scenarioId: string;
  status: 'in-progress' | 'completed';
  sourceStatus: 'demo-local-state';
  startedAt: string;
  completedAt?: string;
  steps: Array<{
    stepId?: string;
    decision?: string;
    selectedActions?: string[];
    submittedAt: string;
  }>;
  // HEAL-347.91: this module-singleton in-memory array had no owner/tenant
  // concept at all -- any authenticated user of any org who knew/observed a
  // runId could submit steps to or complete another org's in-progress
  // training exercise. Absent on legacy in-flight runs from before this fix.
  userId?: string;
  organizationId?: string;
}

import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class StartSimulationDto {
  @IsString()
  @MaxLength(200)
  scenarioId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  learnerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  role?: string;
}

export class SubmitSimulationStepDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  stepId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  decision?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  selectedActions?: string[];
}

export class CompleteSimulationDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  selectedActions?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  reflection?: string;
}

export interface SimulationOutcomeDto {
  runId: string;
  scenarioId: string;
  completionRate: number;
  timeToCriticalActionSeconds: number;
  missedCriticalActions: string[];
  diagnosticAccuracy: number;
  toolUsageCorrectness: number;
  communicationScore: number;
  teamworkScore: number;
  safetyScore: number;
  debriefQualityScore: number;
  knowledgePrePostDelta: number;
  confidencePrePostDelta: number;
  kirkpatrickLevel: string;
  sourceStatus: 'demo-local-state';
}

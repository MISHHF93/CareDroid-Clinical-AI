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
}

export interface StartSimulationDto {
  scenarioId: string;
  learnerId?: string;
  role?: string;
}

export interface SubmitSimulationStepDto {
  stepId?: string;
  decision?: string;
  selectedActions?: string[];
}

export interface CompleteSimulationDto {
  selectedActions?: string[];
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

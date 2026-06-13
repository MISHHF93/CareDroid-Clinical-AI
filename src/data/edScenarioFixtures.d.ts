export const ED_SCENARIO_DEMO_MODES: any[];
export const DEFAULT_ED_SCENARIO_ID: string;

export function buildEdScenarioFixture(scenarioId?: string, options?: any): any;
export function buildEmergencyScenarioModuleEnvelope(moduleName: string, scenarioId?: string): any;
export function buildRootEmergencyScenarioState(scenarioId?: string): any;
export function buildSrcEmergencyScenarioState(scenarioId?: string): any;
export function getEdScenarioMeta(scenarioId: string): any;
export function getInitialEdScenarioId(): string;
export function persistEdScenarioId(scenarioId: string): void;

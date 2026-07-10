import { IntentClassification } from '../medical-control-plane/intent-classifier/dto/intent-classification.dto';

export type ToolCallingCategory = 'calculator' | 'map' | 'fleet' | 'iot' | 'backend-executor';

export type ToolExecutionKind = 'orchestrator' | 'live-tracking' | 'platform-demo' | 'fallback';

export interface CatalogLaunch {
  path: string | null;
  registryId: string | null;
  chatSeed: string | null;
  orchestratorTool: string | null;
  openLabel: string;
}

export interface ToolParameterSpec {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCallingCategory;
  executionKind: ToolExecutionKind;
  launch: CatalogLaunch;
  requiredParameters: ToolParameterSpec[];
  optionalParameters: ToolParameterSpec[];
  aliases?: string[];
  executorToolId?: string;
  platformCapabilityId?: string;
}

export interface ToolResolution {
  requestedToolId: string | null;
  resolvedToolId: string | null;
  definition: ToolDefinition | null;
  launch: CatalogLaunch;
  confidence: number;
  reason: string;
}

export interface ParameterCollectionResult {
  parameters: Record<string, any>;
  missingRequired: ToolParameterSpec[];
  collectedFrom: string[];
  needsFollowUp: boolean;
  followUpMessage?: string;
}

export interface ToolCallingValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ToolExecutionLogEntry {
  timestamp: string;
  userId: string;
  phase:
    | 'intent'
    | 'resolution'
    | 'parameter_collection'
    | 'validation'
    | 'execution'
    | 'response'
    | 'fallback';
  status: 'success' | 'missing_parameters' | 'failed' | 'skipped' | 'fallback';
  message: string;
  metadata?: Record<string, any>;
}

export interface ToolCallingRequest {
  prompt: string;
  toolId?: string;
  parameters?: Record<string, any>;
  userId?: string;
  conversationId?: string;
  classification?: IntentClassification | null;
  context?: Record<string, any>;
}

export interface ToolCallingResult {
  success: boolean;
  status:
    | 'executed'
    | 'needs_parameters'
    | 'validation_failed'
    | 'unsupported'
    | 'fallback'
    | 'failed';
  text: string;
  toolId?: string;
  toolName?: string;
  category?: ToolCallingCategory;
  launch?: CatalogLaunch;
  parameters?: Record<string, any>;
  result?: any;
  missingParameters?: ToolParameterSpec[];
  validation?: ToolCallingValidationResult;
  intentClassification?: IntentClassification | null;
  executionLogs: ToolExecutionLogEntry[];
  suggestions?: string[];
  visualizations?: any[];
  context?: {
    toolId?: string;
    toolName?: string;
    category?: ToolCallingCategory;
    executionKind?: ToolExecutionKind;
    launch?: CatalogLaunch;
    parameters?: Record<string, any>;
    resultSummary?: Record<string, any>;
  };
  errorCode?: string;
  executionTimeMs?: number;
}

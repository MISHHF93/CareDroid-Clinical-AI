import { IntentClassification } from '../medical-control-plane/intent-classifier/dto/intent-classification.dto';

export const experts = [
  'emergency',
  'cardiology',
  'pulmonology',
  'nephrology',
  'gastroenterology',
  'neurology',
  'psychiatry',
  'musculoskeletal',
  'fleet',
  'hospital-map',
  'medical-iot',
  'operations',
  'documentation',
] as const;

export type MoEExpertId = (typeof experts)[number];

export type RetrievalPolicy = 'none' | 'reference' | 'guideline' | 'patient_scoped' | 'operational';

export type ExpertRole = 'primary' | 'supporting' | 'review';

export type RouterModelTier = 'deterministic' | 'embedding' | 'small' | 'standard' | 'large';

export type ExpertModelTier = 'none' | 'small' | 'standard' | 'large';

export type RoutingMode = 'lightweight' | 'single_expert' | 'multi_expert' | 'fallback';

/** Snapshot of CareDroid unified AI node (NLU + artifact-router) on this run. */
export interface UnifiedNodeRouteSnapshot {
  nodeId: string;
  method?: string;
  primaryIntent?: string;
  toolId?: string;
  artifactType?: string;
  artifactRouteConfidence?: number;
  confidence?: number;
  isEmergency?: boolean;
}

export interface GatewayRunEnvelope {
  runId: string;
  capabilityId: string;
  userId: string;
  workspaceId?: string;
  organizationId?: string;
  conversationId?: string;
  input: {
    message?: string;
    structuredPayload?: unknown;
    toolHint?: string;
    featureHint?: string;
  };
  policy: {
    phiAccessed: boolean;
    requiresHumanReview: boolean;
    allowedTools: string[];
    maxCostUsd?: number;
  };
  /** Filled when IntentClassifier / Unified AI Node has run for this envelope. */
  unifiedNode?: UnifiedNodeRouteSnapshot;
  trace: {
    sourceSurface: string;
    clientRequestId?: string;
    startedAt: string;
  };
}

export interface MoEExpertDescriptor {
  id: MoEExpertId;
  label: string;
  clinical: boolean;
  intents: string[];
  keywords: string[];
  toolHints: string[];
  featureHints: string[];
  sourceSurfaces: string[];
  retrievalPolicy: RetrievalPolicy;
  estimatedCost: number;
  defaultRelevance: number;
  requiresHumanReview: boolean;
  emergencyAware: boolean;
  reason: string;
}

export interface RouteEvidence {
  expertId: MoEExpertId;
  kind:
    | 'keyword'
    | 'intent'
    | 'tool_id'
    | 'feature'
    | 'source_surface'
    | 'policy'
    | 'artifact_type';
  value: string;
  weight: number;
}

export interface ExpertCandidate {
  expertId: MoEExpertId;
  role: ExpertRole;
  confidence: number;
  relevance: number;
  estimatedCost: number;
  score: number;
  reason: string;
  evidence: RouteEvidence[];
  descriptor: MoEExpertDescriptor;
}

export interface SelectedExpertRoute {
  expertId: MoEExpertId;
  role: ExpertRole;
  confidence: number;
  relevance: number;
  estimatedCost: number;
  score: number;
  reason: string;
}

export interface ExpertSelectionInput {
  envelope: GatewayRunEnvelope;
  classification: IntentClassification | null;
  primaryIntent: string;
}

export interface ExpertRoutePlan {
  runId: string;
  primaryIntent: string;
  selectedExpert: MoEExpertId;
  selectedExperts: SelectedExpertRoute[];
  confidence: number;
  retrievalPolicy: RetrievalPolicy;
  routeScore: number;
  routeReason: string;
  routingMode: RoutingMode;
  fallbackApplied: boolean;
  routingEvidence: RouteEvidence[];
  modelPlan: {
    routerModel: RouterModelTier;
    expertModel: ExpertModelTier;
    useLightweightFirst: boolean;
    allowEscalation: boolean;
    maxTokens: number;
  };
  toolPlan: {
    allowedToolIds: string[];
    backendExecutorIds: string[];
    requiredHumanConfirmation: boolean;
    orchestrationMode: 'skip' | 'plan' | 'execute';
  };
  costPlan: {
    preferredModel: string;
    maxTokens: number;
    allowFallback: boolean;
    estimatedCost: number;
    budgetLimit?: number;
    costReductionApplied: string[];
  };
  safetyPlan: {
    emergencyEscalation: boolean;
    crisisEscalation: boolean;
    requiresHumanReview: boolean;
    blockedActions: string[];
  };
}

export interface PipelineStage {
  stage:
    | 'ai_gateway'
    | 'intent_classifier'
    | 'expert_router'
    | 'context_builder'
    | 'tool_orchestrator'
    | 'response_composer';
  status: 'complete' | 'planned' | 'skipped' | 'fallback';
  detail?: string;
}

export interface AiContextPacket {
  runId: string;
  capabilityId: string;
  userId: string;
  conversationId?: string;
  sourceSurface: string;
  inputSummary: {
    messageCharacters: number;
    toolHint?: string;
    featureHint?: string;
  };
  route: {
    primaryIntent: string;
    selectedExpert: MoEExpertId;
    selectedExperts: SelectedExpertRoute[];
    retrievalPolicy: RetrievalPolicy;
    confidence: number;
    routeScore: number;
    routeReason: string;
    routingMode: RoutingMode;
    fallbackApplied: boolean;
  };
  cost: {
    estimatedCost: number;
    costReductionApplied: string[];
  };
  memory: {
    conversationScope: 'request' | 'session' | 'patient' | 'workspace';
    persistence: 'none' | 'planned' | 'enabled';
  };
  safety: {
    phiAccessed: boolean;
    requiresHumanReview: boolean;
    blockedActions: string[];
  };
  pipeline: PipelineStage[];
}

export interface AiGatewayMetadata {
  runId: string;
  capabilityId: string;
  route: string;
  selectedExpert: MoEExpertId;
  selectedExperts?: SelectedExpertRoute[];
  retrievalPolicy: RetrievalPolicy;
  confidence: number;
  routeScore?: number;
  routeReason?: string;
  routingMode?: RoutingMode;
  fallbackApplied?: boolean;
  estimatedCost?: number;
  costReductionApplied?: string[];
  phiAccessed: boolean;
  requiresHumanReview: boolean;
  startedAt: string;
  /** Present when CareDroid unified AI node contributed to this run. */
  unifiedNode?: UnifiedNodeRouteSnapshot;
}

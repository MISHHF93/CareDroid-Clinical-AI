export type RetrievalPolicy = 'none' | 'reference' | 'guideline' | 'patient_scoped' | 'operational';

export type AiExpertId =
  | 'emergency'
  | 'cardiology'
  | 'pulmonology'
  | 'nephrology'
  | 'radiology'
  | 'psychiatry'
  | 'fleet'
  | 'iot'
  | 'operations'
  | 'hospital-map'
  | 'documentation';

export type ExpertRole = 'primary' | 'supporting' | 'review';

export type RouterModelTier = 'deterministic' | 'embedding' | 'small' | 'standard' | 'large';

export type ExpertModelTier = 'none' | 'small' | 'standard' | 'large';

export interface RouteEvidence {
  expertId: AiExpertId;
  kind: 'keyword' | 'intent' | 'tool_id' | 'feature' | 'source_surface' | 'policy';
  value: string;
  weight: number;
}

export interface SelectedExpertRoute {
  expertId: AiExpertId;
  role: ExpertRole;
  confidence: number;
  relevance: number;
  estimatedCost: number;
  score: number;
  reason: string;
}

export interface AiRunEnvelope {
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
  trace: {
    sourceSurface: string;
    clientRequestId?: string;
    startedAt: string;
  };
}

export interface ExpertRoutePlan {
  runId: string;
  primaryIntent: string;
  /**
   * Backward-compatible primary expert field for older consumers.
   * New consumers should prefer selectedExperts[0].expertId.
   */
  selectedExpert: string;
  selectedExperts: SelectedExpertRoute[];
  confidence: number;
  retrievalPolicy: RetrievalPolicy;
  routeScore: number;
  routeReason: string;
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
    selectedExpert: string;
    selectedExperts: SelectedExpertRoute[];
    retrievalPolicy: RetrievalPolicy;
    confidence: number;
    routeScore: number;
    routeReason: string;
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
}

export interface AiFoundationMetadata {
  runId: string;
  capabilityId: string;
  route: string;
  selectedExpert: string;
  selectedExperts?: SelectedExpertRoute[];
  retrievalPolicy: RetrievalPolicy;
  confidence: number;
  routeScore?: number;
  routeReason?: string;
  estimatedCost?: number;
  costReductionApplied?: string[];
  phiAccessed: boolean;
  requiresHumanReview: boolean;
  startedAt: string;
}

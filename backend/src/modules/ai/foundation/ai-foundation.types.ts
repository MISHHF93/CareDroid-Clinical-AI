export type RetrievalPolicy = 'none' | 'reference' | 'guideline' | 'patient_scoped';

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
  selectedExpert: string;
  confidence: number;
  retrievalPolicy: RetrievalPolicy;
  toolPlan: {
    allowedToolIds: string[];
    requiredHumanConfirmation: boolean;
  };
  costPlan: {
    preferredModel: string;
    maxTokens: number;
    allowFallback: boolean;
  };
  safetyPlan: {
    emergencyEscalation: boolean;
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
    retrievalPolicy: RetrievalPolicy;
    confidence: number;
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
  retrievalPolicy: RetrievalPolicy;
  confidence: number;
  phiAccessed: boolean;
  requiresHumanReview: boolean;
  startedAt: string;
}

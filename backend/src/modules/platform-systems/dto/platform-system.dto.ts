export interface PlatformSafetyDto {
  reviewRequired: boolean;
  demoMode: boolean;
  blockedActions: string[];
  warnings: string[];
}

export interface SourceProvenanceDto {
  sourceSystem: string;
  sourceResourceId: string;
  observedAt: string;
  freshness: 'demo' | 'current' | 'stale' | 'unknown';
  normalized: boolean;
}

export interface PlatformCapabilityContractDto {
  capabilityId: string;
  pack: string;
  tier: string;
  route: string;
  endpoint: string;
  sourceKind: 'platform';
  executorStatus: 'platform' | 'registered_executor' | 'unsupported';
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  permissionPolicy: string[];
  apiClient: string;
  auditEvents: string[];
  dashboardPlacement: string[];
  status: 'demo_available' | 'unsupported_until_configured';
  contractVersion: string;
  criticality?: 'P0' | 'P1' | 'P2' | 'P3';
  implementationPhase?: string;
  requiresHumanReview?: boolean;
  requiresConsent?: boolean;
  regulatoryClassificationRequired?: boolean;
  provenance: SourceProvenanceDto;
  safety: PlatformSafetyDto;
}

export interface PlatformDemoResultDto {
  runId: string;
  capabilityId: string;
  contractVersion: string;
  status: string;
  reviewRequired: boolean;
  provenance: SourceProvenanceDto;
  safety: PlatformSafetyDto;
  data: Record<string, unknown>;
}

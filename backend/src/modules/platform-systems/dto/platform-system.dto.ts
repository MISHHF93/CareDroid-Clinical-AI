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
  status: 'demo_available' | 'unsupported_until_configured';
  contractVersion: string;
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

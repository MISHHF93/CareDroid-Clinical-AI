export interface PlatformGateDecisionDto {
  runId?: string;
  capabilityId: string;
  allowed: boolean;
  requiresHumanReview: boolean;
  consentRequired: boolean;
  regulatoryClassificationRequired: boolean;
  blockedActions: string[];
  reasons: string[];
  metadata: Record<string, any>;
}

export interface PlatformGovernanceSummaryDto {
  status: string;
  generatedAt: string;
  readiness: {
    criticality: 'P0';
    blocked: boolean;
    blockers: string[];
  };
  counts: Record<string, number>;
  safety: {
    autonomousActionTaken: false;
    failClosed: boolean;
    demoExternalConnectors: boolean;
  };
}

export interface PlatformSyntheticConnectorDto {
  connectorId: string;
  connectorType: 'fhir' | 'hl7';
  status: 'synthetic_ready';
  sourceSystem: string;
  payload: Record<string, any>;
  provenance: Record<string, any>;
}

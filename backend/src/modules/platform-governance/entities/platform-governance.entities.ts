import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PlatformGovernanceStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  NEEDS_REVIEW = 'needs_review',
  BLOCKED = 'blocked',
  RESOLVED = 'resolved',
  REVOKED = 'revoked',
  DEMO = 'demo',
}

@Entity('platform_governance_policies')
@Index(['capabilityId', 'status'])
@Index(['organizationId', 'updatedAt'])
export class PlatformGovernancePolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  organizationId: string;

  @Column({ type: 'varchar', length: 96 })
  capabilityId: string;

  @Column({ type: 'varchar', length: 80 })
  policyType: string;

  @Column({ type: 'varchar', length: 40, default: 'v1' })
  version: string;

  @Column({ type: 'varchar', length: 40, default: PlatformGovernanceStatus.DRAFT })
  status: PlatformGovernanceStatus;

  @Column({ type: 'simple-json', nullable: true })
  content: Record<string, any>;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ type: 'datetime', nullable: true })
  effectiveAt: Date;

  @Column({ type: 'datetime', nullable: true })
  retiredAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('clinical_release_gates')
@Index(['capabilityId', 'status'])
@Index(['changeType', 'riskLevel'])
export class PlatformClinicalReleaseGate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 96 })
  capabilityId: string;

  @Column({ type: 'varchar', length: 80 })
  changeType: string;

  @Column({ type: 'varchar', length: 96, nullable: true })
  artifactVersion: string;

  @Column({ type: 'varchar', length: 40, default: 'high' })
  riskLevel: string;

  @Column({ type: 'varchar', length: 96, nullable: true })
  validationRunId: string;

  @Column({ type: 'varchar', length: 40, default: PlatformGovernanceStatus.NEEDS_REVIEW })
  status: PlatformGovernanceStatus;

  @Column({ type: 'simple-json', nullable: true })
  requiredApprovals: Record<string, any>[];

  @Column({ type: 'simple-json', nullable: true })
  decision: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('clinical_safety_findings')
@Index(['capabilityId', 'status'])
@Index(['runId'])
@Index(['severity', 'findingType'])
export class PlatformClinicalSafetyFinding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 96, nullable: true })
  runId: string;

  @Column({ type: 'varchar', length: 96 })
  capabilityId: string;

  @Column({ type: 'varchar', length: 40, default: 'high' })
  severity: string;

  @Column({ type: 'varchar', length: 80, default: 'clinical_safety' })
  findingType: string;

  @Column({ type: 'varchar', length: 80, default: 'governance' })
  source: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'uuid', nullable: true })
  ownerUserId: string;

  @Column({ type: 'varchar', length: 40, default: PlatformGovernanceStatus.NEEDS_REVIEW })
  status: PlatformGovernanceStatus;

  @Column({ type: 'simple-json', nullable: true })
  resolution: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('platform_security_events')
@Index(['runId'])
@Index(['capabilityId', 'createdAt'])
@Index(['severity', 'status'])
export class PlatformSecurityEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 96, nullable: true })
  runId: string;

  @Column({ type: 'varchar', length: 96 })
  capabilityId: string;

  @Column({ type: 'varchar', length: 80 })
  eventType: string;

  @Column({ type: 'varchar', length: 40, default: 'medium' })
  severity: string;

  @Column({ type: 'varchar', length: 40, default: PlatformGovernanceStatus.NEEDS_REVIEW })
  status: PlatformGovernanceStatus;

  @Column({ type: 'varchar', length: 120, nullable: true })
  action: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  inputHash: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('platform_regulatory_classifications')
@Index(['capabilityId', 'status'])
@Index(['jurisdiction', 'riskLevel'])
export class PlatformRegulatoryClassification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 96 })
  capabilityId: string;

  @Column({ type: 'varchar', length: 40, default: 'US' })
  jurisdiction: string;

  @Column({ type: 'varchar', length: 80, default: 'clinical_decision_support' })
  classification: string;

  @Column({ type: 'varchar', length: 40, default: 'high' })
  riskLevel: string;

  @Column({ type: 'text' })
  intendedUse: string;

  @Column({ type: 'simple-json', nullable: true })
  excludedUses: string[];

  @Column({ type: 'boolean', default: true })
  requiresHumanReview: boolean;

  @Column({ type: 'varchar', length: 40, default: PlatformGovernanceStatus.NEEDS_REVIEW })
  status: PlatformGovernanceStatus;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('platform_equity_metrics')
@Index(['capabilityId', 'cohortId'])
@Index(['metricName', 'windowEnd'])
export class PlatformEquityMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 96 })
  capabilityId: string;

  @Column({ type: 'varchar', length: 96 })
  cohortId: string;

  @Column({ type: 'varchar', length: 80 })
  metricName: string;

  @Column({ type: 'float', default: 0 })
  value: number;

  @Column({ type: 'int', default: 0 })
  denominator: number;

  @Column({ type: 'datetime', nullable: true })
  windowStart: Date;

  @Column({ type: 'datetime', nullable: true })
  windowEnd: Date;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('platform_validation_scenarios')
@Index(['capabilityId', 'status'])
@Index(['scenarioType', 'riskLevel'])
export class PlatformValidationScenario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 96 })
  capabilityId: string;

  @Column({ type: 'varchar', length: 80 })
  scenarioType: string;

  @Column({ type: 'varchar', length: 40, default: 'high' })
  riskLevel: string;

  @Column({ type: 'varchar', length: 40, default: 'v1' })
  version: string;

  @Column({ type: 'varchar', length: 40, default: PlatformGovernanceStatus.DEMO })
  status: PlatformGovernanceStatus;

  @Column({ type: 'simple-json', nullable: true })
  inputFixture: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  expectedAssertions: Record<string, any>[];

  @Column({ type: 'simple-json', nullable: true })
  lastRunSummary: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('platform_review_items')
@Index(['patientId', 'status'])
@Index(['runId'])
@Index(['reviewType', 'severity'])
export class PlatformReviewItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  organizationId: string;

  @Column({ type: 'varchar', length: 96, nullable: true })
  patientId: string;

  @Column({ type: 'varchar', length: 96, nullable: true })
  runId: string;

  @Column({ type: 'varchar', length: 96 })
  capabilityId: string;

  @Column({ type: 'varchar', length: 80 })
  reviewType: string;

  @Column({ type: 'varchar', length: 40, default: 'high' })
  severity: string;

  @Column({ type: 'varchar', length: 40, default: PlatformGovernanceStatus.NEEDS_REVIEW })
  status: PlatformGovernanceStatus;

  @Column({ type: 'uuid', nullable: true })
  assignedTo: string;

  @Column({ type: 'datetime', nullable: true })
  dueAt: Date;

  @Column({ type: 'simple-json', nullable: true })
  payload: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  decision: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('platform_consent_records')
@Index(['patientId', 'scope', 'status'])
@Index(['organizationId', 'updatedAt'])
export class PlatformConsentRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 96 })
  patientId: string;

  @Column({ type: 'uuid', nullable: true })
  organizationId: string;

  @Column({ type: 'varchar', length: 80 })
  scope: string;

  @Column({ type: 'varchar', length: 40, default: PlatformGovernanceStatus.NEEDS_REVIEW })
  status: PlatformGovernanceStatus;

  @Column({ type: 'datetime', nullable: true })
  grantedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date;

  @Column({ type: 'datetime', nullable: true })
  revokedAt: Date;

  @Column({ type: 'varchar', length: 80, default: 'platform' })
  source: string;

  @Column({ type: 'uuid', nullable: true })
  capturedBy: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('platform_privacy_requests')
@Index(['patientId', 'status'])
@Index(['requestType', 'createdAt'])
@Index(['organizationId'])
export class PlatformPrivacyRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Nullable: existing rows predate this column with no reliable org signal
   * to backfill from. A null row is treated as legacy/unscoped -- visible to
   * every org's reads until reconciled, never assigned to a different org's
   * own row. Matches the pattern already established for PlatformReviewItem/
   * PlatformConsentRecord (see getConsent()'s IsNull()-OR read shape).
   */
  @Column({ type: 'uuid', nullable: true })
  organizationId: string;

  @Column({ type: 'varchar', length: 96 })
  patientId: string;

  @Column({ type: 'varchar', length: 80 })
  requestType: string;

  @Column({ type: 'varchar', length: 40, default: PlatformGovernanceStatus.NEEDS_REVIEW })
  status: PlatformGovernanceStatus;

  @Column({ type: 'uuid', nullable: true })
  requestedBy: string;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy: string;

  @Column({ type: 'datetime', nullable: true })
  dueAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resultArtifactUri: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('platform_observability_events')
@Index(['correlationId'])
@Index(['capabilityId', 'createdAt'])
@Index(['eventType', 'status'])
@Index(['organizationId'])
export class PlatformObservabilityEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** See PlatformPrivacyRequest.organizationId for the nullable/legacy-row rationale. */
  @Column({ type: 'uuid', nullable: true })
  organizationId: string;

  @Column({ type: 'varchar', length: 96, nullable: true })
  correlationId: string;

  @Column({ type: 'varchar', length: 96 })
  capabilityId: string;

  @Column({ type: 'varchar', length: 80 })
  eventType: string;

  @Column({ type: 'varchar', length: 40, default: 'info' })
  severity: string;

  @Column({ type: 'varchar', length: 40, default: 'recorded' })
  status: string;

  @Column({ type: 'int', nullable: true })
  durationMs: number;

  @Column({ type: 'boolean', default: false })
  phiAccessed: boolean;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('platform_source_provenance')
@Index(['patientId', 'resourceType'])
@Index(['sourceSystem', 'externalResourceId'])
export class PlatformSourceProvenance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  sourceSystem: string;

  @Column({ type: 'varchar', length: 80 })
  sourceType: string;

  @Column({ type: 'varchar', length: 160 })
  externalResourceId: string;

  @Column({ type: 'varchar', length: 96, nullable: true })
  patientId: string;

  @Column({ type: 'varchar', length: 80 })
  resourceType: string;

  @Column({ type: 'datetime', nullable: true })
  fetchedAt: Date;

  @Column({ type: 'varchar', length: 40, default: 'demo' })
  freshness: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  normalizedHash: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}

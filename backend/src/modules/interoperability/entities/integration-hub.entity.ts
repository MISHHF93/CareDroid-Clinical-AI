import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  AutomationTrigger,
  IntegrationAutomationRouteResult,
  IntegrationEvent,
  IntegrationEventFamily,
  IntegrationParserStatus,
  NormalizedClinicalEvent,
  SafeAction,
} from '../normalized-clinical-event.model';

export enum IntegrationSourceStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
  DEMO = 'demo',
}

export enum IntegrationEventProcessingStatus {
  RECEIVED = 'received',
  NORMALIZED = 'normalized',
  ROUTED = 'routed',
  UNSUPPORTED = 'unsupported',
  FAILED = 'failed',
}

@Entity('integration_sources')
@Index(['organizationId', 'workspaceId', 'sourceSystem', 'family'])
export class IntegrationSourceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  organizationId: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  workspaceId: string | null;

  @Column({ type: 'varchar', length: 160 })
  sourceSystem: string;

  @Column({ type: 'varchar', length: 64 })
  family: IntegrationEventFamily;

  @Column({ type: 'varchar', length: 120, nullable: true })
  vendor: string | null;

  @Column({ type: 'varchar', length: 80, default: IntegrationSourceStatus.ACTIVE })
  status: IntegrationSourceStatus;

  @Column({ type: 'varchar', length: 80, default: 'shared-secret-or-token' })
  authMode: string;

  @Column({ type: 'simple-json', default: '[]' })
  labels: string[];

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('integration_event_records')
@Index(['organizationId', 'workspaceId', 'receivedAt'])
@Index(['sourceId', 'receivedAt'])
@Index(['idempotencyKey'])
export class IntegrationEventRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sourceId: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  organizationId: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  workspaceId: string | null;

  @Column({ type: 'varchar', length: 160 })
  sourceSystem: string;

  @Column({ type: 'varchar', length: 64 })
  family: string;

  @Column({ type: 'varchar', length: 120 })
  eventType: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  vendor: string | null;

  @Column({ type: 'varchar', length: 220, nullable: true })
  idempotencyKey: string | null;

  @Column({ type: 'varchar', length: 80, default: IntegrationEventProcessingStatus.RECEIVED })
  processingStatus: IntegrationEventProcessingStatus;

  @Column({ type: 'simple-json' })
  rawEvent: IntegrationEvent;

  @Column({ type: 'simple-json', nullable: true })
  routeResult: IntegrationAutomationRouteResult | null;

  @Column({ type: 'uuid', nullable: true })
  normalizedEventId: string | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'datetime' })
  receivedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('normalized_integration_events')
@Index(['organizationId', 'workspaceId', 'occurredAt'])
@Index(['rawEventRecordId'])
@Index(['kind', 'severity'])
export class NormalizedIntegrationEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  rawEventRecordId: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  organizationId: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  workspaceId: string | null;

  @Column({ type: 'varchar', length: 80 })
  kind: string;

  @Column({ type: 'varchar', length: 64 })
  sourceFamily: string;

  @Column({ type: 'varchar', length: 120 })
  sourceEventType: string;

  @Column({ type: 'varchar', length: 80 })
  parserStatus: IntegrationParserStatus;

  @Column({ type: 'varchar', length: 40 })
  severity: string;

  @Column({ type: 'simple-json' })
  normalizedEvent: NormalizedClinicalEvent;

  @Column({ type: 'simple-json', nullable: true })
  trigger: AutomationTrigger | null;

  @Column({ type: 'simple-json' })
  safeAction: SafeAction;

  @Column({ type: 'simple-json', default: '[]' })
  labels: string[];

  @Column({ type: 'datetime' })
  occurredAt: Date;

  @Column({ type: 'datetime' })
  receivedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}

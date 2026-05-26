import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ArtifactType {
  CALCULATOR = 'calculator',
  WORKFLOW = 'workflow',
  PROMPT = 'prompt',
  DASHBOARD = 'dashboard',
  TEMPLATE = 'template',
  PROTOCOL = 'protocol',
  TELEMETRY_SCHEMA = 'telemetry_schema',
  MAP = 'map',
  AI_OUTPUT = 'ai_output',
}

export interface ArtifactRelationship {
  artifactId: string;
  type?: string;
  label?: string;
}

@Entity('artifacts')
@Index(['type'])
@Index(['version'])
export class Artifact {
  @PrimaryColumn({ type: 'varchar', length: 96 })
  id: string;

  @Column({ type: 'varchar', length: 40 })
  type: ArtifactType;

  @Column({ type: 'varchar', length: 180 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'simple-json', nullable: true })
  tags: string[];

  @Column({ type: 'simple-json', nullable: true })
  relationships: ArtifactRelationship[];

  @Column({ type: 'varchar', length: 32 })
  version: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

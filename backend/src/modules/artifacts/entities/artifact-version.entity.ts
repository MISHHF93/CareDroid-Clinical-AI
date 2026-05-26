import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { ArtifactRelationship, ArtifactType } from './artifact.entity';

@Entity('artifact_versions')
@Index(['artifactId', 'version'])
export class ArtifactVersion {
  @PrimaryColumn({ type: 'varchar', length: 96 })
  id: string;

  @Column({ type: 'varchar', length: 96 })
  artifactId: string;

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

  @Column({ type: 'varchar', length: 180, nullable: true })
  changeSummary: string;

  @CreateDateColumn()
  createdAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Workspace } from './workspace.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  country: string;

  @Column({ type: 'simple-json', nullable: true })
  branding: Record<string, any>;

  @OneToMany(() => Workspace, (workspace) => workspace.organization)
  workspaces: Workspace[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

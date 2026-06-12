import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrganizationType } from '../../platform-assets/enums/platform-asset.enums';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 64, default: OrganizationType.HOSPITAL })
  organizationType: OrganizationType;

  @Column({ type: 'varchar', length: 120, nullable: true })
  country: string;

  @Column({ type: 'simple-json', nullable: true })
  branding: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  settings: Record<string, any>;

  @OneToMany('Workspace', (workspace: any) => workspace.organization)
  workspaces: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

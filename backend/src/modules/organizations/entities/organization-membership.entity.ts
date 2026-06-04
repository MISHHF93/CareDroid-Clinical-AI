import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OrganizationMembershipRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Entity('organization_memberships')
@Index(['organizationId', 'userId'], { unique: true })
export class OrganizationMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 32, default: OrganizationMembershipRole.MEMBER })
  role: OrganizationMembershipRole;

  @Column({ type: 'varchar', length: 80, nullable: true })
  roleProfileId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

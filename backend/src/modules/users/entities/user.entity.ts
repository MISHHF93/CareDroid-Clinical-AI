import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserProfile } from './user-profile.entity';
import { OAuthAccount } from './oauth-account.entity';
import { TwoFactor } from '../../two-factor/entities/two-factor.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { AuditLog } from '../../audit/entities/audit-log.entity';

export enum UserRole {
  PHYSICIAN = 'physician',
  NURSE = 'nurse',
  STUDENT = 'student',
  ADMIN = 'admin',
  /**
   * Read-only PHI access with zero write/export/delete permissions -- e.g. a hallway
   * monitor or an observer/auditor account. Before this role existed, the frontend's
   * 'read_only_viewer'/'public_display' operational labels (see
   * jwt-claims.util.ts's EMERGENCY_ROLE_CLAIM_IDS) had no corresponding backend
   * UserRole at all, so a real account provisioned to view PHI had to be granted
   * NURSE (READ_PHI + WRITE_PHI) or fall back to STUDENT (no PHI access at all) --
   * "read-only" was enforced only by hiding UI controls, not at the permission layer.
   */
  READ_ONLY_VIEWER = 'read_only_viewer',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string; // Will be encrypted at rest

  @Column({ type: 'blob', nullable: true })
  @Exclude()
  emailEncrypted: Buffer; // Encrypted email for at-rest encryption

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Exclude()
  passwordHash: string;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true })
  @Exclude()
  emailVerificationToken: string | null;

  @Column({ type: 'datetime', nullable: true })
  emailVerificationExpiry: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  @Exclude()
  passwordResetToken: string | null;

  @Column({ type: 'datetime', nullable: true })
  passwordResetExpiry: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', enum: UserRole, default: UserRole.STUDENT })
  role: UserRole;

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt: Date;

  @Column({ type: 'varchar', length: 45, nullable: true })
  lastLoginIp: string;

  // PHI columns - encrypted at rest
  @Column({ type: 'blob', nullable: true })
  @Exclude()
  phoneEncrypted: Buffer; // Encrypted phone number

  @Column({ type: 'blob', nullable: true })
  @Exclude()
  ssnEncrypted: Buffer; // Encrypted SSN (if collected)

  // Encryption tracking
  @Column({ type: 'int', nullable: true })
  encryptionKeyVersion: number; // Which key version was used

  @Column({ type: 'boolean', default: false })
  phiFieldsEncrypted: boolean; // Whether PHI fields are encrypted

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Transient property for in-memory phone (decrypted)
  phoneDecrypted?: string;

  // Relations
  @OneToOne(() => UserProfile, (profile) => profile.user, { cascade: true })
  profile: UserProfile;

  @OneToMany(() => OAuthAccount, (account) => account.user, { cascade: true })
  oauthAccounts: OAuthAccount[];

  @OneToOne(() => TwoFactor, (twoFactor) => twoFactor.user, { cascade: true })
  twoFactor: TwoFactor;

  @OneToOne(() => Subscription, (subscription) => subscription.user)
  subscription: Subscription;

  @OneToMany(() => AuditLog, (log) => log.user)
  auditLogs: AuditLog[];
}

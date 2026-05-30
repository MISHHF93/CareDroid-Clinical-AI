import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
  AfterLoad,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserProfile } from './user-profile.entity';
import { OAuthAccount } from './oauth-account.entity';
import { TwoFactor } from '../../two-factor/entities/two-factor.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { AuditLog } from '../../audit/entities/audit-log.entity';
import { EncryptionService } from '../../encryption/encryption.service';

export enum UserRole {
  PHYSICIAN = 'physician',
  NURSE = 'nurse',
  STUDENT = 'student',
  ADMIN = 'admin',
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
  emailVerificationToken: string;

  @Column({ type: 'datetime', nullable: true })
  emailVerificationExpiry: Date;

  @Column({ type: 'varchar', length: 64, nullable: true })
  @Exclude()
  passwordResetToken: string;

  @Column({ type: 'datetime', nullable: true })
  passwordResetExpiry: Date;

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

  /**
   * BeforeInsert hook: Encrypt PHI fields before saving to database
   * Called whenever a new User is inserted
   */
  @BeforeInsert()
  async encryptPhiBeforeInsert(_encryptionService?: EncryptionService) {
    // Encryption service will be injected via hooks decorator in UsersService
    // For now, this is a placeholder that will be implemented at the repository level
    this.phiFieldsEncrypted = false;
  }

  /**
   * BeforeUpdate hook: Re-encrypt PHI fields during updates
   * Called whenever a User is updated
   */
  @BeforeUpdate()
  async encryptPhiBeforeUpdate(_encryptionService?: EncryptionService) {
    // Encryption service will be injected via hooks decorator in UsersService
    // For now, this is a placeholder that will be implemented at the repository level
    this.phiFieldsEncrypted = false;
  }

  /**
   * AfterLoad hook: Decrypt PHI fields after loading from database
   * Called whenever entities are loaded from the database
   */
  @AfterLoad()
  async decryptPhiAfterLoad() {
    // Decryption will be handled at the service level
    // This is a placeholder for automatic decryption logic
    this.phoneDecrypted = undefined;
  }
}

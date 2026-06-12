import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  AfterLoad,
} from 'typeorm';

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  fullName: string; // Will be encrypted at rest

  @Column({ type: 'varchar', length: 128, nullable: true })
  firstName: string; // Will be encrypted at rest

  @Column({ type: 'varchar', length: 128, nullable: true })
  lastName: string; // Will be encrypted at rest

  @Column({ type: 'varchar', length: 255, nullable: true })
  institution: string; // Will be encrypted at rest

  @Column({ type: 'uuid', nullable: true })
  organizationId: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  roleProfileId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  specialty: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  licenseNumber: string; // Will be encrypted at rest

  @Column({ type: 'varchar', length: 50, nullable: true })
  country: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  languagePreference: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  timezone: string;

  @Column({ type: 'boolean', default: false })
  verified: boolean; // Institutional verification status

  @Column({ type: 'integer', default: 0 })
  trustScore: number; // 0-100 reputation score

  @Column({ type: 'text', nullable: true })
  avatarUrl: string;

  // PHI columns - encrypted at rest
  @Column({ type: 'blob', nullable: true })
  dateOfBirthEncrypted: Buffer; // Encrypted DOB

  @Column({ type: 'blob', nullable: true })
  medicalHistoryEncrypted: Buffer; // Encrypted medical history

  @Column({ type: 'blob', nullable: true })
  allergiesEncrypted: Buffer; // Encrypted allergies

  @Column({ type: 'blob', nullable: true })
  medicationsEncrypted: Buffer; // Encrypted medications

  // Encryption tracking
  @Column({ type: 'int', nullable: true })
  encryptionKeyVersion: number; // Which key version was used

  // Consent Management (GDPR/CCPA compliance)
  @Column({ type: 'boolean', default: false })
  consentMarketingCommunications: boolean;

  @Column({ type: 'boolean', default: false })
  consentDataProcessing: boolean;

  @Column({ type: 'boolean', default: false })
  consentThirdPartySharing: boolean;

  @Column({ type: 'boolean', default: true })
  consentEssentialCookies: boolean;

  @Column({ type: 'datetime', nullable: true })
  consentMarketingUpdatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  consentDataProcessingUpdatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  consentThirdPartySharingUpdatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Transient properties for in-memory decrypted data
  dateOfBirthDecrypted?: string;
  medicalHistoryDecrypted?: string;
  allergiesDecrypted?: string;
  medicationsDecrypted?: string;

  // Relations
  @OneToOne('User', (user: any) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: any;

  /**
   * BeforeInsert hook: Encrypt PHI fields before saving to database
   * Called whenever a new UserProfile is inserted
   */
  @BeforeInsert()
  async encryptPhiBeforeInsert() {
    // Encryption service will be injected via service-level handler
    // This is a placeholder for automatic encryption logic
  }

  /**
   * BeforeUpdate hook: Re-encrypt PHI fields during updates
   * Called whenever a UserProfile is updated
   */
  @BeforeUpdate()
  async encryptPhiBeforeUpdate() {
    // Encryption service will be injected via service-level handler
    // This is a placeholder for automatic encryption logic
  }

  /**
   * AfterLoad hook: Decrypt PHI fields after loading from database
   * Called whenever entities are loaded from the database
   */
  @AfterLoad()
  async decryptPhiAfterLoad() {
    // Decryption will be handled at the service level
    // This is a placeholder for automatic decryption logic
    this.dateOfBirthDecrypted = undefined;
    this.medicalHistoryDecrypted = undefined;
    this.allergiesDecrypted = undefined;
    this.medicationsDecrypted = undefined;
  }
}

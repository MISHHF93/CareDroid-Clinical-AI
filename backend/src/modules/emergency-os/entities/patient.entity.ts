import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('patients')
@Index(['state'])
@Index(['priority'])
export class Patient {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 64 })
  mrn: string;

  @Column({ type: 'blob', nullable: true })
  mrnEncrypted?: Buffer;

  @Column({ type: 'varchar', length: 120 })
  firstName: string;

  @Column({ type: 'blob', nullable: true })
  firstNameEncrypted?: Buffer;

  @Column({ type: 'varchar', length: 120 })
  lastName: string;

  @Column({ type: 'blob', nullable: true })
  lastNameEncrypted?: Buffer;

  @Column({ type: 'varchar', length: 32 })
  dob: string;

  @Column({ type: 'blob', nullable: true })
  dobEncrypted?: Buffer;

  @Column({ type: 'int' })
  age: number;

  @Column({ type: 'varchar', length: 16 })
  sex: string;

  /** @deprecated Prefer `arrival.arrivalTimestamp`. Retained for API compatibility. */
  @Column({ type: 'varchar', length: 64 })
  arrivalTime: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  triageTime?: string;

  @Column({ type: 'text' })
  chiefComplaint: string;

  @Column({ type: 'varchar', length: 64 })
  complaintCategory: string;

  @Column({ type: 'varchar', length: 32 })
  state: string;

  @Column({ type: 'varchar', length: 8 })
  priority: string;

  @Column({ type: 'simple-json' })
  vitals: unknown[];

  @Column({ type: 'simple-json' })
  flags: string[];

  @Column({ type: 'varchar', length: 120, nullable: true })
  assignedStaffId?: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  roomId?: string;

  @Column({ type: 'simple-json' })
  notes: unknown[];

  @Column({ type: 'simple-json' })
  timeline: unknown[];

  @Column({ type: 'simple-json', nullable: true })
  triageAssist?: unknown;

  @Column({ type: 'varchar', length: 64, nullable: true })
  triageAssistGeneratedAt?: string;

  /** @deprecated Prefer `arrival.arrivalMode`. */
  @Column({ type: 'varchar', length: 32, nullable: true })
  arrivalMode?: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  registrationStatus?: string;

  @Column({ type: 'boolean', nullable: true })
  triagePending?: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true })
  firstContactAt?: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  queueDestination?: string;

  @Column({ type: 'simple-json', nullable: true })
  arrival?: unknown;

  @Column({ type: 'simple-json', nullable: true })
  quickSafetyFlags?: string[];

  @Column({ type: 'simple-json', nullable: true })
  highRiskComplaintFlags?: unknown[];

  @Column({ type: 'boolean', default: false })
  piiFieldsEncrypted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

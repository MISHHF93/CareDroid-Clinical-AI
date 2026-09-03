import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum BiometricType {
  FINGERPRINT = 'fingerprint',
  FACE = 'face',
  IRIS = 'iris',
}

@Entity('biometric_configs')
@Index(['userId'])
export class BiometricConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'boolean', default: false })
  isEnabled: boolean;

  @Column({
    type: 'varchar',
    enum: BiometricType,
    nullable: true,
  })
  biometricType: BiometricType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  deviceId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceName: string;

  // Challenge token for verification (hashed)
  @Column({ type: 'varchar', length: 500, nullable: true })
  challengeToken: string;

  @Column({ type: Date, nullable: true })
  lastUsedAt: Date;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  // Security: Track failed attempts
  @Column({ type: 'int', default: 0 })
  failedAttempts: number;

  @Column({ type: Date, nullable: true })
  lockedUntil: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

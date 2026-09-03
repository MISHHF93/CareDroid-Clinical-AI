import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('two_factor_auth')
@Index(['userId'], { unique: true })
export class TwoFactor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  secret: string | null; // TOTP secret (encrypted)

  @Column({ type: 'simple-array', nullable: true })
  backupCodes: string[] | null; // Hashed backup codes

  @Column({ type: Date, nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToOne('User', (user: any) => user.twoFactor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: any;
}

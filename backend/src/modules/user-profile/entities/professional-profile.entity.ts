import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('professional_profiles')
@Index(['userId'], { unique: true })
export class ProfessionalProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  username: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  profession: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  department: string;

  @Column({ type: 'simple-json', nullable: true })
  credentials: string[];

  @Column({ type: 'simple-json', nullable: true })
  certifications: Array<Record<string, any>>;

  @Column({ type: 'simple-json', nullable: true })
  specialties: string[];

  @Column({ type: 'varchar', length: 80, default: 'mid' })
  experienceLevel: string;

  @Column({ type: 'simple-json', nullable: true })
  clinicalInterests: string[];

  @Column({ type: 'varchar', length: 120, nullable: true })
  licenseRegion: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

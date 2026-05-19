import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('drugs')
@Index(['name'])
@Index(['category'])
export class Drug {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  genericName: string;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'text' })
  dosage: string;

  @Column({ type: 'text' })
  indications: string;

  @Column({ type: 'text', nullable: true })
  contraindications: string;

  @Column({ type: 'text', nullable: true })
  sideEffects: string;

  @Column({ type: 'text', nullable: true })
  interactions: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

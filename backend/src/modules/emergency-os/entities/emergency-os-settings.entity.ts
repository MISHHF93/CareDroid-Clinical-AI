import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Durable per-organization store for EmergencyOsSettingsContract
 * (`emergency-os.types.ts`). The contract is a large, deeply nested config
 * object (aiSettings/integrationSettings/reassessmentThresholds/
 * capacityThresholds/emsThresholds/notificationSettings/etc.) that this
 * codebase already treats atomically everywhere (materializeSettings/
 * mergeSettings/clone) -- stored as one JSON blob per organization rather
 * than decomposed into dozens of relational columns, matching that existing
 * shape instead of inventing a new one.
 */
@Entity('emergency_os_settings')
export class EmergencyOsSettingsEntity {
  /** organizationId, or the '__global__' sentinel EmergencySettingsService already uses for tenant-less callers. */
  @PrimaryColumn({ type: 'varchar', length: 120 })
  organizationId: string;

  @Column({ type: 'text' })
  settingsJson: string;

  @UpdateDateColumn()
  updatedAt: Date;
}

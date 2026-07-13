/**
 * CareDroid Canonical Contracts
 *
 * This module re-exports the canonical domain types and provides
 * compatibility bridges with legacy type definitions.
 *
 * Migration strategy:
 * - New code should import from '@/contracts' or '@/contracts/domains'
 * - Legacy code continues to import from '@/types/emergency'
 * - Over time, migrate imports to use these canonical types
 */

// Re-export all canonical types
export * from './domains';

// Re-export commonly used legacy types for backward compatibility
export type {
  EntityId,
  ISODateString,
  PatientState,
  PatientFlag,
  PatientFlagType,
  Priority,
  PatientPriority,
  Vitals,
  PatientVitals,
  JourneyEvent,
  Encounter,
  Note,
  Referral,
  EMSArrival,
  EMSCase,
  TriageAcuity,
  Room,
  CapacitySnapshot,
  Alert,
  AlertSeverity,
  AlertLifecycleStatus,
  AlertType,
  Staff,
} from '../types/emergency';

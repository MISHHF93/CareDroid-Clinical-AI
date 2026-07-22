/**
 * CEDS component registry — aliases the REAL, already-shipped implementations
 * under the requested CEDS names rather than creating duplicates. See
 * DESIGN_SYSTEM.md's component-mapping table for the full rationale and for
 * the requested components that don't exist yet (ClinicianCard, WorkflowCard,
 * EvidenceCard, TimelineCard) — those are intentionally not stubbed here;
 * building them ahead of a real call site is exactly the premature-scaffolding
 * pattern this project has twice had to delete (src/domain/*, src/features/*).
 */
export { default as PatientCard } from '../../components/PatientCard';
export { DashboardCard } from '../../components/ui/CareDroidPrimitives';
export { StatCard } from '../../components/data-display/StatCard';
export { AIRecommendationCard, AIChiefRecommendationCard } from '../../components/ai';
export { ActionProposalCard, type ActionProposalCardProps } from '../../components/ai';
export { Card } from '../../components/surfaces/Card';

/**
 * AlertCard was deleted as confirmed dead code (Cycle 146, zero real
 * importers). Use the alarm-system components instead — they're the real,
 * live implementation of the same concern.
 */
export { AlarmBanner, AlarmKpi, AlarmRail } from '../../alarm';

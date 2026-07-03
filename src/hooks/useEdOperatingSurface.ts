import { useMemo } from 'react';
import useHospitalOperatingSystem from './useHospitalOperatingSystem';
import { ED_JOURNEY_PHASES, type EdJourneyPhaseId, type EdOperatingPriority, type EdOperatingSurfaceDefinition } from '../config/edOperatingSurface.config';
import type { WorkflowSituationBriefProps } from '../pages/emergency/emergencyRouteShared';

export type EdOperatingSurfaceContext = Readonly<{
  surface: EdOperatingSurfaceDefinition | null;
  phaseId: EdJourneyPhaseId | null;
  phaseLabel: string | null;
  phaseOrder: number | null;
  ownerRole: string;
  priority: EdOperatingPriority;
  primaryDecision: string;
  defaultNextAction: string;
  threeMinuteRelevant: boolean;
  situationBrief: WorkflowSituationBriefProps | null;
  topActionLabel: string | null;
  topActionRoute: string | null;
  isEmergencyRoute: boolean;
}>;

export function useEdOperatingSurface(): EdOperatingSurfaceContext {
  const hospitalOs = useHospitalOperatingSystem({ syncBackend: false });

  return useMemo(
    () =>
      Object.freeze({
        surface: hospitalOs.surface,
        phaseId: hospitalOs.phaseId,
        phaseLabel: hospitalOs.phaseLabel,
        phaseOrder: hospitalOs.phaseOrder,
        ownerRole: hospitalOs.ownerRole,
        priority: hospitalOs.priority,
        primaryDecision: hospitalOs.primaryDecision,
        defaultNextAction: hospitalOs.defaultNextAction,
        threeMinuteRelevant: hospitalOs.threeMinuteRelevant,
        situationBrief: hospitalOs.situationBrief,
        topActionLabel: hospitalOs.topActionLabel,
        topActionRoute: hospitalOs.topActionRoute,
        isEmergencyRoute: hospitalOs.isHospitalRoute,
      }),
    [hospitalOs],
  );
}

export function listEdJourneyPhases() {
  return ED_JOURNEY_PHASES;
}

export default useEdOperatingSurface;
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useEmergencyStore } from '../store/emergencyStore';
import { buildFullEmergencyCareJourneySnapshot } from '../services/fullEmergencyCareJourneyService';
import { buildCommandCenterWorkflowActions } from '../config/operationalWorkflow.config';
import {
  ED_JOURNEY_PHASES,
  getEdJourneyPhase,
  resolveEdOperatingSurfaceFromPath,
  type EdJourneyPhaseId,
  type EdOperatingPriority,
  type EdOperatingSurfaceDefinition,
} from '../config/edOperatingSurface.config';
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

function attentionTone(metrics: {
  threeMinuteBreaches: number;
  criticalAlerts: number;
  p1p2Patients: number;
  inboundEms: number;
}): WorkflowSituationBriefProps['tone'] {
  if (metrics.threeMinuteBreaches > 0 || metrics.criticalAlerts > 0) return 'critical';
  if (metrics.p1p2Patients > 0 || metrics.inboundEms > 0) return 'warning';
  return 'neutral';
}

function buildSituationBrief(
  surface: EdOperatingSurfaceDefinition,
  snapshot: ReturnType<typeof buildFullEmergencyCareJourneySnapshot>,
  topAction: ReturnType<typeof buildCommandCenterWorkflowActions>[number] | null,
): WorkflowSituationBriefProps {
  const metrics = snapshot.metrics;
  const attentionParts: string[] = [];

  if (metrics.threeMinuteBreaches > 0) {
    attentionParts.push(`${metrics.threeMinuteBreaches} three-minute breach${metrics.threeMinuteBreaches === 1 ? '' : 'es'}`);
  }
  if (metrics.criticalAlerts > 0) {
    attentionParts.push(`${metrics.criticalAlerts} critical alert${metrics.criticalAlerts === 1 ? '' : 's'}`);
  }
  if (metrics.p1p2Patients > 0) {
    attentionParts.push(`${metrics.p1p2Patients} P1/P2`);
  }
  if (metrics.inboundEms > 0) {
    attentionParts.push(`${metrics.inboundEms} inbound EMS`);
  }

  const phase = getEdJourneyPhase(surface.phaseId);
  const status = `${surface.label} — ${metrics.activePatients} active patient${metrics.activePatients === 1 ? '' : 's'}`;

  return {
    status,
    attention: attentionParts.length ? attentionParts.join(' · ') : 'No P0 signals on this surface',
    owner: surface.ownerRole,
    nextAction: topAction?.active ? topAction.nextAction : surface.defaultNextAction,
    tone: attentionTone(metrics),
  };
}

export function useEdOperatingSurface(): EdOperatingSurfaceContext {
  const { pathname } = useLocation();
  const patients = useEmergencyStore((state) => state.patients);
  const staff = useEmergencyStore((state) => state.staff);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const alerts = useEmergencyStore((state) => state.alerts);
  const capacity = useEmergencyStore((state) => state.capacity);

  return useMemo(() => {
    const isEmergencyRoute = pathname.startsWith('/emergency') ||
      pathname.startsWith('/reception') ||
      pathname.startsWith('/triage') ||
      pathname.startsWith('/queue') ||
      pathname.startsWith('/intake') ||
      pathname.startsWith('/alerts') ||
      pathname.startsWith('/analytics') ||
      pathname.startsWith('/reports');

    const surface = resolveEdOperatingSurfaceFromPath(pathname);
    if (!surface) {
      return Object.freeze({
        surface: null,
        phaseId: null,
        phaseLabel: null,
        phaseOrder: null,
        ownerRole: 'Care team',
        priority: 'P3' as EdOperatingPriority,
        primaryDecision: '',
        defaultNextAction: '',
        threeMinuteRelevant: false,
        situationBrief: null,
        topActionLabel: null,
        topActionRoute: null,
        isEmergencyRoute,
      });
    }

    const snapshot = buildFullEmergencyCareJourneySnapshot({
      patients,
      staff,
      emsArrivals,
      alerts,
      capacity,
    });

    const commandActions = buildCommandCenterWorkflowActions({
      dispatch: snapshot.liveServiceSummaries.dispatch,
      readiness: snapshot.liveServiceSummaries.readiness,
      metrics: snapshot.metrics,
      staffRouting: snapshot.liveServiceSummaries.staffRouting,
      bottlenecks: snapshot.liveServiceSummaries.bottlenecks,
    });

    const topAction = commandActions.find((action) => action.active) ?? commandActions[0] ?? null;
    const phase = getEdJourneyPhase(surface.phaseId);

    return Object.freeze({
      surface,
      phaseId: surface.phaseId,
      phaseLabel: phase.label,
      phaseOrder: phase.order,
      ownerRole: surface.ownerRole,
      priority: surface.priority,
      primaryDecision: surface.primaryDecision,
      defaultNextAction: surface.defaultNextAction,
      threeMinuteRelevant: surface.threeMinuteRelevant,
      situationBrief: buildSituationBrief(surface, snapshot, topAction),
      topActionLabel: topAction?.label ?? null,
      topActionRoute: topAction?.route ?? null,
      isEmergencyRoute,
    });
  }, [pathname, patients, staff, emsArrivals, alerts, capacity]);
}

export function listEdJourneyPhases() {
  return ED_JOURNEY_PHASES;
}

export default useEdOperatingSurface;
/**
 * EMS handoff interactive assist — same InteractiveAIWorkspace architecture,
 * EMS channel + pre-arrival triggers.
 */

import { InteractiveAIWorkspace } from './InteractiveAIWorkspace';

export type EmsInteractiveAssistPanelProps = {
  role?: string;
  userId?: string;
  organizationId?: string;
  patientId?: string;
  emsUnitId?: string;
};

export function EmsInteractiveAssistPanel({
  role = 'paramedic',
  userId,
  organizationId,
  patientId,
  emsUnitId,
}: EmsInteractiveAssistPanelProps) {
  return (
    <InteractiveAIWorkspace
      role={role}
      userId={userId}
      organizationId={organizationId}
      patientId={patientId}
      pageId="ems_handoff"
      channel="ems"
      purpose="ems_handoff_assist"
      title="EMS Handoff Assist"
      seedTriggers={
        emsUnitId
          ? [
              {
                kind: 'ems_prearrival',
                summary: `EMS unit ${emsUnitId} inbound — prepare handoff and compare ETA with room readiness.`,
                urgency: 'attention',
                patientId,
                // sourceId keys this trigger to the EMS unit itself so a
                // patient-linkage resolving after the unit is already known
                // (arrivals often report the inbound unit before identity
                // links a chart) can't defeat dedup and seed a 2nd card for
                // what is canonically the same inbound event.
                metadata: { emsUnitId, sourceId: emsUnitId },
              },
            ]
          : []
      }
    />
  );
}

export default EmsInteractiveAssistPanel;

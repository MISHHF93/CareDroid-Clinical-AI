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
      seedTriggers={[
        {
          kind: 'ems_prearrival',
          summary: emsUnitId
            ? `EMS unit ${emsUnitId} inbound — prepare handoff and compare ETA with room readiness.`
            : 'Inbound EMS unit may need ED preparation. Review handoff and ETA freshness.',
          urgency: 'attention',
          patientId,
          metadata: { emsUnitId },
        },
      ]}
    />
  );
}

export default EmsInteractiveAssistPanel;

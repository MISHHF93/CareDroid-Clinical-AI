/**
 * Triage interactive assist — same InteractiveAIWorkspace architecture.
 */

import { InteractiveAIWorkspace } from './InteractiveAIWorkspace';

export type TriageInteractiveAssistPanelProps = {
  role?: string;
  userId?: string;
  organizationId?: string;
  patientId?: string;
  hasUnresolvedAlert?: boolean;
};

export function TriageInteractiveAssistPanel({
  role = 'triage_nurse',
  userId,
  organizationId,
  patientId,
  hasUnresolvedAlert = false,
}: TriageInteractiveAssistPanelProps) {
  return (
    <InteractiveAIWorkspace
      role={role}
      userId={userId}
      organizationId={organizationId}
      patientId={patientId}
      pageId="triage_queue"
      channel="triage"
      purpose="triage_interactive_assist"
      title="Triage Assist"
      seedTriggers={[
        {
          kind: hasUnresolvedAlert ? 'unresolved_alert' : 'missing_clinical_field',
          summary: hasUnresolvedAlert
            ? 'An alert needs triage review. Explain and assign ownership — do not auto-resolve.'
            : 'Check missing clinical fields before definitive prioritization.',
          urgency: hasUnresolvedAlert ? 'urgent' : 'attention',
          patientId,
        },
        {
          kind: 'calculator_opportunity',
          summary: 'A deterministic calculator may apply. Suggest selection only; never invent scores.',
          urgency: 'info',
          patientId,
        },
      ]}
    />
  );
}

export default TriageInteractiveAssistPanel;

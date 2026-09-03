import { recordAutomationFailure } from './automationAuditLogger';
import { reportApiError } from './apiErrorHandling';

export type EmsHandoffSyncFailureInput = {
  arrivalId: string;
  patientId?: string | null;
  unitName?: string | null;
  error: unknown;
};

/**
 * EMS handoff completion is optimistic-local-first (offline/demo path must keep working),
 * so a failed backend persist can't block the clinical workflow — but it also can't be
 * silent. Records the miss to the automation audit trail and surfaces a non-blocking
 * system alert so staff know the journal write didn't land and can follow up.
 */
export function reportEmsHandoffSyncFailure({
  arrivalId,
  patientId,
  unitName,
  error,
}: EmsHandoffSyncFailureInput): void {
  void recordAutomationFailure({
    triggerFired: 'EMS handoff completed locally',
    actionSelected: 'Persist EMS handoff completion',
    toolCalled: 'ems-handoff-persist',
    backendEndpoint: '/api/emergency/ems/handoff',
    conditionsEvaluated: [
      {
        label: `Arrival ${arrivalId}${patientId ? ` linked to patient ${patientId}` : ' (no linked patient yet)'}`,
        result: false,
      },
    ],
    aiInvolvement: { involved: false, summary: 'Rules-only handoff persistence.' },
    error,
  });

  reportApiError({
    title: 'EMS handoff not journaled',
    message: `Handoff for ${unitName || arrivalId} was completed locally but the server record failed to save. It will not retry automatically — reopen and complete it again if this persists.`,
    error,
    endpoint: '/api/emergency/ems/handoff',
    severity: 'Warning',
  });
}

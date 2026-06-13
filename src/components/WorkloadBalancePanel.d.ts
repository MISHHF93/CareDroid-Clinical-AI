import type { ComponentType } from 'react';

declare const WorkloadBalancePanel: ComponentType<{
  open: boolean;
  activeShift?: Record<string, unknown>;
  workloads?: Array<Record<string, unknown>>;
  rebalanceSuggestion?: Record<string, unknown> | null;
  currentStaffProfile?: Record<string, unknown> | null;
  onClose: () => void;
  onAssignStaff: (patientId: string, staffId: string) => void;
}>;

export default WorkloadBalancePanel;

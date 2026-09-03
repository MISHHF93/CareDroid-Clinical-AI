import { useMemo } from 'react';
import { useEmergencyStore } from '../../store/emergencyStore';
import { buildPatientFlowPatientSnapshot } from '../../engine/continuousPatientFlowEngine';
import type { Patient } from '../../types/emergency';
import './patient-flow-status.css';

type PatientFlowBadgeProps = {
  patient: Patient;
  className?: string;
};

export function PatientFlowBadge({ patient, className = '' }: PatientFlowBadgeProps) {
  const staff = useEmergencyStore((state) => state.staff);
  const referrals = useEmergencyStore((state) => state.referrals);
  const snapshot = useEmergencyStore((state) => state.patientFlowSnapshot);

  const flow = useMemo(() => {
    const cached = snapshot?.patients.find((entry) => entry.patientId === patient.id);
    if (cached) return cached;
    return buildPatientFlowPatientSnapshot(patient, { staff, referrals });
  }, [patient, referrals, snapshot?.patients, staff]);

  if (!flow) return null;

  return (
    <span
      className={`patient-flow-status__badge patient-flow-status__badge--${flow.bottleneckStatus} ${className}`.trim()}
      title={`${flow.workflowStateLabel} · ${flow.stageWaitMinutes}m in stage · ${flow.predictedNextStep || 'Next step pending'}`}
    >
      {flow.workflowStateLabel} · {flow.stageWaitMinutes}m
    </span>
  );
}

export default PatientFlowBadge;

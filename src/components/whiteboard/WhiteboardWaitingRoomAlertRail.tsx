import { useMemo } from 'react';
import type { Alert, EMSArrival, Patient, Referral, Staff } from '../../types/emergency';
import WhiteboardAlertRail from './WhiteboardAlertRail';
import {
  buildWaitingRoomAlertMetrics,
  type WaitingRoomAlertRailFeatures,
} from './whiteboardAlertRailModel';

type WhiteboardWaitingRoomAlertRailProps = {
  patients: Patient[];
  alerts?: Alert[];
  referrals?: Referral[];
  staff?: Staff[];
  workflowLogs?: unknown[];
  emsArrivals?: EMSArrival[];
  settings?: Record<string, unknown> | null;
  roleId?: string | null;
  features?: WaitingRoomAlertRailFeatures;
  readOnly?: boolean;
  className?: string;
  onSelectPatient?: (patientId: string) => void;
};

export default function WhiteboardWaitingRoomAlertRail({
  patients,
  alerts = [] as any[],
  referrals = [] as any[],
  staff = [] as any[],
  workflowLogs = [] as any[],
  emsArrivals = [] as any[],
  settings = null,
  roleId = null,
  features = {} as any,
  readOnly = false,
  className = '',
  onSelectPatient,
}: WhiteboardWaitingRoomAlertRailProps) {
  const metrics = useMemo(
    () =>
      buildWaitingRoomAlertMetrics({
        patients,
        alerts,
        referrals,
        staff,
        workflowLogs,
        emsArrivals,
        settings,
        roleId,
        features,
      }),
    [alerts, emsArrivals, features, patients, referrals, roleId, settings, staff, workflowLogs],
  );

  return (
    <WhiteboardAlertRail
      metrics={metrics}
      ariaLabel="Waiting room safety alert rail"
      readOnly={readOnly}
      className={className}
      onSelectPatient={onSelectPatient}
    />
  );
}
import { useMemo } from 'react';
import type { Alert, EMSArrival, Patient, Referral, Room, Staff } from '../../types/emergency';
import WhiteboardAlertRail from '../whiteboard/WhiteboardAlertRail';
import {
  buildReceptionAlertMetrics,
  type ReceptionAlertRailFeatures,
} from './receptionAlertRailModel';
import './ReceptionAlertRail.css';

type ReceptionAlertRailProps = {
  patients: Patient[];
  alerts?: Alert[];
  referrals?: Referral[];
  staff?: Staff[];
  workflowLogs?: unknown[];
  emsArrivals?: EMSArrival[];
  rooms?: Room[];
  settings?: Record<string, unknown> | null;
  roleId?: string | null;
  features?: ReceptionAlertRailFeatures;
  readOnly?: boolean;
  className?: string;
  onSelectPatient?: (patientId: string) => void;
};

export default function ReceptionAlertRail({
  patients,
  alerts = [],
  referrals = [],
  staff = [],
  workflowLogs = [],
  emsArrivals = [],
  rooms = [],
  settings = null,
  roleId = null,
  features = {},
  readOnly = false,
  className = '',
  onSelectPatient,
}: ReceptionAlertRailProps) {
  const metrics = useMemo(
    () =>
      buildReceptionAlertMetrics({
        patients,
        alerts,
        referrals,
        staff,
        workflowLogs,
        emsArrivals,
        rooms,
        settings,
        roleId,
        features,
      }),
    [alerts, emsArrivals, features, patients, referrals, roleId, rooms, settings, staff, workflowLogs],
  );

  return (
    <WhiteboardAlertRail
      metrics={metrics}
      ariaLabel="Reception operational alert rail"
      readOnly={readOnly}
      className={['reception-alert-rail', className].filter(Boolean).join(' ')}
      onSelectPatient={onSelectPatient}
    />
  );
}
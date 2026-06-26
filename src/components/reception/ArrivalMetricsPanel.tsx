import React, { useMemo } from 'react';
import useProfileNavigate from '../../hooks/useProfileNavigate';
import { useEmergencyStore } from '../../store/emergencyStore';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import { selectArrivalDashboardMetrics, selectEmsInboundCount } from './receptionQueueModel';

function receptionMetricRoute(tab) {
  return `${CANONICAL_ROUTES.emergencyReception}?queue=${encodeURIComponent(tab)}`;
}

/** @deprecated Prefer ArrivalDashboard — kept for legacy imports and alignment scans. */
export default function ArrivalMetricsPanel({ patients: patientsProp }) {
  const { profileNavigate } = useProfileNavigate();
  const emergencyRole = useEmergencyRolePermissions();
  const storePatients = useEmergencyStore((state) => state.patients);
  const emsInbound = useEmergencyStore(selectEmsInboundCount);
  const patients = patientsProp ?? storePatients;

  const { metrics } = useMemo(
    () => selectArrivalDashboardMetrics(patients, emsInbound),
    [patients, emsInbound],
  );

  return (
    <div className="arrival-metrics" aria-label="Arrival dashboard queue counts">
      {metrics.map((metric) => {
        const route = metric.queueTab
          ? receptionMetricRoute(metric.queueTab)
          : CANONICAL_ROUTES.emergencyReception;
        return (
          <button
            key={metric.id}
            type="button"
            className="arrival-metrics__card"
            disabled={!emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyReception)}
            onClick={() => {
              if (emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyReception)) {
                profileNavigate(route);
              }
            }}
          >
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </button>
        );
      })}
    </div>
  );
}

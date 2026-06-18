import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmergencyStore } from '../../store/emergencyStore';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { prefersReceptionForPatientSearch } from '../../config/emergencyRolePermissions';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import { selectReceptionQueues } from './receptionQueueModel';

function selectEmsInboundCount(state) {
  return (
    (state.emsArrivals ?? []).filter((arrival) => arrival.status === 'Inbound').length +
    (state.emsIncomingPatients ?? []).length +
    (state.emsUnits ?? []).filter((unit) => unit.status === 'Inbound').length
  );
}

function receptionMetricRoute(tab) {
  return `${CANONICAL_ROUTES.emergencyReception}?queue=${encodeURIComponent(tab)}`;
}

export default function ArrivalMetricsPanel() {
  const navigate = useNavigate();
  const emergencyRole = useEmergencyRolePermissions();
  const patients = useEmergencyStore((state) => state.patients);
  const emsInbound = useEmergencyStore(selectEmsInboundCount);
  const receptionScoped = prefersReceptionForPatientSearch(emergencyRole.role);

  const queueCounts = useMemo(() => selectReceptionQueues(patients).counts, [patients]);

  const metrics = useMemo(
    () => [
      {
        id: 'recent-arrivals',
        label: 'Recent arrivals',
        value: queueCounts.recentArrivals,
        route: CANONICAL_ROUTES.emergencyReception,
      },
      {
        id: 'waiting',
        label: 'Current waiting',
        value: queueCounts.waiting,
        route: receptionScoped ? receptionMetricRoute('pretriage') : CANONICAL_ROUTES.emergencyQueues,
      },
      {
        id: 'awaiting-verification',
        label: 'Awaiting verification',
        value: queueCounts.awaitingVerification,
        route: receptionScoped ? receptionMetricRoute('verification') : CANONICAL_ROUTES.emergencyReception,
      },
      {
        id: 'awaiting-triage',
        label: 'Awaiting triage',
        value: queueCounts.awaitingTriage,
        route: receptionScoped ? receptionMetricRoute('pretriage') : CANONICAL_ROUTES.emergencyQueues,
      },
      {
        id: 'ems-inbound',
        label: 'EMS inbound',
        value: emsInbound,
        route: CANONICAL_ROUTES.emergencyReception,
      },
    ],
    [emsInbound, queueCounts, receptionScoped],
  );

  return (
    <div className="arrival-metrics" aria-label="Arrival dashboard queue counts">
      {metrics.map((metric) => (
        <button
          key={metric.id}
          type="button"
          className="arrival-metrics__card"
          disabled={!emergencyRole.canAccessRoute(metric.route.split('?')[0])}
          onClick={() => {
            const routePath = metric.route.split('?')[0];
            if (emergencyRole.canAccessRoute(routePath)) navigate(metric.route);
          }}
        >
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </button>
      ))}
    </div>
  );
}

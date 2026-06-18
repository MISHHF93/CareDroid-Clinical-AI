import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientState } from '../../types/emergency';
import { useEmergencyStore } from '../../store/emergencyStore';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { prefersReceptionForPatientSearch } from '../../config/emergencyRolePermissions';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';

function selectEmsInboundCount(state) {
  return (
    (state.emsArrivals ?? []).filter((arrival) => arrival.status === 'Inbound').length +
    (state.emsIncomingPatients ?? []).length +
    (state.emsUnits ?? []).filter((unit) => unit.status === 'Inbound').length
  );
}

const RECENT_ARRIVAL_MINUTES = 30;

function minutesSince(isoTime) {
  if (!isoTime) return Number.POSITIVE_INFINITY;
  const timestamp = new Date(isoTime).getTime();
  if (!Number.isFinite(timestamp)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.round((Date.now() - timestamp) / 60000));
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

  const metrics = useMemo(() => {
    const recentArrivals = patients.filter(
      (patient) => minutesSince(patient.arrivalTime) <= RECENT_ARRIVAL_MINUTES,
    ).length;
    const waiting = patients.filter((patient) => patient.state === PatientState.Waiting).length;
    const awaitingVerification = patients.filter(
      (patient) => patient.state === PatientState.Registration,
    ).length;
    const awaitingTriage = patients.filter(
      (patient) => patient.state === PatientState.Triage,
    ).length;

    return [
      {
        id: 'recent-arrivals',
        label: 'Recent arrivals',
        value: recentArrivals,
        route: CANONICAL_ROUTES.emergencyReception,
      },
      {
        id: 'waiting',
        label: 'Current waiting',
        value: waiting,
        route: receptionScoped ? receptionMetricRoute('pretriage') : CANONICAL_ROUTES.emergencyQueues,
      },
      {
        id: 'awaiting-verification',
        label: 'Awaiting verification',
        value: awaitingVerification,
        route: receptionScoped ? receptionMetricRoute('verification') : CANONICAL_ROUTES.emergencyReception,
      },
      {
        id: 'awaiting-triage',
        label: 'Awaiting triage',
        value: awaitingTriage,
        route: receptionScoped ? receptionMetricRoute('pretriage') : CANONICAL_ROUTES.emergencyQueues,
      },
      {
        id: 'ems-inbound',
        label: 'EMS inbound',
        value: emsInbound,
        route: CANONICAL_ROUTES.emergencyReception,
      },
    ];
  }, [emsInbound, patients, receptionScoped]);

  return (
    <div className="arrival-metrics" aria-label="Arrival dashboard metrics">
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

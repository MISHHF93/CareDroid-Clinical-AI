import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ambulance, Bed, CheckCircle2, Clock3 } from 'lucide-react';
import { useEmergencyStore } from '../store/emergencyStore';
import EMSPressureScore from './EMSPressureScore';
import { EMERGENCY_ACTIONS, getReceptionEmbeddedIntakePath, prefersReceptionForPatientCreate } from '../config/emergencyRolePermissions';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import { useEMSIntake } from '../hooks/useEmergencyOs';
import { convertEmsArrivalForReception } from '../services/receptionIntakeBridge';
import { fetchEmsFleetSnapshot, fetchEmergencyDiversionStatus } from '../services/emergencyTransportApi';
import './EMSPipeline.css';

function minutesRemaining(arrival, now) {
  const target = new Date(arrival.estimatedArrivalTime).getTime();
  if (!Number.isFinite(target)) return arrival.eta ?? 0;
  return Math.ceil((target - now.getTime()) / 60000);
}

function minutesBetween(start, end) {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return null;
  return Math.round((endMs - startMs) / 60000);
}

function offloadMinutes(arrival, now) {
  if (!arrival.arrivedAt) return null;
  return minutesBetween(arrival.arrivedAt, arrival.handoffCompletedAt || now.toISOString());
}

function etaTone(remainingMinutes, status) {
  if (status === 'Arrived' || status === 'Handoff' || remainingMinutes <= 0) return 'arrived';
  if (remainingMinutes < 5) return 'critical';
  if (remainingMinutes <= 10) return 'warning';
  return 'normal';
}

function formatEta(remainingMinutes, status) {
  if (status === 'Arrived' || status === 'Handoff' || remainingMinutes <= 0) return 'Arrived';
  return `${remainingMinutes} min`;
}

function formatFreshness(timestamp) {
  if (!timestamp) return 'latest local state';
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return 'latest local state';
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - parsed) / 60000));
  if (elapsedMinutes < 1) return 'updated now';
  if (elapsedMinutes < 60) return `updated ${elapsedMinutes}m ago`;
  return `updated ${Math.round(elapsedMinutes / 60)}h ago`;
}

function sourceLabel(source) {
  if (!source) return 'local Emergency OS state - no live EMS CAD integration';
  return /fixture|demo|fallback|scenario|first-customer/i.test(source)
    ? 'walkthrough/local dataset - no live EMS CAD integration'
    : source;
}

function vitalValue(vitals, ...keys) {
  for (const key of keys) {
    const value = vitals?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function vitalsStrip(vitals) {
  if (!vitals) return ['HR --', 'BP --/--', 'SpO2 --', 'GCS --'];
  const hr = vitalValue(vitals, 'hr', 'heartRate');
  const sbp = vitalValue(vitals, 'sbp', 'bpSystolic');
  const dbp = vitalValue(vitals, 'dbp', 'bpDiastolic');
  const spo2 = vitalValue(vitals, 'spo2', 'oxygenSaturation');
  const gcs = vitalValue(vitals, 'gcs');
  return [
    `HR ${hr ?? '--'}`,
    `BP ${sbp ?? '--'}/${dbp ?? '--'}`,
    `SpO2 ${spo2 ?? '--'}${spo2 === undefined ? '' : '%'}`,
    `GCS ${gcs ?? '--'}`,
  ];
}

function crewLabel(arrival) {
  return arrival.crewNames?.length ? arrival.crewNames.join(' / ') : 'Crew pending';
}

function unitLabel(arrival) {
  return arrival.unitName && arrival.unitName !== arrival.unitId
    ? `${arrival.unitName} · ${crewLabel(arrival)}`
    : crewLabel(arrival);
}

function roomName(rooms, roomId) {
  return rooms.find((room) => room.id === roomId)?.name || 'Bay pending';
}

function EMSArrivalRow({
  arrival,
  now,
  rooms,
  onPrepareBay,
  onConvert,
  onCompleteHandoff,
  onOpenPatient,
  offloadTargetMinutes,
  canPrepareBay,
  canConvert,
  canCompleteHandoff,
}) {
  const remaining = minutesRemaining(arrival, now);
  const tone = etaTone(remaining, arrival.status);
  const isIncoming = arrival.status === 'Inbound' && remaining > 0;
  const offload = offloadMinutes(arrival, now);
  const offloadBreach = Number.isFinite(offload) && offload > offloadTargetMinutes;

  return (
    <article className={`ems-pipeline__row ems-pipeline__row--${tone}`}>
      <div className="ems-pipeline__unit">
        <strong>{arrival.unitId}</strong>
        <span>{unitLabel(arrival)}</span>
      </div>

      <div className="ems-pipeline__complaint">
        <div className="ems-pipeline__complaint-title">
          <strong>{arrival.chiefComplaint}</strong>
          <span
            className={`ems-pipeline__severity ems-pipeline__severity--${arrival.severity.toLowerCase()}`}
          >
            {arrival.severity}
          </span>
        </div>
        <span>{arrival.mechanismOfInjury || arrival.notes}</span>
      </div>

      <time
        className={`ems-pipeline__eta ems-pipeline__eta--${tone}`}
        dateTime={arrival.estimatedArrivalTime}
      >
        <Clock3 size={14} aria-hidden />
        {formatEta(remaining, arrival.status)}
      </time>

      <div className="ems-pipeline__vitals" aria-label="EMS vitals">
        {vitalsStrip(arrival.vitals).map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      <div className="ems-pipeline__actions">
        {Number.isFinite(offload) ? (
          <span
            className={`ems-pipeline__offload${offloadBreach ? ' ems-pipeline__offload--breach' : ''}`}
          >
            Offload {offload}m
          </span>
        ) : null}
        {arrival.preparedRoomId ? (
          <span className="ems-pipeline__prepared">
            <Bed size={13} aria-hidden />
            {roomName(rooms, arrival.preparedRoomId)}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onPrepareBay(arrival.id)}
            disabled={!isIncoming || !canPrepareBay}
            title={
              !canPrepareBay
                ? 'Prepare Bay unavailable for this role'
                : !isIncoming
                  ? 'Bay preparation is only available for inbound units'
                  : 'Prepare a bay for this EMS unit'
            }
          >
            Prepare Bay
          </button>
        )}
        {!isIncoming && !arrival.patientId ? (
          <button
            type="button"
            className="ems-pipeline__handoff"
            onClick={() => onConvert(arrival.id)}
            disabled={!canConvert}
            title={
              canConvert
                ? 'Convert this arrived EMS unit to a whiteboard patient'
                : 'Add to Whiteboard unavailable for this role'
            }
          >
            <CheckCircle2 size={14} aria-hidden />
            Add to Whiteboard
          </button>
        ) : null}
        {arrival.patientId && !arrival.handoffCompletedAt ? (
          <button
            type="button"
            className="ems-pipeline__handoff"
            onClick={() => onCompleteHandoff(arrival.id)}
            disabled={!canCompleteHandoff}
            title={
              canCompleteHandoff
                ? 'Mark this EMS handoff complete'
                : 'Handoff completion unavailable for this role'
            }
          >
            Handoff complete
          </button>
        ) : null}
        {arrival.patientId ? (
          <button
            type="button"
            className="ems-pipeline__handoff"
            onClick={() => onOpenPatient(arrival.patientId)}
            title="Open this EMS patient without searching"
          >
            Open Patient
          </button>
        ) : null}
        {arrival.patientId && arrival.handoffCompletedAt ? (
          <span className="ems-pipeline__prepared">Handoff complete</span>
        ) : null}
      </div>
    </article>
  );
}

export default function EMSPipeline() {
  const navigate = useNavigate();
  const emergencyRole = useEmergencyRolePermissions();
  const emsModule = useEMSIntake();
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const emergencySettings = useEmergencyStore((state) => state.emergencySettings);
  const rooms = useEmergencyStore((state) => state.rooms);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const prepareEMSBay = useEmergencyStore((state) => state.prepareEMSBay);
  const updateEMSArrival = useEmergencyStore((state) => state.updateEMSArrival);
  const [now, setNow] = useState(() => new Date());
  const [fleetSnapshot, setFleetSnapshot] = useState({ status: 'loading', units: [], message: '' });
  const [diversionStatus, setDiversionStatus] = useState({ status: 'idle', data: null, message: '' });
  const canPrepareBay = emergencyRole.can(EMERGENCY_ACTIONS.prepareEmsBay);
  const canConvert = emergencyRole.can(EMERGENCY_ACTIONS.convertEmsArrival);
  const canCompleteHandoff = emergencyRole.can(EMERGENCY_ACTIONS.completeEmsHandoff);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchEmsFleetSnapshot()
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setFleetSnapshot({
            status: 'ready',
            units: result.data?.units || [],
            message: [
              result.data?.sourceLabel || 'Live EMS feed connected.',
              formatFreshness(result.data?.generatedAt),
            ].join(' '),
          });
        } else {
          setFleetSnapshot({
            status: 'error',
            units: [],
            message: 'EMS unit feed is unavailable. Use active inbound units below for coordination.',
          });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setFleetSnapshot({
          status: 'error',
          units: [],
          message: 'EMS unit feed is unavailable. Use active inbound units below for coordination.',
        });
      });
    fetchEmergencyDiversionStatus()
      .then((result) => {
        if (cancelled) return;
        setDiversionStatus({
          status: result.ok ? 'ready' : 'unavailable',
          data: result.data,
          message: result.message || '',
        });
      })
      .catch(() => {
        if (cancelled) return;
        setDiversionStatus({
          status: 'unavailable',
          data: null,
          message: 'Diversion status feed is unavailable. Confirm diversion status with charge leadership.',
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeArrivals = useMemo(
    () => emsArrivals.filter((arrival) => !['Complete', 'Cancelled'].includes(arrival.status)),
    [emsArrivals]
  );

  useEffect(() => {
    activeArrivals.forEach((arrival) => {
      if (arrival.status !== 'Inbound') return;
      if (minutesRemaining(arrival, now) <= 0) {
        if (!canConvert) return;
        convertEmsArrivalForReception(arrival.id, { actorName: emergencyRole.roleLabel });
      }
    });
  }, [activeArrivals, canConvert, emergencyRole.roleLabel, now]);

  const handleConvertEmsArrival = (arrivalId) => {
    const result = convertEmsArrivalForReception(arrivalId, { actorName: emergencyRole.roleLabel });
    if (!result.ok) return;
    if (prefersReceptionForPatientCreate(emergencyRole.role)) {
      navigate(
        result.receptionVerifyPath ||
          getReceptionEmbeddedIntakePath({
            step: 'verify',
            patientId: result.patientId,
            emsArrivalId: result.emsArrivalId,
          }),
      );
    }
  };

  const incoming = activeArrivals
    .filter((arrival) => arrival.status === 'Inbound' && minutesRemaining(arrival, now) > 0)
    .sort((a, b) => minutesRemaining(a, now) - minutesRemaining(b, now));
  const awaitingHandoff = activeArrivals
    .filter(
      (arrival) =>
        arrival.status === 'Arrived' || arrival.status === 'Handoff' || minutesRemaining(arrival, now) <= 0
    )
    .sort((a, b) => minutesRemaining(a, now) - minutesRemaining(b, now));
  const offloadSamples = emsArrivals
    .map((arrival) => offloadMinutes(arrival, now))
    .filter(Number.isFinite);
  const avgOffload = offloadSamples.length
    ? Math.round(offloadSamples.reduce((sum, minutes) => sum + minutes, 0) / offloadSamples.length)
    : 0;
  const offloadTargetMinutes =
    Number(
      emergencySettings?.thresholds?.emsOffloadTargetMinutes ??
        emergencySettings?.emsThresholds?.offloadTargetMinutes ??
        15
    ) || 15;
  const offloadBreachCount = offloadSamples.filter((minutes) => minutes > offloadTargetMinutes).length;
  const emsSource = sourceLabel(emsModule.data?.source);
  const emsFreshness = formatFreshness(emsModule.data?.generatedAt);
  const completeHandoff = (arrivalId) => {
    updateEMSArrival(arrivalId, {
      status: 'Complete',
      handoffCompletedAt: new Date().toISOString(),
    });
  };
  const openPatient = (patientId) => {
    if (!patientId) return;
    selectPatient(patientId);
    navigate(`${CANONICAL_ROUTES.emergencyPatients}?patientId=${encodeURIComponent(patientId)}`);
  };

  return (
    <section className="ems-pipeline" aria-labelledby="ems-pipeline-title">
      <header className="ems-pipeline__header">
        <div>
          <span>Pre-arrival coordination</span>
          <h1 id="ems-pipeline-title">EMS Pipeline</h1>
          <p className="ems-pipeline__source">
            Track inbound units, bay preparation, handoff timing, and diversion awareness.
            {` Source: ${emsSource}; ${emsFreshness}.`}
          </p>
        </div>
        <div className="ems-pipeline__header-actions">
          <span
            className={`ems-pipeline__offload-kpi${offloadBreachCount ? ' ems-pipeline__offload-kpi--breach' : ''}`}
            title={`${offloadBreachCount} crews over ${offloadTargetMinutes} minutes`}
          >
            Avg offload {avgOffload}m
          </span>
          <EMSPressureScore />
        </div>
      </header>

      {emsModule.loading && !emsArrivals.length ? (
        <p className="ems-pipeline__empty" role="status">Loading Emergency OS EMS intake...</p>
      ) : null}
      {emsModule.error ? (
        <p className="ems-pipeline__empty" role="alert">
          {emsModule.error}. Showing the last local EMS state.
        </p>
      ) : null}

      <div className="ems-pipeline__sections">
        <section className="ems-pipeline__section">
          <div className="ems-pipeline__section-heading">
            <Ambulance size={17} aria-hidden />
            <h2>EMS Unit Visibility</h2>
            <span>{fleetSnapshot.units.length}</span>
          </div>
          <p className="ems-pipeline__source">
            {fleetSnapshot.message || 'Live EMS feed status is pending.'}
          </p>
          {diversionStatus.status === 'ready' && diversionStatus.data ? (
            <div className="ems-pipeline__diversion">
              <strong>Diversion Status</strong>
              <span role="status" aria-label="Diversion status">
                {diversionStatus.data.active ? 'Active diversion' : 'No diversion'}
              </span>
            </div>
          ) : null}
          <div className="ems-pipeline__unit-grid">
            {fleetSnapshot.status === 'loading' ? (
              <p className="ems-pipeline__empty" role="status">Loading department data...</p>
            ) : fleetSnapshot.status === 'error' ? (
              <p className="ems-pipeline__empty" role="alert">
                {fleetSnapshot.message || 'EMS unit feed is unavailable. Use active inbound units below for coordination.'}
              </p>
            ) : fleetSnapshot.units.length ? (
              fleetSnapshot.units.slice(0, 6).map((unit) => (
                <article key={unit.id}>
                  <strong>{unit.callSign}</strong>
                  <span>{unit.status}</span>
                  <small>{unit.lastKnownLocation}</small>
                </article>
              ))
            ) : (
              <p className="ems-pipeline__empty">No EMS units returned by the current source. Confirm the live EMS/CAD feed before director demo claims.</p>
            )}
          </div>
        </section>

        <section className="ems-pipeline__section">
          <div className="ems-pipeline__section-heading">
            <Ambulance size={17} aria-hidden />
            <h2>Incoming</h2>
            <span>{incoming.length}</span>
          </div>
          <div className="ems-pipeline__list">
            {incoming.length ? (
              incoming.map((arrival) => (
                <EMSArrivalRow
                  key={arrival.id}
                  arrival={arrival}
                  now={now}
                  rooms={rooms}
                  onPrepareBay={prepareEMSBay}
                  onConvert={handleConvertEmsArrival}
                  onCompleteHandoff={completeHandoff}
                  onOpenPatient={openPatient}
                  offloadTargetMinutes={offloadTargetMinutes}
                  canPrepareBay={canPrepareBay}
                  canConvert={canConvert}
                  canCompleteHandoff={canCompleteHandoff}
                />
              ))
            ) : (
              <p className="ems-pipeline__empty">No inbound EMS units in the active Emergency OS state.</p>
            )}
          </div>
        </section>

        <section className="ems-pipeline__section">
          <div className="ems-pipeline__section-heading">
            <Bed size={17} aria-hidden />
            <h2>Awaiting Handoff</h2>
            <span>{awaitingHandoff.length}</span>
          </div>
          <div className="ems-pipeline__list">
            {awaitingHandoff.length ? (
              awaitingHandoff.map((arrival) => (
                <EMSArrivalRow
                  key={arrival.id}
                  arrival={arrival}
                  now={now}
                  rooms={rooms}
                  onPrepareBay={prepareEMSBay}
                  onConvert={handleConvertEmsArrival}
                  onCompleteHandoff={completeHandoff}
                  onOpenPatient={openPatient}
                  offloadTargetMinutes={offloadTargetMinutes}
                  canPrepareBay={canPrepareBay}
                  canConvert={canConvert}
                  canCompleteHandoff={canCompleteHandoff}
                />
              ))
            ) : (
              <p className="ems-pipeline__empty">No crews waiting for handoff.</p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

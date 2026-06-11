import React, { useEffect, useMemo, useState } from 'react';
import { Ambulance, Bed, CheckCircle2, Clock3 } from 'lucide-react';
import { useEmergencyStore } from '../../store/emergencyStore';
import EMSPressureScore from './EMSPressureScore';
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

function vitalsStrip(vitals) {
  if (!vitals) return ['HR --', 'BP --/--', 'SpO2 --', 'GCS --'];
  return [
    `HR ${vitals.hr ?? '--'}`,
    `BP ${vitals.bpSystolic ?? '--'}/${vitals.bpDiastolic ?? '--'}`,
    `SpO2 ${vitals.spo2 ?? '--'}${vitals.spo2 === null || vitals.spo2 === undefined ? '' : '%'}`,
    `GCS ${vitals.gcs ?? '--'}`,
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
  offloadTargetMinutes,
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
          <button type="button" onClick={() => onPrepareBay(arrival.id)} disabled={!isIncoming}>
            Prepare Bay
          </button>
        )}
        {!isIncoming && !arrival.patientId ? (
          <button
            type="button"
            className="ems-pipeline__handoff"
            onClick={() => onConvert(arrival.id)}
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
          >
            Handoff complete
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
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const emergencySettings = useEmergencyStore((state) => state.emergencySettings);
  const rooms = useEmergencyStore((state) => state.rooms);
  const prepareEMSBay = useEmergencyStore((state) => state.prepareEMSBay);
  const updateEMSArrival = useEmergencyStore((state) => state.updateEMSArrival);
  const convertEMSArrivalToPatient = useEmergencyStore((state) => state.convertEMSArrivalToPatient);
  const [now, setNow] = useState(() => new Date());
  const [fleetSnapshot, setFleetSnapshot] = useState({ status: 'loading', units: [], message: '' });
  const [diversionStatus, setDiversionStatus] = useState({ status: 'idle', data: null, message: '' });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchEmsFleetSnapshot().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setFleetSnapshot({
          status: 'ready',
          units: result.data?.units || [],
          message: result.data?.sourceLabel || result.message || '',
        });
      } else {
        setFleetSnapshot({ status: 'error', units: [], message: result.message || 'EMS unit backend unavailable.' });
      }
    });
    fetchEmergencyDiversionStatus().then((result) => {
      if (cancelled) return;
      setDiversionStatus({
        status: result.ok ? 'ready' : 'unavailable',
        data: result.data,
        message: result.message || '',
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
        convertEMSArrivalToPatient(arrival.id);
      }
    });
  }, [activeArrivals, convertEMSArrivalToPatient, now]);

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
  const offloadTargetMinutes = emergencySettings.thresholds.emsOffloadTargetMinutes || 15;
  const offloadBreachCount = offloadSamples.filter((minutes) => minutes > offloadTargetMinutes).length;
  const completeHandoff = (arrivalId) => {
    updateEMSArrival(arrivalId, {
      status: 'Complete',
      handoffCompletedAt: new Date().toISOString(),
    });
  };

  return (
    <section className="ems-pipeline" aria-labelledby="ems-pipeline-title">
      <header className="ems-pipeline__header">
        <div>
          <span>Pre-arrival coordination</span>
          <h1 id="ems-pipeline-title">EMS Pipeline</h1>
        </div>
        <div className="ems-pipeline__header-actions">
          <span
            className={`ems-pipeline__offload-kpi${offloadBreachCount ? ' ems-pipeline__offload-kpi--breach' : ''}`}
            title={`${offloadBreachCount} crews over ${offloadTargetMinutes} minutes`}
          >
            Avg offload {avgOffload}m
          </span>
          <EMSPressureScore />
          <strong aria-label={`${incoming.length} incoming EMS units`}>{incoming.length}</strong>
        </div>
      </header>

      <div className="ems-pipeline__sections">
        <section className="ems-pipeline__section">
          <div className="ems-pipeline__section-heading">
            <Ambulance size={17} aria-hidden />
            <h2>Backend EMS Unit Visibility</h2>
            <span>{fleetSnapshot.units.length}</span>
          </div>
          <p className="ems-pipeline__source">
            {fleetSnapshot.message || 'Fleet backend status unavailable.'}
          </p>
          {diversionStatus.status === 'ready' && diversionStatus.data ? (
            <div className="ems-pipeline__diversion">
              <strong>Diversion Status</strong>
              <button type="button" aria-pressed={Boolean(diversionStatus.data.active)}>
                {diversionStatus.data.active ? 'Active diversion' : 'No diversion'}
              </button>
            </div>
          ) : null}
          <div className="ems-pipeline__unit-grid">
            {fleetSnapshot.units.slice(0, 6).map((unit) => (
              <article key={unit.id}>
                <strong>{unit.callSign}</strong>
                <span>{unit.status}</span>
                <small>{unit.lastKnownLocation}</small>
              </article>
            ))}
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
                  onConvert={convertEMSArrivalToPatient}
                  onCompleteHandoff={completeHandoff}
                  offloadTargetMinutes={offloadTargetMinutes}
                />
              ))
            ) : (
              <p className="ems-pipeline__empty">No inbound EMS units.</p>
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
                  onConvert={convertEMSArrivalToPatient}
                  onCompleteHandoff={completeHandoff}
                  offloadTargetMinutes={offloadTargetMinutes}
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

import React, { useEffect, useMemo, useState } from 'react';
import { Ambulance, Bed, CheckCircle2 } from 'lucide-react';
import { useEmergencyStore } from '../../store/emergencyStore';
import EMSPressureScore from './EMSPressureScore';
import './EMSPipeline.css';

function minutesRemaining(arrival, now) {
  const target = new Date(arrival.estimatedArrivalTime).getTime();
  if (!Number.isFinite(target)) return arrival.eta ?? 0;
  return Math.ceil((target - now.getTime()) / 60000);
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

function roomName(rooms, roomId) {
  return rooms.find((room) => room.id === roomId)?.name || 'Bay pending';
}

function EMSArrivalRow({ arrival, now, rooms, onPrepareBay, onConvert }) {
  const remaining = minutesRemaining(arrival, now);
  const tone = etaTone(remaining, arrival.status);
  const isIncoming = arrival.status === 'Inbound' && remaining > 0;

  return (
    <article className={`ems-pipeline__row ems-pipeline__row--${tone}`}>
      <div className="ems-pipeline__unit">
        <strong>{arrival.unitName || arrival.unitId}</strong>
        <span>{crewLabel(arrival)}</span>
      </div>

      <div className="ems-pipeline__complaint">
        <strong>{arrival.chiefComplaint}</strong>
        <span>{arrival.mechanismOfInjury || arrival.notes}</span>
      </div>

      <span
        className={`ems-pipeline__severity ems-pipeline__severity--${arrival.severity.toLowerCase()}`}
      >
        {arrival.severity}
      </span>

      <time className="ems-pipeline__eta" dateTime={arrival.estimatedArrivalTime}>
        {formatEta(remaining, arrival.status)}
      </time>

      <div className="ems-pipeline__vitals" aria-label="EMS vitals">
        {vitalsStrip(arrival.vitals).map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      <div className="ems-pipeline__actions">
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
      </div>
    </article>
  );
}

export default function EMSPipeline() {
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const rooms = useEmergencyStore((state) => state.rooms);
  const updateEMSArrival = useEmergencyStore((state) => state.updateEMSArrival);
  const prepareEMSBay = useEmergencyStore((state) => state.prepareEMSBay);
  const convertEMSArrivalToPatient = useEmergencyStore((state) => state.convertEMSArrivalToPatient);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeArrivals = useMemo(
    () => emsArrivals.filter((arrival) => !['Complete', 'Cancelled'].includes(arrival.status)),
    [emsArrivals]
  );

  useEffect(() => {
    activeArrivals.forEach((arrival) => {
      if (arrival.status !== 'Inbound') return;
      if (minutesRemaining(arrival, now) <= 0) {
        updateEMSArrival(arrival.id, {
          status: 'Arrived',
          arrivedAt: arrival.arrivedAt || now.toISOString(),
        });
      }
    });
  }, [activeArrivals, now, updateEMSArrival]);

  const incoming = activeArrivals
    .filter((arrival) => arrival.status === 'Inbound' && minutesRemaining(arrival, now) > 0)
    .sort((a, b) => minutesRemaining(a, now) - minutesRemaining(b, now));
  const awaitingHandoff = activeArrivals
    .filter(
      (arrival) =>
        (arrival.status === 'Arrived' ||
          arrival.status === 'Handoff' ||
          minutesRemaining(arrival, now) <= 0) &&
        !arrival.patientId
    )
    .sort((a, b) => minutesRemaining(a, now) - minutesRemaining(b, now));

  return (
    <section className="ems-pipeline" aria-labelledby="ems-pipeline-title">
      <header className="ems-pipeline__header">
        <div>
          <span>Pre-arrival coordination</span>
          <h1 id="ems-pipeline-title">EMS Pipeline</h1>
        </div>
        <strong>{incoming.length}</strong>
      </header>

      <div className="ems-pipeline__sections">
        <EMSPressureScore variant="gauge" />

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

import React, { useEffect, useMemo, useState } from 'react';
import { useEmergencyStore } from '../store/emergencyStore';
import './EMSPressureScore.css';

const TARGET_OFFLOAD_MINUTES = 15;

export function minutesUntilEMSArrival(arrival, now = new Date()) {
  const target = new Date(arrival.estimatedArrivalTime).getTime();
  if (!Number.isFinite(target)) return arrival.eta ?? 0;
  return Math.ceil((target - now.getTime()) / 60000);
}

function offloadStartTime(arrival, now) {
  const arrivedAt = arrival.arrivedAt ? new Date(arrival.arrivedAt).getTime() : NaN;
  if (Number.isFinite(arrivedAt)) return arrivedAt;

  const estimated = new Date(arrival.estimatedArrivalTime).getTime();
  if (Number.isFinite(estimated) && estimated <= now.getTime()) return estimated;
  return null;
}

export function getEMSPressureBand(score) {
  if (score <= 25) return { id: 'stable', label: 'EMS Stable', color: 'green' };
  if (score <= 50) return { id: 'moderate', label: 'EMS Moderate', color: 'yellow' };
  if (score <= 75) return { id: 'elevated', label: 'EMS Elevated', color: 'orange' };
  return { id: 'critical', label: 'EMS Critical', color: 'red' };
}

export function calculateEMSPressureScore(emsArrivals = [], now = new Date()) {
  const activeArrivals = emsArrivals.filter(
    (arrival) => !['Complete', 'Cancelled'].includes(arrival.status)
  );
  const incomingUnits = activeArrivals.filter(
    (arrival) =>
      arrival.status === 'Inbound' && minutesUntilEMSArrival(arrival, now) > 0 && !arrival.patientId
  );
  const awaitingHandoff = activeArrivals.filter(
    (arrival) =>
      !arrival.patientId &&
      (arrival.status === 'Arrived' ||
        arrival.status === 'Handoff' ||
        minutesUntilEMSArrival(arrival, now) <= 0)
  );
  const criticalPending = activeArrivals.filter(
    (arrival) => !arrival.patientId && arrival.severity === 'Critical'
  );
  const offloadDurations = awaitingHandoff
    .map((arrival) => offloadStartTime(arrival, now))
    .filter((timestamp) => timestamp !== null)
    .map((timestamp) => Math.max(0, Math.round((now.getTime() - timestamp) / 60000)));
  const averageOffloadMinutes = offloadDurations.length
    ? Math.round(offloadDurations.reduce((sum, value) => sum + value, 0) / offloadDurations.length)
    : 0;

  const incomingScore = Math.min(40, incomingUnits.length * 10);
  const handoffScore = Math.min(30, awaitingHandoff.length * 15);
  const offloadScore = Math.min(
    20,
    Math.round((averageOffloadMinutes / TARGET_OFFLOAD_MINUTES) * 20)
  );
  const criticalScore = criticalPending.length * 10;
  const score = Math.min(100, incomingScore + handoffScore + offloadScore + criticalScore);

  return {
    score,
    band: getEMSPressureBand(score),
    incomingUnits: incomingUnits.length,
    awaitingHandoff: awaitingHandoff.length,
    averageOffloadMinutes,
    criticalPending: criticalPending.length,
    components: {
      incomingScore,
      handoffScore,
      offloadScore,
      criticalScore,
    },
  };
}

export function isEMSPressureElevated(pressure) {
  return pressure.band.id === 'elevated' || pressure.band.id === 'critical';
}

export function buildEMSPressureCopilotContext(pressure) {
  if (!isEMSPressureElevated(pressure)) return null;
  return `EMS pressure is elevated. ${pressure.incomingUnits} units inbound. Consider clearing bays and expediting handoffs.`;
}

export default function EMSPressureScore({ variant = 'badge', className = '' }) {
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const pressure = useMemo(() => calculateEMSPressureScore(emsArrivals, now), [emsArrivals, now]);
  const modifier = `ems-pressure--${pressure.band.id}`;

  if (variant === 'gauge') {
    return (
      <section className={`ems-pressure ems-pressure--gauge ${modifier} ${className}`}>
        <div className="ems-pressure__gauge" style={{ '--ems-pressure-score': pressure.score }}>
          <strong>{pressure.score}</strong>
          <span>/100</span>
        </div>
        <div className="ems-pressure__body">
          <span>EMS Pressure</span>
          <h2>{pressure.band.label}</h2>
          <p>
            {pressure.incomingUnits} inbound · {pressure.awaitingHandoff} awaiting handoff · avg
            offload {pressure.averageOffloadMinutes}m
          </p>
        </div>
      </section>
    );
  }

  return (
    <div
      className={`ems-pressure ems-pressure--badge ${modifier} ${className}`}
      role="status"
      aria-label={`EMS pressure score ${pressure.score}, ${pressure.band.label}`}
    >
      <span className="ems-pressure__dot" aria-hidden />
      <span>EMS</span>
      <strong>{pressure.score}</strong>
    </div>
  );
}

export function minutesRemaining(arrival, now = Date.now()) {
  const etaMs = new Date(arrival.estimatedArrivalTime || 0).getTime();
  if (!Number.isFinite(etaMs)) return Number(arrival.eta ?? arrival.etaMinutes ?? 0) || 0;
  return Math.max(0, Math.round((etaMs - now) / 60000));
}

export function formatEta(remainingMinutes, status) {
  if (status === 'Arrived' || status === 'Handoff') return 'On scene';
  if (status === 'Complete') return 'Complete';
  if (status === 'Cancelled') return 'Cancelled';
  if (remainingMinutes <= 0) return 'Arriving now';
  if (remainingMinutes === 1) return 'ETA 1 min';
  return `ETA ${remainingMinutes} min`;
}

export function etaTone(remainingMinutes, status) {
  if (['Arrived', 'Handoff', 'Complete'].includes(status)) return 'arrived';
  if (remainingMinutes <= 3) return 'critical';
  if (remainingMinutes <= 8) return 'warning';
  return 'stable';
}

export function vitalsStrip(vitals) {
  if (!vitals || typeof vitals !== 'object') return [];
  const items = [] as any[];
  if (vitals.hr != null) items.push(`HR ${vitals.hr}`);
  if (vitals.sbp != null && vitals.dbp != null) items.push(`BP ${vitals.sbp}/${vitals.dbp}`);
  if (vitals.spo2 != null) items.push(`SpO2 ${vitals.spo2}%`);
  if (vitals.rr != null) items.push(`RR ${vitals.rr}`);
  if (vitals.gcs != null) items.push(`GCS ${vitals.gcs}`);
  return items.slice(0, 4);
}

export function unitLabel(arrival) {
  return arrival.unitName || arrival.unitId || 'EMS unit';
}

export function isInboundEmsArrival(arrival, now = Date.now()) {
  if (!arrival || ['Complete', 'Cancelled'].includes(arrival.status)) return false;
  if (arrival.status === 'Inbound') return minutesRemaining(arrival, now) > 0 || !arrival.patientId;
  return arrival.status === 'Arrived' && !arrival.patientId;
}

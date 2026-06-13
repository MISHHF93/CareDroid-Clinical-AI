import { useMemo } from 'react';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientState } from '../types/emergency';
import { longWaitShiftMetrics } from '../utils/longWaitRescue';

function isShiftPatient(patient) {
  return patient.state !== PatientState.Discharge && patient.state !== PatientState.Deceased;
}

function MetricRow({ label, value }) {
  return (
    <article style={{
      background: '#111827',
      border: '1px solid #1F2937',
      borderRadius: 12,
      padding: 14,
    }}>
      <span style={{ color: '#9CA3AF', fontSize: 12 }}>{label}</span>
      <strong style={{ color: '#F9FAFB', display: 'block', fontSize: 22, marginTop: 4 }}>{value}</strong>
    </article>
  );
}

export default function ShiftSummary() {
  const patients = useEmergencyStore((state) => state.patients);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const emergencySettings = useEmergencyStore((state) => state.emergencySettings);
  const metrics = useMemo(
    () => longWaitShiftMetrics(patients.filter(isShiftPatient), new Date(), emergencySettings),
    [emergencySettings, patients],
  );

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 500, color: '#F9FAFB' }}>Shift Summary</h1>
      <p style={{ color: '#9CA3AF', marginTop: 8 }}>
        {activeShift.label} started {new Date(activeShift.startTime).toLocaleString()}.
      </p>
      <section
        aria-label="LWBS safety metrics"
        style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: 18 }}
      >
        <MetricRow label="Long wait events" value={metrics.longWaitEvents} />
        <MetricRow label="LWBS risk events" value={metrics.lwbsRiskEvents} />
        <MetricRow label="Max wait this shift" value={`${metrics.maxWaitMinutes}min`} />
        <MetricRow
          label="Patients exceeding CTAS target"
          value={`${metrics.exceedingTargetCount} (${metrics.exceedingTargetPercent}%)`}
        />
      </section>
    </div>
  );
}

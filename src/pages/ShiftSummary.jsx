import { useMemo } from 'react';
import { MEDICAL_THEME } from '../config/medicalTheme.constants';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientState } from '../types/emergency';
import { longWaitShiftMetrics } from '../utils/longWaitRescue';

function isShiftPatient(patient) {
  return patient.state !== PatientState.Discharge && patient.state !== PatientState.Deceased;
}

function MetricRow({ label, value }) {
  return (
    <article style={{
      background: MEDICAL_THEME.surfaceCard,
      border: '1px solid #e0f2fe',
      borderRadius: 12,
      padding: 14,
    }}>
      <span style={{ color: MEDICAL_THEME.inkSubtle, fontSize: 12 }}>{label}</span>
      <strong style={{ color: 'var(--medical-ink, #111827)', display: 'block', fontSize: 22, marginTop: 4 }}>{value}</strong>
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
      <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--medical-ink, #111827)' }}>Shift Summary</h1>
      <p style={{ color: MEDICAL_THEME.inkSubtle, marginTop: 8 }}>
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

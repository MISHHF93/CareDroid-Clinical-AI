import React, { useState } from 'react';
import { usePatientDetail } from './usePatientDetail';
import { PatientHeader } from '../../domain/patient/PatientHeader';
import { VitalsSnapshot } from '../../domain/patient/VitalsSnapshot';
import { PatientTimeline } from '../../domain/patient/PatientTimeline';
import { AlertRail } from '../../domain/alerts/AlertRail';
import { EmptyState } from '../../components/data-display/EmptyState';
import { useEmergencyStore } from '../../store/emergencyStore';
import type { Alert } from '../../types/emergency';

const TABS = ['Overview', 'Vitals', 'Timeline', 'Alerts'] as const;
type Tab = typeof TABS[number];

type PatientDetailFeatureProps = {
  patientId?: string;
  onBack?: () => void;
};

export function PatientDetailFeature({ patientId, onBack }: PatientDetailFeatureProps) {
  const [tab, setTab] = useState<Tab>('Overview');
  const { patient, latestVitals, patientAlerts } = usePatientDetail(patientId);
  const dismissAlert = useEmergencyStore((s) => s.dismissAlert);

  if (!patient) {
    return <EmptyState title="No patient selected" description="Select a patient from the queue to view details." />;
  }

  function handleDismiss(alert: Alert) {
    dismissAlert(alert.id);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PatientHeader patient={patient} actions={
        onBack && (
          <button
            onClick={onBack}
            style={{ fontSize: 'var(--cd-text-sm)', color: 'var(--cd-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--cd-space-1) var(--cd-space-2)' }}
          >
            ← Back
          </button>
        )
      } />

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--cd-border-subtle)', background: 'var(--cd-bg-surface)' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: 'var(--cd-space-3) var(--cd-space-4)',
              fontSize: 'var(--cd-text-sm)',
              fontWeight: tab === t ? 'var(--cd-font-semibold)' : 'var(--cd-font-regular)',
              color: tab === t ? 'var(--cd-text-primary)' : 'var(--cd-text-secondary)',
              background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--cd-brand-bg)' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            {t}
            {t === 'Alerts' && patientAlerts.length > 0 && (
              <span style={{ marginLeft: 4, fontSize: 'var(--cd-text-xs)', background: 'var(--cd-danger-icon)', color: '#fff', borderRadius: 'var(--cd-radius-full)', padding: '0 5px' }}>
                {patientAlerts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--cd-space-4)' }}>
        {tab === 'Overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cd-space-5)' }}>
            <section>
              <h3 style={{ fontSize: 'var(--cd-text-sm)', fontWeight: 'var(--cd-font-semibold)', color: 'var(--cd-text-secondary)', marginBottom: 'var(--cd-space-2)', textTransform: 'uppercase', letterSpacing: 'var(--cd-tracking-wider)' }}>Latest Vitals</h3>
              <VitalsSnapshot vitals={latestVitals} />
            </section>
            {patient.notes.length > 0 && (
              <section>
                <h3 style={{ fontSize: 'var(--cd-text-sm)', fontWeight: 'var(--cd-font-semibold)', color: 'var(--cd-text-secondary)', marginBottom: 'var(--cd-space-2)', textTransform: 'uppercase', letterSpacing: 'var(--cd-tracking-wider)' }}>Recent Notes</h3>
                {patient.notes.slice(-3).reverse().map((note) => (
                  <div key={note.id} style={{ padding: 'var(--cd-space-2) 0', borderBottom: '1px solid var(--cd-border-subtle)', fontSize: 'var(--cd-text-sm)', color: 'var(--cd-text-primary)' }}>
                    {note.text ?? note.body}
                  </div>
                ))}
              </section>
            )}
          </div>
        )}

        {tab === 'Vitals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cd-space-4)' }}>
            {patient.vitals.length === 0
              ? <EmptyState title="No vitals recorded" />
              : [...patient.vitals].reverse().map((v, i) => (
                <div key={i} style={{ borderBottom: '1px solid var(--cd-border-subtle)', paddingBottom: 'var(--cd-space-3)' }}>
                  <div style={{ fontSize: 'var(--cd-text-xs)', color: 'var(--cd-text-secondary)', marginBottom: 'var(--cd-space-2)' }}>
                    {new Date(v.recordedAt).toLocaleString()}
                  </div>
                  <VitalsSnapshot vitals={v} />
                </div>
              ))
            }
          </div>
        )}

        {tab === 'Timeline' && (
          <PatientTimeline events={patient.timeline} />
        )}

        {tab === 'Alerts' && (
          <AlertRail alerts={patientAlerts} onDismiss={handleDismiss} />
        )}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { usePatientDetail } from './usePatientDetail';
import { PatientHeader } from '../../domain/patient/PatientHeader';
import { VitalsSnapshot } from '../../domain/patient/VitalsSnapshot';
import { PatientTimeline } from '../../domain/patient/PatientTimeline';
import { AlertRail } from '../../domain/alerts/AlertRail';
import { AIRecommendationCard } from '../../components/ai';
import { EmptyState } from '../../components/data-display/EmptyState';
import { useEmergencyStore } from '../../store/emergencyStore';
import type { Alert } from '../../types/emergency';
import { useCareDroidAI } from '../../hooks/useCareDroidAI';
import type { CareDroidAIRequest } from '../../../lib/ai/careDroidAI';
import './PatientDetailFeature.css';

const TABS = ['Overview', 'Vitals', 'Timeline', 'Alerts'] as const;
type Tab = (typeof TABS)[number];

type PatientDetailFeatureProps = {
  patientId?: string;
  onBack?: () => void;
};

export function PatientDetailFeature({ patientId, onBack }: PatientDetailFeatureProps) {
  const [tab, setTab] = useState<Tab>('Overview');
  const { patient, latestVitals, patientAlerts } = usePatientDetail(patientId);
  const dismissAlert = useEmergencyStore((s) => s.dismissAlert);
  const aiSummaryRequest = useMemo<CareDroidAIRequest | undefined>(() => {
    if (!patient) return undefined;
    return {
      intent: 'patient_summary',
      input: {
        demographics: {
          age: patient.age,
          sex: patient.sex,
        },
        intakeData: {
          symptoms: [patient.chiefComplaint || patient.complaint || patient.complaintCategory].filter(Boolean),
          arrivalMode: patient.arrivalMode || patient.source || patient.arrival?.arrivalMode,
        },
        vitals: latestVitals || patient.currentVitals || patient.vitals.at(-1) || {},
        triageNotes: patient.notes
          .slice(-5)
          .map((note) => note.text || note.body)
          .filter(Boolean),
        medicalHistory: patient.flags,
        medications: patient.emsArrival?.medicationsEnRoute || [],
        allergies: [],
        labResults: [],
        imagingResults: [],
        previousVisits: [],
      },
      context: {
        sourceScreen: 'patient_profile',
        userRole: 'clinician',
      },
    };
  }, [latestVitals, patient]);
  const {
    response: aiSummary,
    isLoading: aiSummaryLoading,
    error: aiSummaryError,
    run: runAiSummary,
  } = useCareDroidAI(aiSummaryRequest);

  useEffect(() => {
    if (!aiSummaryRequest) return;
    void runAiSummary(aiSummaryRequest).catch(() => undefined);
  }, [aiSummaryRequest, runAiSummary]);

  if (!patient) {
    return <EmptyState title="No patient selected" description="Select a patient from the queue to view details." />;
  }

  function handleDismiss(alert: Alert) {
    dismissAlert(alert.id);
  }

  return (
    <div className="cd-patient-detail">
      <PatientHeader
        patient={patient}
        actions={
          onBack ? (
            <button type="button" className="cd-patient-detail__back" onClick={onBack}>
              Back
            </button>
          ) : null
        }
      />

      <div className="cd-patient-detail__tabs" role="tablist" aria-label="Patient detail sections">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className="cd-patient-detail__tab"
            data-active={tab === t ? 'true' : 'false'}
            onClick={() => setTab(t)}
          >
            {t}
            {t === 'Alerts' && patientAlerts.length > 0 ? (
              <span className="cd-patient-detail__tab-count">{patientAlerts.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="cd-patient-detail__panel" role="tabpanel" aria-label={tab}>
        {tab === 'Overview' ? (
          <div className="cd-patient-detail__stack">
            <section className="cd-patient-detail__ai" aria-label="AI patient summary">
              <h3 className="cd-patient-detail__section-title">AI Patient Summary</h3>
              {aiSummaryLoading ? (
                <p className="cd-patient-detail__ai-state" role="status">Generating summary...</p>
              ) : aiSummary ? (
                <AIRecommendationCard
                  response={aiSummary}
                  title="Patient handoff summary"
                  compact
                />
              ) : aiSummaryError ? (
                <p className="cd-patient-detail__ai-state" role="alert">{aiSummaryError}</p>
              ) : null}
            </section>
            <section>
              <h3 className="cd-patient-detail__section-title">Latest Vitals</h3>
              <VitalsSnapshot vitals={latestVitals} />
            </section>
            {patient.notes.length > 0 ? (
              <section>
                <h3 className="cd-patient-detail__section-title">Recent Notes</h3>
                {patient.notes
                  .slice(-3)
                  .reverse()
                  .map((note) => (
                    <div key={note.id} className="cd-patient-detail__note">
                      {note.text ?? note.body}
                    </div>
                  ))}
              </section>
            ) : null}
          </div>
        ) : null}

        {tab === 'Vitals' ? (
          <div className="cd-patient-detail__stack">
            {patient.vitals.length === 0 ? (
              <EmptyState title="No vitals recorded" />
            ) : (
              [...patient.vitals].reverse().map((v, i) => (
                <div key={`${v.recordedAt}-${i}`} className="cd-patient-detail__vital-entry">
                  <div className="cd-patient-detail__vital-time">
                    {new Date(v.recordedAt).toLocaleString()}
                  </div>
                  <VitalsSnapshot vitals={v} />
                </div>
              ))
            )}
          </div>
        ) : null}

        {tab === 'Timeline' ? <PatientTimeline events={patient.timeline} /> : null}

        {tab === 'Alerts' ? <AlertRail alerts={patientAlerts} onDismiss={handleDismiss} /> : null}
      </div>
    </div>
  );
}

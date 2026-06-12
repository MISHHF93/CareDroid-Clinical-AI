import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { selectSelectedPatient, useEmergencyStore } from '../../store/emergencyStore';
import { buildClinicalDecisionSupportPlan, DEFAULT_SYMPTOMS } from '../data/clinicalDecisionSupportEngine';
import { buildUserToolProfile } from '../data/profileToolSegmentation';
import { getUserFacingToolRegistryProjection } from '../data/toolInventory';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import './ClinicalDecisionSupport.css';

function formatPatientVitals(patient) {
  const vitals = patient?.vitals || {};
  return [
    vitals.hr ? `HR ${vitals.hr}` : '',
    vitals.bpSystolic || vitals.bpDiastolic ? `BP ${vitals.bpSystolic || '?'}/${vitals.bpDiastolic || '?'}` : '',
    vitals.rr ? `RR ${vitals.rr}` : '',
    vitals.spo2 ? `SpO2 ${vitals.spo2}` : '',
    vitals.temp ? `Temp ${vitals.temp}` : '',
  ]
    .filter(Boolean)
    .join(', ');
}

function buildPatientContext(patient) {
  return {
    age: patient?.age != null ? String(patient.age) : '',
    sex: patient?.sex || 'not specified',
    vitals: formatPatientVitals(patient) || 'No current vitals in Emergency OS store',
    history: patient?.history || patient?.chiefComplaint || 'No additional history in Emergency OS store',
  };
}

function RecommendationList({ title, items }) {
  return (
    <article className="cds-panel">
      <h2>{title}</h2>
      <ul className="cds-list">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </article>
  );
}

export default function ClinicalDecisionSupport() {
  const { user } = useUser();
  const { activeWorkspaceId, workspaces } = useWorkspace();
  const selectedPatient = useEmergencyStore(selectSelectedPatient);
  const selectedPatientContext = useMemo(() => buildPatientContext(selectedPatient), [selectedPatient]);
  const [symptoms, setSymptoms] = useState(selectedPatient?.chiefComplaint || DEFAULT_SYMPTOMS);
  const [patientContext, setPatientContext] = useState(selectedPatientContext);

  useEffect(() => {
    setPatientContext(selectedPatientContext);
    setSymptoms(selectedPatient?.chiefComplaint || DEFAULT_SYMPTOMS);
  }, [selectedPatient?.chiefComplaint, selectedPatientContext]);
  const profile = useMemo(
    () => buildUserToolProfile({ user, activeWorkspaceId }),
    [activeWorkspaceId, user]
  );
  const calculatorInventory = useMemo(
    () =>
      getUserFacingToolRegistryProjection().filter((tool) =>
        [tool.category, tool.presentationCategory, tool.surface]
          .map((value) => String(value || '').toLowerCase())
          .some((value) => value.includes('calculator'))
      ),
    []
  );
  const activeWorkspaceName =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId)?.name || activeWorkspaceId;
  const plan = useMemo(
    () =>
      buildClinicalDecisionSupportPlan({
        symptoms,
        patientContext,
        profile,
        activeWorkspaceId,
        calculatorInventory,
      }),
    [activeWorkspaceId, calculatorInventory, patientContext, profile, symptoms]
  );

  return (
    <section className="cds-page">
      <section className="cds-hero" aria-labelledby="cds-title">
        <div className="cds-hero__icon" aria-hidden>
          <NavIcon icon={CHROME_ICONS.stethoscope} size={34} />
        </div>
        <div>
          <p className="cds-eyebrow">{plan.safetyLabel}</p>
          <h1 id="cds-title">Clinical Decision Support Engine</h1>
          <p>
            Patient-context-aware recommendations for risk stratification, calculators, workflows,
            labs, imaging, escalation, and explainability.
          </p>
        </div>
        <Link
          className="cds-primary-action"
          to={`/assistant?seed=${encodeURIComponent(plan.assistantPrompt)}`}
        >
          Ask AI Assistant
        </Link>
      </section>

      <section className="cds-metrics" aria-label="Decision support context">
        <article>
          <span>Risk level</span>
          <strong>{plan.riskLevel}</strong>
          <small>{plan.signals.length} matched signal groups</small>
        </article>
        <article>
          <span>Profile</span>
          <strong>{profile.role}</strong>
          <small>{profile.specialty}</small>
        </article>
        <article>
          <span>Workspace</span>
          <strong>{activeWorkspaceName}</strong>
          <small>Context-aware recommendation framing</small>
        </article>
        <article>
          <span>Calculator inventory</span>
          <strong>{calculatorInventory.length}</strong>
          <small>Canonical calculators available</small>
        </article>
      </section>

      <section className="cds-layout">
        <div className="cds-panel cds-intake">
          <div className="cds-panel__header">
            <div>
              <p className="cds-eyebrow">Symptom intake</p>
              <h2>Patient presentation</h2>
            </div>
            <span className={`cds-badge cds-badge--${plan.riskLevel}`}>{plan.riskLevel}</span>
          </div>
          <label>
            Symptoms / chief complaint
            <textarea
              value={symptoms}
              onChange={(event) => setSymptoms(event.target.value)}
              placeholder="Enter symptoms, onset, associated features, and risk context."
            />
          </label>
          <div className="cds-field-grid">
            <label>
              Age
              <input
                value={patientContext.age}
                onChange={(event) => setPatientContext((current) => ({ ...current, age: event.target.value }))}
              />
            </label>
            <label>
              Sex/context
              <input
                value={patientContext.sex}
                onChange={(event) => setPatientContext((current) => ({ ...current, sex: event.target.value }))}
              />
            </label>
          </div>
          <label>
            Vitals / instability signals
            <input
              value={patientContext.vitals}
              onChange={(event) => setPatientContext((current) => ({ ...current, vitals: event.target.value }))}
            />
          </label>
          <label>
            Relevant history
            <textarea
              value={patientContext.history}
              onChange={(event) => setPatientContext((current) => ({ ...current, history: event.target.value }))}
              placeholder="Comorbidities, medications, pregnancy, anticoagulation, immune status, prior events."
            />
          </label>
        </div>

        <aside className="cds-panel">
          <div className="cds-panel__header">
            <div>
              <p className="cds-eyebrow">Risk stratification</p>
              <h2>Matched signals</h2>
            </div>
          </div>
          <div className="cds-stack">
            {plan.signals.map((signal) => (
              <article key={signal.id} className="cds-mini-card">
                <strong>{signal.label}</strong>
                <span>{signal.risk} risk</span>
                <small>Matched: {signal.matchedKeywords.join(', ')}</small>
              </article>
            ))}
          </div>
          <div className="cds-decision-note">
            <strong>Escalation suggestions</strong>
            <ul className="cds-list">
              {plan.escalationSuggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
            </ul>
          </div>
        </aside>
      </section>

      <section className="cds-grid">
        <article className="cds-panel cds-calculators">
          <h2>Calculator Recommendations</h2>
          <div className="cds-stack">
            {plan.calculatorRecommendations.map((calculator) => (
              <Link key={calculator.id} className="cds-mini-card cds-link-card" to={calculator.path}>
                <strong>{calculator.name}</strong>
                <span>{calculator.id}</span>
                <small>{calculator.reason}</small>
              </Link>
            ))}
          </div>
        </article>
        <RecommendationList title="Workflow Recommendations" items={plan.workflowRecommendations} />
        <RecommendationList title="Lab Recommendations" items={plan.labRecommendations} />
        <RecommendationList title="Imaging Recommendations" items={plan.imagingRecommendations} />
      </section>

      <section className="cds-panel cds-explainability" aria-label="Decision support explainability">
        <div className="cds-panel__header">
          <div>
            <p className="cds-eyebrow">Explainability</p>
            <h2>Why these recommendations appeared</h2>
          </div>
          <span className="cds-badge">Transparent reasoning</span>
        </div>
        <div className="cds-explainability-grid">
          <article>
            <strong>Matched clinical signals</strong>
            <span>{plan.explainability.matchedSignals.join(', ')}</span>
          </article>
          <article>
            <strong>Profile context</strong>
            <span>{plan.explainability.profileContext}</span>
          </article>
          <article>
            <strong>Workspace context</strong>
            <span>{plan.explainability.workspaceContext}</span>
          </article>
          <article>
            <strong>Inventory context</strong>
            <span>{plan.explainability.inventoryContext}</span>
          </article>
        </div>
        <div className="cds-grid cds-grid--compact">
          <RecommendationList title="Patient Context Considered" items={plan.explainability.patientContext} />
          <RecommendationList title="Limitations" items={plan.explainability.limitations} />
        </div>
      </section>
    </section>
  );
}

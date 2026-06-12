import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileScan, Link2, UserPlus, UserRoundX } from 'lucide-react';
import { SMART_INTAKE_DEMO } from '../../data/smartIntakeFixtures';
import SmartIntakeApi from '../../services/smartIntakeApi';
import './SmartIntake.css';

const STATUS_LABEL = {
  verified: 'Verified',
  unverified: 'Unverified',
  conflicting: 'Conflict',
  missing: 'Missing',
  overridden: 'Staff override',
};

function fieldTone(status) {
  if (status === 'verified') return 'verified';
  if (status === 'conflicting') return 'conflicting';
  if (status === 'missing') return 'missing';
  if (status === 'overridden') return 'overridden';
  return 'unverified';
}

export default function SmartIntake() {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedCandidateId, setSelectedCandidateId] = useState(SMART_INTAKE_DEMO.candidates[0]?.patientId || null);
  const [sessionId, setSessionId] = useState(SMART_INTAKE_DEMO.sessionId);
  const [statusMessage, setStatusMessage] = useState('Demo review loaded. Backend API is used when Mongoose Emergency OS runtime is enabled.');
  const [fieldDecisions, setFieldDecisions] = useState(() =>
    Object.fromEntries(SMART_INTAKE_DEMO.extractedFields.map((field) => [field.field, field.status]))
  );

  const verificationComplete = useMemo(
    () => Object.values(fieldDecisions).every((status) => ['verified', 'overridden'].includes(status)),
    [fieldDecisions]
  );

  const startBackendSession = async () => {
    try {
      const result = await SmartIntakeApi.createSession('Smart Intake RN');
      setSessionId(result.sessionId || result.session?._id || SMART_INTAKE_DEMO.sessionId);
      setStatusMessage('Backend Smart Intake session created.');
      setActiveStep(1);
    } catch (error) {
      setStatusMessage(`Using local demo workflow: ${error.message}`);
      setActiveStep(1);
    }
  };

  const updateDecision = (field, decision) => {
    setFieldDecisions((current) => ({
      ...current,
      [field]: decision === 'edited' ? 'overridden' : decision === 'approved' ? 'verified' : 'missing',
    }));
  };

  const selectedCandidate = SMART_INTAKE_DEMO.candidates.find((candidate) => candidate.patientId === selectedCandidateId);

  return (
    <section className="smart-intake" aria-labelledby="smart-intake-title">
      <header className="smart-intake__hero">
        <div>
          <span>CareDroid Emergency OS</span>
          <h1 id="smart-intake-title">Smart Intake Identity Review</h1>
          <p>
            Verify extracted identity, medication, allergy, EMS, and referral evidence before creating,
            linking, or continuing as an unknown patient.
          </p>
        </div>
        <button type="button" onClick={startBackendSession}>
          <FileScan size={18} aria-hidden />
          Start Intake
        </button>
      </header>

      <ol className="smart-intake__steps" aria-label="Smart Intake steps">
        {SMART_INTAKE_DEMO.steps.map((step, index) => (
          <li key={step} className={index <= activeStep ? 'smart-intake__step--active' : ''}>
            <button type="button" onClick={() => setActiveStep(index)} aria-current={index === activeStep ? 'step' : undefined}>
              <span>{index + 1}</span>
              {step}
            </button>
          </li>
        ))}
      </ol>

      <div className="smart-intake__status" role="status">
        <strong>Session:</strong> {sessionId} · {statusMessage}
      </div>

      <div className="smart-intake__grid">
        <section className="smart-intake__panel" aria-labelledby="extracted-title">
          <header>
            <h2 id="extracted-title">Extracted vs Existing Data</h2>
            <p>Critical fields must be approved, rejected, or edited before the final action.</p>
          </header>
          <div className="smart-intake__field-list">
            {SMART_INTAKE_DEMO.extractedFields.map((field) => {
              const tone = fieldTone(fieldDecisions[field.field]);
              return (
                <article key={field.field} className={`smart-intake__field smart-intake__field--${tone}`}>
                  <div>
                    <strong>{field.field}</strong>
                    <span>{field.source}</span>
                  </div>
                  <dl>
                    <div>
                      <dt>Extracted</dt>
                      <dd>{field.extracted || 'Missing'}</dd>
                    </div>
                    <div>
                      <dt>Existing</dt>
                      <dd>{field.existing || 'No existing value'}</dd>
                    </div>
                  </dl>
                  <footer>
                    <span>{STATUS_LABEL[tone]}</span>
                    <button type="button" onClick={() => updateDecision(field.field, 'approved')}>
                      Approve
                    </button>
                    <button type="button" onClick={() => updateDecision(field.field, 'edited')}>
                      Edit
                    </button>
                    <button type="button" onClick={() => updateDecision(field.field, 'rejected')}>
                      Reject
                    </button>
                  </footer>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="smart-intake__panel" aria-labelledby="match-title">
          <header>
            <h2 id="match-title">Patient Match Candidates</h2>
            <p>Ranked candidates only. The system never auto-links without staff confirmation.</p>
          </header>
          <div className="smart-intake__candidate-list">
            {SMART_INTAKE_DEMO.candidates.map((candidate) => (
              <button
                key={candidate.patientId}
                type="button"
                className={candidate.patientId === selectedCandidateId ? 'smart-intake__candidate--selected' : ''}
                onClick={() => setSelectedCandidateId(candidate.patientId)}
              >
                <strong>{candidate.displayName}</strong>
                <span>{candidate.matchScore}% match</span>
                <small>Matched: {candidate.matchedFields.join(', ')}</small>
                <small>Conflicts: {candidate.conflictingFields.join(', ') || 'none'}</small>
              </button>
            ))}
          </div>

          {selectedCandidate ? (
            <div className="smart-intake__match-explanation">
              <AlertTriangle size={18} aria-hidden />
              <p>
                {selectedCandidate.displayName} is recommended for{' '}
                <strong>{selectedCandidate.recommendedAction.replace(/_/g, ' ')}</strong>. Staff must confirm
                before linking or creating a duplicate record.
              </p>
            </div>
          ) : null}

          <div className="smart-intake__warnings">
            {SMART_INTAKE_DEMO.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        </aside>
      </div>

      <section className="smart-intake__actions" aria-label="Final Smart Intake actions">
        <button type="button" disabled={!verificationComplete}>
          <Link2 size={17} aria-hidden />
          Link to Existing Patient
        </button>
        <button type="button" disabled={!verificationComplete}>
          <UserPlus size={17} aria-hidden />
          Create New Patient
        </button>
        <button type="button">
          <UserRoundX size={17} aria-hidden />
          Continue as Unknown Patient
        </button>
        <button type="button" disabled={!verificationComplete}>
          <CheckCircle2 size={17} aria-hidden />
          Send to Triage
        </button>
      </section>

      <section className="smart-intake__audit" aria-label="Patient identity audit log">
        <h2>Identity Audit Log</h2>
        {SMART_INTAKE_DEMO.auditLog.map((entry) => (
          <span key={entry}>{entry}</span>
        ))}
      </section>
    </section>
  );
}

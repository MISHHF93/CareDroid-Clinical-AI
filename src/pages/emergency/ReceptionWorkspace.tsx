import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, FileText, FolderOpen, Save, ShieldCheck, Sparkles, Timer, UserPlus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import HelpTrigger from '../../components/help/HelpTrigger';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { EMERGENCY_ACTIONS } from '../../config/emergencyRolePermissions';
import { useUser } from '../../contexts/UserContext';
import useProfileNavigate from '../../hooks/useProfileNavigate';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import { useEmergencyStore } from '../../store/emergencyStore';
import { PatientFlag, PatientState, Priority, type Alert, type Patient } from '../../types/emergency';
import {
  assertReceptionMutationAllowed,
  createPatientAndRouteFromReception,
  detectReceptionRedFlags,
  runReceptionAiIntakeAssist,
  validateReceptionMinimumCriticalData,
  type ReceptionAiIntakeAssist,
  type ReceptionArrivalType,
  type ReceptionIntakeDraft,
  type ReceptionRouteResult,
} from '../../services/receptionIntakeOrchestrator';
import './ReceptionWorkspace.css';
import './emergency-route.css';

const ARRIVAL_TYPES: Array<{ id: ReceptionArrivalType; label: string }> = [
  { id: 'walk-in', label: 'Walk-in' },
  { id: 'ambulance-arrival', label: 'Ambulance arrival' },
  { id: 'ems-prearrival', label: 'EMS pre-arrival' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'referral', label: 'Referral' },
  { id: 'staff-created-emergency', label: 'Staff-created emergency' },
];

const RED_FLAG_OPTIONS = [
  'Chest pain',
  'Shortness of breath',
  'Stroke symptoms',
  'Severe bleeding',
  'Sepsis concern',
  'Anaphylaxis concern',
  'Altered mental status',
  'Severe pain',
  'Pregnancy emergency',
  'Self-harm risk',
];

const EMPTY_DRAFT: ReceptionIntakeDraft = {
  arrivalType: 'walk-in',
  chiefComplaint: '',
  estimatedAge: '',
  dob: '',
  sex: '',
  consciousnessStatus: 'unknown',
  breathingStatus: 'unknown',
  visibleDistress: 'unknown',
  painLevel: '',
  redFlagSymptoms: [],
  allergiesKnown: 'unknown',
  allergies: '',
  medicationsKnown: 'unknown',
  medications: '',
  firstName: '',
  lastName: '',
  contactCallback: '',
  insuranceStatus: 'unknown',
  consentStatus: 'unknown',
  documentStatus: 'unknown',
  notes: '',
};

function patientDisplayName(patient: Patient): string {
  return [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() || patient.name || patient.mrn;
}

function isReceptionQueuePatient(patient: Patient): boolean {
  return [
    PatientState.Arrival,
    PatientState.Registration,
    PatientState.Triage,
    PatientState.Waiting,
  ].includes(patient.state);
}

function isHighRiskPatient(patient: Patient): boolean {
  return (
    patient.priority === Priority.P1 ||
    patient.priority === Priority.P2 ||
    patient.flags.includes(PatientFlag.HighRisk) ||
    patient.flags.includes(PatientFlag.DeteriorationRisk) ||
    patient.flags.includes(PatientFlag.SepsisAlert) ||
    patient.flags.includes(PatientFlag.StrokeCode)
  );
}

function waitMinutes(patient: Patient): number {
  const time = new Date(patient.arrival?.arrivalTimestamp || patient.arrivalTime || '').getTime();
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.round((Date.now() - time) / 60000));
}

function queueStatus(patient: Patient): string {
  if (patient.registrationStatus === 'provisional') return 'Temporary identity';
  if (patient.registrationStatus === 'in-progress') return 'Incomplete registration';
  if (patient.state === PatientState.Triage || patient.triagePending) return 'Waiting for triage';
  if (patient.state === PatientState.Waiting) return 'Waiting room';
  return patient.state;
}

function nextStep(patient: Patient): string {
  if (isHighRiskPatient(patient)) return 'Priority triage review';
  if (patient.registrationStatus === 'provisional') return 'Demographics follow-up';
  if (patient.state === PatientState.Triage || patient.triagePending) return 'Triage nurse';
  return 'Standard queue';
}

function ownerRole(patient: Patient): string {
  if (isHighRiskPatient(patient)) return 'Triage nurse / charge nurse';
  if (patient.registrationStatus === 'provisional' || patient.state === PatientState.Registration) {
    return 'Registration clerk';
  }
  return 'Triage nurse';
}

function isReceptionCriticalAlert(alert: Alert): boolean {
  return (
    alert.severity === 'Critical' &&
    !alert.dismissed &&
    !alert.acknowledged &&
    ['reception-critical-intake', 'reception-escalation-workflow', 'three-minute-timer-engine'].includes(
      String(alert.source || ''),
    )
  );
}

function formatTimer(alert: Alert, now: number): string {
  const startedAt = String(alert.metadata?.responseStartedAt || alert.createdAt || '');
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started)) return '3:00';
  const remaining = Math.max(0, 180 - Math.floor((now - started) / 1000));
  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function isTimerBreached(alert: Alert, now: number): boolean {
  const startedAt = String(alert.metadata?.responseStartedAt || alert.createdAt || '');
  const started = new Date(startedAt).getTime();
  return Number.isFinite(started) && now - started >= 180000;
}

function Stepper({ draft, aiAssist, result }: { draft: ReceptionIntakeDraft; aiAssist: ReceptionAiIntakeAssist | null; result: ReceptionRouteResult | null }) {
  const criticalStarted = Boolean(result?.criticalAlertId || result?.responseTimerId);
  const steps = [
    { id: 'arrival', label: 'Arrival Type', complete: Boolean(draft.arrivalType) },
    {
      id: 'critical',
      label: 'Minimum Critical Info',
      complete: validateReceptionMinimumCriticalData(draft).length === 0 || detectReceptionRedFlags(draft).length > 0,
    },
    { id: 'ai', label: 'AI Intake Assist', complete: Boolean(aiAssist) },
    { id: 'route', label: 'Create Patient & Route', complete: Boolean(result) },
  ];

  return (
    <ol className="reception-command-stepper" aria-label="Reception intake progress">
      {steps.map((step) => (
        <li
          key={step.id}
          className={`reception-command-stepper__item${step.complete ? ' reception-command-stepper__item--complete' : ''}`}
        >
          <span>{step.label}</span>
        </li>
      ))}
      {criticalStarted ? (
        <li className="reception-command-stepper__item reception-command-stepper__item--critical">
          <span>3-minute response started</span>
        </li>
      ) : null}
    </ol>
  );
}

export default function ReceptionWorkspace() {
  const { user } = useUser();
  const { profileNavigate } = useProfileNavigate();
  const [searchParams] = useSearchParams();
  const emergencyRole = useEmergencyRolePermissions();
  const patients = useEmergencyStore((state) => state.patients);
  const alerts = useEmergencyStore((state) => state.alerts);
  const capacity = useEmergencyStore((state) => state.capacity);
  const selectedPatientId = useEmergencyStore((state) => state.selectedPatientId);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const [draft, setDraft] = useState<ReceptionIntakeDraft>(EMPTY_DRAFT);
  const [aiAssist, setAiAssist] = useState<ReceptionAiIntakeAssist | null>(null);
  const [result, setResult] = useState<ReceptionRouteResult | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const currentUserName =
    emergencyRole.canonicalProfile?.preferredName ||
    emergencyRole.canonicalProfile?.fullName ||
    user?.name ||
    user?.email ||
    'Reception Desk';
  const hospitalSite =
    emergencyRole.canonicalProfile?.hospitalSite ||
    (capacity as { siteName?: string }).siteName ||
    'Virtual City Hospital';
  const shiftStatus = emergencyRole.canonicalProfile?.shiftStatus || 'On shift';
  const canCreatePatient = emergencyRole.canMutate(EMERGENCY_ACTIONS.createPatient);
  const clinicalOverride = assertReceptionMutationAllowed(emergencyRole.role, EMERGENCY_ACTIONS.triage);
  const missingCriticalFields = validateReceptionMinimumCriticalData(draft);
  const liveRedFlags = detectReceptionRedFlags(draft);
  const criticalNeeded = useMemo(
    () =>
      aiAssist?.urgencySuggestion === 'critical' ||
      runReceptionAiIntakeAssist(draft).urgencySuggestion === 'critical',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aiAssist?.urgencySuggestion, draft.chiefComplaint, draft.redFlagSymptoms, draft.consciousnessStatus, draft.breathingStatus, draft.visibleDistress, draft.painLevel, draft.arrivalType],
  );

  const receptionQueue = useMemo(
    () =>
      patients
        .filter(isReceptionQueuePatient)
        .sort((left, right) => {
          const riskDelta = Number(isHighRiskPatient(right)) - Number(isHighRiskPatient(left));
          if (riskDelta) return riskDelta;
          return waitMinutes(right) - waitMinutes(left);
        }),
    [patients],
  );
  const criticalAlerts = useMemo(() => alerts.filter(isReceptionCriticalAlert), [alerts]);
  const selectedPatient = useMemo(
    () => (selectedPatientId ? patients.find((patient) => patient.id === selectedPatientId) || null : null),
    [patients, selectedPatientId],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const patientId = searchParams.get('patientId') || searchParams.get('patient') || searchParams.get('arrived');
    if (patientId) selectPatient(patientId);
  }, [searchParams, selectPatient]);

  const updateDraft = (patch: Partial<ReceptionIntakeDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setError('');
    setStatus('');
    setResult(null);
  };

  const toggleRedFlag = (flag: string) => {
    const next = new Set(draft.redFlagSymptoms || []);
    if (next.has(flag)) next.delete(flag);
    else next.add(flag);
    updateDraft({ redFlagSymptoms: [...next] });
  };

  const saveDraft = () => {
    const storedDraft = { ...draft, id: draft.id || `draft-${Date.now()}`, savedAt: new Date().toISOString() };
    window.sessionStorage?.setItem('caredroid:reception-draft', JSON.stringify(storedDraft));
    setDraft(storedDraft);
    setStatus('Draft saved. Critical routing remains available.');
  };

  const runAiAssist = (options: { aiUnavailable?: boolean } = {}) => {
    const nextAssist = runReceptionAiIntakeAssist(draft, options);
    setAiAssist(nextAssist);
    setStatus(options.aiUnavailable ? 'Manual fallback prepared.' : 'AI Intake Assist completed.');
    setError('');
    return nextAssist;
  };

  const createAndRoute = async (options: { aiUnavailable?: boolean } = {}) => {
    if (!canCreatePatient) {
      setError('Reception profile is not allowed to create patients.');
      return;
    }

    setSubmitting(true);
    setError('');
    setStatus('');
    try {
      const routeResult = await createPatientAndRouteFromReception(draft, {
        actorName: currentUserName,
        actorStaffId: emergencyRole.canonicalProfile?.employeeId || emergencyRole.canonicalProfile?.id,
        aiUnavailable: options.aiUnavailable,
      });
      setAiAssist(routeResult.aiAssist);
      setResult(routeResult);
      setStatus(
        routeResult.criticalAlertId
          ? 'Critical alert created. 3-minute response timer started.'
          : 'Patient created and routed to queue.',
      );
      selectPatient(routeResult.patientId);
      window.sessionStorage?.removeItem('caredroid:reception-draft');
    } catch (routeError) {
      setError(routeError instanceof Error ? routeError.message : 'Unable to create and route patient.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForNextPatient = () => {
    setDraft({ ...EMPTY_DRAFT });
    setAiAssist(null);
    setResult(null);
    setError('');
    setStatus('');
  };

  return (
    <section className="reception-command" aria-labelledby="reception-command-title">
      <header className="reception-command-header">
        <div>
          <p className="reception-command-header__eyebrow">Reception Command Desk</p>
          <h1 id="reception-command-title">Emergency Reception</h1>
          <div className="reception-command-header__meta">
            <span>{currentUserName}</span>
            <span className="reception-command-badge">{emergencyRole.roleLabel || 'Registration Clerk'}</span>
            <span>{shiftStatus}</span>
            <span>{hospitalSite}</span>
          </div>
        </div>
        <div className="reception-command-header__metrics" aria-label="Reception queue metrics">
          <div>
            <strong>{receptionQueue.length}</strong>
            <span>Active queue</span>
          </div>
          <div className={criticalAlerts.length ? 'reception-command-metric--critical' : ''}>
            <strong>{criticalAlerts.length}</strong>
            <span>Critical arrivals</span>
          </div>
          <HelpTrigger variant="button" label="Guide" className="reception-command-help" />
        </div>
      </header>

      <Stepper draft={draft} aiAssist={aiAssist} result={result} />

      {!clinicalOverride.allowed ? (
        <div className="reception-command-guardrail" role="note">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>{clinicalOverride.reason}</span>
        </div>
      ) : null}

      {missingCriticalFields.length ? (
        <div className="reception-command-missing" role="status">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>Missing critical info: {missingCriticalFields.join(', ')}.</span>
        </div>
      ) : null}

      <main className="reception-command-grid">
        <section className="reception-command-panel reception-command-panel--span" aria-labelledby="arrival-type-title">
          <div className="reception-command-panel__header">
            <h2 id="arrival-type-title">Fast Arrival Capture</h2>
          </div>
          <div className="reception-command-segmented" role="radiogroup" aria-label="Arrival type">
            {ARRIVAL_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                role="radio"
                aria-checked={draft.arrivalType === type.id}
                className={draft.arrivalType === type.id ? 'is-active' : ''}
                onClick={() => updateDraft({ arrivalType: type.id })}
              >
                {type.label}
              </button>
            ))}
          </div>
        </section>

        <section className="reception-command-panel reception-command-panel--intake" aria-labelledby="critical-intake-title">
          <div className="reception-command-panel__header">
            <h2 id="critical-intake-title">Minimum Life-Critical Intake</h2>
            {liveRedFlags.length ? <span className="reception-command-chip reception-command-chip--critical">{liveRedFlags.length} red flags</span> : null}
          </div>

          <div className="reception-command-form-grid">
            <label className="reception-command-field reception-command-field--wide">
              <span>Chief complaint</span>
              <textarea
                value={draft.chiefComplaint}
                onChange={(event) => updateDraft({ chiefComplaint: event.target.value })}
                placeholder="Primary symptom or observable emergency"
                rows={3}
              />
            </label>
            <label className="reception-command-field">
              <span>Estimated age</span>
              <input
                value={draft.estimatedAge}
                onChange={(event) => updateDraft({ estimatedAge: event.target.value })}
                inputMode="numeric"
                placeholder="If DOB unavailable"
              />
            </label>
            <label className="reception-command-field">
              <span>DOB</span>
              <input type="date" value={draft.dob} onChange={(event) => updateDraft({ dob: event.target.value })} />
            </label>
            <label className="reception-command-field">
              <span>Sex if known</span>
              <select value={draft.sex} onChange={(event) => updateDraft({ sex: event.target.value as ReceptionIntakeDraft['sex'] })}>
                <option value="">Unknown</option>
                <option value="F">Female</option>
                <option value="M">Male</option>
                <option value="Intersex">Intersex</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="reception-command-field">
              <span>Consciousness</span>
              <select
                value={draft.consciousnessStatus}
                onChange={(event) => updateDraft({ consciousnessStatus: event.target.value as ReceptionIntakeDraft['consciousnessStatus'] })}
              >
                <option value="unknown">Unknown</option>
                <option value="alert">Alert</option>
                <option value="confused">Confused</option>
                <option value="drowsy">Drowsy</option>
                <option value="unresponsive">Unresponsive</option>
              </select>
            </label>
            <label className="reception-command-field">
              <span>Breathing</span>
              <select
                value={draft.breathingStatus}
                onChange={(event) => updateDraft({ breathingStatus: event.target.value as ReceptionIntakeDraft['breathingStatus'] })}
              >
                <option value="unknown">Unknown</option>
                <option value="normal">Normal</option>
                <option value="short-of-breath">Short of breath</option>
                <option value="labored">Labored</option>
                <option value="not-breathing">Not breathing</option>
              </select>
            </label>
            <label className="reception-command-field">
              <span>Visible distress</span>
              <select
                value={draft.visibleDistress}
                onChange={(event) => updateDraft({ visibleDistress: event.target.value as ReceptionIntakeDraft['visibleDistress'] })}
              >
                <option value="unknown">Unknown</option>
                <option value="none">None visible</option>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
            </label>
            <label className="reception-command-field">
              <span>Pain level</span>
              <input
                type="number"
                min="0"
                max="10"
                value={draft.painLevel}
                onChange={(event) => updateDraft({ painLevel: event.target.value })}
                placeholder="0-10"
              />
            </label>
            <label className="reception-command-field">
              <span>Contact / callback</span>
              <input
                value={draft.contactCallback}
                onChange={(event) => updateDraft({ contactCallback: event.target.value })}
                placeholder="If available"
              />
            </label>
          </div>

          <fieldset className="reception-command-red-flags">
            <legend>Red flag symptoms</legend>
            <div>
              {RED_FLAG_OPTIONS.map((flag) => (
                <label key={flag} className="reception-command-check">
                  <input
                    type="checkbox"
                    checked={(draft.redFlagSymptoms || []).includes(flag)}
                    onChange={() => toggleRedFlag(flag)}
                  />
                  <span>{flag}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="reception-command-form-grid reception-command-form-grid--admin">
            <label className="reception-command-field">
              <span>Allergies if known</span>
              <select value={draft.allergiesKnown} onChange={(event) => updateDraft({ allergiesKnown: event.target.value as ReceptionIntakeDraft['allergiesKnown'] })}>
                <option value="unknown">Unknown</option>
                <option value="yes">Known</option>
                <option value="no">None reported</option>
              </select>
            </label>
            <label className="reception-command-field">
              <span>Allergy details</span>
              <input value={draft.allergies} onChange={(event) => updateDraft({ allergies: event.target.value })} placeholder="If available" />
            </label>
            <label className="reception-command-field">
              <span>Medications if known</span>
              <select value={draft.medicationsKnown} onChange={(event) => updateDraft({ medicationsKnown: event.target.value as ReceptionIntakeDraft['medicationsKnown'] })}>
                <option value="unknown">Unknown</option>
                <option value="yes">Known</option>
                <option value="no">None reported</option>
              </select>
            </label>
            <label className="reception-command-field">
              <span>Medication details</span>
              <input value={draft.medications} onChange={(event) => updateDraft({ medications: event.target.value })} placeholder="If available" />
            </label>
            <label className="reception-command-field">
              <span>First name</span>
              <input value={draft.firstName} onChange={(event) => updateDraft({ firstName: event.target.value })} placeholder="Unknown allowed" />
            </label>
            <label className="reception-command-field">
              <span>Last name</span>
              <input value={draft.lastName} onChange={(event) => updateDraft({ lastName: event.target.value })} placeholder="Unknown allowed" />
            </label>
            <label className="reception-command-field">
              <span>Insurance</span>
              <select value={draft.insuranceStatus} onChange={(event) => updateDraft({ insuranceStatus: event.target.value as ReceptionIntakeDraft['insuranceStatus'] })}>
                <option value="unknown">Unknown</option>
                <option value="captured">Captured</option>
                <option value="missing">Missing</option>
                <option value="deferred">Deferred</option>
              </select>
            </label>
            <label className="reception-command-field">
              <span>Consent</span>
              <select value={draft.consentStatus} onChange={(event) => updateDraft({ consentStatus: event.target.value as ReceptionIntakeDraft['consentStatus'] })}>
                <option value="unknown">Unknown</option>
                <option value="captured">Captured</option>
                <option value="unable">Unable</option>
                <option value="deferred">Deferred</option>
              </select>
            </label>
            <label className="reception-command-field">
              <span>Documents</span>
              <select value={draft.documentStatus} onChange={(event) => updateDraft({ documentStatus: event.target.value as ReceptionIntakeDraft['documentStatus'] })}>
                <option value="unknown">Unknown</option>
                <option value="captured">Captured</option>
                <option value="missing">Missing</option>
                <option value="deferred">Deferred</option>
              </select>
            </label>
            <label className="reception-command-field reception-command-field--wide">
              <span>Reception notes</span>
              <textarea
                value={draft.notes || ''}
                onChange={(event) => updateDraft({ notes: event.target.value })}
                placeholder="Additional observations for handoff (optional)"
                rows={2}
              />
            </label>
          </div>
        </section>

        <aside className="reception-command-panel reception-command-panel--assist" aria-labelledby="ai-assist-title">
          <div className="reception-command-panel__header">
            <h2 id="ai-assist-title">AI Intake Assist</h2>
            <span className="reception-command-chip">Decision support</span>
          </div>
          {aiAssist ? (
            <div className="reception-command-ai">
              <div className={`reception-command-ai__urgency reception-command-ai__urgency--${aiAssist.urgencySuggestion}`}>
                <strong>{aiAssist.urgencySuggestion}</strong>
                <span>Confidence {Math.round(aiAssist.confidence * 100)}%</span>
              </div>
              <dl>
                <div>
                  <dt>Missing fields</dt>
                  <dd>{aiAssist.missingCriticalFields.length ? aiAssist.missingCriticalFields.join(', ') : 'None'}</dd>
                </div>
                <div>
                  <dt>Red flags</dt>
                  <dd>{aiAssist.redFlags.length ? aiAssist.redFlags.join(', ') : 'None detected'}</dd>
                </div>
                <div>
                  <dt>Next action</dt>
                  <dd>{aiAssist.nextAction}</dd>
                </div>
              </dl>
              <ul className="reception-command-ai__questions">
                {aiAssist.suggestedQuestions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
              <p className="reception-command-ai__notice">{aiAssist.safetyNotice}</p>
            </div>
          ) : (
            <div className="reception-command-ai-empty">
              <div className="reception-command-empty">
                <Sparkles size={20} aria-hidden="true" />
                <span>Run assist after critical fields are started.</span>
              </div>
              <button
                type="button"
                className="reception-command-ai-fallback"
                onClick={() => runAiAssist({ aiUnavailable: true })}
                title="Use when AI is unavailable — activates manual intake fallback"
              >
                Manual fallback (AI unavailable)
              </button>
            </div>
          )}
        </aside>

        <section className="reception-command-panel" aria-labelledby="queue-title">
          <div className="reception-command-panel__header">
            <h2 id="queue-title">Reception Queue</h2>
            <span className="reception-command-chip">{receptionQueue.length} active</span>
          </div>
          <div className="reception-command-queue">
            {receptionQueue.length ? (
              receptionQueue.slice(0, 8).map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  className={`reception-command-queue-row${isHighRiskPatient(patient) ? ' reception-command-queue-row--risk' : ''}`}
                  onClick={() => selectPatient(patient.id)}
                >
                  <span>
                    <strong>{patientDisplayName(patient)}</strong>
                    <small>{patient.chiefComplaint || patient.complaint || 'Complaint pending'}</small>
                  </span>
                  <span>{queueStatus(patient)}</span>
                  <span>{nextStep(patient)}</span>
                  <span>{ownerRole(patient)}</span>
                  <span>{waitMinutes(patient)}m</span>
                </button>
              ))
            ) : (
              <div className="reception-command-empty">No active reception queue patients.</div>
            )}
          </div>
          {selectedPatient ? (
            <div className="reception-command-selected" role="status">
              <strong>{patientDisplayName(selectedPatient)}</strong>
              <span>{selectedPatient.mrn} · {selectedPatient.state} · {selectedPatient.chiefComplaint}</span>
              <button
                type="button"
                onClick={() => profileNavigate(`${CANONICAL_ROUTES.emergencyPatients}?patientId=${encodeURIComponent(selectedPatient.id)}`)}
              >
                <FolderOpen size={16} aria-hidden="true" />
                Open Patient Profile
              </button>
            </div>
          ) : null}
        </section>

        <section className="reception-command-panel" aria-labelledby="alerts-title">
          <div className="reception-command-panel__header">
            <h2 id="alerts-title">Critical Reception Alerts</h2>
            <span className={criticalAlerts.length ? 'reception-command-chip reception-command-chip--critical' : 'reception-command-chip'}>
              {criticalAlerts.length} active
            </span>
          </div>
          <div className="reception-command-alerts">
            {criticalAlerts.length ? (
              criticalAlerts.slice(0, 5).map((alert) => (
                <article
                  key={alert.id}
                  className={`reception-command-alert${isTimerBreached(alert, now) ? ' reception-command-alert--breached' : ''}`}
                >
                  <div>
                    <strong>{alert.title}</strong>
                    <p>{alert.message}</p>
                    <small>Notify triage nurse / charge nurse / emergency physician</small>
                  </div>
                  <div className="reception-command-alert__timer" aria-label="3-minute response timer">
                    <Timer size={18} aria-hidden="true" />
                    <span>{formatTimer(alert, now)}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="reception-command-empty">
                <Bell size={20} aria-hidden="true" />
                <span>No critical reception alerts.</span>
              </div>
            )}
          </div>
        </section>
      </main>

      {status || error ? (
        <div className={`reception-command-toast ${error ? 'reception-command-toast--error' : ''}`} role={error ? 'alert' : 'status'}>
          {error || status}
        </div>
      ) : null}

      <div className="reception-command-actionbar" aria-label="Reception actions">
        <button type="button" className="reception-command-actionbar__secondary" onClick={saveDraft}>
          <Save size={17} aria-hidden="true" />
          Save Draft
        </button>
        <button type="button" className="reception-command-actionbar__secondary" onClick={() => runAiAssist()}>
          <Sparkles size={17} aria-hidden="true" />
          Run AI Intake Assist
        </button>
        {criticalNeeded ? (
          <button
            type="button"
            className="reception-command-actionbar__critical"
            disabled={submitting || !canCreatePatient}
            onClick={() => void createAndRoute()}
          >
            <Timer size={17} aria-hidden="true" />
            Start 3-Minute Response
          </button>
        ) : null}
        <button
          type="button"
          className="reception-command-actionbar__primary"
          disabled={submitting || !canCreatePatient}
          onClick={() => void createAndRoute()}
        >
          <UserPlus size={17} aria-hidden="true" />
          {submitting ? 'Routing...' : 'Create Patient & Route'}
        </button>
        {result ? (
          <>
            <button type="button" className="reception-command-actionbar__secondary" onClick={() => profileNavigate(result.profileRoute)}>
              <FolderOpen size={17} aria-hidden="true" />
              Open Patient Profile
            </button>
            <button type="button" className="reception-command-actionbar__secondary" onClick={resetForNextPatient}>
              <FileText size={17} aria-hidden="true" />
              Next Patient
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}

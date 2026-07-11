import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Save, Sparkles, Timer, UserPlus } from 'lucide-react';
import {
  detectReceptionRedFlags,
  resolveUnifiedIntakePrimaryAction,
  runReceptionAiIntakeAssist,
  UNIFIED_INTAKE_PHASE,
  validateReceptionMinimumCriticalData,
  type ReceptionAiIntakeAssist,
  type ReceptionArrivalType,
  type ReceptionIntakeDraft,
  type ReceptionRouteResult,
  type UnifiedIntakePhase,
} from '../../services/receptionIntakeOrchestrator';

const ARRIVAL_TYPES: Array<{ id: ReceptionArrivalType; label: string }> = [
  { id: 'walk-in', label: 'Walk-in' },
  { id: 'ambulance-arrival', label: 'Ambulance arrival' },
  { id: 'ems-prearrival', label: 'EMS pre-arrival' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'referral', label: 'Referral' },
  { id: 'staff-created-emergency', label: 'Staff-created emergency' },
];

const QUICK_COMPLAINT_CHIPS = [
  'Chest pain',
  'Shortness of breath',
  'Abdominal pain',
  'Injury / trauma',
  'Stroke symptoms',
  'Feeling unwell',
] as const;

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

export type UnifiedIntakePanelProps = {
  draft: ReceptionIntakeDraft;
  onDraftChange: (patch: Partial<ReceptionIntakeDraft>) => void;
  aiAssist: ReceptionAiIntakeAssist | null;
  onAiAssistChange: (assist: ReceptionAiIntakeAssist | null) => void;
  result: ReceptionRouteResult | null;
  canCreatePatient: boolean;
  submitting: boolean;
  onSaveDraft: () => void;
  onRoute: (options?: { aiUnavailable?: boolean }) => void | Promise<void>;
  onReset?: () => void;
  showQueueRail?: boolean;
  queueRail?: ReactNode;
  alertsRail?: ReactNode;
};

export default function UnifiedIntakePanel({
  draft,
  onDraftChange,
  aiAssist,
  onAiAssistChange,
  result,
  canCreatePatient,
  submitting,
  onSaveDraft,
  onRoute,
  onReset,
  showQueueRail = true,
  queueRail,
  alertsRail,
}: UnifiedIntakePanelProps) {
  const [phase, setPhase] = useState<UnifiedIntakePhase>(UNIFIED_INTAKE_PHASE.critical);
  const [adminExpanded, setAdminExpanded] = useState(false);

  const missingCriticalFields = useMemo(() => validateReceptionMinimumCriticalData(draft), [draft]);
  const liveRedFlags = useMemo(() => detectReceptionRedFlags(draft), [draft]);
  const primaryAction = useMemo(
    () => resolveUnifiedIntakePrimaryAction(draft, aiAssist),
    [draft, aiAssist],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!String(draft.chiefComplaint || '').trim() && !liveRedFlags.length) {
        onAiAssistChange(null);
        return;
      }
      onAiAssistChange(runReceptionAiIntakeAssist(draft));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [draft, liveRedFlags.length, onAiAssistChange]);

  const toggleRedFlag = (flag: string) => {
    const next = new Set(draft.redFlagSymptoms || []);
    if (next.has(flag)) next.delete(flag);
    else next.add(flag);
    onDraftChange({ redFlagSymptoms: [...next] });
  };

  const showAdminPanel = phase === UNIFIED_INTAKE_PHASE.admin || adminExpanded;

  return (
    <>
      <nav className="unified-intake-phase-nav" aria-label="Intake collection phases">
        <button
          type="button"
          className={`unified-intake-phase-nav__btn${phase === UNIFIED_INTAKE_PHASE.critical ? ' is-active' : ''}`}
          {...(phase === UNIFIED_INTAKE_PHASE.critical ? { 'aria-current': 'step' as const } : {})}
          onClick={() => setPhase(UNIFIED_INTAKE_PHASE.critical)}
        >
          1. Life-critical
          {missingCriticalFields.length ? (
            <span className="unified-intake-phase-nav__badge">{missingCriticalFields.length}</span>
          ) : null}
        </button>
        <button
          type="button"
          className={`unified-intake-phase-nav__btn${phase === UNIFIED_INTAKE_PHASE.admin ? ' is-active' : ''}`}
          {...(phase === UNIFIED_INTAKE_PHASE.admin ? { 'aria-current': 'step' as const } : {})}
          onClick={() => {
            setPhase(UNIFIED_INTAKE_PHASE.admin);
            setAdminExpanded(true);
          }}
        >
          2. Registration details
        </button>
      </nav>

      {missingCriticalFields.length && phase === UNIFIED_INTAKE_PHASE.critical ? (
        <div className="reception-command-missing" role="status">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>Missing critical info: {missingCriticalFields.join(', ')}.</span>
        </div>
      ) : null}

      <div className="reception-command-grid unified-intake-grid">
        <section className="reception-command-panel reception-command-panel--span" aria-labelledby="arrival-type-title">
          <div className="reception-command-panel__header">
            <h2 id="arrival-type-title">Arrival type</h2>
          </div>
          <div className="reception-command-segmented" role="radiogroup" aria-label="Arrival type">
            {ARRIVAL_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                role="radio"
                {...((draft.arrivalType === type.id) ? { 'aria-checked': 'true' as const } : { 'aria-checked': 'false' as const })}
                className={draft.arrivalType === type.id ? 'is-active' : ''}
                onClick={() => onDraftChange({ arrivalType: type.id })}
              >
                {type.label}
              </button>
            ))}
          </div>
        </section>

        <section
          className="reception-command-panel reception-command-panel--intake"
          aria-labelledby="critical-intake-title"
        >
          <div className="reception-command-panel__header">
            <h2 id="critical-intake-title">Life-critical intake</h2>
            {liveRedFlags.length ? (
              <span className="reception-command-chip reception-command-chip--critical">
                {liveRedFlags.length} red flags
              </span>
            ) : null}
          </div>

          <div className="reception-quick-complaints" role="group" aria-label="Common complaints">
            {QUICK_COMPLAINT_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                className={`reception-quick-complaints__chip${
                  String(draft.chiefComplaint || '').toLowerCase().includes(chip.toLowerCase()) ? ' is-active' : ''
                }`}
                onClick={() => {
                  const current = String(draft.chiefComplaint || '').trim();
                  onDraftChange({
                    chiefComplaint: current && !current.toLowerCase().includes(chip.toLowerCase())
                      ? `${current}; ${chip}`
                      : chip,
                  });
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="reception-command-form-grid">
            <label className="reception-command-field reception-command-field--wide">
              <span>Chief complaint</span>
              <textarea
                value={draft.chiefComplaint}
                onChange={(event) => onDraftChange({ chiefComplaint: event.target.value })}
                placeholder="Primary symptom or observable emergency"
                rows={3}
              />
            </label>
            <label className="reception-command-field">
              <span>Estimated age</span>
              <input
                value={draft.estimatedAge}
                onChange={(event) => onDraftChange({ estimatedAge: event.target.value })}
                inputMode="numeric"
                placeholder="If DOB unavailable"
              />
            </label>
            <label className="reception-command-field">
              <span>DOB</span>
              <input type="date" value={draft.dob} onChange={(event) => onDraftChange({ dob: event.target.value })} />
            </label>
            <label className="reception-command-field">
              <span>Sex if known</span>
              <select
                value={draft.sex}
                onChange={(event) => onDraftChange({ sex: event.target.value as ReceptionIntakeDraft['sex'] })}
              >
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
                onChange={(event) =>
                  onDraftChange({ consciousnessStatus: event.target.value as ReceptionIntakeDraft['consciousnessStatus'] })
                }
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
                onChange={(event) =>
                  onDraftChange({ breathingStatus: event.target.value as ReceptionIntakeDraft['breathingStatus'] })
                }
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
                onChange={(event) =>
                  onDraftChange({ visibleDistress: event.target.value as ReceptionIntakeDraft['visibleDistress'] })
                }
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
                onChange={(event) => onDraftChange({ painLevel: event.target.value })}
                placeholder="0-10"
              />
            </label>
            <label className="reception-command-field">
              <span>Contact / callback</span>
              <input
                value={draft.contactCallback}
                onChange={(event) => onDraftChange({ contactCallback: event.target.value })}
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

          {!showAdminPanel ? (
            <button
              type="button"
              className="unified-intake-admin-toggle"
              onClick={() => {
                setAdminExpanded(true);
                setPhase(UNIFIED_INTAKE_PHASE.admin);
              }}
            >
              <ChevronDown size={16} aria-hidden="true" />
              Add registration details (optional before routing)
            </button>
          ) : (
            <>
              <button
                type="button"
                className="unified-intake-admin-toggle unified-intake-admin-toggle--expanded"
                onClick={() => {
                  setAdminExpanded(false);
                  setPhase(UNIFIED_INTAKE_PHASE.critical);
                }}
              >
                <ChevronUp size={16} aria-hidden="true" />
                Hide registration details
              </button>
              <div className="reception-command-form-grid reception-command-form-grid--admin">
                <label className="reception-command-field">
                  <span>Allergies if known</span>
                  <select
                    value={draft.allergiesKnown}
                    onChange={(event) =>
                      onDraftChange({ allergiesKnown: event.target.value as ReceptionIntakeDraft['allergiesKnown'] })
                    }
                  >
                    <option value="unknown">Unknown</option>
                    <option value="yes">Known</option>
                    <option value="no">None reported</option>
                  </select>
                </label>
                <label className="reception-command-field">
                  <span>Allergy details</span>
                  <input
                    value={draft.allergies}
                    onChange={(event) => onDraftChange({ allergies: event.target.value })}
                    placeholder="If available"
                  />
                </label>
                <label className="reception-command-field">
                  <span>Medications if known</span>
                  <select
                    value={draft.medicationsKnown}
                    onChange={(event) =>
                      onDraftChange({ medicationsKnown: event.target.value as ReceptionIntakeDraft['medicationsKnown'] })
                    }
                  >
                    <option value="unknown">Unknown</option>
                    <option value="yes">Known</option>
                    <option value="no">None reported</option>
                  </select>
                </label>
                <label className="reception-command-field">
                  <span>Medication details</span>
                  <input
                    value={draft.medications}
                    onChange={(event) => onDraftChange({ medications: event.target.value })}
                    placeholder="If available"
                  />
                </label>
                <label className="reception-command-field">
                  <span>First name</span>
                  <input
                    value={draft.firstName}
                    onChange={(event) => onDraftChange({ firstName: event.target.value })}
                    placeholder="Unknown allowed"
                  />
                </label>
                <label className="reception-command-field">
                  <span>Last name</span>
                  <input
                    value={draft.lastName}
                    onChange={(event) => onDraftChange({ lastName: event.target.value })}
                    placeholder="Unknown allowed"
                  />
                </label>
                <label className="reception-command-field">
                  <span>Insurance</span>
                  <select
                    value={draft.insuranceStatus}
                    onChange={(event) =>
                      onDraftChange({ insuranceStatus: event.target.value as ReceptionIntakeDraft['insuranceStatus'] })
                    }
                  >
                    <option value="unknown">Unknown</option>
                    <option value="captured">Captured</option>
                    <option value="missing">Missing</option>
                    <option value="deferred">Deferred</option>
                  </select>
                </label>
                <label className="reception-command-field">
                  <span>Consent</span>
                  <select
                    value={draft.consentStatus}
                    onChange={(event) =>
                      onDraftChange({ consentStatus: event.target.value as ReceptionIntakeDraft['consentStatus'] })
                    }
                  >
                    <option value="unknown">Unknown</option>
                    <option value="captured">Captured</option>
                    <option value="unable">Unable</option>
                    <option value="deferred">Deferred</option>
                  </select>
                </label>
                <label className="reception-command-field">
                  <span>Documents</span>
                  <select
                    value={draft.documentStatus}
                    onChange={(event) =>
                      onDraftChange({ documentStatus: event.target.value as ReceptionIntakeDraft['documentStatus'] })
                    }
                  >
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
                    onChange={(event) => onDraftChange({ notes: event.target.value })}
                    placeholder="Additional observations for handoff (optional)"
                    rows={2}
                  />
                </label>
              </div>
            </>
          )}
        </section>

        <aside className="reception-command-panel reception-command-panel--assist" aria-labelledby="ai-assist-title">
          <div className="reception-command-panel__header">
            <h2 id="ai-assist-title">AI Intake Assist</h2>
            <span className="reception-command-chip">Auto-updated</span>
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
              {aiAssist.manualFallback ? (
                <button
                  type="button"
                  className="reception-command-ai-fallback"
                  onClick={() => onAiAssistChange(runReceptionAiIntakeAssist(draft, { aiUnavailable: true }))}
                >
                  Manual fallback active
                </button>
              ) : null}
            </div>
          ) : (
            <div className="reception-command-ai-empty">
              <div className="reception-command-empty">
                <Sparkles size={20} aria-hidden="true" />
                <span>Assist updates as you capture chief complaint and critical fields.</span>
              </div>
            </div>
          )}
        </aside>

        {showQueueRail ? queueRail : null}
        {showQueueRail ? alertsRail : null}
      </div>

      <div className="reception-command-actionbar unified-intake-actionbar" aria-label="Unified intake actions">
        <button type="button" className="reception-command-actionbar__secondary" onClick={onSaveDraft}>
          <Save size={17} aria-hidden="true" />
          Save draft
        </button>
        <button
          type="button"
          className={
            primaryAction.tone === 'critical'
              ? 'reception-command-actionbar__critical'
              : 'reception-command-actionbar__primary'
          }
          disabled={submitting || !canCreatePatient}
          onClick={() => void onRoute()}
        >
          {primaryAction.startsThreeMinuteResponse ? (
            <Timer size={17} aria-hidden="true" />
          ) : (
            <UserPlus size={17} aria-hidden="true" />
          )}
          {submitting ? 'Routing...' : primaryAction.label}
        </button>
        {result && onReset ? (
          <button type="button" className="reception-command-actionbar__secondary" onClick={onReset}>
            Next patient
          </button>
        ) : null}
      </div>
    </>
  );
}
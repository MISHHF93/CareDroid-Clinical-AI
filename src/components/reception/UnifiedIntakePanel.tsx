import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, ClipboardCheck, Save, Sparkles, Timer, UserPlus } from 'lucide-react';
import {
  detectReceptionRedFlags,
  listReceptionRecommendedSafetyFields,
  resolveReceptionRouteValidationMode,
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
import {
  AiTruthLabel,
  receptionAiIntakeAssistTruthLabel,
  recognizeComplaintTruthLabel,
} from '../ai/AiTruthLabel';
import { RECEPTION_COPY } from './receptionCopy';
import ReceptionDocumentCapture from './ReceptionDocumentCapture';
import { recognizeComplaint } from '../../data/clinicalTerminology/recognizeComplaint';
import { recordTerminologyGap } from '../../services/terminologyGapQueue';
import './UnifiedIntakePanel.css';

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
  /** Actor label for OCR audit trail. */
  actorName?: string;
  /** Optional patient id when completing ID for an existing provisional chart. */
  patientId?: string;
  /** Duplicate-match warnings from board search (non-blocking). */
  duplicateWarnings?: string[];
  /** Override assist panel title (e.g. "Desk assist" instead of AI). */
  assistTitle?: string;
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
  actorName = 'Reception',
  patientId,
  duplicateWarnings = [],
  assistTitle,
}: UnifiedIntakePanelProps) {
  const [phase, setPhase] = useState<UnifiedIntakePhase>(UNIFIED_INTAKE_PHASE.critical);
  const [adminExpanded, setAdminExpanded] = useState(false);

  const routeMode = useMemo(
    () => resolveReceptionRouteValidationMode(draft, { urgency: aiAssist?.urgencySuggestion }),
    [aiAssist?.urgencySuggestion, draft],
  );
  const missingCriticalFields = useMemo(
    () => validateReceptionMinimumCriticalData(draft, routeMode),
    [draft, routeMode],
  );
  const recommendedSafety = useMemo(() => listReceptionRecommendedSafetyFields(draft), [draft]);
  const liveRedFlags = useMemo(() => detectReceptionRedFlags(draft), [draft]);
  const complaintRecognition = useMemo(
    () => recognizeComplaint(draft.chiefComplaint),
    [draft.chiefComplaint],
  );
  const primaryAction = useMemo(
    () => resolveUnifiedIntakePrimaryAction(draft, aiAssist),
    [draft, aiAssist],
  );

  const outstandingActions = useMemo(() => {
    const items: string[] = [];
    if (!String(draft.chiefComplaint || '').trim() && routeMode === 'standard') {
      items.push('Capture chief complaint');
    }
    if (missingCriticalFields.length) {
      items.push(
        routeMode === 'standard'
          ? `Complete required field${missingCriticalFields.length === 1 ? '' : 's'}: ${missingCriticalFields.join(', ')}`
          : `Still needed for ${routeMode} route: ${missingCriticalFields.join(', ')}`,
      );
    } else if (routeMode !== 'standard' && recommendedSafety.length) {
      items.push(`Optional before nurse (recommended): ${recommendedSafety.join(', ')}`);
    }
    if (liveRedFlags.length) {
      items.push(`Confirm red flag${liveRedFlags.length === 1 ? '' : 's'}: ${liveRedFlags.join(', ')}`);
    }
    return items;
  }, [draft.chiefComplaint, missingCriticalFields, liveRedFlags, recommendedSafety, routeMode]);

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

  useEffect(() => {
    if (complaintRecognition.confidenceTier !== 'NO_MATCH' && complaintRecognition.confidenceTier !== 'LOW_CONFIDENCE') {
      return;
    }
    if (!complaintRecognition.normalizedText) return;
    // Debounced so we don't write a gap event on every keystroke — only once
    // typing settles on text that stayed unrecognized. Raw text is preserved as
    // typed; never replaced or discarded (see terminologyGapQueue.ts).
    const timer = window.setTimeout(() => {
      recordTerminologyGap(complaintRecognition);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [complaintRecognition]);

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
          <span>Missing for {routeMode} route: {missingCriticalFields.join(', ')}.</span>
        </div>
      ) : null}

      {routeMode !== 'standard' && !missingCriticalFields.length ? (
        <div className="reception-command-missing reception-command-missing--rapid" role="status">
          <span>
            Rapid route allowed ({routeMode}). Safety fields are recommended but will not block send
            {recommendedSafety.length ? `: ${recommendedSafety.join(', ')}` : ''}.
          </span>
        </div>
      ) : null}

      {duplicateWarnings.length ? (
        <div className="reception-command-missing reception-command-missing--duplicate" role="status">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>
            Possible existing record{duplicateWarnings.length === 1 ? '' : 's'}:{' '}
            {duplicateWarnings.join(' · ')}. Confirm identity before creating a new patient.
          </span>
        </div>
      ) : null}

      <div className="reception-command-grid unified-intake-grid">
        <section className="reception-command-panel reception-command-panel--span" aria-labelledby="document-scan-title">
          <div className="reception-command-panel__header">
            <h2 id="document-scan-title">Identity document capture</h2>
          </div>
          <ReceptionDocumentCapture
            draft={draft}
            onDraftChange={(patch) => onDraftChange(patch)}
            actorName={actorName}
            patientId={patientId}
            disabled={submitting || Boolean(result)}
          />
        </section>

        <section className="reception-command-panel reception-command-panel--span" aria-labelledby="arrival-type-title">
          <div className="reception-command-panel__header">
            <h2 id="arrival-type-title">Arrival type</h2>
          </div>
          <div className="reception-command-segmented" role="radiogroup" aria-label="Arrival type">
            {ARRIVAL_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                // eslint-disable-next-line jsx-a11y/role-has-required-aria-props -- aria-checked is always set via the conditional spread below, the linter can't trace it statically
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
              {draft.chiefComplaint?.trim() ? (
                <p
                  className={`reception-complaint-recognition reception-complaint-recognition--${complaintRecognition.confidenceTier.toLowerCase()}`}
                  role="status"
                >
                  {complaintRecognition.confidenceTier === 'NO_MATCH' ? (
                    <>Not recognized as a standard complaint — original text will be used and flagged for triage review.</>
                  ) : (
                    <>
                      Suggested: <strong>{complaintRecognition.canonicalName}</strong>
                      {complaintRecognition.confidenceTier !== 'HIGH_CONFIDENCE'
                        ? ` (${complaintRecognition.confidenceTier === 'MEDIUM_CONFIDENCE' ? 'medium' : 'low'} confidence — confirm before routing)`
                        : ''}
                      {' · original wording is kept as entered '}
                      <AiTruthLabel {...recognizeComplaintTruthLabel()} compact />
                    </>
                  )}
                </p>
              ) : null}
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
              <span>Preferred language</span>
              <input
                value={draft.preferredLanguage || ''}
                onChange={(event) => onDraftChange({ preferredLanguage: event.target.value })}
                placeholder="English, Spanish, ASL…"
                list="reception-language-suggestions-critical"
                autoComplete="off"
              />
              <datalist id="reception-language-suggestions-critical">
                <option value="English" />
                <option value="Spanish" />
                <option value="French" />
                <option value="Mandarin" />
                <option value="Arabic" />
                <option value="ASL" />
                <option value="Other" />
              </datalist>
            </label>
            <label className="reception-command-field">
              <span>Interpreter needed</span>
              <select
                value={draft.interpreterNeeded || 'unknown'}
                onChange={(event) =>
                  onDraftChange({
                    interpreterNeeded: event.target.value as ReceptionIntakeDraft['interpreterNeeded'],
                  })
                }
              >
                <option value="unknown">Unknown</option>
                <option value="yes">Yes — flag for care team</option>
                <option value="no">No</option>
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
                onChange={(event) => {
                  // HEAL-238: min/max are advisory on a native number input
                  // and don't block keyboard entry -- a sign-flip typo
                  // (e.g. "-8" for severe 8/10 pain) reached
                  // receptionIntakeOrchestrator.ts's single-sided
                  // `Number(draft.painLevel) >= 8`/`>= 7` checks unclamped,
                  // failing both, so "Severe pain" was never flagged and
                  // the chest-pain P1 escalation never fired -- silently
                  // routing a patient reporting severe pain as P2/P3.
                  const raw = event.target.value;
                  if (raw === '') {
                    onDraftChange({ painLevel: '' });
                    return;
                  }
                  const parsed = Number(raw);
                  if (Number.isNaN(parsed)) return;
                  onDraftChange({ painLevel: String(Math.min(10, Math.max(0, parsed))) });
                }}
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
                <div className="reception-command-field reception-command-field--wide">
                  <button
                    type="button"
                    className="reception-command-actionbar__secondary"
                    onClick={() =>
                      onDraftChange({
                        insuranceStatus: 'deferred',
                        consentStatus: 'deferred',
                        documentStatus:
                          draft.documentStatus === 'captured' ? draft.documentStatus : 'deferred',
                      })
                    }
                  >
                    Defer insurance & consent (do not block nurse)
                  </button>
                </div>
                <label className="reception-command-field">
                  <span>Preferred language</span>
                  <input
                    value={draft.preferredLanguage || ''}
                    onChange={(event) => onDraftChange({ preferredLanguage: event.target.value })}
                    placeholder="e.g. English, Spanish, ASL"
                    list="reception-language-suggestions"
                  />
                  <datalist id="reception-language-suggestions">
                    <option value="English" />
                    <option value="Spanish" />
                    <option value="French" />
                    <option value="Mandarin" />
                    <option value="Arabic" />
                    <option value="ASL" />
                    <option value="Other" />
                  </datalist>
                </label>
                <label className="reception-command-field">
                  <span>Interpreter needed</span>
                  <select
                    value={draft.interpreterNeeded || 'unknown'}
                    onChange={(event) =>
                      onDraftChange({
                        interpreterNeeded: event.target.value as ReceptionIntakeDraft['interpreterNeeded'],
                      })
                    }
                  >
                    <option value="unknown">Unknown</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <label className="reception-command-field">
                  <span>Next of kin / support person</span>
                  <input
                    value={draft.nextOfKinName || ''}
                    onChange={(event) => onDraftChange({ nextOfKinName: event.target.value })}
                    placeholder="Name"
                  />
                </label>
                <label className="reception-command-field">
                  <span>Next of kin phone</span>
                  <input
                    value={draft.nextOfKinPhone || ''}
                    onChange={(event) => onDraftChange({ nextOfKinPhone: event.target.value })}
                    placeholder="Callback number"
                    inputMode="tel"
                  />
                </label>
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
                    title="Use Check Identity for OCR scan of ID/health card; then create & route"
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
            <h2 id="ai-assist-title">{assistTitle || RECEPTION_COPY.copilot?.title || 'Desk assist'}</h2>
            <span className="reception-command-chip">{RECEPTION_COPY.copilot.autoUpdated}</span>
          </div>

          <div className="reception-command-copilot-outstanding" role="status">
            <div className="reception-command-copilot-outstanding__header">
              <ClipboardCheck size={16} aria-hidden="true" />
              <span>{RECEPTION_COPY.copilot.outstandingTitle}</span>
            </div>
            {outstandingActions.length ? (
              <ul>
                {outstandingActions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>{RECEPTION_COPY.copilot.outstandingNone}</p>
            )}
          </div>

          {aiAssist ? (
            <div className="reception-command-ai">
              <AiTruthLabel {...receptionAiIntakeAssistTruthLabel()} compact />
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
                <span>{RECEPTION_COPY.copilot.idle}</span>
              </div>
            </div>
          )}
        </aside>

        {showQueueRail ? queueRail : null}
        {showQueueRail ? alertsRail : null}
      </div>

      <div className="reception-command-actionbar unified-intake-actionbar" aria-label="Unified intake actions">
        <button
          type="button"
          className="reception-command-actionbar__secondary unified-intake-actionbar__secondary"
          data-testid="reception-save-draft"
          onClick={onSaveDraft}
        >
          <Save size={17} aria-hidden="true" />
          Save draft
        </button>
        <button
          type="button"
          className="reception-command-actionbar__secondary unified-intake-actionbar__secondary"
          data-testid="reception-defer-admin"
          title="Mark insurance and consent as deferred — does not block create & route"
          disabled={submitting || Boolean(result)}
          onClick={() => {
            onDraftChange({
              insuranceStatus: 'deferred',
              consentStatus: 'deferred',
              documentStatus:
                draft.documentStatus === 'captured' ? draft.documentStatus : 'deferred',
            });
          }}
        >
          Defer admin
        </button>
        <button
          type="button"
          className={
            primaryAction.tone === 'critical'
              ? 'reception-command-actionbar__critical unified-intake-actionbar__primary'
              : 'reception-command-actionbar__primary unified-intake-actionbar__primary'
          }
          data-testid="reception-create-route"
          disabled={submitting || !canCreatePatient}
          title={
            !canCreatePatient
              ? 'Your profile cannot create patients. Switch to a registration-enabled role.'
              : submitting
                ? 'Creating patient and routing to triage…'
                : primaryAction.label
          }
          aria-disabled={(submitting || !canCreatePatient) ? 'true' : 'false'}
          onClick={() => {
            if (submitting || !canCreatePatient) return;
            void onRoute();
          }}
        >
          {primaryAction.startsThreeMinuteResponse ? (
            <Timer size={17} aria-hidden="true" />
          ) : (
            <UserPlus size={17} aria-hidden="true" />
          )}
          {submitting ? 'Creating & routing…' : primaryAction.label}
        </button>
        {result && onReset ? (
          <button
            type="button"
            className="reception-command-actionbar__secondary unified-intake-actionbar__secondary"
            data-testid="reception-next-patient"
            onClick={onReset}
          >
            Next patient
          </button>
        ) : null}
      </div>
    </>
  );
}
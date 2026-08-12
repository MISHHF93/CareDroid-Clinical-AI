import { useEffect, useMemo, useRef, useState } from 'react';
import { MEDICAL_THEME } from '../config/medicalTheme.constants';
import type { FormEvent, KeyboardEvent } from 'react';
import './QuickIntake.css';
import { Patient, PatientFlag, PatientState, Priority, Vitals } from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';
import { EMERGENCY_ACTIONS } from '../config/emergencyRolePermissions';
import { getCentralControlPolicy } from '../config/centralControl.config';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import { createSmartIntakePatient } from '../services/emergencyOsApi';
import { ERROR_RECOVERY_COPY, formatApiRecoveryMessage } from '../config/errorRecoveryModel';
import { routeComplaint } from '../engine/complaintRouter';
import { registerNewArrival } from '../services/arrivalControlLayer';
import { completeIntakeHandoff } from '../services/receptionHandoff';
import { confirmCareDroidAction } from '../services/careDroidInteractionFeedback';
import useProfileNavigate from '../hooks/useProfileNavigate';
import { notifyWorkflowHandoffComplete } from '../services/workflowNavigationFeedback';
import { buildPatientArrivalRecord, syncPatientFromArrival } from '../services/patientArrivalModel';
import {
  buildHighRiskComplaintPatch,
  detectHighRiskComplaintFlags,
} from '../services/highRiskComplaintFlags';
import { recognizeComplaint } from '../data/clinicalTerminology/recognizeComplaint';
import { recordTerminologyGap } from '../services/terminologyGapQueue';

type QuickIntakeProps = {
  onClose: () => void;
  onAdded: (patient: Patient) => void;
};

// This modal is only ever mounted as the "Central Node Intake" widget for clinical staff away
// from the registration desk (pages/emergency/index.tsx's whiteboard mission button/Header's
// "New Patient" action) -- it previously supported a second "reception" variant with its own
// copy/duplicate-detection UI/submit path, but no caller ever passed that variant (confirmed by
// grepping every <QuickIntake usage in the repo), making that entire branch dead code. Removed
// during the patient-onboarding-consolidation audit; Reception's own full intake now lives in
// UnifiedIntakePanel.tsx via receptionIntakeOrchestrator.ts.
const QUICK_INTAKE_COPY = {
  title: 'Central Node Intake',
  submit: 'Send to Central Node',
  submitting: 'Sending...',
  priorityPrefix: 'Central CTAS',
  showCentralBanner: true,
  closeLabel: 'Close quick intake',
} as const;

type ComplaintCategory =
  | 'Chest pain'
  | 'Breathing'
  | 'Neuro/Stroke'
  | 'Sepsis'
  | 'Trauma'
  | 'OB/Gyn'
  | 'Pediatric'
  | 'Other';
type Sex = Patient['sex'];

const CATEGORY_BUTTONS: Array<{ label: ComplaintCategory; icon: string }> = [
  { label: 'Chest pain', icon: '🫀' },
  { label: 'Breathing', icon: '🫁' },
  { label: 'Neuro/Stroke', icon: '🧠' },
  { label: 'Sepsis', icon: '🩸' },
  { label: 'Trauma', icon: '🤕' },
  { label: 'OB/Gyn', icon: '🤰' },
  { label: 'Pediatric', icon: '🧒' },
  { label: 'Other', icon: '📋' },
];

const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.P1]: '#EF4444',
  [Priority.P2]: '#F97316',
  [Priority.P3]: '#F59E0B',
  [Priority.P4]: '#10B981',
  [Priority.P5]: MEDICAL_THEME.inkMuted,
};

const SUGGESTED_PROTOCOLS: Partial<Record<ComplaintCategory, string[]>> = {
  'Chest pain': ['HEART Score', 'ACS Protocol'],
  Sepsis: ['qSOFA', 'Sepsis Bundle'],
  'Neuro/Stroke': ['NIHSS', 'Stroke Protocol'],
};

const PRIORITIES = Object.values(Priority);

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createMrn(): string {
  return `ED-${Math.floor(100000 + Math.random() * 900000)}`;
}

function numeric(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function calculateAge(dob: string): number {
  const dobTime = new Date(dob).getTime();
  if (!Number.isFinite(dobTime)) return 0;
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return Math.max(0, age);
}

function isMinorComplaint(category: ComplaintCategory, complaint: string): boolean {
  const text = complaint.toLowerCase();
  return (
    category === 'Other' ||
    text.includes('rash') ||
    text.includes('ankle') ||
    text.includes('sprain') ||
    text.includes('suture') ||
    text.includes('refill') ||
    text.includes('form') ||
    text.includes('minor')
  );
}

function computePriority(
  category: ComplaintCategory | null,
  complaint: string,
  vitals: Partial<Vitals>,
): Priority {
  const hr = vitals.hr;
  const sbp = vitals.sbp;
  const spo2 = vitals.spo2;

  if ((spo2 !== undefined && spo2 < 90) || (hr !== undefined && (hr < 40 || hr > 150))) {
    return Priority.P1;
  }

  if (
    (category === 'Chest pain' && hr !== undefined && hr > 100) ||
    (sbp !== undefined && sbp < 90)
  ) {
    return Priority.P2;
  }

  if (category && isMinorComplaint(category, complaint)) {
    return complaint.toLowerCase().includes('refill') || complaint.toLowerCase().includes('form')
      ? Priority.P5
      : Priority.P4;
  }

  return Priority.P3;
}

function buildVitals(form: {
  hr: string;
  sbp: string;
  spo2: string;
  temp: string;
}): Partial<Vitals> {
  return {
    hr: numeric(form.hr),
    sbp: numeric(form.sbp),
    spo2: numeric(form.spo2),
    temp: numeric(form.temp),
  };
}

export default function QuickIntake({ onClose, onAdded }: QuickIntakeProps) {
  const copy = QUICK_INTAKE_COPY;
  const { profileNavigate } = useProfileNavigate();
  const emergencyRole = useEmergencyRolePermissions();
  const addPatient = useEmergencyStore((state) => state.addPatient);
  const centralControlSettings = useEmergencyStore(
    (state) => state.emergencySettings.centralControl,
  );
  const complaintInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [complaintCategory, setComplaintCategory] = useState<ComplaintCategory | null>(null);
  const [complaint, setComplaint] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<Sex>('Other');
  const [mrn] = useState(createMrn);
  const [vitalsForm, setVitalsForm] = useState({ hr: '', sbp: '', spo2: '', temp: '' });
  const [priorityOverride, setPriorityOverride] = useState<Priority | null>(null);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [protocolSuggestions, setProtocolSuggestions] = useState<string[]>([]);
  const createPatientPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.createPatient);
  const canCreatePatient = createPatientPresentation.enabled;

  const centralControl = useMemo(
    () =>
      getCentralControlPolicy({
        role: emergencyRole.role,
        can: emergencyRole.can,
        settings: centralControlSettings,
      }),
    [centralControlSettings, emergencyRole],
  );
  const canSubmitCentralInput =
    (createPatientPresentation.visible && canCreatePatient) ||
    (centralControl.enabled && !emergencyRole.readOnly);

  const age = useMemo(() => calculateAge(dob), [dob]);
  const vitals = useMemo(() => buildVitals(vitalsForm), [vitalsForm]);
  const computedPriority = useMemo(
    () => computePriority(complaintCategory, complaint, vitals),
    [complaint, complaintCategory, vitals],
  );
  const priority = priorityOverride || computedPriority;
  const protocols = protocolSuggestions.length
    ? protocolSuggestions
    : complaintCategory
      ? SUGGESTED_PROTOCOLS[complaintCategory] || []
      : [];
  const detectedComplaintFlags = useMemo(
    () =>
      detectHighRiskComplaintFlags({
        complaint,
        complaintCategory,
      }),
    [complaint, complaintCategory],
  );
  const complaintRecognition = useMemo(() => recognizeComplaint(complaint), [complaint]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const route = routeComplaint(complaint);
      setProtocolSuggestions(route ? route.scoreIds : []);
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [complaint]);

  useEffect(() => {
    // High-risk flags already surface their own recognition + category UI below —
    // only record a terminology gap when no flag fired, so a genuinely unrecognized
    // or general (non-flag) complaint is still captured for staff review rather than
    // silently dropped, without duplicating the high-risk box's own signal.
    if (detectedComplaintFlags.length) return;
    if (complaintRecognition.confidenceTier !== 'NO_MATCH' && complaintRecognition.confidenceTier !== 'LOW_CONFIDENCE') {
      return;
    }
    if (!complaintRecognition.normalizedText) return;
    const timeout = window.setTimeout(() => {
      recordTerminologyGap(complaintRecognition);
    }, 1200);
    return () => window.clearTimeout(timeout);
  }, [complaintRecognition, detectedComplaintFlags.length]);

  const chooseCategory = (category: ComplaintCategory) => {
    setComplaintCategory(category);
    window.setTimeout(() => complaintInputRef.current?.focus(), 0);
  };

  const closeWithConfirm = async () => {
    const hasDraft = Boolean(
      complaintCategory ||
      complaint.trim() ||
      firstName.trim() ||
      lastName.trim() ||
      dob ||
      vitalsForm.hr ||
      vitalsForm.sbp ||
      vitalsForm.spo2 ||
      vitalsForm.temp,
    );
    if (
      !hasDraft ||
      (await confirmCareDroidAction({
        title: 'Discard intake?',
        message: 'Unsaved intake details will be lost.',
        confirmLabel: 'Discard',
        tone: 'danger',
      }))
    ) {
      onClose();
    }
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (submitting) return;
    if (!canSubmitCentralInput) {
      setSubmitError(`${emergencyRole.roleLabel} cannot submit central intake inputs.`);
      return;
    }

    const now = new Date().toISOString();
    const completeVitals: Vitals[] = Object.values(vitals).some((value) => value !== undefined)
      ? [{ ...vitals, recordedAt: now, recordedBy: 'intake' }]
      : [];
    const safetyFlags: import('../types/emergency').QuickSafetyFlag[] =
      priority === Priority.P1 || priority === Priority.P2 ? [PatientFlag.HighRisk as import('../types/emergency').QuickSafetyFlag] : [];
    const complaintPatch = buildHighRiskComplaintPatch(
      {
        chiefComplaint: complaint.trim() || complaintCategory || 'Unspecified complaint',
        complaintCategory: complaintCategory || 'Other',
        state: PatientState.Triage,
        triagePending: undefined,
      },
    );
    const complaintText = complaint.trim() || complaintCategory || 'Unspecified complaint';
    const intakeState = PatientState.Triage;
    const arrival = buildPatientArrivalRecord({
      arrivalMode: 'walk-in',
      arrivalTimestamp: now,
      chiefComplaint: complaintText,
      state: intakeState,
      triageAcuity: {
        code: priority,
        status: 'confirmed',
        assignedAt: now,
      },
      queueDestination: complaintPatch.queueDestination || 'triage-queue',
      triagePending: true,
      waitingRoomStatus: 'waiting-for-triage',
    });

    const patient = syncPatientFromArrival(
      {
        id: createId('patient'),
        mrn,
        firstName: firstName.trim() || 'Unknown',
        lastName: lastName.trim() || 'Patient',
        dob: dob || new Date().toISOString().slice(0, 10),
        age,
        sex,
        state: intakeState,
        triageTime: now,
        complaintCategory: complaintCategory || 'Other',
        vitals: completeVitals,
        flags: safetyFlags,
        quickSafetyFlags: safetyFlags,
        ...complaintPatch,
        notes: [
          {
            id: createId('central-input-note'),
            type: 'System',
            body: `${centralControl.inputProfile.label} submitted unified intake input to ${centralControl.label}. Escalation path: ${centralControl.inputProfile.escalationPath}.`,
            authorId: emergencyRole.role,
            createdAt: now,
            metadata: {
              centralNodeId: centralControl.nodeId,
              inputMode: centralControl.userInputMode,
              inputRole: emergencyRole.role,
              escalationPath: centralControl.inputProfile.escalationPath,
            },
          },
        ],
        timeline: [],
      },
      arrival,
    ) as Patient;

    setSubmitting(true);
    setSubmitError('');

    try {
      const response = await createSmartIntakePatient(patient, { confirmDuplicateOverride: true });
      const persistedPatient = response?.data?.patient || patient;
      addPatient(persistedPatient);
      registerNewArrival(
        {
          patients: useEmergencyStore.getState().patients,
          updatePatient: useEmergencyStore.getState().updatePatient,
          dispatchWebSocketEvent: useEmergencyStore.getState().dispatchWebSocketEvent,
        },
        persistedPatient.id,
        { source: 'quick-intake' },
      );
      const handoff = completeIntakeHandoff(useEmergencyStore.getState(), {
        patientId: persistedPatient.id,
        source: 'quick-intake',
        actorName: emergencyRole.roleLabel || 'Intake',
      });
      notifyWorkflowHandoffComplete({
        patientName: `${persistedPatient.firstName} ${persistedPatient.lastName}`.trim(),
        nextRoute: handoff.nextRoute,
        onNavigate: profileNavigate,
      });
      onAdded(persistedPatient);
      profileNavigate(handoff.nextRoute);
      onClose();
    } catch (error: any) {
      addPatient(patient);
      registerNewArrival(
        {
          patients: useEmergencyStore.getState().patients,
          updatePatient: useEmergencyStore.getState().updatePatient,
          dispatchWebSocketEvent: useEmergencyStore.getState().dispatchWebSocketEvent,
        },
        patient.id,
        { source: 'quick-intake' },
      );
      const handoff = completeIntakeHandoff(useEmergencyStore.getState(), {
        patientId: patient.id,
        source: 'quick-intake',
        actorName: emergencyRole.roleLabel || 'Intake',
      });
      notifyWorkflowHandoffComplete({
        patientName: `${patient.firstName} ${patient.lastName}`.trim(),
        nextRoute: handoff.nextRoute,
        onNavigate: profileNavigate,
      });
      onAdded(patient);
      profileNavigate(handoff.nextRoute);
      onClose();
      setSubmitError(
        `${formatApiRecoveryMessage(error, 'intake form')} ${ERROR_RECOVERY_COPY.handoffPending}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeWithConfirm();
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div
      className="quick-intake-overlay u-modal-scrim-260"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-intake-title"

    >
      <style>
        {`
          @media (max-width: 768px) {
            .quick-intake-overlay {
              padding: 0 !important;
              align-items: stretch !important;
              justify-content: stretch !important;
            }

            .quick-intake-modal {
              width: 100% !important;
              height: var(--app-viewport-height, 100dvh) !important;
              max-height: none !important;
              border-radius: 0 !important;
            }

            .quick-intake-grid {
              grid-template-columns: 1fr !important;
            }

            .quick-intake-category-grid {
              grid-template-columns: 1fr !important;
            }

            .quick-intake-category-button {
              width: 100% !important;
              min-height: 56px !important;
              height: 56px !important;
            }

            .quick-intake-modal button,
            .quick-intake-modal input,
            .quick-intake-modal select,
            .quick-intake-modal textarea {
              min-height: 48px !important;
              -webkit-tap-highlight-color: transparent;
            }

            .quick-intake-footer {
              align-items: stretch !important;
              flex-direction: column !important;
            }

            .quick-intake-submit {
              width: 100% !important;
              height: 56px !important;
            }
          }

          @media (max-width: 390px) {
            .quick-intake-modal [style*='grid-template-columns: repeat(3, 1fr)'],
            .quick-intake-modal [style*='grid-template-columns: repeat(4, 1fr)'],
            .quick-intake-modal [style*='grid-template-columns: 1fr 1fr'] {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- a <form> is a real interactive element; onKeyDown handles Escape-to-cancel/Enter-to-submit shortcuts */}
      <form
        className="quick-intake-modal qi-modal"
        onSubmit={submit}
        onKeyDown={handleKeyDown}
      >
        <header
          className="u-panel-header-row"
        >
          <div>
            <h2 id="quick-intake-title" className="u-title-18-750">
              {copy.title}
            </h2>
            <div className="qi-subtitle">
              {`Unified input and escalation for ${centralControl.inputProfile.label}`}
            </div>
          </div>
          <button
            type="button"
            onClick={closeWithConfirm}
            aria-label={copy.closeLabel}
            className="u-icon-btn-32"
          >
            X
          </button>
        </header>

        <div className="quick-intake-grid qi-grid">
          <section className="u-flex-col-gap-12">
            {copy.showCentralBanner ? (
            <div aria-label="Central node input mode" className="qi-central-banner">
              {centralControl.label} receives this as {centralControl.inputProfile.label}.
              Escalation path: {centralControl.inputProfile.escalationPath.replace(/-/g, ' ')}.
            </div>
            ) : null}
            <div
              className="quick-intake-category-grid u-grid-2"

            >
              {CATEGORY_BUTTONS.map((category) => {
                const active = complaintCategory === category.label;
                return (
                  <button
                    className="quick-intake-category-button"
                    key={category.label}
                    type="button"
                    onClick={() => chooseCategory(category.label)}
                    style={{
                      height: 56,
                      border: active ? '1px solid #0ea5e9' : '1px solid #e0f2fe',
                      borderRadius: 12,
                      background: active ? 'rgba(14, 165, 233, 0.12)' : MEDICAL_THEME.surfaceCard,
                      color: 'var(--medical-ink, #111827)',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 700,
                      textAlign: 'left',
                      padding: '0 12px',
                    }}
                  >
                    <span aria-hidden="true" className="qi-category-icon">
                      {category.icon}
                    </span>
                    {category.label}
                  </button>
                );
              })}
            </div>

            <label className="u-flex-col-gap-6">
              <span className="qi-label-md">Complaint</span>
              <textarea
                ref={complaintInputRef}
                value={complaint}
                onChange={(event) => setComplaint(event.target.value)}
                placeholder="Describe complaint..."
                rows={2}
                className="qi-textarea"
              />
              {complaint.trim() && !detectedComplaintFlags.length ? (
                <p
                  className={`qi-complaint-recognition qi-complaint-recognition--${complaintRecognition.confidenceTier.toLowerCase()}`}
                  role="status"
                >
                  {complaintRecognition.confidenceTier === 'NO_MATCH' ? (
                    <>Not recognized as a standard complaint — original text kept, flagged for triage review.</>
                  ) : (
                    <>
                      Recognized: <strong>{complaintRecognition.canonicalName}</strong>
                      {complaintRecognition.confidenceTier !== 'HIGH_CONFIDENCE'
                        ? ` (${complaintRecognition.confidenceTier === 'MEDIUM_CONFIDENCE' ? 'medium' : 'low'} confidence)`
                        : ''}
                    </>
                  )}
                </p>
              ) : null}
            </label>

            {protocols.length ? (
              <div aria-label="Suggested protocols" className="qi-protocols-box">
                <div className="qi-label-sm-mb8">
                  Suggested protocols
                </div>
                <div className="u-flex-wrap u-gap-8">
                  {protocols.map((protocol) => (
                    <span
                      key={protocol}
                      className="qi-protocol-badge"
                    >
                      {protocol}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {detectedComplaintFlags.length ? (
              <div className="qi-highrisk-box">
                <div className="qi-label-critical-mb8">
                  High-risk complaint flags — staff alert only
                </div>
                <div className="u-flex-wrap u-gap-8">
                  {detectedComplaintFlags.map((flag) => (
                    <span
                      key={flag.id}
                      className="qi-flag-badge"
                    >
                      {flag.label}
                    </span>
                  ))}
                </div>
                <p className="qi-highrisk-note">
                  Sends to rapid review queue. Does not assign triage level.
                </p>
              </div>
            ) : null}
          </section>

          <section className="u-flex-col u-gap-10">
            <div className="u-grid-2">
              <label className="u-flex-col-gap-5">
                <span className="qi-label-sm">First</span>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  disabled={submitting}
                  className="qi-input"
                />
              </label>
              <label className="u-flex-col-gap-5">
                <span className="qi-label-sm">Last</span>
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  disabled={submitting}
                  className="qi-input"
                />
              </label>
            </div>

            <label className="u-flex-col-gap-5">
              <span className="qi-label-sm">
                DOB {dob ? `(Age ${age})` : ''}
              </span>
              <input
                type="date"
                value={dob}
                onChange={(event) => setDob(event.target.value)}
                disabled={submitting}
                className="qi-input"
              />
            </label>

            <div>
              <div className="qi-label-sm-mb5">
                Sex
              </div>
              <div className="qi-grid-3">
                {(['M', 'F', 'Other'] as Sex[]).map((candidate) => (
                  <button
                    key={candidate}
                    type="button"
                    onClick={() => setSex(candidate)}
                    style={{
                      border: sex === candidate ? '1px solid #0ea5e9' : '1px solid #e0f2fe',
                      borderRadius: 10,
                      background: sex === candidate ? 'rgba(14, 165, 233, 0.12)' : MEDICAL_THEME.surfaceCard,
                      color: 'var(--medical-ink, #111827)',
                      padding: '8px 6px',
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    {candidate}
                  </button>
                ))}
              </div>
            </div>

            <label className="u-flex-col-gap-5">
              <span className="qi-label-sm">MRN</span>
              <input
                value={mrn}
                readOnly
                aria-readonly="true"
                className="qi-input qi-input-readonly"
              />
            </label>

            <div>
              <div className="qi-label-sm-mb5">
                Vitals
              </div>
              <div className="qi-grid-4">
                {(
                  [
                    ['hr', 'HR'],
                    ['sbp', 'SBP'],
                    ['spo2', 'SpO2'],
                    ['temp', 'Temp'],
                  ] as const
                ).map(([key, label]) => (
                  <input
                    key={key}
                    aria-label={label}
                    value={vitalsForm[key]}
                    onChange={(event) =>
                      setVitalsForm((previous) => ({ ...previous, [key]: event.target.value }))
                    }
                    inputMode="decimal"
                    placeholder={label}
                    className="qi-input qi-input-compact"
                  />
                ))}
              </div>
            </div>
          </section>
        </div>

        <footer
          className="quick-intake-footer qi-footer"
        >
          <div className="qi-priority-wrap">
            <button
              type="button"
              onClick={() => setShowPriorityPicker((visible) => !visible)}
              disabled={!canSubmitCentralInput}
              aria-label={`CTAS ${priority} priority badge`}
              style={{
                border: `1px solid ${PRIORITY_COLORS[priority]}`,
                borderRadius: 999,
                background: `${PRIORITY_COLORS[priority]}22`,
                color: PRIORITY_COLORS[priority],
                padding: '9px 13px',
                cursor: canSubmitCentralInput ? 'pointer' : 'not-allowed',
                opacity: canSubmitCentralInput ? 1 : 0.55,
                fontWeight: 800,
              }}
            >
              {copy.priorityPrefix} {priority}
              {priorityOverride ? ' override' : ''}
            </button>
            {showPriorityPicker ? (
              <div className="qi-priority-dropdown">
                {PRIORITIES.map((candidate) => (
                  <button
                    key={candidate}
                    type="button"
                    onClick={() => {
                      setPriorityOverride(candidate);
                      setShowPriorityPicker(false);
                    }}
                    style={{
                      border: `1px solid ${PRIORITY_COLORS[candidate]}`,
                      borderRadius: 999,
                      background:
                        priority === candidate ? `${PRIORITY_COLORS[candidate]}33` : 'transparent',
                      color: PRIORITY_COLORS[candidate],
                      padding: '6px 8px',
                      cursor: 'pointer',
                      fontWeight: 800,
                    }}
                  >
                    {candidate}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {submitError ? (
            <div role="alert" className="qi-submit-error">
              {submitError}
            </div>
          ) : null}

          <button
            className="quick-intake-submit"
            type="submit"
            disabled={submitting || !canSubmitCentralInput}
            style={{
              height: 48,
              border: 0,
              borderRadius: 12,
              background: submitting || !canSubmitCentralInput ? '#1E3A8A' : MEDICAL_THEME.accent,
              color: 'var(--medical-ink, #111827)',
              cursor: submitting ? 'progress' : canSubmitCentralInput ? 'pointer' : 'not-allowed',
              opacity: canSubmitCentralInput ? 1 : 0.65,
              fontWeight: 800,
              padding: '0 18px',
              minWidth: 170,
            }}
          >
            {submitting ? copy.submitting : copy.submit}
          </button>
        </footer>
      </form>
    </div>
  );
}

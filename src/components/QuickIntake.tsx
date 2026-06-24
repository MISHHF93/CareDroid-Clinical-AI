import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, KeyboardEvent } from 'react';
import { Patient, PatientFlag, PatientState, Priority, Vitals } from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';
import { EMERGENCY_ACTIONS } from '../config/emergencyRolePermissions';
import { getCentralControlPolicy } from '../config/centralControl.config';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import { createSmartIntakePatient } from '../services/emergencyOsApi';
import { ERROR_RECOVERY_COPY, formatApiRecoveryMessage } from '../config/errorRecoveryModel';
import { routeComplaint } from '../engine/complaintRouter';
import {
  DUPLICATE_HIGH_CONFIDENCE_THRESHOLD,
  findDuplicateCandidates,
  type PatientDuplicateCandidate,
} from '../utils/patientDuplicateDetection';
import DuplicateReviewAlert from './verification/DuplicateReviewAlert';
import { registerNewArrival } from '../services/arrivalControlLayer';
import { buildPatientArrivalRecord, syncPatientFromArrival } from '../services/patientArrivalModel';
import {
  buildHighRiskComplaintPatch,
  detectHighRiskComplaintFlags,
} from '../services/highRiskComplaintFlags';

type QuickIntakeVariant = 'whiteboard' | 'reception';

type QuickIntakeProps = {
  onClose: () => void;
  onAdded: (patient: Patient) => void;
  onOpenVerification?: (patientId?: string) => void;
  onProvisionalIntake?: () => void;
  variant?: QuickIntakeVariant;
};

const QUICK_INTAKE_COPY = {
  whiteboard: {
    title: 'Central Node Intake',
    submit: 'Send to Central Node',
    submitting: 'Sending...',
    priorityPrefix: 'Central CTAS',
    showCentralBanner: true,
    closeLabel: 'Close quick intake',
  },
  reception: {
    title: 'Register with symptoms',
    submit: 'Register & send to nurse',
    submitting: 'Registering...',
    priorityPrefix: 'Urgency',
    showCentralBanner: false,
    closeLabel: 'Close registration form',
  },
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
  [Priority.P5]: '#6B7280',
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

export default function QuickIntake({
  onClose,
  onAdded,
  onOpenVerification,
  onProvisionalIntake,
  variant = 'whiteboard',
}: QuickIntakeProps) {
  const copy = QUICK_INTAKE_COPY[variant];
  const emergencyRole = useEmergencyRolePermissions();
  const addPatient = useEmergencyStore((state) => state.addPatient);
  const patients = useEmergencyStore((state) => state.patients);
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
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);
  const [protocolSuggestions, setProtocolSuggestions] = useState<string[]>([]);
  const createPatientPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.createPatient);
  const canCreatePatient = createPatientPresentation.enabled;

  const duplicateCandidates = useMemo<PatientDuplicateCandidate[]>(() => {
    if (variant !== 'reception') return [];
    if (!firstName.trim() && !lastName.trim() && !dob) return [];
    return findDuplicateCandidates(patients, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth: dob || undefined,
      sex,
      mrn,
    });
  }, [variant, patients, firstName, lastName, dob, sex, mrn]);

  const highConfidenceDuplicate = duplicateCandidates.find(
    (candidate) => candidate.matchScore >= DUPLICATE_HIGH_CONFIDENCE_THRESHOLD,
  );

  useEffect(() => {
    setDuplicateAcknowledged(false);
  }, [firstName, lastName, dob, sex]);
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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const route = routeComplaint(complaint);
      setProtocolSuggestions(route ? route.scoreIds : []);
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [complaint]);

  const chooseCategory = (category: ComplaintCategory) => {
    setComplaintCategory(category);
    window.setTimeout(() => complaintInputRef.current?.focus(), 0);
  };

  const closeWithConfirm = () => {
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
    if (!hasDraft || window.confirm('Discard this intake?')) onClose();
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (submitting) return;
    if (!canSubmitCentralInput) {
      setSubmitError(`${emergencyRole.roleLabel} cannot submit central intake inputs.`);
      return;
    }
    if (variant === 'reception' && highConfidenceDuplicate && !duplicateAcknowledged) {
      setSubmitError(
        `Possible duplicate: ${highConfidenceDuplicate.displayName} (${highConfidenceDuplicate.matchScore}%). Open the existing chart or acknowledge before creating a new record.`,
      );
      return;
    }
    const now = new Date().toISOString();
    const isReceptionIntake = variant === 'reception';
    const completeVitals: Vitals[] = Object.values(vitals).some((value) => value !== undefined)
      ? [{ ...vitals, recordedAt: now, recordedBy: 'intake' }]
      : [];
    const safetyFlags =
      priority === Priority.P1 || priority === Priority.P2 ? [PatientFlag.HighRisk] : [];
    const complaintPatch = buildHighRiskComplaintPatch(
      {
        chiefComplaint: complaint.trim() || complaintCategory || 'Unspecified complaint',
        complaintCategory: complaintCategory || 'Other',
        state: isReceptionIntake ? PatientState.Registration : PatientState.Triage,
        triagePending: isReceptionIntake ? true : undefined,
      },
    );
    const complaintText = complaint.trim() || complaintCategory || 'Unspecified complaint';
    const intakeState = isReceptionIntake ? PatientState.Registration : PatientState.Triage;
    const arrival = buildPatientArrivalRecord({
      arrivalMode: 'walk-in',
      arrivalTimestamp: now,
      chiefComplaint: complaintText,
      state: intakeState,
      triageAcuity: {
        code: priority,
        status: isReceptionIntake ? 'unassigned' : 'confirmed',
        assignedAt: isReceptionIntake ? null : now,
      },
      queueDestination:
        complaintPatch.queueDestination ||
        (isReceptionIntake ? 'verification' : 'triage-queue'),
      triagePending: isReceptionIntake ? (complaintPatch.triagePending ?? true) : true,
      waitingRoomStatus: isReceptionIntake ? 'registered' : 'waiting-for-triage',
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
        triageTime: isReceptionIntake ? undefined : now,
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
      const response = await createSmartIntakePatient(patient);
      const persistedPatient = response?.data?.patient || patient;
      addPatient(persistedPatient);
      registerNewArrival(
        {
          patients: useEmergencyStore.getState().patients,
          updatePatient: useEmergencyStore.getState().updatePatient,
          dispatchWebSocketEvent: useEmergencyStore.getState().dispatchWebSocketEvent,
        },
        persistedPatient.id,
        { source: isReceptionIntake ? 'quick-intake-reception' : 'quick-intake-whiteboard' },
      );
      onAdded(persistedPatient);
      onClose();
    } catch (error) {
      addPatient(patient);
      registerNewArrival(
        {
          patients: useEmergencyStore.getState().patients,
          updatePatient: useEmergencyStore.getState().updatePatient,
          dispatchWebSocketEvent: useEmergencyStore.getState().dispatchWebSocketEvent,
        },
        patient.id,
        { source: isReceptionIntake ? 'quick-intake-reception' : 'quick-intake-whiteboard' },
      );
      onAdded(patient);
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
      className="quick-intake-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-intake-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 260,
        background: 'rgba(0,0,0,0.66)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
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
      <form
        className="quick-intake-modal"
        onSubmit={submit}
        onKeyDown={handleKeyDown}
        style={{
          width: 'min(600px, calc(100vw - 24px))',
          maxWidth: '100%',
          maxHeight: 'min(92vh, calc(var(--app-viewport-height, 100dvh) - 24px))',
          overflowY: 'auto',
          background: '#111827',
          border: 0,
          borderRadius: 14,
          color: '#F9FAFB',
          boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: 16,
            borderBottom: '1px solid #1F2937',
          }}
        >
          <div>
            <h2 id="quick-intake-title" style={{ margin: 0, fontSize: 18, fontWeight: 750 }}>
              {copy.title}
            </h2>
            <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>
              {variant === 'reception'
                ? 'Fast registration for front desk — patient enters triage queue after submit.'
                : `Unified input and escalation for ${centralControl.inputProfile.label}`}
            </div>
          </div>
          <button
            type="button"
            onClick={closeWithConfirm}
            aria-label={copy.closeLabel}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid #374151',
              background: 'transparent',
              color: '#F9FAFB',
              cursor: 'pointer',
            }}
          >
            X
          </button>
        </header>

        <div
          className="quick-intake-grid"
          style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14, padding: 16 }}
        >
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {variant === 'reception' && duplicateCandidates.length ? (
              <DuplicateReviewAlert
                candidates={duplicateCandidates}
                acknowledged={duplicateAcknowledged}
                onAcknowledge={() => {
                  setDuplicateAcknowledged(true);
                  setSubmitError('');
                }}
                onOpenPatient={(patientId) => onOpenVerification?.(patientId)}
                onOpenVerification={(patientId) => onOpenVerification?.(patientId)}
                onProvisionalIntake={onProvisionalIntake}
              />
            ) : null}
            {copy.showCentralBanner ? (
            <div
              aria-label="Central node input mode"
              style={{
                border: 0,
                borderRadius: 12,
                background: 'rgba(37, 99, 235, 0.12)',
                boxShadow: 'inset 3px 0 0 rgba(96,165,250,0.72)',
                color: '#BFDBFE',
                padding: 10,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {centralControl.label} receives this as {centralControl.inputProfile.label}.
              Escalation path: {centralControl.inputProfile.escalationPath.replace(/-/g, ' ')}.
            </div>
            ) : null}
            <div
              className="quick-intake-category-grid"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}
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
                      border: active ? '1px solid #60A5FA' : '1px solid #374151',
                      borderRadius: 12,
                      background: active ? '#1D4ED81F' : '#0B1120',
                      color: '#F9FAFB',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 700,
                      textAlign: 'left',
                      padding: '0 12px',
                    }}
                  >
                    <span aria-hidden="true" style={{ marginRight: 6 }}>
                      {category.icon}
                    </span>
                    {category.label}
                  </button>
                );
              })}
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ color: '#9CA3AF', fontSize: 12, fontWeight: 700 }}>Complaint</span>
              <textarea
                ref={complaintInputRef}
                value={complaint}
                onChange={(event) => setComplaint(event.target.value)}
                placeholder="Describe complaint..."
                rows={2}
                style={{
                  resize: 'vertical',
                  minHeight: 68,
                  border: '1px solid #374151',
                  borderRadius: 12,
                  background: '#0B1120',
                  color: '#F9FAFB',
                  padding: 12,
                  outline: 'none',
                }}
              />
            </label>

            {protocols.length ? (
              <div
                aria-label="Suggested protocols"
                style={{
                  border: 0,
                  borderRadius: 12,
                  background: '#0B1120',
                  padding: 10,
                }}
              >
                <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                  Suggested protocols
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {protocols.map((protocol) => (
                    <span
                      key={protocol}
                      style={{
                        borderRadius: 999,
                        background: '#1D4ED81F',
                        border: '1px solid #2563EB',
                        color: '#BFDBFE',
                        padding: '5px 8px',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {protocol}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {detectedComplaintFlags.length ? (
              <div
                style={{
                  borderRadius: 10,
                  border: '1px solid #DC2626',
                  background: '#7F1D1D22',
                  padding: 10,
                }}
              >
                <div style={{ color: '#FCA5A5', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                  High-risk complaint flags — staff alert only
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {detectedComplaintFlags.map((flag) => (
                    <span
                      key={flag.id}
                      style={{
                        borderRadius: 999,
                        background: '#991B1B33',
                        border: '1px solid #EF4444',
                        color: '#FEE2E2',
                        padding: '5px 8px',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {flag.label}
                    </span>
                  ))}
                </div>
                <p style={{ color: '#FCA5A5', fontSize: 11, margin: '8px 0 0' }}>
                  Sends to rapid review queue. Does not assign triage level.
                </p>
              </div>
            ) : null}
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700 }}>First</span>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  disabled={submitting}
                  style={inputStyle}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700 }}>Last</span>
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  disabled={submitting}
                  style={inputStyle}
                />
              </label>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700 }}>
                DOB {dob ? `(Age ${age})` : ''}
              </span>
              <input
                type="date"
                value={dob}
                onChange={(event) => setDob(event.target.value)}
                disabled={submitting}
                style={inputStyle}
              />
            </label>

            <div>
              <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, marginBottom: 5 }}>
                Sex
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {(['M', 'F', 'Other'] as Sex[]).map((candidate) => (
                  <button
                    key={candidate}
                    type="button"
                    onClick={() => setSex(candidate)}
                    style={{
                      border: sex === candidate ? '1px solid #60A5FA' : '1px solid #374151',
                      borderRadius: 10,
                      background: sex === candidate ? '#1D4ED81F' : '#0B1120',
                      color: '#F9FAFB',
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

            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700 }}>MRN</span>
              <input
                value={mrn}
                readOnly
                aria-readonly="true"
                style={{ ...inputStyle, color: '#9CA3AF' }}
              />
            </label>

            <div>
              <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, marginBottom: 5 }}>
                Vitals
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
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
                    style={{ ...inputStyle, padding: '8px 6px', textAlign: 'center' }}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>

        <footer
          className="quick-intake-footer"
          style={{
            position: 'sticky',
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: 16,
            borderTop: '1px solid #1F2937',
            background: '#111827',
          }}
        >
          <div style={{ position: 'relative' }}>
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
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  bottom: 44,
                  display: 'flex',
                  gap: 6,
                  padding: 8,
                  border: '1px solid #374151',
                  borderRadius: 12,
                  background: '#0B1120',
                  boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
                }}
              >
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
            <div role="alert" style={{ color: '#FCA5A5', fontSize: 12, flex: '1 1 auto' }}>
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
              background: submitting || !canSubmitCentralInput ? '#1E3A8A' : '#2563EB',
              color: '#F9FAFB',
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

const inputStyle = {
  border: '1px solid #374151',
  borderRadius: 10,
  background: '#0B1120',
  color: '#F9FAFB',
  padding: '9px 10px',
  outline: 'none',
} satisfies CSSProperties;

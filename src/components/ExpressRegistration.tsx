import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, KeyboardEvent } from 'react';
import { Patient, PatientState, Priority } from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';
import { EMERGENCY_ACTIONS } from '../config/emergencyRolePermissions';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import { createSmartIntakePatient } from '../services/emergencyOsApi';
import { ERROR_RECOVERY_COPY, formatApiRecoveryMessage } from '../config/errorRecoveryModel';
import {
  DUPLICATE_HIGH_CONFIDENCE_THRESHOLD,
  findDuplicateCandidates,
  type PatientDuplicateCandidate,
} from '../utils/patientDuplicateDetection';

import DuplicateReviewAlert from './verification/DuplicateReviewAlert';
import { RECEPTION_COPY } from './reception/receptionCopy';
import { buildArrivalControlFields, registerNewArrival } from '../services/arrivalControlLayer';
import { buildHighRiskComplaintPatch } from '../services/highRiskComplaintFlags';

type ExpressRegistrationProps = {
  onClose: () => void;
  onAdded: (patient: Patient) => void;
  onOpenVerification?: (patientId?: string) => void;
  onProvisionalIntake?: () => void;
};

const ARRIVAL_REASON_CHIPS = [
  'Injury / trauma',
  'Chest pain',
  'Breathing difficulty',
  'Abdominal pain',
  'Feeling unwell',
] as const;

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createMrn(): string {
  return `ED-${Math.floor(100000 + Math.random() * 900000)}`;
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

const inputStyle: CSSProperties = {
  border: '1px solid #374151',
  borderRadius: 10,
  background: '#0B1120',
  color: '#F9FAFB',
  padding: '11px 12px',
  outline: 'none',
  fontSize: 15,
  width: '100%',
  boxSizing: 'border-box',
};

export default function ExpressRegistration({
  onClose,
  onAdded,
  onOpenVerification,
  onProvisionalIntake,
}: ExpressRegistrationProps) {
  const emergencyRole = useEmergencyRolePermissions();
  const addPatient = useEmergencyStore((state) => state.addPatient);
  const patients = useEmergencyStore((state) => state.patients);
  const firstNameRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [healthCard, setHealthCard] = useState('');
  const [phone, setPhone] = useState('');
  const [arrivalReason, setArrivalReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);

  const canCreatePatient = emergencyRole.can(EMERGENCY_ACTIONS.createPatient);
  const age = useMemo(() => calculateAge(dob), [dob]);

  const duplicateCandidates = useMemo<PatientDuplicateCandidate[]>(() => {
    if (!firstName.trim() && !lastName.trim() && !dob && !healthCard.trim()) return [];
    return findDuplicateCandidates(patients, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth: dob || undefined,
      healthCardNumber: healthCard.trim() || undefined,
      mrn: healthCard.trim() || undefined,
      phone: phone.trim() || undefined,
    });
  }, [patients, firstName, lastName, dob, healthCard, phone]);

  const highConfidenceDuplicate = duplicateCandidates.find(
    (candidate) => candidate.matchScore >= DUPLICATE_HIGH_CONFIDENCE_THRESHOLD,
  );

  useEffect(() => {
    firstNameRef.current?.focus();
  }, []);

  useEffect(() => {
    setDuplicateAcknowledged(false);
  }, [firstName, lastName, dob, healthCard, phone]);

  const closeWithConfirm = () => {
    const hasDraft = Boolean(
      firstName.trim() ||
        lastName.trim() ||
        dob ||
        healthCard.trim() ||
        phone.trim() ||
        arrivalReason.trim(),
    );
    if (!hasDraft || window.confirm('Discard this registration?')) onClose();
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (submitting || !canCreatePatient) return;

    if (!firstName.trim() && !lastName.trim()) {
      setSubmitError('Enter at least a first or last name.');
      return;
    }
    if (!arrivalReason.trim()) {
      setSubmitError('Select or enter an arrival reason.');
      return;
    }
    if (highConfidenceDuplicate && !duplicateAcknowledged) {
      setSubmitError(
        `Possible duplicate: ${highConfidenceDuplicate.displayName}. Open the existing chart or confirm before creating.`,
      );
      return;
    }

    const now = new Date().toISOString();
    const resolvedMrn = healthCard.trim() || createMrn();
    const patient: Patient = {
      id: createId('patient'),
      mrn: resolvedMrn,
      firstName: firstName.trim() || 'Unknown',
      lastName: lastName.trim() || 'Patient',
      dob: dob || new Date().toISOString().slice(0, 10),
      age: dob ? age : 0,
      sex: 'Other',
      arrivalTime: now,
      triageTime: undefined,
      chiefComplaint: arrivalReason.trim(),
      complaintCategory: 'Other',
      state: PatientState.Registration,
      priority: Priority.P3,
      vitals: [],
      flags: [],
      notes: [],
      timeline: [],
      phone: phone.trim() || undefined,
      healthCardNumber: healthCard.trim() || undefined,
      healthCard: healthCard.trim() || undefined,
      source: 'WalkIn',
      ...buildArrivalControlFields({
        arrivalMode: 'walk-in',
        state: PatientState.Registration,
        presentingComplaint: arrivalReason.trim(),
      }),
      ...buildHighRiskComplaintPatch({
        chiefComplaint: arrivalReason.trim(),
        complaintCategory: 'Other',
        state: PatientState.Registration,
        triagePending: true,
      }),
    };

    setSubmitting(true);
    setSubmitError('');

    try {
      const response = await createSmartIntakePatient(patient);
      const persistedPatient = response?.data?.patient || patient;
      addPatient(persistedPatient);
      registerNewArrival(
        { patients: [...patients, persistedPatient], updatePatient: useEmergencyStore.getState().updatePatient, dispatchWebSocketEvent: useEmergencyStore.getState().dispatchWebSocketEvent },
        persistedPatient.id,
        { source: 'express-register' },
      );
      onAdded(persistedPatient);
      onClose();
    } catch (error) {
      addPatient(patient);
      registerNewArrival(
        {
          patients: [...patients, patient],
          updatePatient: useEmergencyStore.getState().updatePatient,
          dispatchWebSocketEvent: useEmergencyStore.getState().dispatchWebSocketEvent,
        },
        patient.id,
        { source: 'express-register' },
      );
      onAdded(patient);
      onClose();
      setSubmitError(
        `${formatApiRecoveryMessage(error, 'registration form')} ${ERROR_RECOVERY_COPY.handoffPending}`,
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
    if (event.key === 'Enter' && !event.shiftKey && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div
      className="express-registration-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="express-registration-title"
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
      <form
        className="express-registration-modal"
        onSubmit={submit}
        onKeyDown={handleKeyDown}
        style={{
          width: 'min(440px, calc(100vw - 24px))',
          maxWidth: '100%',
          background: '#111827',
          borderRadius: 14,
          color: '#F9FAFB',
          boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
          overflow: 'hidden',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '14px 16px',
            borderBottom: '1px solid #1F2937',
          }}
        >
          <div>
            <h2 id="express-registration-title" style={{ margin: 0, fontSize: 18, fontWeight: 750 }}>
              {RECEPTION_COPY.express.title}
            </h2>
            <p style={{ margin: '4px 0 0', color: '#9CA3AF', fontSize: 12 }}>
              {RECEPTION_COPY.express.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={closeWithConfirm}
            aria-label="Close express registration"
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
            ×
          </button>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16 }}>
          {duplicateCandidates.length ? (
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700 }}>First name</span>
              <input
                ref={firstNameRef}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
                disabled={submitting}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700 }}>Last name</span>
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                disabled={submitting}
                style={inputStyle}
              />
            </label>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700 }}>
              Date of birth {dob ? `(age ${age})` : ''}
            </span>
            <input
              type="date"
              value={dob}
              onChange={(event) => setDob(event.target.value)}
              disabled={submitting}
              style={inputStyle}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700 }}>Health card</span>
            <input
              value={healthCard}
              onChange={(event) => setHealthCard(event.target.value)}
              inputMode="numeric"
              autoComplete="off"
              placeholder="Provincial health number"
              disabled={submitting}
              style={inputStyle}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700 }}>Phone</span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
              inputMode="tel"
              placeholder="Mobile or home"
              disabled={submitting}
              style={inputStyle}
            />
          </label>

          <div>
            <span style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6 }}>
              Arrival reason
            </span>
            <div
              style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}
              role="group"
              aria-label="Common arrival reasons"
            >
              {ARRIVAL_REASON_CHIPS.map((reason) => {
                const active = arrivalReason === reason;
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => {
                      setArrivalReason(reason);
                      setSubmitError('');
                    }}
                    style={{
                      border: active ? '1px solid #60A5FA' : '1px solid #374151',
                      borderRadius: 999,
                      background: active ? '#1D4ED81F' : '#0B1120',
                      color: '#F9FAFB',
                      padding: '6px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {reason}
                  </button>
                );
              })}
            </div>
            <input
              value={arrivalReason}
              onChange={(event) => setArrivalReason(event.target.value)}
              placeholder="Or type arrival reason"
              disabled={submitting}
              style={inputStyle}
            />
          </div>

          {submitError ? (
            <p role="alert" style={{ margin: 0, color: '#FCA5A5', fontSize: 12 }}>
              {submitError}
            </p>
          ) : null}
        </div>

        <footer
          style={{
            padding: 16,
            borderTop: '1px solid #1F2937',
            background: '#111827',
          }}
        >
          <button
            type="submit"
            disabled={submitting || !canCreatePatient}
            style={{
              width: '100%',
              height: 48,
              border: 0,
              borderRadius: 12,
              background: submitting || !canCreatePatient ? '#1E3A8A' : '#2563EB',
              color: '#F9FAFB',
              cursor: submitting ? 'progress' : 'pointer',
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            {submitting ? RECEPTION_COPY.express.submitting : RECEPTION_COPY.express.submit}
          </button>
        </footer>
      </form>
    </div>
  );
}

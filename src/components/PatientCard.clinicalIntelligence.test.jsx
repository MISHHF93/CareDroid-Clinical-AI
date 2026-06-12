import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PatientDetailPanel } from './PatientCard';
import { useEmergencyStore } from '../../store/emergencyStore';
import { PatientState, Priority } from '../../types/emergency';
import { generatePatientSummaryAi } from '../services/clinicalIntelligenceApi';

vi.mock('../services/clinicalIntelligenceApi', () => ({
  generatePatientSummaryAi: vi.fn(),
  generateDifferentialAi: vi.fn(),
  generateOrderSetAi: vi.fn(),
  queryGuidelineEvidence: vi.fn(),
}));

vi.mock('../services/clinicalChatService', () => ({
  sendClinicalChatMessage: vi.fn(() =>
    Promise.resolve({
      ok: true,
      data: { response: 'Protocol context ready.' },
    })
  ),
}));

const originalState = useEmergencyStore.getState();

function selectedPatient() {
  return {
    id: 'patient-ai-panel-test',
    mrn: 'MRN-AI-1',
    firstName: 'Avery',
    lastName: 'Stone',
    dob: '1970-01-01',
    age: 56,
    sex: 'Female',
    arrivalTime: '2026-06-12T08:40:00-04:00',
    triageTime: null,
    lastAssessedTime: null,
    chiefComplaint: 'Shortness of breath',
    complaintCategory: 'Respiratory',
    state: PatientState.Assessment,
    priority: Priority.P2,
    vitals: {
      recordedAt: '2026-06-12T08:55:00-04:00',
      hr: 118,
      bpSystolic: 108,
      bpDiastolic: 66,
      spo2: 88,
      temp: 37.5,
      rr: 30,
      gcs: 15,
      pain: 2,
    },
    assignedStaffId: null,
    roomId: null,
    flags: [],
    timeline: [],
    notes: [],
  };
}

function seedPatientDetail() {
  const patient = selectedPatient();
  act(() => {
    useEmergencyStore.setState(
      {
        ...originalState,
        patients: [patient],
        selectedPatientId: patient.id,
        referrals: [],
        patientBackendDetails: {
          [patient.id]: {
            patientId: patient.id,
            status: 'ready',
            loadedAt: '2026-06-12T08:59:00-04:00',
            data: {
              medications: [{ id: 'med-1', name: 'Albuterol', status: 'Active' }],
              allergies: [],
              labs: [{ id: 'lab-1', name: 'ABG pH', value: '7.31', unit: '' }],
              visits: [],
              imaging: [],
              documents: [],
              observations: [],
              orders: [],
              diagnoses: [],
            },
          },
        },
        loadPatientBackendDetails: vi.fn(() => Promise.resolve(null)),
      },
      true
    );
  });
}

afterEach(() => {
  act(() => {
    useEmergencyStore.setState(originalState, true);
  });
  vi.clearAllMocks();
});

describe('PatientDetailPanel clinical intelligence', () => {
  it('runs patient-scoped backend AI from the toggleable panel', async () => {
    const user = userEvent.setup();
    generatePatientSummaryAi.mockResolvedValue({
      ok: true,
      data: { summary: 'Respiratory patient summary generated.' },
    });
    seedPatientDetail();

    render(
      <MemoryRouter>
        <PatientDetailPanel />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /show ai/i }));
    await user.click(screen.getByRole('button', { name: /summarize/i }));

    await waitFor(() => {
      expect(generatePatientSummaryAi).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'patient-ai-panel-test',
          patientContext: expect.stringContaining('Shortness of breath'),
        })
      );
    });
    expect(await screen.findByText(/Respiratory patient summary generated/i)).toBeInTheDocument();
  });
});

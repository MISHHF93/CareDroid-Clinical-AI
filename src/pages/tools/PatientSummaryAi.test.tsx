import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PatientSummaryAi from './PatientSummaryAi';
import {
  mockConversationValue,
  mockToolPreferencesValue,
} from '../../test/testRenderUtils';
import { generatePatientSummaryAi } from '../../services/clinicalIntelligenceApi';

vi.mock('./ToolPageLayout.css', () => ({}));

vi.mock('../../contexts/ConversationContext', () => ({
  useConversation: () => mockConversationValue,
}));

vi.mock('../../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../../services/clinicalIntelligenceApi', () => ({
  generatePatientSummaryAi: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tools/patient-summary-ai']}>
      <PatientSummaryAi />
    </MemoryRouter>,
  );
}

describe('PatientSummaryAi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generatePatientSummaryAi).mockResolvedValue({
      ok: true,
      data: {
        runId: 'summary-run-1',
        status: 'summary_generated',
        activeProblems: [
          {
            label: 'CHF exacerbation',
            evidence: ['Listed in submitted active problems.'],
            priority: 'medium',
          },
        ],
        medications: [
          {
            name: 'Furosemide',
            context: 'Volume status / diuretic therapy context.',
            reviewFlags: [],
          },
        ],
        recentLabs: [
          {
            label: 'K',
            value: '5.5',
            interpretation: 'abnormal',
          },
        ],
        alerts: [
          {
            severity: 'urgent_review',
            message: 'Hyperkalemia alert',
            rationale: 'Submitted alert context.',
          },
        ],
        riskFactors: [
          {
            label: 'CKD',
            rationale: 'Submitted risk factor.',
          },
        ],
        explainability: {
          method: 'Structured extraction from submitted chart text.',
          inputsUsed: ['patientContext', 'problems', 'medications', 'labs', 'alerts', 'riskFactors'],
          limitations: ['Requires clinician review.'],
        },
        safety: {
          warnings: ['Patient summary is decision support only and must be verified.'],
        },
      },
    });
  });

  it('renders patient summary intake and safety scope', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /patient summary ai/i })).toBeInTheDocument();
    expect(screen.getByText(/does not reconcile the chart autonomously/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^problems$/i)).toBeInTheDocument();
  });

  it('generates active problems, medications, labs, alerts, and risk factors', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/patient context/i), {
      target: { value: 'Older adult with CHF and CKD' },
    });
    fireEvent.change(screen.getByLabelText(/^problems$/i), {
      target: { value: 'CHF exacerbation; CKD stage 3' },
    });
    fireEvent.change(screen.getByLabelText(/medications/i), {
      target: { value: 'Furosemide; lisinopril' },
    });
    fireEvent.change(screen.getByLabelText(/recent labs/i), {
      target: { value: 'K 5.5; Creatinine 1.8' },
    });
    fireEvent.change(screen.getByLabelText(/^alerts$/i), {
      target: { value: 'Hyperkalemia alert' },
    });
    fireEvent.change(screen.getByLabelText(/risk factors/i), {
      target: { value: 'CKD; diabetes' },
    });
    fireEvent.click(screen.getByRole('button', { name: /generate patient summary/i }));

    await waitFor(() => {
      expect(generatePatientSummaryAi).toHaveBeenCalledWith(
        expect.objectContaining({
          patientContext: 'Older adult with CHF and CKD',
          problems: 'CHF exacerbation; CKD stage 3',
          medications: 'Furosemide; lisinopril',
          labs: 'K 5.5; Creatinine 1.8',
          alerts: 'Hyperkalemia alert',
          riskFactors: 'CKD; diabetes',
        }),
      );
    });

    expect(await screen.findByRole('heading', { name: /active problems/i })).toBeInTheDocument();
    expect(screen.getAllByText(/CHF exacerbation/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Furosemide/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/5.5/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Hyperkalemia alert/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CKD/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /risk factors/i })).toBeInTheDocument();
  });

  it('does not produce a React duplicate-key warning when the AI extraction repeats the same problem/medication/risk-factor label (HEAL-225)', async () => {
    // AI-extracted labels/names are free text, not a dev-authored enum --
    // the same problem or drug name can plausibly be extracted twice with
    // different evidence/context/rationale (e.g. pulled from two
    // different parts of the note). A single-field key collides in that
    // case; these 3 lists were brought in line with the compound-key
    // pattern already used by their recentLabs/alerts siblings in this
    // same file.
    vi.mocked(generatePatientSummaryAi).mockResolvedValue({
      ok: true,
      data: {
        runId: 'summary-run-2',
        status: 'summary_generated',
        activeProblems: [
          { label: 'Hypertension', evidence: ['From vitals section.'], priority: 'medium' },
          { label: 'Hypertension', evidence: ['From history section.'], priority: 'high' },
        ],
        medications: [
          { name: 'Metoprolol', context: 'Morning dose, cardiology note.', reviewFlags: [] },
          { name: 'Metoprolol', context: 'Evening dose, discharge note.', reviewFlags: [] },
        ],
        recentLabs: [],
        alerts: [],
        riskFactors: [
          { label: 'Smoking', rationale: 'Documented in social history.' },
          { label: 'Smoking', rationale: 'Documented in intake questionnaire.' },
        ],
        explainability: {
          method: 'Structured extraction from submitted chart text.',
          inputsUsed: ['patientContext'],
          limitations: [],
        },
        safety: { warnings: [] },
      },
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /generate patient summary/i }));

    await screen.findByText(/From vitals section\./i);

    expect(screen.getByText(/From history section\./i)).toBeInTheDocument();
    expect(screen.getByText(/Morning dose, cardiology note\./i)).toBeInTheDocument();
    expect(screen.getByText(/Evening dose, discharge note\./i)).toBeInTheDocument();
    expect(screen.getByText(/Documented in social history\./i)).toBeInTheDocument();
    expect(screen.getByText(/Documented in intake questionnaire\./i)).toBeInTheDocument();

    const keyWarnings = consoleErrorSpy.mock.calls.filter((call) =>
      String(call[0]).includes('Encountered two children with the same key'),
    );
    expect(keyWarnings).toHaveLength(0);

    consoleErrorSpy.mockRestore();
  });
});

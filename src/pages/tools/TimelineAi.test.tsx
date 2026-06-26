import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TimelineAi from './TimelineAi';
import {
  mockConversationValue,
  mockToolPreferencesValue,
} from '../../test/testRenderUtils';
import { generateTimelineAi } from '../../services/clinicalIntelligenceApi';

vi.mock('./ToolPageLayout.css', () => ({}));
vi.mock('./TimelineAi.css', () => ({}));

vi.mock('../../contexts/ConversationContext', () => ({
  useConversation: () => mockConversationValue,
}));

vi.mock('../../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../../services/clinicalIntelligenceApi', () => ({
  generateTimelineAi: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tools/timeline-ai']}>
      <TimelineAi />
    </MemoryRouter>,
  );
}

describe('TimelineAi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateTimelineAi.mockResolvedValue({
      ok: true,
      data: {
        runId: 'timeline-run-1',
        status: 'timeline_generated',
        timeline: [
          {
            id: 'encounter-1',
            dateLabel: '2026-05-01',
            encounterType: 'ED visit',
            title: 'Initial dyspnea visit',
            summary: 'Presented with dyspnea and edema.',
            keyFindings: ['Encounter: Presented with dyspnea and edema.', 'Labs/studies: BNP 650'],
            abnormalSignals: ['Possible hypoxia or respiratory decline'],
          },
        ],
        trends: [
          {
            id: 'respiratory',
            label: 'Respiratory status',
            direction: 'worsening',
            evidence: ['Encounter 1: dyspnea, oxygen'],
          },
        ],
        abnormalProgression: [
          {
            id: 'progression-1',
            severity: 'urgent_review',
            signal: 'Possible hypoxia or respiratory decline',
            rationale: 'Abnormal signal detected in 2026-05-01',
            relatedEncounterIds: ['encounter-1'],
          },
        ],
        explainability: {
          method: 'Chronological encounter normalization.',
          inputsUsed: ['patientContext', 'focus', 'encounters', 'labs', 'vitals'],
          limitations: ['Requires clinician review.'],
        },
        safety: {
          warnings: ['Timeline summaries are clinical decision support only.'],
        },
      },
    });
  });

  it('renders responsive timeline intake and safety scope', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /patient timeline ai/i })).toBeInTheDocument();
    expect(screen.getByText(/summarizes submitted encounter text/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add encounter/i })).toBeInTheDocument();
  });

  it('generates timeline events, trends, and abnormal progression', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/patient context/i), {
      target: { value: 'CHF and CKD' },
    });
    fireEvent.change(screen.getByLabelText(/review focus/i), {
      target: { value: 'respiratory decline' },
    });
    fireEvent.change(screen.getAllByLabelText(/encounter details/i)[1], {
      target: { value: 'Returned with worsening dyspnea and oxygen requirement.' },
    });
    fireEvent.change(screen.getAllByLabelText(/vitals/i)[1], {
      target: { value: 'SpO2 88%, BP 92/56' },
    });
    fireEvent.click(screen.getByRole('button', { name: /generate timeline/i }));

    await waitFor(() => {
      expect(generateTimelineAi).toHaveBeenCalledWith(
        expect.objectContaining({
          patientContext: 'CHF and CKD',
          focus: 'respiratory decline',
          encounters: expect.arrayContaining([
            expect.objectContaining({ details: expect.stringContaining('worsening dyspnea') }),
          ]),
        }),
      );
    });

    expect(await screen.findByRole('heading', { name: /initial dyspnea visit/i })).toBeInTheDocument();
    expect(screen.getByText(/Respiratory status/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /abnormal progression/i })).toBeInTheDocument();
    expect(screen.getByText(/urgent_review/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/responsive patient timeline/i)).toBeInTheDocument();
  });
});

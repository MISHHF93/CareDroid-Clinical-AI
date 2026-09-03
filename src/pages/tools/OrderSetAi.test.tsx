import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrderSetAi from './OrderSetAi';
import { mockConversationValue, mockToolPreferencesValue } from '../../test/testRenderUtils';
import { generateOrderSetAi } from '../../services/clinicalIntelligenceApi';

vi.mock('./ToolPageLayout.css', () => ({}));

vi.mock('../../contexts/ConversationContext', () => ({
  useConversation: () => mockConversationValue,
}));

vi.mock('../../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../../services/clinicalIntelligenceApi', () => ({
  generateOrderSetAi: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tools/order-set-ai']}>
      <OrderSetAi />
    </MemoryRouter>,
  );
}

describe('OrderSetAi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateOrderSetAi).mockResolvedValue({
      ok: true,
      data: {
        runId: 'order-set-run-1',
        status: 'suggestions_generated',
        orderBundles: [
          {
            id: 'sepsis-initial-review',
            title: 'Sepsis Initial Evaluation Bundle',
            intent: 'Support early recognition and reassessment.',
            suggestedOrders: [
              {
                category: 'labs',
                label: 'CBC, CMP, lactate, blood cultures',
                rationale: 'Assess organ dysfunction and microbiology source data.',
                reviewRequired: true,
              },
            ],
            evidenceLinks: [
              {
                label: 'Sepsis bundle principles',
                basis: 'Common sepsis pathways emphasize lactate, cultures, and reassessment.',
              },
            ],
            reviewChecklist: ['Check allergies and renal function.'],
          },
        ],
        protocolPathways: [
          {
            id: 'sepsis-pathway',
            name: 'Sepsis Recognition and Reassessment Pathway',
            trigger: 'Suspected infection with hypotension.',
            steps: ['Confirm source.', 'Review lactate.'],
            escalationCriteria: ['Persistent hypotension'],
          },
        ],
        explainability: {
          matchedSignals: ['Sepsis / infection pathway signal'],
          method: 'Matched scenario against curated protocol bundle patterns.',
          limitations: ['Does not place, sign, route, or activate orders.'],
        },
        safety: {
          reviewRequired: true,
          autonomousOrderPlacement: false,
          blockedActions: ['place_orders', 'sign_orders'],
          warnings: ['No autonomous order placement. Clinician review is required.'],
        },
      },
    });
  });

  it('renders review-required order set safety copy', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { name: /intelligent order set assistant/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/No autonomous order placement/i)).toBeInTheDocument();
    expect(screen.getByText(/licensed clinician must review/i)).toBeInTheDocument();
  });

  it('generates evidence-linked order bundles, pathways, explainability, and safety state', async () => {
    renderPage();

    fireEvent.change(screen.getByRole('textbox', { name: /^clinical scenario$/i }), {
      target: { value: 'Suspected sepsis with hypotension and elevated lactate' },
    });
    fireEvent.change(screen.getByLabelText(/working diagnosis/i), {
      target: { value: 'Sepsis' },
    });
    fireEvent.change(screen.getByLabelText(/patient context/i), {
      target: { value: 'CKD stage 3 and penicillin allergy' },
    });
    fireEvent.click(screen.getByRole('button', { name: /suggest order bundles/i }));

    await waitFor(() => {
      expect(generateOrderSetAi).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicalScenario: expect.stringContaining('Suspected sepsis'),
          diagnosis: 'Sepsis',
          patientContext: 'CKD stage 3 and penicillin allergy',
        }),
      );
    });

    expect(
      await screen.findByRole('heading', { name: /sepsis initial evaluation bundle/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Sepsis bundle principles/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /protocol pathways/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /explainability/i })).toBeInTheDocument();
    expect(screen.getByText(/Autonomous order placement:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Blocked/i).length).toBeGreaterThan(0);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClinicalAudit from './ClinicalAudit';
import {
  mockConversationValue,
  mockToolPreferencesValue,
} from '../../test/testRenderUtils';
import { fetchClinicalAuditExecutionLogs } from '../../services/clinicalIntelligenceApi';

vi.mock('./ToolPageLayout.css', () => ({}));

vi.mock('../../contexts/ConversationContext', () => ({
  useConversation: () => mockConversationValue,
}));

vi.mock('../../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../../services/clinicalIntelligenceApi', () => ({
  fetchClinicalAuditExecutionLogs: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tools/clinical-audit']}>
      <ClinicalAudit />
    </MemoryRouter>,
  );
}

describe('ClinicalAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchClinicalAuditExecutionLogs.mockResolvedValue({
      ok: true,
      data: {
        runId: 'audit-1',
        status: 'logs_available',
        summary: {
          logCount: 2,
          phiAccessCount: 1,
          integrityVerifiedCount: 2,
          uniqueCapabilities: ['differential-ai', 'order-set-ai'],
        },
        toolChain: ['differential-ai -> ranked_differential_generated -> ai_query'],
        executionLogs: [
          {
            id: 'log-1',
            timestamp: '2026-05-22T05:00:00.000Z',
            action: 'ai_query',
            resource: 'clinical-intelligence/differential-ai',
            capabilityId: 'differential-ai',
            status: 'ranked_differential_generated',
            phiAccessed: true,
            integrityVerified: true,
            hashPreview: 'abcdef1234...',
          },
        ],
        safety: {
          warnings: ['Clinical audit view shows sanitized execution metadata only.'],
        },
      },
    });
  });

  it('renders clinical audit scope and filters', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /clinical audit/i })).toBeInTheDocument();
    expect(screen.getByText(/sanitized execution logs/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/action/i)).toBeInTheDocument();
  });

  it('loads execution log summary, tool chain, and integrity metadata', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/action/i), {
      target: { value: 'ai_query' },
    });
    fireEvent.click(screen.getByRole('button', { name: /load execution logs/i }));

    await waitFor(() => {
      expect(fetchClinicalAuditExecutionLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ai_query',
          limit: '50',
        }),
      );
    });

    expect(await screen.findByRole('heading', { name: /summary/i })).toBeInTheDocument();
    expect(screen.getByText(/logs_available/i)).toBeInTheDocument();
    expect(screen.getByText(/differential-ai, order-set-ai/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /tool chain/i })).toBeInTheDocument();
    expect(screen.getAllByText(/integrity verified/i).length).toBeGreaterThan(0);
  });
});

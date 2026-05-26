import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MemoryDashboard from './MemoryDashboard';
import {
  mockConversationValue,
  mockToolPreferencesValue,
} from '../test/testRenderUtils';

vi.mock('./MemoryDashboard.css', () => ({}));

const memoryApiMock = vi.hoisted(() => ({
  fetchMemoryDashboard: vi.fn(),
  persistShortMemory: vi.fn(),
}));

vi.mock('../services/memoryApi', () => ({
  LOCAL_MEMORY_DASHBOARD: {
    recentActivity: [],
    recentConversations: [],
    recentTools: [],
    savedWorkflows: [],
    aiContext: {
      shortTerm: { activeConversation: null, activeCalculator: null, activeDashboard: null },
      longTerm: { preferences: [], history: [], savedTools: [] },
      clinical: { findings: [], summaries: [], scores: [] },
    },
  },
  fetchMemoryDashboard: memoryApiMock.fetchMemoryDashboard,
  persistShortMemory: memoryApiMock.persistShortMemory,
}));

vi.mock('../contexts/ConversationContext', () => ({
  useConversation: () => mockConversationValue,
}));

vi.mock('../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    activeWorkspace: { id: 'not-a-backend-uuid', name: 'Hospital Ops' },
    aiPersonalization: {
      recommendedWorkflows: [
        {
          id: 'recommended-rounding',
          title: 'Recommended rounding workflow',
          reason: 'Use for morning ICU review.',
          toolId: 'patient-summary-ai',
        },
      ],
    },
  }),
}));

function arrangeDashboard() {
  memoryApiMock.fetchMemoryDashboard.mockResolvedValue({
    ok: true,
    recentActivity: [
      {
        id: 'activity-1',
        source: 'clinical',
        type: 'summaries',
        title: 'Latest sepsis summary',
        occurredAt: '2026-05-25T12:00:00.000Z',
        metadata: { status: 'ready' },
      },
    ],
    recentConversations: [
      {
        id: 'conversation-memory-1',
        title: 'Persisted cardiology follow-up',
        content: { messageCount: 5 },
        updatedAt: '2026-05-25T11:50:00.000Z',
      },
    ],
    recentTools: [
      {
        id: 'tool-memory-1',
        title: 'drug-check',
        content: { toolId: 'drug-check' },
        updatedAt: '2026-05-25T11:45:00.000Z',
      },
    ],
    savedWorkflows: [
      {
        id: 'workflow-1',
        title: 'Sepsis escalation workflow',
        content: { reason: 'Bundle checklist saved for reuse.' },
        updatedAt: '2026-05-25T11:55:00.000Z',
      },
    ],
    aiContext: {
      shortTerm: {
        activeConversation: {
          id: 'short-1',
          title: 'Persisted active conversation',
          content: { messageCount: 3 },
          updatedAt: '2026-05-25T11:58:00.000Z',
        },
        activeCalculator: null,
        activeDashboard: null,
      },
      longTerm: {
        preferences: [{ id: 'pref-1', title: 'Concise responses', content: { style: 'concise' } }],
        history: [],
        savedTools: [],
      },
      clinical: {
        findings: [{ id: 'finding-1', title: 'Hypotension finding', content: { severity: 'watch' } }],
        summaries: [],
        scores: [{ id: 'score-1', title: 'qSOFA score', content: { score: 2 } }],
      },
    },
    message: '',
  });
  memoryApiMock.persistShortMemory.mockResolvedValue({ ok: true, data: {}, message: '' });
  mockConversationValue.conversations = [
    { id: 'conversation-1', title: 'ICU rounds', date: '2026-05-25T12:05:00.000Z' },
  ];
  mockConversationValue.activeConversationId = 'conversation-1';
  mockConversationValue.messages = [
    { id: 'm1', role: 'user', content: 'Summarize the overnight events.' },
    { id: 'm2', role: 'assistant', content: 'Clinical decision support ready.' },
  ];
  mockConversationValue.selectedTool = 'qsofa';
  mockToolPreferencesValue.recentTools = ['qsofa', 'drug-check'];
}

describe('MemoryDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    arrangeDashboard();
  });

  it('renders recent activity, saved workflows, and AI context', async () => {
    render(
      <MemoryRouter>
        <MemoryDashboard />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /memory dashboard/i })).toBeInTheDocument();
    expect(await screen.findByText('Sepsis escalation workflow')).toBeVisible();
    expect(screen.getByRole('heading', { name: /recent conversations/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /recent tools/i })).toBeInTheDocument();
    expect(screen.getByText('Latest sepsis summary')).toBeVisible();
    expect(screen.getByText('Persisted active conversation')).toBeVisible();
    expect(screen.getByText('Persisted cardiology follow-up')).toBeVisible();
    expect(screen.getAllByText('drug-check').length).toBeGreaterThan(0);
    expect(screen.getByText('qSOFA score')).toBeVisible();
    expect(screen.getByText('Recommended rounding workflow')).toBeVisible();

    const activityPanel = screen.getByRole('heading', { name: /recent activity/i }).closest('section');
    expect(within(activityPanel).getByText('ICU rounds')).toBeVisible();
  });

  it('persists live dashboard, conversation, and calculator context', async () => {
    render(
      <MemoryRouter>
        <MemoryDashboard />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(memoryApiMock.persistShortMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'active_dashboard',
          title: 'Memory dashboard',
          content: expect.objectContaining({ route: '/ai-memory' }),
        })
      )
    );
    expect(memoryApiMock.persistShortMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'active_conversation',
        title: 'ICU rounds',
      })
    );
    expect(memoryApiMock.persistShortMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'active_calculator',
        title: 'qsofa',
      })
    );
  });
});

import React from 'react';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import {
  mockCompactViewport,
  mockConversationValue,
  mockToolPreferencesValue,
  mockUserValue,
} from '../test/testRenderUtils';

vi.mock('../contexts/UserContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useUser: () => mockUserValue,
  };
});

vi.mock('../contexts/ConversationContext', () => ({
  useConversation: () => mockConversationValue,
}));

vi.mock('../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../hooks/useNotificationActions', () => ({
  useNotificationActions: () => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }),
}));

vi.mock('../services/clinicalChatService', () => ({
  sendClinicalChatMessage: vi.fn().mockResolvedValue({
    ok: true,
    data: { response: 'ok' },
  }),
  mapChatResponseToAssistantMessage: vi.fn((data) => ({
    role: 'assistant',
    content: data.response || 'ok',
  })),
  registryIdToChatToolParam: vi.fn(() => null),
}));

const __dirname = dirname(fileURLToPath(import.meta.url));
const dashboardCss = readFileSync(join(__dirname, 'Dashboard.css'), 'utf8');
const operationalResultCardCss = readFileSync(
  join(__dirname, '../components/chat/OperationalResultCard.css'),
  'utf8'
);
const chatExecutionCardCss = readFileSync(
  join(__dirname, '../components/chat/ChatExecutionCard.css'),
  'utf8'
);
const toolCardCss = readFileSync(join(__dirname, '../components/ToolCard.css'), 'utf8');

function renderDashboard(route = '/assistant') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Dashboard />
    </MemoryRouter>
  );
}

describe('Dashboard Chat mobile layout contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompactViewport(true);
    Element.prototype.scrollTo = vi.fn();
    mockConversationValue.messages = [];
    mockConversationValue.selectedTool = null;
  });

  it('keeps composer controls and send button reachable on compact viewports', () => {
    renderDashboard('/assistant');

    expect(screen.getByLabelText(/clinical chat message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/composer actions/i)).toBeInTheDocument();
  });

  it('renders suggestion chips in the Chat action rail on mobile', async () => {
    renderDashboard('/assistant');

    const rail = screen.getByLabelText(/suggested actions/i);
    await waitFor(() => {
      expect(within(rail).getByRole('button', { name: /plan follow-up/i })).toBeInTheDocument();
      expect(within(rail).getByRole('button', { name: /drug checker/i })).toBeInTheDocument();
    });
  });

  it('renders operational result cards inside mobile Chat messages without losing raw text', () => {
    mockConversationValue.messages = [
      {
        id: 'mobile-result',
        role: 'assistant',
        content: 'SOFA Score completed successfully.',
        toolResult: {
          toolId: 'sofa-calculator',
          toolName: 'SOFA Score',
          result: {
            success: true,
            data: { totalScore: 4 },
            warnings: [],
            errors: [],
          },
        },
        metadata: {
          parameters: { pao2fio2: 280, platelets: 140 },
        },
      },
    ];

    renderDashboard('/assistant');

    expect(screen.getByText(/sofa score completed successfully/i)).toBeInTheDocument();
    expect(screen.getByText(/operational result/i)).toBeInTheDocument();
    expect(screen.getByText(/total sofa score: 4/i)).toBeInTheDocument();
  });
});

describe('Dashboard Chat mobile CSS contracts', () => {
  it('uses horizontal scrolling for suggestion chips instead of vertical wrapping', () => {
    expect(dashboardCss).toMatch(/\.dashboard-recs-row\s*\{[\s\S]*flex-wrap:\s*nowrap/);
    expect(dashboardCss).toMatch(/\.dashboard-recs-row\s*\{[\s\S]*overflow-x:\s*auto/);
    expect(dashboardCss).toMatch(/\.dashboard-action-chip\s*\{[\s\S]*flex:\s*0 0 auto/);
  });

  it('keeps mobile composer and send controls visible with keyboard-safe spacing', () => {
    expect(dashboardCss).toMatch(
      /@media \(max-width: 900px\)[\s\S]*\.dashboard-input-row[\s\S]*flex-wrap:\s*nowrap/
    );
    expect(dashboardCss).toMatch(
      /@media \(max-width: 400px\)[\s\S]*\.dashboard-input-row[\s\S]*flex-direction:\s*row/
    );
    expect(dashboardCss).toMatch(
      /\.app-keyboard-visible \.dashboard-scroll[\s\S]*scroll-padding-bottom:\s*max\(160px/
    );
    expect(dashboardCss).toMatch(/\.dashboard-send\s*\{[\s\S]*min-width:\s*76px/);
  });

  it('turns Chat drawers into bottom sheets on mobile', () => {
    expect(dashboardCss).toMatch(
      /@media \(max-width: 900px\)[\s\S]*\.drawer-right\.dashboard-outreach-drawer[\s\S]*transform:\s*translateY\(100%\)/
    );
    expect(dashboardCss).toMatch(
      /\.drawer-right\.drawer-open\.dashboard-outreach-drawer[\s\S]*transform:\s*translateY\(0\)/
    );
    expect(dashboardCss).toMatch(
      /\.drawer-right\.dashboard-confirmation-drawer[\s\S]*height:\s*min\(88dvh/
    );
  });

  it('keeps result and execution cards readable on small screens', () => {
    expect(operationalResultCardCss).toMatch(
      /\.operational-result-card\s*\{[\s\S]*max-width:\s*100%/
    );
    expect(operationalResultCardCss).toMatch(
      /@media \(max-width: 520px\)[\s\S]*\.operational-result-card__body/
    );
    expect(chatExecutionCardCss).toMatch(/\.chat-exec-card\s*\{[\s\S]*max-width:\s*100%/);
    expect(chatExecutionCardCss).toMatch(
      /@media \(max-width: 700px\)[\s\S]*\.chat-exec-summary-row[\s\S]*grid-template-columns:\s*1fr/
    );
    expect(toolCardCss).toMatch(
      /@media \(max-width: 520px\)[\s\S]*\.tool-card-table[\s\S]*min-width:\s*460px/
    );
  });

  it('stacks the profile tool graph card on mobile', () => {
    expect(dashboardCss).toMatch(
      /@media \(max-width: 760px\)[\s\S]*\.profile-tool-graph-card__columns[\s\S]*grid-template-columns:\s*1fr/
    );
    expect(dashboardCss).toMatch(
      /@media \(max-width: 760px\)[\s\S]*\.profile-tool-graph-card__header[\s\S]*flex-direction:\s*column/
    );
    expect(dashboardCss).toMatch(/\.profile-tool-graph-card__metrics[\s\S]*flex-wrap:\s*wrap/);
  });

  it('does not hide the action rail in mobile landscape', () => {
    const landscapeBlock = dashboardCss.match(
      /@media \(max-width: 900px\) and \(orientation: landscape\) \{[\s\S]*?\n\}/
    )?.[0];
    expect(landscapeBlock).toBeTruthy();
    expect(landscapeBlock).not.toMatch(/display:\s*none/);
  });
});

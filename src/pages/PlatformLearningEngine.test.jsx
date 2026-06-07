import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PlatformLearningEngine from './PlatformLearningEngine';

vi.mock('./PlatformLearningEngine.css', () => ({}));

vi.mock('../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => ({
    recentTools: ['qsofa', 'news2'],
  }),
}));

vi.mock('../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    memoryFabricContext: {
      userMemory: {
        savedWorkflows: [
          { id: 'workflow-1', workflowId: 'sepsis-escalation', label: 'Sepsis escalation', count: 12 },
        ],
      },
      organizationMemory: {
        commonSearches: [
          { id: 'search-1', category: 'sepsis', count: 10, resultCount: 3 },
        ],
      },
    },
    activity: {
      recentSimulations: [
        { id: 'sim-1', scenarioId: 'sepsis-deterioration', label: 'Sepsis Deterioration', count: 7 },
      ],
      abandonedPages: [
        { id: 'abandoned-1', route: '/ai-models', label: 'AI Models', views: 10, completedActions: 1 },
      ],
      failedLaunches: [
        { id: 'failed-1', assetId: 'lab-interp', label: 'Lab Interpreter', count: 4, route: '/tools/lab-interpreter' },
      ],
    },
  }),
}));

describe('PlatformLearningEngine', () => {
  it('renders optimization suggestions and learning signal summary', () => {
    render(
      <MemoryRouter>
        <PlatformLearningEngine />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /caredroid self-optimization/i })).toBeInTheDocument();
    expect(screen.getByText('Optimization Suggestions')).toBeVisible();
    expect(screen.getByText('Successful Workflows')).toBeVisible();
    expect(screen.getByText('Failed Launches')).toBeVisible();
    expect(screen.getByRole('heading', { name: /continuously improve caredroid/i })).toBeVisible();
    expect(screen.getByText(/privacy-safe-aggregate/i)).toBeVisible();
    expect(screen.getAllByText(/promote|repair|improve|review hiding/i).length).toBeGreaterThan(0);
  });

  it('filters suggestions by repair launches', () => {
    render(
      <MemoryRouter>
        <PlatformLearningEngine />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /repair launches/i }));

    expect(screen.getByText(/repair lab interpreter/i)).toBeVisible();
  });
});

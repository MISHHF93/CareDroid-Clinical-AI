import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Operations from './Operations';
import { mockWorkspaceValue } from '../test/testRenderUtils';

vi.mock('./OperatingWorkspace.css', () => ({}));

vi.mock('../contexts/ConversationContext', () => ({
  useConversation: () => ({
    addMessage: vi.fn(),
    selectTool: vi.fn(),
    setActiveTool: vi.fn(),
  }),
}));

vi.mock('../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => ({
    recordToolAccess: vi.fn(),
  }),
}));

vi.mock('../contexts/WorkspaceContext', () => ({
  useWorkspace: () => mockWorkspaceValue,
}));

describe('Operations', () => {
  it('keeps the operations hub primary cards separate from lower-level drill-downs', () => {
    mockWorkspaceValue.activeWorkspaceId = 'emergency';
    mockWorkspaceValue.activeWorkspace = { id: 'emergency', name: 'Emergency' };

    render(
      <MemoryRouter>
        <Operations />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /^emergency operations$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /emergency operational areas/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /drill-downs/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /operations intelligence/i })).toBeInTheDocument();

    const operationalAreas = screen.getByRole('heading', { name: /emergency operational areas/i }).closest('section');
    const drilldowns = screen.getByRole('heading', { name: /drill-downs/i }).closest('section');
    const intelligence = screen.getByRole('heading', { name: /operations intelligence/i }).closest('section');
    const continuations = screen.getByRole('heading', { name: /continue from emergency operations/i }).closest('section');

    expect(within(operationalAreas).getByRole('button', { name: /medical iot[\s\S]*open iot/i })).toBeInTheDocument();
    expect(within(operationalAreas).queryByRole('button', { name: /open telemetry/i })).not.toBeInTheDocument();
    expect(within(drilldowns).getByRole('button', { name: /fleet map/i })).toBeInTheDocument();
    expect(within(drilldowns).queryByRole('button', { name: /predictive maintenance/i })).not.toBeInTheDocument();
    expect(within(intelligence).getByRole('button', { name: /workflow mining/i })).toBeInTheDocument();
    expect(within(intelligence).getByRole('button', { name: /workspace graph/i })).toBeInTheDocument();
    expect(within(intelligence).queryByRole('button', { name: /twin intelligence/i })).not.toBeInTheDocument();
    expect(within(intelligence).queryByRole('button', { name: /usage/i })).not.toBeInTheDocument();
    expect(within(continuations).getByRole('link', { name: /build operations workflow/i })).toHaveAttribute(
      'href',
      '/workflows?source=operations'
    );
    expect(within(continuations).getByRole('link', { name: /review operation results/i })).toHaveAttribute(
      'href',
      '/timeline?kind=workflow'
    );
    expect(within(continuations).getByRole('link', { name: /recommended next action/i })).toHaveAttribute(
      'href',
      '/recommendations?source=operations'
    );
    expect(within(continuations).getByRole('link', { name: /ask assistant/i })).toHaveAttribute('href', '/assistant');
  });
});

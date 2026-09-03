import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import OperationsCenterMenu from './OperationsCenterMenu';

let surfaces = {
  showAiChiefBar: true,
  showThreeMinuteMissionBar: true,
  showWorkflowAutomationBar: true,
};

vi.mock('../../contexts/PractitionerVisibilityContext', () => ({
  usePractitionerSurfaceVisibility: () => ({ emergencyRoutes: surfaces }),
}));

const aiChiefMock = vi.fn();
const missionMock = vi.fn();
const workflowMock = vi.fn();

vi.mock('../../hooks/useAiChiefOrchestrator', () => ({
  default: () => aiChiefMock(),
}));

vi.mock('../../hooks/useThreeMinuteMission', () => ({
  default: () => missionMock(),
}));

vi.mock('../../hooks/useUnifiedWorkflowAutomation', () => ({
  default: () => workflowMock(),
}));

vi.mock('../emergency/OperationalIntelligenceBar', () => ({
  default: () => <div data-testid="stub-ai-chief-bar">AI Chief content</div>,
}));

vi.mock('../emergency/ThreeMinuteMissionBar', () => ({
  default: () => <div data-testid="stub-mission-bar">Mission content</div>,
}));

vi.mock('../emergency/WorkflowAutomationCommandBar', () => ({
  default: () => <div data-testid="stub-workflow-bar">Workflow content</div>,
}));

function baseCounts(
  overrides: {
    critical?: number;
    watch?: number;
    breach?: number;
    unacked?: number;
    pending?: number;
    workflowCritical?: number;
  } = {},
) {
  aiChiefMock.mockReturnValue({
    criticalDomainCount: overrides.critical ?? 0,
    watchDomainCount: overrides.watch ?? 0,
  });
  missionMock.mockReturnValue({
    breachCount: overrides.breach ?? 0,
    unacknowledgedCount: overrides.unacked ?? 0,
  });
  workflowMock.mockReturnValue({
    criticalCount: overrides.workflowCritical ?? 0,
    pendingCount: overrides.pending ?? 0,
  });
}

function renderMenu(path = '/emergency/reception') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <OperationsCenterMenu />
    </MemoryRouter>,
  );
}

describe('OperationsCenterMenu', () => {
  beforeEach(() => {
    surfaces = {
      showAiChiefBar: true,
      showThreeMinuteMissionBar: true,
      showWorkflowAutomationBar: true,
    };
    aiChiefMock.mockReset();
    missionMock.mockReset();
    workflowMock.mockReset();
    baseCounts();
  });

  it('renders a trigger with no badge when everything is quiet', () => {
    renderMenu();

    const trigger = screen.getByRole('button', { name: 'Operations center, all clear' });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows a critical-tone badge summing breaches/critical domains/critical workflow items', () => {
    baseCounts({ critical: 1, breach: 2, workflowCritical: 1 });
    renderMenu();

    const trigger = screen.getByRole('button', {
      name: 'Operations center, 4 items need attention',
    });
    expect(trigger).toHaveClass('operations-center-menu__trigger--critical');
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('opens the panel on click, rendering the merged bar plus missions and workflow queue', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: 'Operations center, all clear' }));

    expect(screen.getByRole('dialog', { name: 'Operations center' })).toBeInTheDocument();
    expect(screen.getByTestId('stub-ai-chief-bar')).toBeInTheDocument();
    expect(screen.getByTestId('stub-mission-bar')).toBeInTheDocument();
    expect(screen.getByTestId('stub-workflow-bar')).toBeInTheDocument();
    expect(screen.getByText('Open Command Center')).toBeInTheDocument();
  });

  it('closes the panel when the close button is clicked', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: 'Operations center, all clear' }));
    expect(screen.getByRole('dialog', { name: 'Operations center' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close operations center' }));
    expect(screen.queryByRole('dialog', { name: 'Operations center' })).not.toBeInTheDocument();
  });

  it('HEAL-272: closes the panel on Escape, not just click-outside/close-button', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: 'Operations center, all clear' }));
    expect(screen.getByRole('dialog', { name: 'Operations center' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Operations center' })).not.toBeInTheDocument();
  });

  it('renders nothing when the current route is not a hospital operational path', () => {
    const { container } = renderMenu('/settings');
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when every surface is hidden for this role', () => {
    surfaces = {
      showAiChiefBar: false,
      showThreeMinuteMissionBar: false,
      showWorkflowAutomationBar: false,
    };
    const { container } = renderMenu();
    expect(container).toBeEmptyDOMElement();
  });
});

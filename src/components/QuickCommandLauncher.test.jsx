import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import QuickCommandLauncher, { buildQuickCommandEntries } from './QuickCommandLauncher';
import { getUserFacingToolRegistryProjection } from '../data/toolInventory';
import {
  mockConversationValue,
  mockToolPreferencesValue,
} from '../test/testRenderUtils';

vi.mock('./QuickCommandLauncher.css', () => ({}));

vi.mock('../contexts/ConversationContext', () => ({
  useConversation: () => mockConversationValue,
}));

vi.mock('../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../contexts/UserContext', () => ({
  useUser: () => ({ user: { role: 'physician' } }),
}));

vi.mock('../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    account: { role: 'physician' },
    activeWorkspace: null,
    preferences: null,
    platformContext: null,
    workspaceState: { effectivePermissions: [] },
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function QuickCommandHost({ defaultOpen = false, isCompact = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open command host
      </button>
      <QuickCommandLauncher
        isOpen={open}
        isCompact={isCompact}
        onClose={() => setOpen(false)}
        themePreference="system"
        resolvedTheme="light"
        onCycleTheme={vi.fn()}
      />
      <LocationProbe />
    </>
  );
}

function renderQuickCommand(props = {}) {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <QuickCommandHost {...props} />
    </MemoryRouter>
  );
}

describe('QuickCommandLauncher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToolPreferencesValue.recentTools = ['qsofa', 'medical-iot-dashboard'];
  });

  it('opens and closes from the integrated launcher host', () => {
    renderQuickCommand();

    fireEvent.click(screen.getByRole('button', { name: /open command host/i }));
    expect(screen.getByRole('dialog', { name: /quick command/i })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /close quick command/i }).at(-1));
    expect(screen.queryByRole('dialog', { name: /quick command/i })).not.toBeInTheDocument();
  });

  it('closes on Escape and outside click', async () => {
    renderQuickCommand({ defaultOpen: true });

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /quick command/i })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /open command host/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /close quick command/i })[0]);
    expect(screen.queryByRole('dialog', { name: /quick command/i })).not.toBeInTheDocument();
  });

  it('filters commands and tools through unified inventory search', () => {
    renderQuickCommand({ defaultOpen: true });

    fireEvent.change(screen.getByLabelText(/search commands and tools/i), {
      target: { value: 'qsofa' },
    });

    expect(screen.getByRole('button', { name: /open qsofa/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open drug checker/i })).not.toBeInTheDocument();
  });

  it('launches tool entries through canonical route behavior', () => {
    renderQuickCommand({ defaultOpen: true });

    fireEvent.change(screen.getByLabelText(/search commands and tools/i), {
      target: { value: 'qsofa' },
    });
    fireEvent.click(screen.getByRole('button', { name: /open qsofa/i }));

    expect(mockToolPreferencesValue.recordToolAccess).toHaveBeenCalledWith('qsofa');
    expect(screen.getByTestId('location')).toHaveTextContent('/tools/calculators/qsofa');
    expect(screen.queryByRole('dialog', { name: /quick command/i })).not.toBeInTheDocument();
  });

  it('keeps command entries unique and inventory-backed', () => {
    const inventory = getUserFacingToolRegistryProjection();
    const inventoryIds = new Set(inventory.map((tool) => tool.id));
    const entries = buildQuickCommandEntries({
      tools: inventory,
      recentToolIds: ['qsofa', 'qsofa', 'medical-iot-dashboard'],
    });
    const commandIds = [
      ...entries.workspaceEntries,
      ...entries.navEntries,
      ...entries.recentEntries,
      ...entries.toolEntries,
    ].map((entry) => entry.id);

    expect(new Set(commandIds).size).toBe(commandIds.length);
    expect([...entries.recentEntries, ...entries.toolEntries].some((entry) => entry.sourceId === 'qsofa')).toBe(true);
    for (const entry of entries.toolEntries) {
      expect(inventoryIds.has(entry.sourceId), entry.sourceId).toBe(true);
    }
  });

  it('does not include non-launchable entitled-filtered tools', () => {
    const entries = buildQuickCommandEntries({
      tools: [
        { id: 'qsofa', name: 'qSOFA', description: 'Score', category: 'Calculator', path: '/tools/qsofa' },
        {
          id: 'locked-ai',
          name: 'Locked AI',
          description: 'Premium AI',
          category: 'AI',
          path: '/assistant',
          isLaunchable: false,
        },
      ],
      recentToolIds: ['locked-ai', 'qsofa'],
    });
    const toolIds = [...entries.recentEntries, ...entries.toolEntries].map((entry) => entry.sourceId);

    expect(toolIds).toContain('qsofa');
    expect(toolIds).not.toContain('locked-ai');
  });

  it('uses workspace-first destinations while keeping secondary routes searchable', () => {
    const entries = buildQuickCommandEntries({
      tools: getUserFacingToolRegistryProjection(),
      recentToolIds: [],
    });
    const workspaceIds = entries.workspaceEntries.map((entry) => entry.sourceId);
    const navIds = entries.navEntries.map((entry) => entry.sourceId);
    const toolIds = entries.toolEntries.map((entry) => entry.sourceId);

    expect(workspaceIds).toEqual(
      expect.arrayContaining([
        'emergency',
        'icu',
        'cardiology',
        'laboratory',
        'operations',
        'fleet',
        'medical-iot',
        'education',
        'research',
        'governance',
      ])
    );
    expect(navIds).toEqual(
      expect.arrayContaining([
        'workspace',
        'home',
        'assistant',
        'tools',
        'operations',
        'live-map',
        'hospital-map',
        'medical-iot',
        'devices',
        'fleet',
      ])
    );
    expect(navIds).not.toContain('calculators');
    expect(toolIds).not.toContain('live-tracking-map');
    expect(toolIds).not.toContain('device-fleet-management');
  });

  it('launches workspace entries as first-class command destinations', () => {
    renderQuickCommand({ defaultOpen: true });

    fireEvent.change(screen.getByLabelText(/search commands and tools/i), {
      target: { value: 'emergency workspace' },
    });
    fireEvent.click(screen.getByRole('button', { name: /open emergency workspace/i }));

    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/emergency');
  });

  it('keeps shared calculator-hub tools searchable instead of hiding them as nav duplicates', () => {
    const entries = buildQuickCommandEntries({
      tools: getUserFacingToolRegistryProjection(),
      recentToolIds: [],
    });
    const toolIds = entries.toolEntries.map((entry) => entry.sourceId);

    expect(toolIds).toEqual(expect.arrayContaining(['wells-pe', 'perc', 'grace-acs']));
    expect(toolIds).not.toContain('calculators');
  });

  it('finds simulation, laboratory, and 3D viewer launch entries', () => {
    const entries = buildQuickCommandEntries({
      tools: getUserFacingToolRegistryProjection(),
      recentToolIds: [],
    });
    const toolIds = entries.toolEntries.map((entry) => entry.sourceId);

    expect(toolIds).toEqual(
      expect.arrayContaining([
        'digital-operations-center',
        'clinical-documentation-assistant',
        'research-evidence-hub',
        'clinical-knowledge-graph',
        'predictive-analytics-dashboard',
        'clinical-decision-support',
        'competency-platform',
        'credentialing-platform',
        'simulation-suite',
        'scenario-player',
        'simulation-outcomes',
        'laboratory-dashboard',
        'medical-3d-viewer',
      ])
    );
  });
});

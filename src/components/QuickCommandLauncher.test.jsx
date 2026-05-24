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
});

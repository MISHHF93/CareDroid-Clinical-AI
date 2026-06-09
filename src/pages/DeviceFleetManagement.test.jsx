import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import DeviceFleetManagement from './DeviceFleetManagement';
import { fetchLiveTrackingCapability } from '../services/liveTrackingApi';
import { mockCompactViewport, mockToolPreferencesValue } from '../test/testRenderUtils';

vi.mock('../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../services/liveTrackingApi', () => ({
  fetchLiveTrackingCapability: vi.fn(),
}));

function renderDevices() {
  return render(
    <MemoryRouter initialEntries={['/devices']}>
      <DeviceFleetManagement />
    </MemoryRouter>
  );
}

describe('DeviceFleetManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompactViewport(false);
    fetchLiveTrackingCapability.mockResolvedValue({
      ok: false,
      unsupported: false,
      message: 'Backend unavailable in test.',
    });
  });

  it('renders /devices with demo labels, inventory, maintenance, firmware, and telemetry state', async () => {
    renderDevices();

    expect(await screen.findByRole('heading', { level: 1, name: /device fleet management/i })).toBeInTheDocument();
    expect(screen.getByText(/demo\/local actions only/i)).toBeInTheDocument();
    expect(screen.getAllByText(/demo hospital map telemetry/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /ask assistant/i })[0]).toHaveAttribute('href', '/assistant');
    expect(screen.getByRole('heading', { name: /device inventory/i })).toBeInTheDocument();
    expect(screen.getAllByText(/firmware/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/maintenance/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/calibration/i).length).toBeGreaterThan(0);
  });

  it('filters devices and opens the detail panel with location history placeholder', async () => {
    const user = userEvent.setup();
    renderDevices();

    await screen.findByRole('heading', { level: 1, name: /device fleet management/i });
    await user.selectOptions(screen.getByRole('combobox', { name: /maintenance/i }), 'overdue');
    expect(screen.getByText(/room 210 glucose monitor/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /view details/i }));
    const detail = screen.getByRole('complementary', { name: /room 210 glucose monitor details/i });
    expect(within(detail).getByText(/firmware/i)).toBeInTheDocument();
    expect(within(detail).getByText(/No live location history endpoint is connected/i)).toBeInTheDocument();
    expect(within(detail).getByText(/calibration/i)).toBeInTheDocument();
  });

  it('keeps write-like actions local and visibly labeled as demo only', async () => {
    const user = userEvent.setup();
    renderDevices();

    await screen.findByRole('heading', { level: 1, name: /device fleet management/i });
    await user.click(screen.getAllByRole('button', { name: /mark maintenance needed/i })[0]);

    expect(await screen.findByText(/demo\/local only\. no backend write api was called/i)).toBeInTheDocument();
  });

  it('keeps the device fleet workspace available under compact mobile layout', async () => {
    mockCompactViewport(true);
    const { container } = renderDevices();

    expect(await screen.findByRole('heading', { level: 1, name: /device fleet management/i })).toBeInTheDocument();
    expect(container.querySelector('.device-fleet-page')).toBeTruthy();
    expect(container.querySelector('.device-fleet-table-wrap')).toBeTruthy();
    expect(container.querySelector('.device-fleet-detail')).toBeTruthy();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import HospitalMapDashboard from './HospitalMapDashboard';
import { fetchLiveTrackingCapability } from '../services/liveTrackingApi';
import {
  mockConversationValue,
  mockToolPreferencesValue,
  mockCompactViewport,
} from '../test/testRenderUtils';

vi.mock('../contexts/ConversationContext', () => ({
  useConversation: () => mockConversationValue,
}));

vi.mock('../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../services/liveTrackingApi', () => ({
  fetchLiveTrackingCapability: vi.fn(),
}));

function renderHospitalMap() {
  return render(
    <MemoryRouter initialEntries={['/hospital-map']}>
      <HospitalMapDashboard />
    </MemoryRouter>
  );
}

describe('HospitalMapDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompactViewport(false);
    fetchLiveTrackingCapability.mockResolvedValue({
      ok: false,
      unsupported: false,
      message: 'Backend unavailable in test.',
    });
  });

  it('renders the route with demo data labels and first-class hospital map content', async () => {
    renderHospitalMap();

    expect(await screen.findByRole('heading', { level: 1, name: /^hospital map$/i })).toBeInTheDocument();
    expect(screen.getByText(/demo hospital map telemetry/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /hospital floor plan/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Bed 12A/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /device fleet management/i })).toBeInTheDocument();
  });

  it('renders device markers and opens the detail drawer', async () => {
    const user = userEvent.setup();
    renderHospitalMap();

    const marker = await screen.findByRole('button', { name: /open bed 12 pulse oximeter details/i });
    await user.click(marker);

    const drawer = screen.getByRole('complementary', { name: /bed 12 pulse oximeter details/i });
    expect(within(drawer).getByRole('heading', { name: /bed 12 pulse oximeter/i })).toBeInTheDocument();
    expect(within(drawer).getByRole('heading', { name: /telemetry parameters/i })).toBeInTheDocument();
    expect(within(drawer).getByText(/last seen:/i)).toBeInTheDocument();
  });

  it('renders normalized backend demo contract data without crashing', async () => {
    const user = userEvent.setup();
    fetchLiveTrackingCapability.mockImplementation((_capability, path) => {
      if (path === '/api/hospital-map/floors') {
        return Promise.resolve({
          ok: true,
          sourceLabel: 'Backend demo hospital map contract',
          generatedAt: '2026-05-24T12:00:00.000Z',
          payload: {
            floors: [{ id: 'floor-2', name: 'ICU', level: 2 }],
            units: [{ id: 'icu', floorId: 'floor-2', name: 'ICU' }],
            rooms: [
              {
                id: 'icu-12',
                floorId: 'floor-2',
                unitId: 'icu',
                name: 'ICU 12',
                x: 84,
                y: 82,
                width: 210,
                height: 145,
              },
            ],
            beds: [{ id: 'bed-12a', roomId: 'icu-12', label: 'Bed 12A' }],
          },
        });
      }

      return Promise.resolve({
        ok: true,
        generatedAt: '2026-05-24T12:00:00.000Z',
        message: 'Backend demo hospital devices returned.',
        payload: {
          devices: [
            {
              id: 'pump-icu-12',
              name: 'ICU 12 Backend Pump',
              type: 'Infusion pump',
              status: 'warning',
              freshness: 'stale',
              floorId: 'floor-2',
              unitId: 'icu',
              roomId: 'icu-12',
              bedId: 'bed-12a',
              battery: 18,
              maintenanceStatus: 'due-soon',
              calibrationStatus: 'ok',
              lastSeenAt: '2026-05-24T11:40:00.000Z',
              location: { x: 420, y: 180, source: 'Backend demo floor coordinate' },
              telemetry: { infusionPumpState: 'Running' },
            },
          ],
          alerts: [
            {
              id: 'pump-low-battery',
              deviceId: 'pump-icu-12',
              severity: 'medium',
              status: 'active',
              title: 'Backend low battery',
              detail: 'Battery below threshold.',
              timestamp: '2026-05-24T11:40:00.000Z',
            },
          ],
        },
      });
    });

    renderHospitalMap();

    expect(await screen.findByText(/backend demo hospital map contract/i)).toBeInTheDocument();
    const marker = screen.getByRole('button', { name: /open icu 12 backend pump details/i });
    await user.click(marker);

    const drawer = screen.getByRole('complementary', { name: /icu 12 backend pump details/i });
    expect(within(drawer).getByText(/infusion pump in icu \/ icu 12 \/ bed 12a/i)).toBeInTheDocument();
    expect(within(drawer).getByText(/backend low battery/i)).toBeInTheDocument();
    expect(within(drawer).getByText(/infusion pump state/i)).toBeInTheDocument();
  });

  it('shows stale and offline warnings with timestamps', async () => {
    const user = userEvent.setup();
    renderHospitalMap();

    await user.selectOptions(await screen.findByRole('combobox', { name: /^status$/i }), 'offline');
    expect(await screen.findByRole('button', { name: /open icu-15 telemetry patch details/i })).toBeInTheDocument();
    expect(screen.getAllByText(/offline/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/last seen required/i)).toBeInTheDocument();
  });

  it('filters active alerts and keeps alert cards wired to devices', async () => {
    const user = userEvent.setup();
    renderHospitalMap();

    await screen.findByRole('heading', { level: 1, name: /^hospital map$/i });
    await user.click(screen.getByLabelText(/active alerts only/i));

    expect(screen.getByRole('button', { name: /low oxygen saturation/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /low oxygen saturation/i }));
    await waitFor(() => {
      expect(screen.getByRole('complementary', { name: /bed 12 pulse oximeter details/i })).toBeInTheDocument();
    });
  });

  it('survives compact viewport without horizontal document overflow contract markers', async () => {
    mockCompactViewport(true);
    const { container } = renderHospitalMap();

    expect(await screen.findByRole('heading', { level: 1, name: /^hospital map$/i })).toBeInTheDocument();
    expect(container.querySelector('.hospital-map-page')).toBeTruthy();
    expect(container.querySelector('.hospital-map-canvas')).toBeTruthy();
    expect(container.querySelector('.hospital-map-detail')).toBeTruthy();
  });
});

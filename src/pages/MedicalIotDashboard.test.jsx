import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MedicalIotDashboard from './MedicalIotDashboard';
import { mockCompactViewport } from '../test/testRenderUtils';
import {
  buildDemoMedicalIotSnapshot,
  MEDICAL_IOT_EMPTY_SNAPSHOT,
} from '../services/medicalIotService';

const mocks = vi.hoisted(() => ({
  fetchMedicalIotSnapshot: vi.fn(),
}));

vi.mock('./MedicalIotDashboard.css', () => ({}));

vi.mock('../services/medicalIotService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchMedicalIotSnapshot: (...args) => mocks.fetchMedicalIotSnapshot(...args),
  };
});

function renderMedicalIot() {
  return render(
    <MemoryRouter initialEntries={['/medical-iot']}>
      <MedicalIotDashboard />
    </MemoryRouter>
  );
}

describe('MedicalIotDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompactViewport(false);
    mocks.fetchMedicalIotSnapshot.mockResolvedValue({
      ok: true,
      unsupported: true,
      snapshot: buildDemoMedicalIotSnapshot(new Date('2026-05-24T05:00:00.000Z')),
      message: 'Dedicated Medical IoT backend endpoints are not implemented yet.',
    });
  });

  it('renders the Medical IoT dashboard route with demo telemetry clearly labeled', async () => {
    renderMedicalIot();

    expect(screen.getByRole('heading', { level: 1, name: /medical iot dashboard/i })).toBeInTheDocument();
    expect((await screen.findAllByText(/demo telemetry/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/monitoring support only/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/mock telemetry, not live patient data/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Bed 12 Pulse Oximeter/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SpO2/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Respiratory rate/i)).toBeInTheDocument();
    expect(screen.getByText(/Temperature/i)).toBeInTheDocument();
    expect(screen.getByText(/Oxygen flow/i)).toBeInTheDocument();
    expect(screen.getByText(/Infusion state/i)).toBeInTheDocument();
    expect(screen.getByText(/Ventilator mode/i)).toBeInTheDocument();
    expect(screen.getByText(/device status distribution/i)).toBeInTheDocument();
    expect(screen.getByText(/heart rate trend/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /device location map/i })).toBeInTheDocument();
  });

  it('renders location markers, filters devices, and opens detail drawer', async () => {
    const user = userEvent.setup();
    renderMedicalIot();

    const marker = await screen.findByRole('button', { name: /open bed 12 pulse oximeter details/i });
    await user.click(marker);

    const drawer = screen.getByRole('complementary', { name: /bed 12 pulse oximeter details/i });
    expect(within(drawer).getByText(/icu \/ bed 12a/i)).toBeInTheDocument();
    expect(within(drawer).getByText(/demo bedside gateway coordinate/i)).toBeInTheDocument();
    expect(within(drawer).getByText(/signal strength/i)).toBeInTheDocument();
    expect(within(drawer).getByText(/low oxygen saturation/i)).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: /status/i }), 'offline');
    expect(screen.getByRole('button', { name: /open home bp cuff details/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open bed 12 pulse oximeter details/i })).not.toBeInTheDocument();
  });

  it('renders offline device warnings with timestamps and source', async () => {
    renderMedicalIot();

    expect(await screen.findByText(/Offline device warning/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Home BP Cuff/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/offline/i).length).toBeGreaterThan(0);
  });

  it('renders an empty connected-device state', async () => {
    mocks.fetchMedicalIotSnapshot.mockResolvedValue({
      ok: true,
      unsupported: true,
      snapshot: MEDICAL_IOT_EMPTY_SNAPSHOT,
      message: 'No telemetry configured.',
    });

    renderMedicalIot();

    expect(await screen.findByRole('heading', { name: /no connected medical devices/i })).toBeInTheDocument();
    expect(screen.getByText(/no vitals streams are reporting/i)).toBeInTheDocument();
  });

  it('renders backend failure state with retry affordance', async () => {
    mocks.fetchMedicalIotSnapshot.mockRejectedValue(new Error('Medical IoT backend unavailable'));

    renderMedicalIot();

    expect(await screen.findByRole('alert')).toHaveTextContent(/medical iot backend unavailable/i);
    expect(screen.getByRole('button', { name: /retry loading medical iot telemetry/i })).toBeInTheDocument();
  });

  it('keeps Medical IoT map layout present in compact viewport', async () => {
    mockCompactViewport(true);
    const { container } = renderMedicalIot();

    expect(await screen.findByRole('heading', { name: /device location map/i })).toBeInTheDocument();
    expect(container.querySelector('.medical-iot-location-workspace')).toBeTruthy();
    expect(container.querySelector('.medical-iot-map-canvas')).toBeTruthy();
    expect(container.querySelector('.medical-iot-detail')).toBeTruthy();
  });
});

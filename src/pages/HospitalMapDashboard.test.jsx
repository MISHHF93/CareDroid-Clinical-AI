import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import HospitalMapDashboard from './HospitalMapDashboard';
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
  });

  it('renders the route with demo data labels and first-class hospital map content', async () => {
    renderHospitalMap();

    expect(await screen.findByRole('heading', { level: 1, name: /^hospital map$/i })).toBeInTheDocument();
    expect(screen.getByText(/demo hospital map telemetry/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /hospital floor plan/i })).toBeInTheDocument();
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

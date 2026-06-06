import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AutomationAuditTrail from './AutomationAuditTrail';
import { resetAutomationAuditTrail } from '../data/automationAuditTrail';

vi.mock('../services/automationAuditApi', () => ({
  fetchAutomationAuditEntries: vi.fn().mockResolvedValue({
    ok: false,
    message: 'Automation audit API is unavailable; showing local fallback entries.',
  }),
}));

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/automation-audit']}>
      <Routes>
        <Route path="/automation-audit" element={<AutomationAuditTrail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AutomationAuditTrail', () => {
  beforeEach(() => {
    resetAutomationAuditTrail();
  });

  it('renders the /automation-audit route', async () => {
    renderRoute();

    expect(screen.getByRole('heading', { level: 1, name: /automation audit/i })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(/no invisible automation/i);
    expect(await screen.findByRole('status')).toHaveTextContent(/local audit fallback active/i);
    expect(screen.getByLabelText(/automation audit entries/i)).toHaveTextContent(/high news2 threshold reached/i);
  });

  it('shows successful, blocked, and reviewer-required audit metadata for the selected tenant', async () => {
    renderRoute();
    await screen.findByRole('status');

    const summary = screen.getByLabelText(/automation audit summary/i);
    expect(within(summary).getByText(/total events/i).nextSibling).toHaveTextContent('2');
    expect(within(summary).getByText(/succeeded/i).nextSibling).toHaveTextContent('1');
    expect(within(summary).getByText(/blocked/i).nextSibling).toHaveTextContent('1');
    expect(within(summary).getByText(/reviewer required/i).nextSibling).toHaveTextContent('1');
    expect(screen.getByText(/blocked reason: device maintenance backend capability is disabled/i)).toBeInTheDocument();
    expect(screen.getByText(/notify clinician escalation pool/i)).toBeInTheDocument();
  });

  it('filters audit entries by tenant', async () => {
    renderRoute();
    await screen.findByRole('status');

    expect(screen.queryByText(/laboratory workflow route returned 503/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/tenant scope/i), {
      target: { value: 'tenant-research-clinic' },
    });

    expect(screen.getByLabelText(/automation audit entries/i)).toHaveTextContent(/abnormal potassium critical result/i);
    expect(screen.getByText(/error: laboratory workflow route returned 503/i)).toBeInTheDocument();
    expect(screen.queryByText(/high news2 threshold reached/i)).not.toBeInTheDocument();
  });
});

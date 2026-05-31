import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlatformSelfDiagnostics from './PlatformSelfDiagnostics';

describe('PlatformSelfDiagnostics', () => {
  it('renders the health score and Critical, Warning, Healthy status groups', () => {
    render(<PlatformSelfDiagnostics />);

    expect(
      screen.getByRole('heading', { name: /platform self-diagnostics/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/self diagnostics health score/i)).toHaveTextContent(/\/100/i);
    expect(screen.getByRole('region', { name: /critical diagnostics/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /warning diagnostics/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /healthy diagnostics/i })).toBeInTheDocument();
    expect(screen.getByText(/routes, apis, inventory, auth/i)).toBeInTheDocument();
  });

  it('filters diagnostics by category', async () => {
    const user = userEvent.setup();
    render(<PlatformSelfDiagnostics />);

    const toolbar = screen.getByRole('region', { name: /diagnostics category filter/i });
    await user.selectOptions(within(toolbar).getByRole('combobox'), 'assets');

    const healthySection = screen.getByRole('region', { name: /healthy diagnostics/i });
    expect(within(healthySection).getByText(/required public shell assets/i)).toBeInTheDocument();
    expect(screen.queryByText(/authentication backend routes exist/i)).not.toBeInTheDocument();
  });
});

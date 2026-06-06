import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkflowAutomationBuilder from './WorkflowAutomationBuilder';

describe('WorkflowAutomationBuilder', () => {
  it('renders trigger condition action automation examples', () => {
    render(<WorkflowAutomationBuilder />);

    expect(screen.getByRole('heading', { name: /^automation$/i })).toBeInTheDocument();
    expect(screen.getByText(/demo-only legacy builder/i)).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(/demo preview only/i);
    expect(screen.getByRole('link', { name: /open canonical workflows/i })).toHaveAttribute(
      'href',
      '/workflows'
    );
    expect(screen.getByRole('button', { name: /high news2 escalation/i })).toHaveTextContent(
      /high news2 -> patient is admitted -> notify clinician/i
    );
    expect(screen.getByRole('button', { name: /offline device maintenance/i })).toHaveTextContent(
      /device offline -> device has assigned owner -> create maintenance ticket/i
    );
    expect(screen.getByRole('button', { name: /abnormal potassium lab workflow/i })).toHaveTextContent(
      /abnormal potassium -> critical result confirmed -> open laboratory workflow/i
    );
  });

  it('updates the preview when the user changes trigger condition and action', async () => {
    const user = userEvent.setup();
    render(<WorkflowAutomationBuilder />);

    await user.selectOptions(screen.getByLabelText(/^trigger$/i), 'abnormal-potassium');
    await user.selectOptions(screen.getByLabelText(/^condition$/i), 'always');
    await user.selectOptions(screen.getByLabelText(/^action$/i), 'open-laboratory-workflow');

    expect(screen.getByLabelText(/automation preview/i)).toHaveTextContent(
      /abnormal potassium -> always run -> open laboratory workflow/i
    );
    expect(screen.getByText(/^demo preview$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/automation preview/i)).toHaveTextContent(/not scheduled, not queued, not saved/i);
  });
});

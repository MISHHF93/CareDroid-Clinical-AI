/* eslint-disable jsx-a11y/aria-role -- `role` here is InteractiveAIWorkspace's own user-role prop (e.g. "reception-lead"), not a DOM ARIA role attribute; the rule can't tell literal-string component props apart from native elements. */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InteractiveAIWorkspace } from './InteractiveAIWorkspace';

describe('InteractiveAIWorkspace', () => {
  it('picks a channel-appropriate heading when no title override is given', () => {
    render(<InteractiveAIWorkspace role="reception-lead" channel="reception" />);
    expect(screen.getByRole('heading', { name: /reception copilot/i })).toBeInTheDocument();
  });

  it('falls back to the generic CareDroid Assist heading for an unrecognized channel', () => {
    render(<InteractiveAIWorkspace role="physician" channel="whiteboard" />);
    expect(screen.getByRole('heading', { name: /caredroid assist/i })).toBeInTheDocument();
  });

  it('renders context chips for the channel, role, and an attached patient', () => {
    render(<InteractiveAIWorkspace role="charge-nurse" channel="ems" patientId="patient-42" />);
    const contextBar = screen.getByTestId('interactive-context-bar');
    expect(contextBar).toHaveTextContent('Channel: ems');
    expect(contextBar).toHaveTextContent('Role: charge-nurse');
    expect(contextBar).toHaveTextContent('Patient: patient-42');
  });

  it('toggles the inbox visibility and its pressed state when the Inbox button is clicked', async () => {
    const user = userEvent.setup();
    render(<InteractiveAIWorkspace role="reception-lead" channel="reception" />);
    const inboxButton = screen.getByRole('button', { name: 'Inbox' });
    expect(inboxButton).toHaveAttribute('aria-pressed', 'true');

    await user.click(inboxButton);
    expect(inboxButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('lets the user type into the composer and enables Send once there is input', async () => {
    const user = userEvent.setup();
    render(<InteractiveAIWorkspace role="reception-lead" channel="reception" />);
    const textarea = screen.getByLabelText('Assist message');
    const sendButton = screen.getByRole('button', { name: 'Send' });
    expect(sendButton).toBeDisabled();

    await user.type(textarea, 'Where is bed 4?');
    expect(sendButton).not.toBeDisabled();
  });
});

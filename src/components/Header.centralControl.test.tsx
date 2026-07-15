import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { UserProvider } from '../contexts/UserContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { Header } from './Header';

vi.mock('../contexts/NotificationShellContext', () => ({
  useNotificationShell: () => ({
    visibleNotificationAlerts: [],
    openPanel: vi.fn(),
    recordAlertAcknowledged: vi.fn(),
    openAlertRoute: vi.fn(() => null),
  }),
  NotificationShellProvider: ({ children }: { children: unknown }) => children,
}));

function renderHeader() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <UserProvider>
          <Header />
        </UserProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('Header chrome (caredroid-header)', () => {
  it('renders identity, search, create, and account', () => {
    renderHeader();

    const header = screen.getByRole('banner');
    expect(header).toHaveClass('caredroid-header');
    expect(
      within(header).getByRole('searchbox', { name: /operational search|patient search/i }),
    ).toBeInTheDocument();
    expect(within(header).getByRole('button', { name: /create patient/i })).toBeInTheDocument();
    expect(within(header).getByRole('button', { name: /Account menu for/i })).toBeInTheDocument();
  });

  it('has no Guide control in the header (Guide is sidebar-only)', () => {
    renderHeader();

    const header = screen.getByRole('banner');
    expect(within(header).queryByLabelText('Department status')).toBeNull();
    // Guide must not appear as a button, link, or labeled control in the top bar
    expect(within(header).queryByRole('button', { name: /^Guide$/i })).toBeNull();
    expect(within(header).queryByRole('link', { name: /^Guide$/i })).toBeNull();
    expect(within(header).queryByRole('button', { name: /open caredroid guide|process guide/i })).toBeNull();
    expect(within(header).queryByTitle(/process guide/i)).toBeNull();
    expect(within(header).queryByText(/Central Node/i)).toBeNull();
    // Sidebar owns the single Guide entry — header actions are alarms/create/account only
    expect(header.querySelector('.help-trigger')).toBeNull();
    expect(header.querySelector('.help-trigger--icon')).toBeNull();
  });

  it('places create before search in the header DOM', () => {
    renderHeader();

    const header = screen.getByRole('banner');
    const search = within(header).getByRole('searchbox');
    const create = within(header).getByRole('button', { name: /create patient/i });
    expect(
      Boolean(create.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
  });
});

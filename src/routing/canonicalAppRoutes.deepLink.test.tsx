import React, { Suspense } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../contexts/ThemeContext';
import { UserProvider } from '../contexts/UserContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { ConversationProvider } from '../contexts/ConversationContext';
import { ToolPreferencesProvider } from '../contexts/ToolPreferencesContext';
import { WorkspaceProvider } from '../contexts/WorkspaceContext';
import { OrganizationContextProvider } from '../contexts/OrganizationContext';
import { WhiteLabelProvider } from '../contexts/WhiteLabelContext';
import { UserIdentityProvider } from '../contexts/UserIdentityContext';
import { CostTrackingProvider } from '../contexts/CostTrackingContext';
import { SystemConfigProvider } from '../contexts/SystemConfigContext';
import { TenantContextProvider } from '../contexts/TenantContext';
import { AppRoutes } from '../App';

vi.mock('../services/clinicalChatService', () => ({
  sendClinicalChatMessage: vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    data: { response: 'AI generated handoff brief.' },
  }),
  mapChatResponseToAssistantMessage: vi.fn(),
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.hash}`}</output>;
}

function AppRouteHarness({ initialPath }) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <ThemeProvider>
        <UserProvider>
          <NotificationProvider>
            <WorkspaceProvider>
              <CostTrackingProvider>
                <ToolPreferencesProvider>
                  <TenantContextProvider>
                    <UserIdentityProvider>
                      <OrganizationContextProvider>
                        <WhiteLabelProvider>
                          <ConversationProvider>
                            <SystemConfigProvider>
                              <Suspense fallback={<div>Loading route</div>}>
                                <AppRoutes />
                                <LocationProbe />
                              </Suspense>
                            </SystemConfigProvider>
                          </ConversationProvider>
                        </WhiteLabelProvider>
                      </OrganizationContextProvider>
                    </UserIdentityProvider>
                  </TenantContextProvider>
                </ToolPreferencesProvider>
              </CostTrackingProvider>
            </WorkspaceProvider>
          </NotificationProvider>
        </UserProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('canonical App routes deep links', () => {
  it('renders /emergency/ems inside the AppShell', async () => {
    render(<AppRouteHarness initialPath="/emergency/ems" />);

    expect(await screen.findByRole('link', { name: 'EMS' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      screen.getByRole('complementary', { name: /emergency navigation/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('banner').some((banner) => banner.textContent?.includes('CareDroid')),
    ).toBe(true);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/emergency/ems');
  });

  it('redirects /settings/features to Feature Flags', async () => {
    render(<AppRouteHarness initialPath="/settings/features#feature-toolsShareResults" />);

    expect(await screen.findByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/feature-flags#feature-toolsShareResults',
    );
  }, 20_000);

  it('redirects the retired assistant alias to CareDroid Copilot', async () => {
    render(<AppRouteHarness initialPath="/assistant?agent=agent-emergency" />);

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/emergency/copilot'),
    );
  }, 20_000);

  it('mounts the OAuth callback route before wildcard redirects', async () => {
    render(<AppRouteHarness initialPath="/auth-callback" />);

    expect(await screen.findByRole('heading', { name: /complete sign-in/i })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/auth-callback');
  });

  it('mounts the auth route before wildcard redirects', async () => {
    render(<AppRouteHarness initialPath="/auth" />);

    expect(await screen.findByRole('heading', { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/auth');
  });

  it('mounts configured sign-in and signup aliases before wildcard redirects', async () => {
    render(<AppRouteHarness initialPath="/account/login" />);

    expect(await screen.findByRole('heading', { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/account/login');
  });

  it('redirects configured account creation aliases to signup mode', async () => {
    render(<AppRouteHarness initialPath="/create-account" />);

    expect(await screen.findByRole('heading', { name: /create account for/i })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/auth');
  });

  it('mounts the welcome onboarding route before wildcard redirects', async () => {
    render(<AppRouteHarness initialPath="/welcome" />);

    expect(await screen.findByRole('heading', { name: /choose your role/i })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/welcome');
  });

  it('mounts personalized discovery instead of the route inventory page', async () => {
    render(<AppRouteHarness initialPath="/discover" />);

    expect(
      await screen.findByRole('heading', { name: /discover caredroid capabilities/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/discover');
  });

  it('mounts the AI command center and aliases', async () => {
    render(<AppRouteHarness initialPath="/ai-command-center" />);

    expect(await screen.findByRole('heading', { name: /^ai command center$/i })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/ai-command-center');
  });

  it('mounts local shared tool sessions before wildcard redirects', async () => {
    render(<AppRouteHarness initialPath="/shared/tools/missing-share" />);

    expect(await screen.findByRole('heading', { name: /session not found/i })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/shared/tools/missing-share');
  });
});

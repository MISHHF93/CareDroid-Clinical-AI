import React, { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
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
  return <output data-testid="location">{location.pathname}</output>;
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

    expect(await screen.findByRole('heading', { name: 'EMS Pipeline' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: /emergency navigation/i })).toBeInTheDocument();
    expect(screen.getAllByRole('banner').some((banner) => banner.textContent?.includes('Emergency OS'))).toBe(true);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('redirects /settings/features to Emergency OS settings', async () => {
    render(<AppRouteHarness initialPath="/settings/features" />);

    expect(await screen.findByRole('heading', { name: 'Emergency OS Settings' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/emergency/settings');
  });

  it('redirects the retired assistant alias to the Emergency OS whiteboard', async () => {
    render(<AppRouteHarness initialPath="/assistant?agent=agent-emergency" />);

    expect(await screen.findByText('Total')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/emergency/whiteboard');
  });
});

import React, { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

vi.mock('../components/ChatInterface', () => ({
  default: ({ prefillText = '' }) => <div data-testid="copilot-chat">{prefillText || 'Copilot chat'}</div>,
}));

vi.mock('../components/EMSPipeline', () => ({
  default: () => <h1>EMS Pipeline</h1>,
}));

vi.mock('../pages/settings/FeatureManagement', () => ({
  default: () => <h1>FeatureTogglePanel</h1>,
}));

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
    expect(screen.getByRole('complementary', { name: /emergency os navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('banner', { name: /emergency os header/i })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('data-layout-role', 'MainContent');
  });

  it('renders /settings/features inside the AppShell', async () => {
    render(<AppRouteHarness initialPath="/settings/features" />);

    expect(await screen.findByRole('heading', { name: 'FeatureTogglePanel' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /settings tabs/i })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: /emergency os navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('data-layout-role', 'MainContent');
  });

  it('preserves assistant agent launch context through the ED Copilot alias', async () => {
    render(<AppRouteHarness initialPath="/assistant?agent=agent-emergency" />);

    expect(await screen.findByTestId('copilot-chat')).toHaveTextContent(
      /Use Emergency AI \(agent-emergency\)/
    );
  });
});

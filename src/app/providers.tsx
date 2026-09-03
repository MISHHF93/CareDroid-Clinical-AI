import type { ReactNode } from 'react';
import { ThemeProvider } from '../contexts/ThemeContext';
import { UserProvider } from '../contexts/UserContext';
import { ConversationProvider } from '../contexts/ConversationContext';
import { ToolPreferencesProvider } from '../contexts/ToolPreferencesContext';
import { WorkspaceProvider } from '../contexts/WorkspaceContext';
import { OrganizationContextProvider } from '../contexts/OrganizationContext';
import { WhiteLabelProvider } from '../contexts/WhiteLabelContext';
import { UserIdentityProvider } from '../contexts/UserIdentityContext';
import { SystemConfigProvider } from '../contexts/SystemConfigContext';
import { TenantContextProvider } from '../contexts/TenantContext';
import OfflineProvider from '../contexts/OfflineProvider';
import { SimulationModeProvider } from '../contexts/SimulationModeContext';
import { useThreeMinuteTimerEngine } from '../hooks/useThreeMinuteTimerEngine';

function ThreeMinuteTimerEngineMount() {
  useThreeMinuteTimerEngine();
  return null;
}

type AppProvidersProps = Readonly<{
  children: ReactNode;
}>;

/** Single provider tree for the unified CareDroid ED application. */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <UserProvider>
        <WorkspaceProvider>
          <ToolPreferencesProvider>
            <TenantContextProvider>
              <UserIdentityProvider>
                <OrganizationContextProvider>
                  <WhiteLabelProvider>
                    <ConversationProvider>
                      <SystemConfigProvider>
                        <OfflineProvider>
                          <SimulationModeProvider>
                            <ThreeMinuteTimerEngineMount />
                            {children}
                          </SimulationModeProvider>
                        </OfflineProvider>
                      </SystemConfigProvider>
                    </ConversationProvider>
                  </WhiteLabelProvider>
                </OrganizationContextProvider>
              </UserIdentityProvider>
            </TenantContextProvider>
          </ToolPreferencesProvider>
        </WorkspaceProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '../components/AppShell';
import { EMERGENCY_OS_ROUTE_COMMANDS } from '../config/commandPalette.config';
import { APP_SHELL_NAV_ITEMS } from '../config/navigation.config';
import {
  NAVIGATION_ITEMS,
  getPilotCustomerNavigationItems,
} from '../config/unified-navigation.config';

const { navigateMock, shellLocation, emergencyStoreState } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  shellLocation: { pathname: '/emergency/whiteboard' },
  emergencyStoreState: {
    patients: [],
    copilotOpen: false,
    toggleCopilot: vi.fn(),
    setCopilotOpen: vi.fn(),
    selectPatient: vi.fn(),
    initializeFromBackend: vi.fn().mockResolvedValue(undefined),
    updateAlerts: vi.fn(),
    setWebSocketStatus: vi.fn(),
    emergencySettings: {
      defaultScreenMode: 'clinical',
      readOnlyDisplayMode: false,
    },
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => shellLocation,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

const emergencyRoleMock = vi.hoisted(() => {
  const { withEmergencyRoleMock } = require('../test/permissiveEmergencyRoleMock.ts');
  return withEmergencyRoleMock({ role: 'physician', nearestRoute: () => '/emergency/whiteboard' });
});

vi.mock('../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => emergencyRoleMock,
  default: () => emergencyRoleMock,
}));

vi.mock('../components/account/DemoPersonaPanel', () => ({
  default: () => null,
}));

vi.mock('../components/chrome/SessionChromeBar', () => ({
  default: () => null,
}));

vi.mock('../store/emergencyStore', () => {
  const useEmergencyStore = (selector) =>
    typeof selector === 'function' ? selector(emergencyStoreState) : emergencyStoreState;
  useEmergencyStore.getState = () => emergencyStoreState;
  useEmergencyStore.setState = vi.fn((partial) => {
    const nextState = typeof partial === 'function' ? partial(emergencyStoreState) : partial;
    Object.assign(emergencyStoreState, nextState);
  });
  return { useEmergencyStore };
});

vi.mock('../engine/reassessmentEngine', () => ({
  startReassessmentEngine: () => 0,
}));

vi.mock('../engine/capacityEngine', () => ({
  startCapacityEngine: () => 0,
}));

vi.mock('../services/emergencyRealtimeService', () => ({
  default: () => () => {},
}));

vi.mock('../components/Sidebar', () => ({
  Sidebar: () => <nav aria-label="Mock sidebar" />,
}));

vi.mock('../components/Header', () => ({
  Header: ({ pageTitle }) => <header>{pageTitle}</header>,
}));

vi.mock('../components/ErrorBoundary', () => ({
  default: ({ children }) => <>{children}</>,
}));

vi.mock('../components/PatientDetailPanel', () => ({
  default: () => null,
}));

vi.mock('../components/CopilotPanel', () => ({
  CopilotPanel: () => null,
}));

vi.mock('../components/CommandPalette', () => ({
  default: () => null,
}));

vi.mock('../components/EMSCriticalBroadcast', () => ({
  default: () => null,
}));

vi.mock('../components/ReassessmentDrawer', () => ({
  default: () => null,
}));

const __dirname = dirname(fileURLToPath(import.meta.url));
const appShellSource = readFileSync(join(__dirname, '../components/AppShell.tsx'), 'utf8');
const navigationConfig = readFileSync(join(__dirname, '../config/navigation.config.ts'), 'utf8');
const commandPaletteSource = readFileSync(
  join(__dirname, '../config/commandPalette.config.ts'),
  'utf8',
);

const PILOT_SIDEBAR_ITEMS = getPilotCustomerNavigationItems(NAVIGATION_ITEMS);
const CANONICAL_SIDEBAR_PATHS = PILOT_SIDEBAR_ITEMS.map((item) => item.path);

describe('AppShell navigation surfaces', () => {
  beforeEach(() => {
    navigateMock.mockClear();
    emergencyStoreState.selectPatient.mockClear();
    emergencyStoreState.initializeFromBackend.mockClear();
  });

  it('renders the canonical Sidebar and no legacy rail or bottom navigation component', () => {
    expect(appShellSource).toContain('<Sidebar navigationItems={visibleNavigationItems} />');
    expect(appShellSource).not.toContain('className="ed-nav-rail"');
    expect(appShellSource).not.toContain('app-shell-bottom-nav');
  });

  it('keeps nav items projected from the canonical unified config', () => {
    expect(navigationConfig).toContain('export const APP_SHELL_NAV_ITEMS');
    expect(navigationConfig).toContain(
      "from './unified-navigation.config'",
    );
    expect(appShellSource).not.toContain('SIDEBAR_ICON_COMPONENTS');
    expect(APP_SHELL_NAV_ITEMS.map((item) => item.featureGate)).toEqual(
      PILOT_SIDEBAR_ITEMS.map((item) => item.featureGate),
    );
  });

  it('keeps each rail item wired to a route and active path list', () => {
    for (const item of APP_SHELL_NAV_ITEMS) {
      expect(item.path, item.id).toMatch(/^\//);
      expect(item.route, item.id).toMatch(/^\//);
      expect(item.iconKey, item.id).toMatch(/^[a-z0-9-]+$/);
      expect(item.activePaths.length, item.id).toBeGreaterThan(0);
      expect(
        item.activePaths.every((path) => path.startsWith('/')),
        item.id,
      ).toBe(true);
    }
    expect(APP_SHELL_NAV_ITEMS.map((item) => item.route)).toEqual(CANONICAL_SIDEBAR_PATHS);
  });

  it('keeps canonical sidebar destinations reachable from the command palette where command-backed', () => {
    expect(commandPaletteSource).toContain('export const EMERGENCY_OS_ROUTE_COMMANDS');
    const commandPaths = EMERGENCY_OS_ROUTE_COMMANDS.map((command) => command.build().path);
    for (const path of CANONICAL_SIDEBAR_PATHS) {
      expect(commandPaths).toContain(path);
    }
    expect(commandPaths).toContain('/emergency/pulse');
    expect(commandPaths).toContain('/emergency/shift');
    expect(commandPaths).toContain('/emergency/analytics');
    expect(commandPaths).toContain('/emergency/settings');
  });

  it('renders required header and content regions once', () => {
    expect(appShellSource).toContain('pageTitle={currentPage.label}');
    expect(appShellSource.match(/role="main"/g)).toHaveLength(1);
    expect(appShellSource).toContain('<CopilotPanel />');
    expect(appShellSource).toContain('<PatientDetailPanel />');
    expect(appShellSource).toContain('<CommandPalette');
    expect(appShellSource).toContain("window.addEventListener('ed:open-tools'");
    expect(appShellSource).toContain("window.addEventListener('ed:open-calculator'");
  });

  it('delegates mobile navigation and overflow to Sidebar.css', () => {
    const sidebarCss = readFileSync(join(__dirname, '../components/Sidebar.css'), 'utf8');
    expect(sidebarCss).toMatch(/@media \(max-width: 768px\)/);
    expect(sidebarCss).toContain('.sidebar-nav-item:nth-of-type(n + 6)');
    expect(sidebarCss).toContain('.sidebar-more-sheet');
    expect(APP_SHELL_NAV_ITEMS).toHaveLength(PILOT_SIDEBAR_ITEMS.length);
  });

  it('closes active AppShell overlays on Escape', () => {
    expect(appShellSource).toContain("if (e.key === 'Escape')");
    expect(appShellSource).toContain('store.selectPatient(null);');
    expect(appShellSource).toContain('setShowReassessmentDrawer(false);');
    expect(appShellSource).toContain("document.dispatchEvent(new Event('close-all-panels'));");
  });

  it('navigates Medical Tools browser events with query intent preserved', async () => {
    render(
      <AppShell>
        <div>Route content</div>
      </AppShell>,
    );

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('ed:open-tools', {
          detail: { source: 'chat', filter: 'clinical-tools', query: 'drug-check' },
        }),
      );
    });
    expect(navigateMock.mock.lastCall?.[0]).toBe(
      '/emergency/tools?source=chat&filter=clinical-tools&q=drug-check&open=drug-check',
    );

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('ed:open-calculator', {
          detail: { calculatorId: 'heart-score', patientId: 'patient-123' },
        }),
      );
    });
    expect(navigateMock.mock.lastCall?.[0]).toBe(
      '/emergency/tools?source=calculators&filter=calculator&q=heart-score&open=heart-score&calc=heart-score&patientId=patient-123',
    );
  });
});

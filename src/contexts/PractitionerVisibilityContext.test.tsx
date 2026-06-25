import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EMERGENCY_ROLE_IDS } from '../config/emergencyRolePermissions';
import { CARE_DROID_SCREEN_MODES } from '../config/careDroidScreenModes';
import {
  PractitionerVisibilityProvider,
  usePractitionerSurfaceVisibility,
} from './PractitionerVisibilityContext';

vi.mock('../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => ({
    role: EMERGENCY_ROLE_IDS.chargeNurse,
  }),
}));

vi.mock('../hooks/useRouteScreenMode', () => ({
  default: () => CARE_DROID_SCREEN_MODES.chargeNurse,
}));

function Probe() {
  const surfaces = usePractitionerSurfaceVisibility();
  return (
    <span data-testid="command-dashboard">
      {surfaces.whiteboard.showCommandDashboard ? 'on' : 'off'}
    </span>
  );
}

describe('PractitionerVisibilityContext', () => {
  it('resolves role-aware surfaces once per provider tree', () => {
    render(
      <PractitionerVisibilityProvider>
        <Probe />
      </PractitionerVisibilityProvider>,
    );

    expect(screen.getByTestId('command-dashboard')).toHaveTextContent('off');
  });
});
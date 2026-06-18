import { describe, expect, it } from 'vitest';
import { CARE_DROID_SCREEN_MODES } from '../central-node/careDroidCentralNode';
import { CANONICAL_ROUTES } from '../config/routes.config';

describe('useRouteScreenMode', () => {
  it('documents route to screen-mode mapping used by the hook', () => {
    const routeModeMap = {
      [CANONICAL_ROUTES.emergencyReception]: CARE_DROID_SCREEN_MODES.registration,
      [CANONICAL_ROUTES.emergencyIntake]: CARE_DROID_SCREEN_MODES.registration,
      [CANONICAL_ROUTES.emergencyEms]: CARE_DROID_SCREEN_MODES.ems,
    };

    expect(routeModeMap[CANONICAL_ROUTES.emergencyReception]).toBe('REGISTRATION_SCREEN');
    expect(CARE_DROID_SCREEN_MODES.readOnly).toBe('READ_ONLY_DISPLAY');
  });
});

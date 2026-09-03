import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCopilotChromeAccess } from './useCopilotChromeAccess';

vi.mock('./useEmergencyRolePermissions', () => ({
  default: () => ({
    presentAction: () => ({ visible: true, enabled: true }),
  }),
}));

vi.mock('./useScreenModeCapabilities', () => ({
  default: () => ({ isRegistrationScreen: false }),
}));

vi.mock('../contexts/PractitionerVisibilityContext', () => ({
  usePractitionerSurfaceVisibility: () => ({
    chrome: { showSessionCopilot: true },
    copilot: { showContextTab: false, showSafetyTab: false },
  }),
}));

describe('useCopilotChromeAccess', () => {
  it('enables copilot access when role and surfaces allow it', () => {
    const { result } = renderHook(() => useCopilotChromeAccess());

    expect(result.current.canUseCopilot).toBe(true);
    // Deprecated, always false — the sidebar nav `copilot` item is the sole
    // entry point now (session chrome no longer hosts a second open control).
    expect(result.current.showSessionCopilot).toBe(false);
    expect(result.current.hiddenOnReception).toBe(false);
  });
});
